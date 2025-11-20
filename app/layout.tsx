import { Inter } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "../context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "คอร์สเรียนครูฮีม",
  description: "เรียนคณิตศาสตร์ออนไลน์ เข้าใจง่าย สไตล์ครูฮีม",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* ครอบทั้งเว็บด้วย AuthContextProvider เพื่อให้ระบบ Login ทำงานทุกหน้า */}
        <AuthContextProvider>
          
          {/* ส่วนหัวเว็บ (Navbar) */}
          <nav className="w-full p-4 bg-slate-900 text-white shadow-md">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold flex items-center gap-2">
                📚 KruHeem Course
              </h1>
            </div>
          </nav>

          {/* เนื้อหาของแต่ละหน้า */}
          {children}

        </AuthContextProvider>
      </body>
    </html>
  );
}