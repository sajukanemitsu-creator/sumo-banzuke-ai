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
            px-3 py-1.5 text-sm rounded border transition-all tracking-wider
            ${currentDiv === key
              ? "bg-[#c0392b] text-white border-[#c0392b] font-bold"
              : "bg-white/50 text-[#1a1008]/60 border-stone-300 hover:border-[#c0392b] hover:text-[#c0392b]"
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
