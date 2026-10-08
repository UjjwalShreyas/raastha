/**
 * Client-Side Audio Recorder & WAV Encoder (16kHz 16-bit Mono)
 * Designed for Vosk Speech-to-Text compatibility.
 */

export class WavAudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private pcmChunks: Float32Array[] = [];
  private isRecording: boolean = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private onSilenceDetected?: () => void;
  private onVolumeChange?: (volume: number) => void;

  constructor(options?: {
    onSilenceDetected?: () => void;
    onVolumeChange?: (volume: number) => void;
  }) {
    this.onSilenceDetected = options?.onSilenceDetected;
    this.onVolumeChange = options?.onVolumeChange;
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;
    this.pcmChunks = [];

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("AudioContext is not supported on this browser.");
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.audioContext = new AudioContextClass();
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Buffer size 4096, 1 input channel, 1 output channel
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    let hasHeardSpeech = false;
    let silenceStart = Date.now();

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      // Clone chunk
      const chunk = new Float32Array(input.length);
      chunk.set(input);
      this.pcmChunks.push(chunk);

      // Volume calculation for visualizer & silence detection
      let sumSquares = 0;
      for (let i = 0; i < input.length; i++) {
        sumSquares += input[i] * input[i];
      }
      const rms = Math.sqrt(sumSquares / input.length);
      this.onVolumeChange?.(Math.min(1, rms * 5));

      // Simple silence / speech detector
      const SPEECH_THRESHOLD = 0.015;
      if (rms > SPEECH_THRESHOLD) {
        hasHeardSpeech = true;
        silenceStart = Date.now();
      } else if (hasHeardSpeech) {
        // If we heard speech and now have 1.8 seconds of silence, auto-trigger completion
        if (Date.now() - silenceStart > 1800) {
          hasHeardSpeech = false;
          this.onSilenceDetected?.();
        }
      }
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
    this.isRecording = true;
  }

  public async stop(): Promise<Blob | null> {
    if (!this.isRecording) return null;
    this.isRecording = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    const currentSampleRate = this.audioContext?.sampleRate || 44100;
    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
      this.audioContext = null;
    }

    if (this.pcmChunks.length === 0) return null;

    // Merge PCM chunks
    const totalLength = this.pcmChunks.reduce((acc, c) => acc + c.length, 0);
    const mergedPCM = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      mergedPCM.set(chunk, offset);
      offset += chunk.length;
    }

    // Resample to 16000 Hz for Vosk KaldiRecognizer
    const targetSampleRate = 16000;
    const resampledPCM = downsamplePCM(mergedPCM, currentSampleRate, targetSampleRate);

    // Encode to 16-bit Mono WAV
    const wavBlob = encodeWAV(resampledPCM, targetSampleRate);
    return wavBlob;
  }
}

/**
 * Resample Float32 PCM from source sampleRate to target sampleRate
 */
function downsamplePCM(
  buffer: Float32Array,
  sourceRate: number,
  targetRate: number
): Float32Array {
  if (sourceRate === targetRate) return buffer;
  const ratio = sourceRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Creates a valid 16-bit Mono WAV file blob with standard 44-byte RIFF header
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    // 16-bit signed integer conversion
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Transcribe WAV Blob using local Vosk offline STT microservice
 */
export async function transcribeWithVosk(audioBlob: Blob): Promise<{ success: boolean; text: string; error?: string }> {
  try {
    const res = await fetch("/api/voice/offline", {
      method: "POST",
      headers: {
        "Content-Type": "audio/wav",
      },
      body: audioBlob,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, text: "", error: err.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      success: !!data.success && !!data.text,
      text: (data.text || "").trim(),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Vosk request failed";
    return { success: false, text: "", error: message };
  }
}
