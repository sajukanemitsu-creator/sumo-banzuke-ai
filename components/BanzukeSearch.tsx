"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BASHO_MONTHS, MONTH_NAMES, DIVISIONS } from "@/lib/utils";

const START_YEAR = 1958;
const END_YEAR   = 2026;
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => END_YEAR - i);

const SELECT_CLASS =
  "w-full px-3 py-2 border border-stone-300 rounded bg-[#f7f0e3] text-sm " +
  "focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]/30 " +
  "appearance-none cursor-pointer";

type Props = {
  currentBasho?: string;
  currentDiv: string;
};

export default function BanzukeSearch({ currentBasho, currentDiv }: Props) {
  const router = useRouter();
  const initYear  = currentBasho ? parseInt(currentBasho.slice(0, 4)) : END_YEAR;
  const initMonth = currentBasho ? parseInt(currentBasho.slice(4)) : 3;

  const [year,  setYear]  = useState(initYear);
  const [month, setMonth] = useState(initMonth);
  const [div,   setDiv]   = useState(currentDiv);

  function handleSearch() {
    const basho = `${year}${String(month).padStart(2, "0")}`;
    router.push(`/banzuke?basho=${basho}&div=${div}`);
  }

  return (
    <div className="bg-white/50 rounded-xl border border-stone-200 p-5 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end justify-center">

        {/* 年 */}
        <div className="flex flex-col gap-1 min-w-[90px]">
          <label className="text-xs text-[#1a1008]/50 tracking-wider">年</label>
          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={SELECT_CLASS}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">▼</span>
          </div>
        </div>

        {/* 場所 */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs text-[#1a1008]/50 tracking-wider">場所</label>
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={SELECT_CLASS}
            >
              {BASHO_MONTHS.map((m) => (
                <option key={m} value={m}>{MONTH_NAMES[m]}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">▼</span>
          </div>
        </div>

        {/* 階級 */}
        <div className="flex flex-col gap-1 min-w-[110px]">
          <label className="text-xs text-[#1a1008]/50 tracking-wider">階級</label>
          <div className="relative">
            <select
              value={div}
              onChange={(e) => setDiv(e.target.value)}
              className={SELECT_CLASS}
            >
              {DIVISIONS.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">▼</span>
          </div>
        </div>

        {/* 検索ボタン */}
        <button
          onClick={handleSearch}
          className="px-7 py-2 bg-[#c0392b] text-white text-sm rounded hover:bg-[#a93226]
                     transition-colors tracking-widest font-bold self-end"
        >
          検索
        </button>
      </div>
    </div>
  );
}
