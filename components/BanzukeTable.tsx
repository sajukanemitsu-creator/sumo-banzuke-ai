"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BanzukeRow, RANK_ORDER, RANK_JA, RANK_COLORS, displayName, DIVISIONS } from "@/lib/utils";
import { getWrestlerBouts, BoutDetail } from "@/lib/actions";

type ModalState = {
  row: BanzukeRow;
  bouts: BoutDetail[];
} | null;

type Props = {
  rows: BanzukeRow[];
  isPredicted?: boolean;
  basho?: string;
  division?: string;
};

const UPPER_DIVS = new Set(["Makuuchi", "Juryo"]);

function BoutModal({
  row,
  bouts,
  onClose,
  division,
}: {
  row: BanzukeRow;
  bouts: BoutDetail[];
  onClose: () => void;
  division?: string;
}) {
  const maxDay = UPPER_DIVS.has(row.division || division || "Makuuchi") ? 15 : 13;
  const boutMap = new Map(bouts.map((b) => [b.day, b]));
  const wins   = bouts.filter((b) => b.result === "win").length;
  const losses = bouts.filter((b) => b.result === "loss").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-[#faf6ef] rounded-xl border border-stone-200 shadow-xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div>
            <p className="text-lg font-bold tracking-wider">{displayName(row)}</p>
            <p className="text-xs text-[#1a1008]/40 mt-0.5">
              {wins}勝 {losses}敗
              {UPPER_DIVS.has(row.division || division || "Makuuchi") && wins + losses < maxDay
                ? ` ${maxDay - wins - losses}休` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#1a1008]/30 hover:text-[#1a1008]/60 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* 取組リスト */}
        <div className="overflow-y-auto max-h-[60vh] divide-y divide-stone-100">
          {bouts.length === 0 ? (
            <p className="text-center text-[#1a1008]/30 text-sm py-8">
              取組データがありません
            </p>
          ) : (
            Array.from({ length: maxDay }, (_, i) => i + 1).map((day) => {
              const bout = boutMap.get(day);
              if (!bout) {
                const isUpper = UPPER_DIVS.has(row.division || division || "Makuuchi");
                if (!isUpper) return null; // 下位階級の空き日はスキップ
                return (
                  <div key={day} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="text-xs text-[#1a1008]/30 w-8 shrink-0 tabular-nums">{day}日目</span>
                    <span className="text-xs text-stone-300">休場</span>
                  </div>
                );
              }
              return (
                <div key={day} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="text-xs text-[#1a1008]/30 w-8 shrink-0 tabular-nums">{day}日目</span>
                  <span className={`font-bold text-sm w-4 ${bout.result === "win" ? "text-[#c0392b]" : "text-stone-400"}`}>
                    {bout.result === "win" ? "○" : bout.result === "loss" ? "●" : "—"}
                  </span>
                  <span className="text-sm flex-1">{bout.opponent}</span>
                  {bout.kimarite && (
                    <span className="text-[10px] text-[#1a1008]/30">{bout.kimarite}</span>
                  )}
                </div>
              );
            }).filter(Boolean)
          )}
        </div>
      </div>
    </div>
  );
}

export default function BanzukeTable({ rows, isPredicted, basho, division }: Props) {
  const [modal, setModal]   = useState<ModalState>(null);
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  function handleDetail(row: BanzukeRow) {
    if (!basho) return;
    const div = division ?? row.division ?? "Makuuchi";
    setLoadingName(row.rikishi_name);
    startTransition(async () => {
      const bouts = await getWrestlerBouts(basho, row.rikishi_name, div);
      setModal({ row, bouts });
      setLoadingName(null);
    });
  }

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

  function WrestlerCell({ row, align }: { row: BanzukeRow; align: "left" | "right" }) {
    const isLoading = loadingName === row.rikishi_name && isPending;
    return (
      <div className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <Link
          href={`/rikishi/${encodeURIComponent(row.rikishi_name)}`}
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded border text-sm
            font-medium transition-opacity hover:opacity-60
            ${RANK_COLORS[row.rank]}
          `}
        >
          {displayName(row)}
        </Link>
        {basho && (
          <button
            onClick={() => handleDetail(row)}
            disabled={isLoading}
            title="対戦詳細"
            className="text-[10px] text-[#1a1008]/25 hover:text-[#c0392b] transition-colors px-1 disabled:opacity-40"
          >
            {isLoading ? "…" : "詳"}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {modal && (
        <BoutModal
          row={modal.row}
          bouts={modal.bouts}
          onClose={() => setModal(null)}
          division={division}
        />
      )}

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
                      className={`border-b border-stone-200 ${isFirst ? "border-t border-t-stone-300" : ""}`}
                    >
                      {/* 東 */}
                      <td className="py-[5px] pr-2 text-right">
                        {eR && <WrestlerCell row={eR} align="right" />}
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
                        {wR && <WrestlerCell row={wR} align="left" />}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
