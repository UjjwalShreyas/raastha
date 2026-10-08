/**
 * Compresses an image File using an HTML5 Canvas:
 * - Resizes maintaining aspect ratio so max(width, height) <= maxDimension (default 1024px)
 * - Encodes as JPEG with quality 0.7
 * Returns: { file: File, base64: string, dataUrl: string }
 */
export async function compressImage(
  file: File,
  maxDimension = 1024,
  quality = 0.7
): Promise<{ file: File; base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Image compression must be run in browser environment."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image data."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context is unavailable."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to encode compressed image blob."));
              return;
            }
            const cleanName =
              (file.name ? file.name.replace(/\.[^/.]+$/, "") : "hazard") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              base64,
              dataUrl,
            });
          },
          "image/jpeg",
          quality
        );
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
