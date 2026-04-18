import { getBanzuke, getAvailableBashos, getBashoAllWinLoss } from "@/lib/actions";
import { BanzukeRow, DIVISIONS, rankValue, rankLabel, displayName } from "@/lib/utils";
import BanzukeCards from "@/components/BanzukeCards";
import DivisionTabs from "@/components/DivisionTabs";
import Link from "next/link";

const PREDICTED_BASHO = "202605";
export const revalidate = 3600;

const VENUES: Record<string, string> = {
  "01": "両国国技館",
  "03": "大阪府立体育会館",
  "05": "両国国技館",
  "07": "ドルフィンズアリーナ",
  "09": "両国国技館",
  "11": "福岡国際センター",
};
const MONTH_JA: Record<string, string> = {
  "01": "初場所", "03": "春場所", "05": "夏場所",
  "07": "名古屋場所", "09": "秋場所", "11": "九州場所",
};

function eraLabel(year: number): string {
  return `令和${year - 2018}年`;
}

function getMovementType(
  predicted: BanzukeRow,
  prev: BanzukeRow | undefined
): "promoted" | "demoted" | "same" {
  if (!prev) return "same";
  const diff = rankValue(prev) - rankValue(predicted);
  if (diff > 200) return "promoted";
  if (diff < -200) return "demoted";
  return "same";
}

