import type { Metadata } from "next";
import { Mali, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const mali = Mali({
  variable: "--font-heading",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "พี่จินนี่ (P' Genie) - AI To-Do List",
  description: "ผู้ช่วยจดการบ้าน แยกวิชา และเตือนเดตไลน์",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className={`${mali.variable} ${notoThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
