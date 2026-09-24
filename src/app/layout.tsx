import type { Metadata } from "next";
import { Sora, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

// Self-hosted by Next.js at build time (no external request at runtime,
// no new dependency - next/font is part of the "next" package itself).
const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "VocalisAi - AI English Practice, Assessment & Proctored Exam Preparation",
  description:
    "Practice and prepare for English language tests, academic and workplace English assessments, recruitment and pre-employment assessments, and proctored mock exams - with real AI-powered speech, grammar and performance analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${sora.variable} ${publicSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