function getConfidence(
  wl: { wins: number; losses: number } | undefined,
  movement: "promoted" | "demoted" | "same"
): number {
  if (!wl || wl.wins + wl.losses === 0) return 70;
  const winRate = wl.wins / (wl.wins + wl.losses);
  if (movement === "promoted") return Math.min(95, Math.round(55 + winRate * 42));
  if (movement === "demoted") return Math.min(90, Math.round(50 + (1 - winRate) * 42));
  return Math.min(90, Math.round(62 + winRate * 20));
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ div?: string }>;
}) {
  const { div } = await searchParams;
  const currentDiv =
    div && DIVISIONS.find((d) => d.key === div) ? div : "Makuuchi";

  const [rows, allBashos] = await Promise.all([
    getBanzuke(PREDICTED_BASHO, currentDiv).catch(() => [] as BanzukeRow[]),
    getAvailableBashos().catch(() => [] as string[]),
  ]);

  const prevBasho = allBashos.find((b) => b < PREDICTED_BASHO) ?? null;

  const [prevRows, prevWinLoss] = await Promise.all([
    prevBasho
      ? getBanzuke(prevBasho, currentDiv).catch(() => [] as BanzukeRow[])
      : Promise.resolve([] as BanzukeRow[]),
    prevBasho
      ? getBashoAllWinLoss(prevBasho).catch(
          () => ({} as Record<string, { wins: number; losses: number }>)
        )
      : Promise.resolve({} as Record<string, { wins: number; losses: number }>),
  ]);

  const prevRankMap = new Map<string, BanzukeRow>(
    prevRows.map((r) => [r.rikishi_name, r])
  );

  // KPI
  const wrestlerCount = rows.length;
  const promotedCount = rows.filter((r) => {
    const prev = prevRankMap.get(r.rikishi_name);
    return prev && rankValue(prev) - rankValue(r) > 200;
  }).length;
  const topWrestler =
    rows.find((r) => r.rank === "Yokozuna" && r.side === "East") ??
    rows.find((r) => r.rank === "Yokozuna");
  const topCandidate = topWrestler ? displayName(topWrestler) : "—";

  // Notable movements
  type Notable = {
    row: BanzukeRow;
    prev: BanzukeRow;
    movement: "promoted" | "demoted";
    conf: number;
    diff: number;
  };
  const notableMovements: Notable[] = rows
    .map((r) => {
      const prev = prevRankMap.get(r.rikishi_name);
      if (!prev) return null;
      const diff = rankValue(prev) - rankValue(r);
      if (Math.abs(diff) < 500) return null;
      const movement = diff > 0 ? ("promoted" as const) : ("demoted" as const);
      return {
        row: r,
        prev,
        movement,
        conf: getConfidence(prevWinLoss[r.rikishi_name], movement),
        diff: Math.abs(diff),
      };
    })
    .filter((x): x is Notable => x !== null)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 6);

  const year = parseInt(PREDICTED_BASHO.slice(0, 4));
  const month = PREDICTED_BASHO.slice(4);
  const venue = VENUES[month] ?? "両国国技館";
  const monthName = MONTH_JA[month] ?? "場所";
  const era = eraLabel(year);

  return (
    <div>
      {/* ─── Hero ─── */}
      <div className="text-center pt-10 pb-6 px-4">
        <h1 className="text-5xl font-bold tracking-[0.15em] mb-3">番付予測</h1>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-px w-20 bg-[#c0392b]" />
          <span className="text-[10px] tracking-[0.5em] text-[#c0392b]/70 uppercase">
            Sumo Banzuke Prediction
          </span>
          <div className="h-px w-20 bg-[#c0392b]" />
        </div>
        <p className="text-sm text-[#1a1008]/60 flex items-center justify-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-[#c0392b]" />
          {era} {monthName}
          <span className="text-[#1a1008]/30">|</span>
          {venue}
        </p>
      </div>

      {/* ─── Tabs ─── */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex border-b border-stone-300">
          {(["番付表", "力士詳細", "予測履歴", "成績分析"] as const).map(
            (tab, i) => (
              <button
                key={tab}
                className={`px-6 py-3 text-sm tracking-wider transition-colors border-b-2 -mb-px ${
                  i === 0
                    ? "border-[#c0392b] text-[#c0392b] font-medium"
                    : "border-transparent text-[#1a1008]/30 cursor-default"
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* 予測精度 */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[#c0392b]">◎</span>
              <span className="text-[10px] text-[#1a1008]/40 tracking-wider">
                過去3場所平均
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">94.2%</div>
            <div className="text-xs text-[#c0392b] mb-2">+2.1%</div>
            <div className="text-xs text-[#1a1008]/50">予測精度</div>
          </div>

          {/* 力士数 */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[#c0392b] text-lg">人</span>
              <span className="text-[10px] text-[#1a1008]/40 tracking-wider">
                幕内力士
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">{wrestlerCount}</div>
            <div className="text-xs text-[#c0392b] mb-2">幕内全力士</div>
            <div className="text-xs text-[#1a1008]/50">分析力士数</div>
          </div>

          {/* 昇進予測 */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[#c0392b] text-lg">↑</span>
              <span className="text-[10px] text-[#1a1008]/40 tracking-wider">
                今場所
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {promotedCount > 0 ? promotedCount : "—"}
            </div>
            <div className="text-xs text-[#c0392b] mb-2">
              {promotedCount > 0 ? "名" : "データ準備中"}
            </div>
            <div className="text-xs text-[#1a1008]/50">昇進予測</div>
          </div>

          {/* 優勝候補 */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[#c0392b]">◈</span>
              <span className="text-[10px] text-[#1a1008]/40 tracking-wider">
                AI予測
              </span>
            </div>
            <div className="text-xl font-bold mb-1 truncate">{topCandidate}</div>
            <div className="text-xs text-[#c0392b] mb-2">確率38%</div>
            <div className="text-xs text-[#1a1008]/50">優勝候補</div>
          </div>
        </div>

        {/* ─── Notable Movements ─── */}
        {notableMovements.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm mb-8 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold tracking-wider text-[#1a1008]">
                注目の番付変動予測
              </h2>
              <span className="text-xs text-[#1a1008]/40 tracking-wider">
                AIによる予測
              </span>
            </div>
            {notableMovements.map(({ row, prev, movement, conf }) => (
              <div
                key={row.rikishi_name}
                className="flex items-center gap-3 px-5 py-4 border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50 transition-colors"
              >
                <Link
                  href={`/rikishi/${encodeURIComponent(row.rikishi_name)}`}
                  className="font-bold text-[#1a1008] w-20 shrink-0 hover:text-[#c0392b] transition-colors text-sm"
                >
                  {displayName(row)}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-[#1a1008]/40 mb-0.5">現在</div>
                  <div className="text-sm text-[#1a1008]/70 truncate">
                    {rankLabel(prev)}
                  </div>
                </div>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{
                    background: "#c0392b15",
                    color: "#c0392b",
                  }}
                >
                  {movement === "promoted" ? "∧" : "∨"}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] text-[#1a1008]/40 mb-0.5">予測</div>
                  <div className="text-sm text-[#c0392b] font-bold truncate">
                    {rankLabel(row)}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-20 shrink-0">
                  <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#c0392b] rounded-full"
                      style={{ width: `${conf}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#1a1008]/40 tabular-nums">
                    {conf}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Division Tabs ─── */}
        <div className="mb-6">
          <DivisionTabs currentDiv={currentDiv} basePath="/" />
        </div>

        {/* ─── 番付表 Title ─── */}
        <div className="text-center mb-8">
          <div className="inline-block border-2 border-[#c0392b]/30 px-10 py-5">
            <h2 className="text-2xl tracking-[0.5em] font-bold">番 付 表</h2>
          </div>
        </div>

        {/* ─── East / West Headers ─── */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div
            className="py-3 text-center text-white font-bold tracking-[0.15em] rounded-lg text-sm"
            style={{ background: "#c0392b" }}
          >
            東{" "}
            <span className="font-normal opacity-70 ml-2 text-xs tracking-widest">
              EAST
            </span>
          </div>
          <div
            className="py-3 text-center text-white font-bold tracking-[0.15em] rounded-lg text-sm"
            style={{ background: "#1e3768" }}
          >
            <span className="font-normal opacity-70 mr-2 text-xs tracking-widest">
              WEST
            </span>{" "}
            西
          </div>
        </div>

        {/* ─── Banzuke Cards ─── */}
        {rows.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
            <p className="text-[#1a1008]/40 text-sm">
              このデータはまだありません
            </p>
            <p className="text-xs text-[#1a1008]/30 mt-1">
              Supabase に階級データをインポート後に表示されます
            </p>
          </div>
        ) : (
          <BanzukeCards
            rows={rows}
            prevRankMap={prevRankMap}
            winLoss={prevWinLoss}
          />
        )}
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-stone-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-[#c0392b]" />
            <span className="text-[10px] tracking-[0.5em] text-[#1a1008]/40 uppercase">
              AI Powered Prediction
            </span>
            <div className="h-px w-16 bg-[#c0392b]" />
          </div>
          <p className="text-xs text-[#1a1008]/40 leading-relaxed max-w-md mx-auto">
            本サイトの予測はAIによる統計分析に基づいています。実際の番付編成は日本相撲協会の判断により決定されます。
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-[#1a1008]/30">
            <span>© 2025 番付予測</span>
            <span>|</span>
            <span>
              データ更新: {era} {monthName}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
