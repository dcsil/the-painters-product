import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { signOut } from "@/lib/auth";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Chatbot Analysis Tool",
  description: "Mass data analysis of AI chatbot conversations",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {session?.user && (
          <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <nav className="flex items-center gap-6">
                <Link href="/upload" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                  Upload
                </Link>
                <Link href="/uploads" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                  History
                </Link>
              </nav>
              <div className="flex items-center gap-4">
                <span className="text-gray-500 text-sm">{session.user.email}</span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}
        {children}
      </body>
    </html>
  );
}
