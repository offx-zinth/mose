import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Private Chat - Secure 2-Person Communication",
  description: "A secure, private chat application for exclusive communication between two people with CAPTCHA-based access control.",
  keywords: ["private chat", "secure messaging", "real-time chat", "private communication"],
  authors: [{ name: "Private Chat Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Private Chat - Secure 2-Person Communication",
    description: "A secure, private chat application for exclusive communication",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Private Chat",
    description: "Secure 2-Person Communication",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
