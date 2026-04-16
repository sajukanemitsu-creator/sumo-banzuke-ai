import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "大相撲番付予測",
  description: "大相撲の番付予測・過去番付照会システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSerifJP.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#f7f0e3] text-[#1a1008]" style={{
        fontFamily: "var(--font-noto-serif-jp), 'Hiragino Mincho ProN', 'Yu Mincho', serif",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
      }}>
        {/* ヘッダー */}
        <header className="border-b-2 border-[#c0392b] bg-[#f7f0e3]/95 backdrop-blur sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-[#c0392b] text-2xl leading-none">◉</span>
              <span className="text-lg font-bold tracking-[0.15em]">大相撲番付予測</span>
            </a>
            <nav className="flex gap-5 text-sm tracking-wider">
              <a href="/"         className="hover:text-[#c0392b] transition-colors">予想番付</a>
              <a href="/banzuke"  className="hover:text-[#c0392b] transition-colors">番付照会</a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[#c0392b]/20 text-center text-xs text-[#1a1008]/40 py-4 tracking-wider">
          データ出典: sumo-api.com　予測は統計モデルによるものです
        </footer>
      </body>
    </html>
  );
}
