import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { signOut } from "@/lib/auth";
import Link from "next/link";
import ClientShell from "@/app/components/ClientShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300"],
});

export const metadata: Metadata = {
  title: "Oversight",
  description: "Independent safety auditing for conversational AI",
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
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        {session?.user && (
          <header className="bg-white border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <nav className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-slate-900 text-[15px] tracking-[0.18em] hover:text-slate-500 transition-colors mr-2"
                  style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 300 }}
                >
                  oversight
                </Link>
                <Link href="/chat" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
                  Chatbot
                </Link>
                <Link href="/monitor" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
                  Monitor
                </Link>
                <Link href="/trends" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
                  Trends
                </Link>
                <Link href="/upload" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
                  Upload
                </Link>
                <Link href="/uploads" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
                  History
                </Link>
                <Link href="/ground-truth" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
                  Ground Truth
                </Link>
                <Link href="/settings" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
                  Settings
                </Link>
              </nav>
              <div className="flex items-center gap-4">
                <span className="text-slate-500 text-sm">{session.user.email}</span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}
        <ClientShell isLoggedIn={!!session?.user}>
          {children}
        </ClientShell>
      </body>
    </html>
  );
}
