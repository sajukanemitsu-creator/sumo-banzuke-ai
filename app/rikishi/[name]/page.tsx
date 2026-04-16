import { getRikishiHistory } from "@/lib/actions";
import { bashoLabel, rankLabel, rankValue, displayName, RANK_ORDER } from "@/lib/utils";
import Link from "next/link";

type Props = { params: Promise<{ name: string }> };

export default async function RikishiPage({ params }: Props) {
  const { name } = await params;
  const rikishiName = decodeURIComponent(name);

  let history: Awaited<ReturnType<typeof getRikishiHistory>> = [];
  try {
    history = await getRikishiHistory(rikishiName);
  } catch (e) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 text-sm">データ取得エラー: {String(e)}</p>
        <Link href="/" className="text-[#c0392b] text-sm hover:underline mt-4 inline-block">← 戻る</Link>
      </div>
    );
  }

  const latest = history[history.length - 1];
  const jpName = latest?.rikishi_name_jp;

  // SVG グラフ用（幕内在位の最新40場所）
  const graphData = history.slice(-40).map((r) => ({
    ...r,
    rv: rankValue(r),
  }));
  const minRV = graphData.length ? Math.min(...graphData.map((r) => r.rv)) : 1000;
  const maxRV = graphData.length ? Math.max(...graphData.map((r) => r.rv)) : 6000;
  const range = maxRV - minRV || 1;
  const W = 560, H = 160, PAD = 24;

  const points = graphData.map((r, i) => ({
    x: PAD + (i / Math.max(graphData.length - 1, 1)) * (W - PAD * 2),
    y: PAD + ((r.rv - minRV) / range) * (H - PAD * 2),
    row: r,
  }));

  // 役職区切り線
  const gridLines = [1000, 2000, 3000, 4000, 5000].filter(
    (rv) => rv >= minRV - 200 && rv <= maxRV + 200
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-[#c0392b] hover:underline mb-6 inline-block tracking-wider">
        ← 番付表に戻る
      </Link>

      {/* 力士名 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-widest mb-1">
          {jpName || rikishiName}
        </h1>
        {jpName && (
          <p className="text-sm text-[#1a1008]/40 tracking-wider">{rikishiName}</p>
        )}
        {latest && (
          <p className="text-sm text-[#1a1008]/60 mt-2">
            直近: {bashoLabel(latest.basho)}
            {latest.side === "East" ? "東" : "西"}
            {rankLabel(latest)}
          </p>
        )}
      </div>

      {/* 罫線 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-[#c0392b]/30" />
        <span className="text-[#c0392b]/60">◉</span>
        <div className="flex-1 h-px bg-[#c0392b]/30" />
      </div>

      {/* 番付履歴グラフ */}
      <div className="bg-white/60 rounded-xl border border-stone-200 p-4 mb-5 shadow-sm">
        <h2 className="text-sm font-bold tracking-wider mb-3 text-[#c0392b]">
          幕内番付履歴（直近40場所）
        </h2>
        {graphData.length < 2 ? (
          <p className="text-xs text-[#1a1008]/40 text-center py-6">
            幕内データが少ないためグラフを表示できません
          </p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
            {gridLines.map((rv) => {
              const y = PAD + ((rv - minRV) / range) * (H - PAD * 2);
              const label = { 1000: "横綱", 2000: "大関", 3000: "関脇", 4000: "小結", 5000: "前頭1" }[rv] ?? "";
              return (
                <g key={rv}>
                  <line x1={PAD} y1={y} x2={W - PAD} y2={y}
                    stroke="#c0392b" strokeOpacity={0.12} strokeDasharray="4 3" />
                  <text x={PAD + 3} y={y - 3} fontSize={8} fill="#c0392b" fillOpacity={0.45}>
                    {label}
                  </text>
                </g>
              );
            })}
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none" stroke="#c0392b" strokeWidth={1.8}
            />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3}
                fill="#c0392b" fillOpacity={0.75} />
            ))}
          </svg>
        )}
        <p className="text-[10px] text-[#1a1008]/25 text-right mt-1">
          ※ 上が上位（役職が高いほど上）
        </p>
      </div>

      {/* 全履歴テーブル */}
      <div className="bg-white/60 rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wider text-[#c0392b]">幕内番付履歴</h2>
          <span className="text-xs text-[#1a1008]/40">{history.length} 場所</span>
        </div>
        <div className="overflow-y-auto max-h-80">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 text-xs tracking-wider text-[#1a1008]/60">場所</th>
                <th className="text-center px-3 py-2 text-xs">東西</th>
                <th className="text-center px-3 py-2 text-xs">番付</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((r) => (
                <tr key={`${r.basho}-${r.side}`}
                  className="border-t border-stone-100 hover:bg-[#c0392b]/5 transition-colors">
                  <td className="px-4 py-2">{bashoLabel(r.basho)}</td>
                  <td className="px-3 py-2 text-center">{r.side === "East" ? "東" : "西"}</td>
                  <td className="px-3 py-2 text-center font-medium">{rankLabel(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
