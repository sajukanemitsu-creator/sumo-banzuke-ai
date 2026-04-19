import Link from "next/link";
import { BanzukeRow, RANK_ORDER, RANK_JA, rankLabel, rankValue, rankCenterLabel, displayName } from "@/lib/utils";

type WinLoss = Record<string, { wins: number; losses: number; absences?: number }>;
type Movement = "promoted" | "demoted" | "same";

function getMovement(predicted: BanzukeRow, prev: BanzukeRow | undefined): Movement {
  if (!prev) return "same";
  const diff = rankValue(prev) - rankValue(predicted);
  if (diff > 1) return "promoted";
  if (diff < -1) return "demoted";
  return "same";
}

function getConfidence(
  wl: { wins: number; losses: number } | undefined,
  movement: Movement
): number {
  if (!wl || wl.wins + wl.losses === 0) return 70;
  const winRate = wl.wins / (wl.wins + wl.losses);
  if (movement === "promoted") return Math.min(95, Math.round(55 + winRate * 42));
  if (movement === "demoted") return Math.min(90, Math.round(50 + (1 - winRate) * 42));
  return Math.min(90, Math.round(62 + winRate * 20));
}

function MovementBadge({ movement, side }: { movement: Movement; side: "East" | "West" }) {
  const color = side === "East" ? "#c0392b" : "#1e3768";
  if (movement === "promoted") {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border"
        style={{ color, borderColor: color, background: `${color}12` }}
      >
        ∧ 昇進
      </span>
    );
  }
  if (movement === "demoted") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border border-stone-300 text-stone-400 bg-stone-50">
        ∨ 降格
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border border-stone-300 text-stone-400 bg-stone-50">
      — 据置
    </span>
  );
}

