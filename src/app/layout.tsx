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
  title: "Wikipedia - The Free Encyclopedia",
  description: "Wikipedia, the free encyclopedia that anyone can edit.",
  keywords: ["Wikipedia", "encyclopedia", "free knowledge"],
  authors: [{ name: "Wikipedia" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Wikipedia - The Free Encyclopedia",
    description: "The free encyclopedia that anyone can edit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wikipedia - The Free Encyclopedia",
    description: "The free encyclopedia that anyone can edit",
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
