import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { LocationProvider } from "@/context/LocationContext";
import { AuthProvider } from "@/context/AuthContext";
import { IssuesProvider } from "@/context/IssuesContext";
import { Navbar } from "@/components/Navbar";
import { VoiceBar } from "@/components/ui/VoiceBar";
import { SOSModal } from "@/components/SOSModal";
import { ToastBanner } from "@/components/ToastBanner";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..900&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full flex flex-col text-[#3E000C] selection:bg-[#3E000C] selection:text-[#FFECD1]"
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      >
        <AuthProvider>
          <LocationProvider>
            <IssuesProvider>
              <AppProvider>
                <Navbar />
                <ToastBanner />
                <main className="flex-1 pb-24 relative">{children}</main>
                <VoiceBar />
                <SOSModal />
              </AppProvider>
            </IssuesProvider>
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
