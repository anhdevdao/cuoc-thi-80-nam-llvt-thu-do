import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cuộc thi tìm hiểu 80 năm Truyền thống Lực lượng vũ trang Thủ đô",
  description:
    "Nền tảng thi trực tuyến chào mừng 80 năm Truyền thống Lực lượng vũ trang Thủ đô, dành cho thí sinh tham gia trả lời trắc nghiệm và dự đoán số lượng tham dự.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
