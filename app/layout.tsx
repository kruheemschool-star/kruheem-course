// File: app/layout.tsx
import "./globals.css";
// import dynamic from "next/dynamic"; // No longer needed here
import { AuthContextProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Mitr, IBM_Plex_Sans_Thai_Looped } from 'next/font/google';
import { DynamicVisitorTracker, DynamicChatWidget } from "@/components/ClientWrappers";

const mitr = Mitr({
  weight: ['200', '300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-mitr',
  display: 'swap',
});

const ibmLoop = IBM_Plex_Sans_Thai_Looped({
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-ibm-loop',
  display: 'swap',
});

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
      <body className={`${mitr.variable} ${ibmLoop.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="noise-overlay"></div>
          <AuthContextProvider>
            <DynamicVisitorTracker />
            {children}
            {/* <DynamicChatWidget /> */}
          </AuthContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}