function EastCard({
  row,
  prev,
  wl,
}: {
  row: BanzukeRow;
  prev?: BanzukeRow;
  wl?: { wins: number; losses: number; absences?: number };
}) {
  const movement = getMovement(row, prev);
  const conf = getConfidence(wl, movement);
  const wins = wl?.wins ?? null;
  const losses = wl?.losses ?? null;
  const is7bout = !["Makuuchi", "Juryo"].includes(row.division);
  const maxBouts = is7bout ? 7 : 15;
  // 幕下以下: 実際の休場数のみ表示（対戦なし日は休ではない）
  const kyujo = wins !== null && losses !== null
    ? (is7bout ? (wl?.absences ?? 0) : Math.max(0, maxBouts - wins - losses))
    : null;
  const winPct = wins !== null ? Math.round((wins / maxBouts) * 100) : null;

  return (
    <div
      className="bg-white rounded-lg border border-stone-200 py-2 px-3 overflow-hidden"
      style={{ borderLeft: "3px solid #c0392b" }}
    >
      <Link
        href={`/rikishi/${encodeURIComponent(row.rikishi_name)}`}
        className="font-sumo text-base font-bold tracking-wider hover:text-[#c0392b] transition-colors block leading-tight mb-1"
      >
        {displayName(row)}
      </Link>

      {/* 前場所番付 */}
      {prev && (
        <div className="text-[9px] text-[#1a1008]/30 mb-0.5">前: {rankLabel(prev)}</div>
      )}

      {/* 前場所成績 */}
      {wins !== null && losses !== null ? (
        <>
          <div className="text-[10px] text-[#1a1008]/40 mb-0.5">前場所成績</div>
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[#c0392b] font-bold text-sm">{wins}</span>
            <span className="text-[#1a1008]/40 text-[10px]">勝</span>
            <span className="text-[#1a1008]/60 font-medium text-sm">{losses}</span>
            <span className="text-[#1a1008]/40 text-[10px]">敗</span>
            {kyujo !== null && kyujo > 0 && (
              <>
                <span className="text-stone-400 font-medium text-sm">{kyujo}</span>
                <span className="text-stone-400 text-[10px]">休</span>
              </>
            )}
          </div>
          <div className="h-1 bg-stone-200 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-[#c0392b] rounded-full"
              style={{ width: `${winPct}%` }}
            />
          </div>
        </>
      ) : (
        <div className="h-6 mb-1.5" />
      )}

      {/* Badge + Confidence（確度は平幕のみ） */}
      <div className="flex items-center justify-between">
        <MovementBadge movement={movement} side="East" />
        {row.rank === "Maegashira" && (
          <span className="text-[10px] text-[#1a1008]/40">確度 {conf}%</span>
        )}
      </div>
    </div>
  );
}

function WestCard({
  row,
  prev,
  wl,
}: {
  row: BanzukeRow;
  prev?: BanzukeRow;
  wl?: { wins: number; losses: number; absences?: number };
}) {
  const movement = getMovement(row, prev);
  const conf = getConfidence(wl, movement);
  const wins = wl?.wins ?? null;
  const losses = wl?.losses ?? null;
  const is7bout = !["Makuuchi", "Juryo"].includes(row.division);
  const maxBouts = is7bout ? 7 : 15;
  const kyujo = wins !== null && losses !== null
    ? (is7bout ? (wl?.absences ?? 0) : Math.max(0, maxBouts - wins - losses))
    : null;
  const winPct = wins !== null ? Math.round((wins / maxBouts) * 100) : null;

  return (
    <div
      className="bg-white rounded-lg border border-stone-200 py-2 px-3 overflow-hidden"
      style={{ borderRight: "3px solid #1e3768" }}
    >
      <Link
        href={`/rikishi/${encodeURIComponent(row.rikishi_name)}`}
        className="font-sumo text-base font-bold tracking-wider hover:text-[#1e3768] transition-colors block text-right leading-tight mb-1"
      >
        {displayName(row)}
      </Link>

      {/* 前場所番付 */}
      {prev && (
        <div className="text-[9px] text-[#1a1008]/30 mb-0.5 text-right">前: {rankLabel(prev)}</div>
      )}

      {/* 前場所成績 */}
      {wins !== null && losses !== null ? (
        <>
          <div className="text-[10px] text-[#1a1008]/40 mb-0.5 text-right">前場所成績</div>
          <div className="flex items-center gap-1 mb-1.5 justify-end">
            <span className="text-[#1e3768] font-bold text-sm">{wins}</span>
            <span className="text-[#1a1008]/40 text-[10px]">勝</span>
            <span className="text-[#1a1008]/60 font-medium text-sm">{losses}</span>
            <span className="text-[#1a1008]/40 text-[10px]">敗</span>
            {kyujo !== null && kyujo > 0 && (
              <>
                <span className="text-stone-400 font-medium text-sm">{kyujo}</span>
                <span className="text-stone-400 text-[10px]">休</span>
              </>
            )}
          </div>
          <div className="h-1 bg-stone-200 rounded-full overflow-hidden mb-1.5 flex justify-end">
            <div
              className="h-full rounded-full"
              style={{ width: `${winPct}%`, background: "#1e3768" }}
            />
          </div>
        </>
      ) : (
        <div className="h-6 mb-1.5" />
      )}

      {/* Badge + Confidence（確度は平幕のみ） */}
      <div className="flex items-center justify-between flex-row-reverse">
        <MovementBadge movement={movement} side="West" />
        {row.rank === "Maegashira" && (
          <span className="text-[10px] text-[#1a1008]/40">確度 {conf}%</span>
        )}
      </div>
    </div>
  );
}

type Props = {
  rows: BanzukeRow[];
  prevRankObj: Record<string, BanzukeRow>;
  winLoss: WinLoss;
};

export default function BanzukeCards({ rows, prevRankObj, winLoss }: Props) {
  const grouped: Record<string, { east: BanzukeRow[]; west: BanzukeRow[] }> = {};
  for (const r of rows) {
    if (!grouped[r.rank]) grouped[r.rank] = { east: [], west: [] };
    if (r.side === "East") grouped[r.rank].east.push(r);
    else grouped[r.rank].west.push(r);
  }

  const rankOrder = Object.keys(grouped).sort(
    (a, b) => (RANK_ORDER[a] ?? 99) - (RANK_ORDER[b] ?? 99)
  );

  return (
    <div className="space-y-6">
      {rankOrder.map((rank) => {
        const { east, west } = grouped[rank];
        const maxRows = Math.max(east.length, west.length);

        return (
          <div key={rank}>
            {/* ランクグループ区切り */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1 h-px bg-stone-300" />
              <span className="font-sumo text-sm font-bold tracking-[0.4em] text-[#1a1008]/50 px-2">
                {(RANK_JA[rank] ?? rank).split("").join("　")}
              </span>
              <div className="flex-1 h-px bg-stone-300" />
            </div>

            <div className="space-y-2">
              {Array.from({ length: maxRows }).map((_, i) => {
                const eR = east[i];
                const wR = west[i];
                const centerRank = eR?.rank ?? wR?.rank ?? rank;
                const centerRankNum = eR?.rank_number ?? wR?.rank_number ?? 0;
                return (
                  <div
                    key={i}
                    style={{ display: "grid", gridTemplateColumns: "1fr 44px 1fr", gap: "4px" }}
                  >
                    <div>
                      {eR ? (
                        <EastCard
                          row={eR}
                          prev={prevRankObj[eR.rikishi_name]}
                          wl={winLoss[eR.rikishi_name]}
                        />
                      ) : (
                        <div />
                      )}
                    </div>

                    {/* 中央: 番付名・枚数（縦書き） */}
                    <div className="flex items-center justify-center">
                      <span
                        className="font-sumo text-[11px] font-medium text-[#1a1008]/45 tracking-widest select-none"
                        style={{ writingMode: "vertical-rl" }}
                      >
                        {rankCenterLabel(centerRank, centerRankNum)}
                      </span>
                    </div>

                    <div>
                      {wR ? (
                        <WestCard
                          row={wR}
                          prev={prevRankObj[wR.rikishi_name]}
                          wl={winLoss[wR.rikishi_name]}
                        />
                      ) : (
                        <div />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
