"use client";

import Link from "next/link";
import { BanzukeRow, RANK_ORDER, RANK_JA, RANK_COLORS, displayName } from "@/lib/utils";

type Props = {
  rows: BanzukeRow[];
  isPredicted?: boolean;
};

export default function BanzukeTable({ rows, isPredicted }: Props) {
  const sorted = [...rows].sort((a, b) => {
    const ro = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
    return ro !== 0 ? ro : a.rank_number - b.rank_number;
  });

  const grouped: Record<string, { east: BanzukeRow[]; west: BanzukeRow[] }> = {};
  for (const r of sorted) {
    if (!grouped[r.rank]) grouped[r.rank] = { east: [], west: [] };
    if (r.side === "East") grouped[r.rank].east.push(r);
    else grouped[r.rank].west.push(r);
  }

  const rankOrder = Object.keys(grouped).sort(
    (a, b) => (RANK_ORDER[a] ?? 99) - (RANK_ORDER[b] ?? 99)
  );

  return (
    <div className="w-full">
      {isPredicted && (
        <p className="text-center text-[11px] text-[#c0392b] mb-3 tracking-widest">
          ※ 統計モデルによる予測番付です
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 340 }}>
          <thead>
            <tr>
              <th className="w-[44%] text-right pr-4 pb-3">
                <span className="text-lg font-bold tracking-[0.3em] text-[#c0392b]">東</span>
              </th>
              <th className="w-[12%] pb-3" />
              <th className="w-[44%] text-left pl-4 pb-3">
                <span className="text-lg font-bold tracking-[0.3em] text-[#c0392b]">西</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rankOrder.map((rank) => {
              const { east, west } = grouped[rank];
              const maxRows = Math.max(east.length, west.length);

              return Array.from({ length: maxRows }).map((_, i) => {
                const eR = east[i];
                const wR = west[i];
                const rankNum = eR?.rank_number ?? wR?.rank_number ?? 1;
                const isFirst = i === 0;

                return (
                  <tr
                    key={`${rank}-${i}`}
                    className={`
                      border-b border-stone-200
                      ${isFirst ? "border-t border-t-stone-300" : ""}
                    `}
                  >
                    {/* 東 */}
                    <td className="py-[5px] pr-2 text-right">
                      {eR && (
                        <Link
                          href={`/rikishi/${encodeURIComponent(eR.rikishi_name)}`}
                          className={`
                            inline-flex items-center gap-1 px-3 py-1 rounded border text-sm
                            font-medium transition-opacity hover:opacity-60
                            ${RANK_COLORS[rank]}
                          `}
                        >
                          {displayName(eR)}
                        </Link>
                      )}
                    </td>

                    {/* 番付ラベル */}
                    <td className="py-[5px] text-center whitespace-nowrap">
                      {isFirst ? (
                        <span className="inline-block bg-[#c0392b] text-white text-[11px] font-bold px-2 py-0.5 rounded tracking-wider">
                          {RANK_JA[rank] ?? rank}
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400 tabular-nums">
                          {rankNum}
                        </span>
                      )}
                    </td>

                    {/* 西 */}
                    <td className="py-[5px] pl-2 text-left">
                      {wR && (
                        <Link
                          href={`/rikishi/${encodeURIComponent(wR.rikishi_name)}`}
                          className={`
                            inline-flex items-center gap-1 px-3 py-1 rounded border text-sm
                            font-medium transition-opacity hover:opacity-60
                            ${RANK_COLORS[rank]}
                          `}
                        >
                          {displayName(wR)}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
