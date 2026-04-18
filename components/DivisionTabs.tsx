"use client";

import { useRouter } from "next/navigation";
import { DIVISIONS } from "@/lib/utils";

type Props = {
  currentDiv: string;
  basePath: string;  // "/" or "/banzuke"
  basho?: string;
};

export default function DivisionTabs({ currentDiv, basePath, basho }: Props) {
  const router = useRouter();

  function handleChange(divKey: string) {
    const params = new URLSearchParams();
    params.set("div", divKey);
    if (basho) params.set("basho", basho);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {DIVISIONS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handleChange(key)}
          className={`
            px-4 py-2 text-xs rounded-lg border transition-all tracking-wider
            ${currentDiv === key
              ? "bg-[#c0392b] text-white border-[#c0392b] font-bold shadow-sm"
              : "bg-white text-[#1a1008]/50 border-stone-200 hover:border-[#c0392b]/50 hover:text-[#c0392b]"
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
