import { getBanzuke, getAvailableBashos, getBashoWinLossByDiv } from "@/lib/actions";
import { BanzukeRow, DIVISIONS, rankValue, rankLabel, displayName } from "@/lib/utils";
import HomeClient from "@/components/HomeClient";

const PREDICTED_BASHO = "202605";
export const revalidate = 300;

const VENUES: Record<string, string> = {
  "01": "両国国技館",   "03": "大阪府立体育会館",
  "05": "両国国技館",   "07": "ドルフィンズアリーナ",
  "09": "両国国技館",   "11": "福岡国際センター",
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

  // 直前の実績場所（予測場所より前）
  const prevBasho = allBashos.find((b) => b < PREDICTED_BASHO) ?? null;

  const [prevRows, prevWinLoss] = await Promise.all([
    prevBasho
      ? getBanzuke(prevBasho, currentDiv).catch(() => [] as BanzukeRow[])
      : Promise.resolve([] as BanzukeRow[]),
    prevBasho
      ? getBashoWinLossByDiv(prevBasho, currentDiv).catch(() => ({} as Record<string, { wins: number; losses: number }>))
      : Promise.resolve({} as Record<string, { wins: number; losses: number }>),
  ]);

  // Map を JSON-serializable な Record に変換（Client Component に渡すため）
  const prevRankObj: Record<string, BanzukeRow> = {};
  for (const r of prevRows) prevRankObj[r.rikishi_name] = r;

  // KPI
  const wrestlerCount = rows.length;
  const promotedCount = rows.filter((r) => {
    const prev = prevRankObj[r.rikishi_name];
    return prev && rankValue(prev) - rankValue(r) > 200;
  }).length;
  const topWrestler =
    rows.find((r) => r.rank === "Yokozuna" && r.side === "East") ??
    rows.find((r) => r.rank === "Yokozuna");
  const topCandidate = topWrestler ? displayName(topWrestler) : "—";

  // 注目の番付変動（差分大きい順top6）
  type Notable = {
    row: BanzukeRow;
    prev: BanzukeRow;
    movement: "promoted" | "demoted";
    conf: number;
  };
  const notableMovements: Notable[] = rows
    .map((r) => {
      // 確度%は平幕の昇降のみ対象
      if (r.rank !== "Maegashira") return null;
      const prev = prevRankObj[r.rikishi_name];
      if (!prev) return null;
      const diff = rankValue(prev) - rankValue(r);
      if (Math.abs(diff) < 500) return null;
      const movement = diff > 0 ? ("promoted" as const) : ("demoted" as const);
      return { row: r, prev, movement, conf: getConfidence(prevWinLoss[r.rikishi_name], movement), diff: Math.abs(diff) };
    })
    .filter((x): x is Notable & { diff: number } => x !== null)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 6)
    .map(({ diff: _diff, ...rest }) => rest);

  const year = parseInt(PREDICTED_BASHO.slice(0, 4));
  const month = PREDICTED_BASHO.slice(4);
  const venue = VENUES[month] ?? "両国国技館";
  const monthName = MONTH_JA[month] ?? "場所";
  const era = eraLabel(year);

  return (
    <div>
      {/* ─── Hero ─── */}
      <div className="text-center pt-10 pb-6 px-4">
        <h1 className="text-5xl font-bold tracking-[0.15em] mb-3">AI番付予測</h1>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-px w-20 bg-[#c0392b]" />
          <span className="text-[10px] tracking-[0.5em] text-[#c0392b]/70 uppercase">
            Sumo Banzuke Prediction
          </span>
          <div className="h-px w-20 bg-[#c0392b]" />
        </div>
        <p className="text-sm text-[#1a1008]/60 flex items-center justify-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-[#c0392b]" />
          {era} {monthName}（{PREDICTED_BASHO}）予測番付
          <span className="text-[#1a1008]/30">|</span>
          {venue}
        </p>
      </div>

      {/* ─── HomeClient（タブ＋コンテンツ） ─── */}
      <HomeClient
        rows={rows}
        prevRankObj={prevRankObj}
        winLoss={prevWinLoss}
        notableMovements={notableMovements}
        wrestlerCount={wrestlerCount}
        promotedCount={promotedCount}
        topCandidate={topCandidate}
        currentDiv={currentDiv}
        era={era}
        monthName={monthName}
        prevBasho={prevBasho}
        allBashos={allBashos}
      />
    </div>
  );
}
