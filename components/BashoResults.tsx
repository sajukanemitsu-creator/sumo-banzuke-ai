"use client";

import { useState, useTransition } from "react";
import { getBashoResults, BashoResultsData } from "@/lib/actions";
import { BanzukeRow, RANK_ORDER, DIVISIONS, displayName } from "@/lib/utils";

const SANSHO_LABELS: Record<string, string> = {
  "Shukun-sho": "殊勲賞",
  "Kanto-sho":  "敢闘賞",
  "Gino-sho":   "技能賞",
};
const SANSHO_ORDER = ["Shukun-sho", "Kanto-sho", "Gino-sho"];

function cleanJp(jp: string): string {
  if (!jp) return "";
  const p = jp.indexOf("（");
  if (p >= 0) jp = jp.slice(0, p);
  const s = jp.indexOf("\u3000");
  if (s >= 0) jp = jp.slice(0, s);
  return jp.trim();
}

type BoutResult = { result: "win" | "loss"; opponent: string; kimarite: string | null };

type Props = { basho: string; division: string; rows: BanzukeRow[] };

export default function BashoResults({ basho, division, rows }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData]         = useState<BashoResultsData | null>(null);
  const [err, setErr]           = useState("");
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (!expanded && !data) {
      startTransition(async () => {
        try {
          const result = await getBashoResults(basho, division);
          setData(result);
          setExpanded(true);
        } catch (e) {
          setErr(String(e));
        }
      });
    } else {
      setExpanded((v) => !v);
    }
  }

  // 力士名マップ（英語→表示名）
  const nameMap = new Map(rows.map((r) => [r.rikishi_name, displayName(r)]));

  // 番付順にソート
  const sortedRows = [...rows].sort((a, b) => {
    const av = RANK_ORDER[a.rank] * 1000 + a.rank_number * 2 + (a.side === "East" ? 0 : 1);
    const bv = RANK_ORDER[b.rank] * 1000 + b.rank_number * 2 + (b.side === "East" ? 0 : 1);
    return av - bv;
  });

  // 勝敗マップ: rikishi_name → Map<day, BoutResult>
  const boutsMap = new Map<string, Map<number, BoutResult>>();
  if (data) {
    for (const b of data.torikumi) {
      if (b.winnerId === null) continue;
      const eastWon = b.winnerId === b.eastId;
      const westWon = b.winnerId === b.westId;

      if (!boutsMap.has(b.eastShikona)) boutsMap.set(b.eastShikona, new Map());
      boutsMap.get(b.eastShikona)!.set(b.day, {
        result:   eastWon ? "win" : "loss",
        opponent: b.westShikona,
        kimarite: b.kimarite,
      });

      if (!boutsMap.has(b.westShikona)) boutsMap.set(b.westShikona, new Map());
      boutsMap.get(b.westShikona)!.set(b.day, {
        result:   westWon ? "win" : "loss",
        opponent: b.eastShikona,
        kimarite: b.kimarite,
      });
    }
  }

  const maxDay = data && data.torikumi.length > 0
    ? Math.max(...data.torikumi.map((t) => t.day))
    : 15;
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  // 三賞をtype別にグループ化
  const sanshoByType = new Map<string, string[]>();
  if (data) {
    for (const p of data.specialPrizes) {
      const name = cleanJp(p.shikonaJp) || p.shikonaEn;
      if (!sanshoByType.has(p.type)) sanshoByType.set(p.type, []);
      sanshoByType.get(p.type)!.push(name);
    }
  }

  const hasData = data && (data.torikumi.length > 0 || data.yusho.length > 0);
  const divLabel = DIVISIONS.find((d) => d.key === division)?.label ?? division;

  return (
    <div className="mt-4">
      {/* トグルボタン */}
      <div className="flex justify-center">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="px-6 py-2 text-sm border border-[#c0392b]/40 rounded text-[#c0392b]
                     hover:bg-[#c0392b]/5 transition-colors tracking-wider disabled:opacity-50"
        >
          {isPending ? "読み込み中..." : expanded ? "▲ 閉じる" : "▼ 勝敗・優勝者を表示"}
        </button>
      </div>

      {err && <p className="text-center text-red-500 text-sm mt-2">{err}</p>}

      {expanded && data && (
        <div className="mt-4 space-y-4">
          {!hasData && (
            <p className="text-center text-[#1a1008]/40 text-sm py-4">
              この場所の勝敗データはまだありません
            </p>
          )}

          {/* 各段優勝 */}
          {data.yusho.length > 0 && (
            <div className="bg-white/60 rounded-lg border border-stone-200 p-4">
              <h3 className="text-xs font-bold tracking-widest text-[#1a1008]/50 mb-3 uppercase">各段優勝</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
                {data.yusho.map((y, i) => {
                  const dl = DIVISIONS.find((d) => d.key === y.type)?.label ?? y.type;
                  const name = cleanJp(y.shikonaJp) || y.shikonaEn;
                  return (
                    <div key={i} className="flex items-baseline gap-2">
                      <span className="text-xs text-[#1a1008]/40 w-10 shrink-0">{dl}</span>
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 三賞 */}
          {sanshoByType.size > 0 && (
            <div className="bg-white/60 rounded-lg border border-stone-200 p-4">
              <h3 className="text-xs font-bold tracking-widest text-[#1a1008]/50 mb-3 uppercase">三賞</h3>
              <div className="space-y-1.5">
                {SANSHO_ORDER.map((type) => {
                  const winners = sanshoByType.get(type) ?? [];
                  return (
                    <div key={type} className="flex items-baseline gap-3">
                      <span className="text-xs text-[#1a1008]/40 w-14 shrink-0">{SANSHO_LABELS[type]}</span>
                      <span className="text-sm">
                        {winners.length > 0
                          ? winners.join(" / ")
                          : <span className="text-[#1a1008]/20">—</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 勝敗表 */}
          {data.torikumi.length > 0 && (
            <div className="bg-white/60 rounded-lg border border-stone-200 p-4">
              <h3 className="text-xs font-bold tracking-widest text-[#1a1008]/50 mb-3 uppercase">
                {divLabel} 十五日間勝敗
              </h3>
              <div className="overflow-x-auto -mx-1">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="sticky left-0 bg-white text-left px-2 py-1.5 font-medium text-[#1a1008]/40 min-w-[72px]">力士</th>
                      {days.map((d) => (
                        <th key={d} className="px-1 py-1.5 text-center text-[#1a1008]/30 font-normal min-w-[22px]">{d}</th>
                      ))}
                      <th className="px-2 py-1.5 text-center text-[#c0392b]/60 font-bold">勝</th>
                      <th className="px-2 py-1.5 text-center text-stone-400 font-medium">敗</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => {
                      const bouts = boutsMap.get(row.rikishi_name) ?? new Map<number, BoutResult>();
                      const wins   = [...bouts.values()].filter((b) => b.result === "win").length;
                      const losses = [...bouts.values()].filter((b) => b.result === "loss").length;
                      return (
                        <tr key={row.id} className="group border-b border-stone-100">
                          <td className="sticky left-0 bg-white group-hover:bg-stone-50 px-2 py-1 whitespace-nowrap font-medium">
                            {displayName(row)}
                          </td>
                          {days.map((day) => {
                            const bout = bouts.get(day);
                            if (!bout) {
                              return <td key={day} className="px-1 py-1 text-center text-stone-200 group-hover:bg-stone-50/50">—</td>;
                            }
                            const isWin = bout.result === "win";
                            const oppName = nameMap.get(bout.opponent) ?? bout.opponent;
                            const tip = `${oppName}${bout.kimarite ? ` (${bout.kimarite})` : ""}`;
                            return (
                              <td key={day} className="px-1 py-1 text-center cursor-default group-hover:bg-stone-50/50" title={tip}>
                                <span className={isWin ? "text-[#c0392b] font-bold" : "text-stone-400"}>
                                  {isWin ? "○" : "●"}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-1 text-center font-bold text-[#c0392b]">{wins > 0 ? wins : ""}</td>
                          <td className="px-2 py-1 text-center text-stone-400">{losses > 0 ? losses : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
