import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Book My Packers — Lead Distribution System",
  description: "A mini lead distribution system that fairly allocates service enquiries to providers with real-time dashboard updates.",
    icons: {
    icon: ['/favicon.png']
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/70 backdrop-blur border-b border-slate-700/40">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-white font-bold text-sm tracking-wide">
              ⚡ Book My Packers
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/request-service" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-700/50 transition-all">
                Request Service
              </Link>
              <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-700/50 transition-all">
                Dashboard
              </Link>
              <Link href="/test-tools" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-700/50 transition-all">
                Test Tools
              </Link>
            </div>
          </div>
        </nav>
        <div className="pt-12">
          {children}
        </div>

        <footer className="">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="text-white font-bold text-sm tracking-wide text-right w-full">
              Design and Developed by <span className="text-emerald-400">Mayank Vishwakarma</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
