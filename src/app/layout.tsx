import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Raleway } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from '@/components/SessionProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-raleway',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perspectra - AI Boardroom for One",
  description: "Your AI-powered boardroom for better decision-making",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${raleway.variable}`}>
      <body className="antialiased">
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
