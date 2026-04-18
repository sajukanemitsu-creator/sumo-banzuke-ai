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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${notoSerifJP.variable} h-full`}>
      <body
        className="min-h-full flex flex-col text-[#1a1008]"
        style={{
          background: "#F5F0E8",
          fontFamily:
            "var(--font-noto-serif-jp), 'Hiragino Mincho ProN', 'Yu Mincho', serif",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
      >
        {/* ─── Header ─── */}
        <header
          className="sticky top-0 z-20 backdrop-blur border-b border-stone-200"
          style={{ background: "rgba(245, 240, 232, 0.95)" }}
        >
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-[#c0392b] text-xl leading-none">◉</span>
              <span className="font-bold tracking-wider text-base">相撲AI</span>
            </a>
            <nav className="flex gap-1">
              <a
                href="/"
                className="px-4 py-1.5 text-sm tracking-wider rounded-lg text-[#1a1008]/70 hover:text-[#c0392b] hover:bg-[#c0392b]/8 transition-all font-medium"
              >
                AI番付予測
              </a>
              <a
                href="/banzuke"
                className="px-4 py-1.5 text-sm tracking-wider rounded-lg text-[#1a1008]/70 hover:text-[#c0392b] hover:bg-[#c0392b]/8 transition-all font-medium"
              >
                番付照会
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
