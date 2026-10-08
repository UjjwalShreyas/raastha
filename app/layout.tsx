import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Navbar } from "@/components/Navbar";
import { VoiceBar } from "@/components/ui/VoiceBar";
import { SOSModal } from "@/components/SOSModal";

export const metadata: Metadata = {
  title: "Raastha | Voice-First Civic Safety & Safe Corridor Navigation",
  description:
    "AI-powered voice-first navigation platform for women & civic safety. Report potholes, broken lights, dark spots, and navigate well-lit safe corridors.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#FFECD1] text-[#3E000C] font-['Helvetica_Neue',Helvetica,Arial,sans-serif] selection:bg-[#3E000C] selection:text-[#FFECD1]">
        <AppProvider>
          <Navbar />
          <main className="flex-1 pb-24 relative">{children}</main>
          <VoiceBar />
          <SOSModal />
        </AppProvider>
      </body>
    </html>
  );
}
