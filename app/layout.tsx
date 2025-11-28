// ไฟล์: app/layout.tsx
import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";
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

export const metadata = {
  title: "KruHeem Course",
  description: "เรียนคณิตศาสตร์ออนไลน์กับครูฮีม",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${prompt.variable} font-sans`}>
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
      </body>
    </html>
  );
}