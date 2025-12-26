// ไฟล์: app/layout.tsx
import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";
import ChatWidget from "@/components/ChatWidget";
import VisitorTracker from "@/components/VisitorTracker";
import { ThemeProvider } from "@/components/ThemeProvider";
import localFont from 'next/font/local'

const prompt = localFont({
  src: [
    {
      path: '../public/fonts/Prompt-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Prompt-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-prompt',
  display: 'swap',
})

import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL('https://www.kruheemmath.com'),
  title: {
    default: 'KruHeem Course | คอร์สเรียนคณิตศาสตร์ออนไลน์ โดยครูฮีม',
    template: '%s | KruHeem Course'
  },
  description: 'เรียนคณิตศาสตร์ออนไลน์กับครูฮีม ติวสอบเข้า ม.1, ม.4, มหาวิทยาลัย เทคนิคคิดลัด เข้าใจง่าย ไม่ต้องท่องจำ ปูพื้นฐานแน่น พร้อมลุยทุกสนามสอบ',
  keywords: ['เรียนคณิตศาสตร์', 'ติวคณิต', 'สอบเข้า ม.1', 'สอบเข้า ม.4', 'TCAS', 'A-Level', 'ครูฮีม', 'KruHeem', 'คอร์สเรียนออนไลน์', 'กวดวิชาคณิตศาสตร์'],
  authors: [{ name: 'KruHeem' }],
  creator: 'KruHeem',
  publisher: 'KruHeem Course',
  openGraph: {
    title: 'KruHeem Course | คอร์สเรียนคณิตศาสตร์ออนไลน์',
    description: 'เปลี่ยนเรื่องยากให้เป็นเรื่องง่าย ติวคณิตศาสตร์กับครูฮีม พร้อมเทคนิคคิดลัดที่ใช้ได้จริง',
    url: 'https://www.kruheemmath.com',
    siteName: 'KruHeem Course',
    images: [
      {
        url: '/assets/kruheem_avatar.png', // Using existing asset as placeholder
        width: 800,
        height: 800,
        alt: 'KruHeem Course Logo',
      },
    ],
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KruHeem Course | คอร์สเรียนคณิตศาสตร์ออนไลน์',
    description: 'ติวคณิตศาสตร์กับครูฮีม เข้าใจง่าย เทคนิคเพียบ',
    images: ['/assets/kruheem_avatar.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${prompt.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthContextProvider>
            <VisitorTracker />
            {children}
            <ChatWidget />
          </AuthContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}