import type { Metadata } from "next";
import { Inter, Inter_Tight, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

// Self-hosted by Next.js at build time (no external request at runtime,
// no new dependency - next/font is part of the "next" package itself).
// Inter Tight for headlines, Inter for text, Instrument Serif (italic) for one
// accent word in a big headline, Plex Mono for numbers (docs/UI_DESIGN_SYSTEM.md).
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "VocalisAi - AI English Practice, Assessment & Proctored Exam Preparation",
  description:
    "Practice and prepare for English language tests, academic and workplace English assessments, recruitment and pre-employment assessments, and proctored mock exams - with real AI-powered speech, grammar and performance analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${interTight.variable} ${inter.variable} ${instrumentSerif.variable} ${plexMono.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
