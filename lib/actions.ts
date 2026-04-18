"use server";

import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

// Server-side only client（service key 使用）
function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, key);
}

export type BanzukeRow = {
  id: number;
  basho: string;
  division: string;
  side: "East" | "West";
  rank: string;
  rank_number: number;
  rikishi_name: string;
  rikishi_name_jp: string | null;
};

export async function getBanzuke(basho: string, division = "Makuuchi"): Promise<BanzukeRow[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("banzuke")
    .select("*")
    .eq("basho", basho)
    .eq("division", division)
    .order("rank_number", { ascending: true });

  if (error) throw new Error(error.message);

  // 同一スロット (side + rank + rank_number) の重複を除去（idが最小の行を優先）
  const seen = new Set<string>();
  const deduped = (data ?? []).filter((r) => {
    const key = `${r.side}-${r.rank}-${r.rank_number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped as BanzukeRow[];
}

// ─── 力士プロフィール（sumodb） ────────────────────────────────────────────

export type RikishiProfile = {
  realName: string | null;
  birthDate: string | null;
  shusshin: string | null;
  heya: string | null;
  height: string | null;
  weight: string | null;
  hatsudohyo: string | null;
  intai: string | null;
  highestRank: string | null;
};

export const getRikishiProfile = cache(async (rikishiName: string): Promise<RikishiProfile | null> => {
  // progress_sumodb.json から r_id を取得
  let rId: number | null = null;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "..", "progress_sumodb.json");
    const prog = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    rId = prog.en_to_rid?.[rikishiName] ?? null;
  } catch {
    return null;
  }
  if (!rId) return null;

  // sumodb rikishi ページ取得
  let html = "";
  try {
    const r = await fetch(
      `https://sumodb.sumogames.de/Rikishi.aspx?r=${rId}&l=e`,
      { headers: { "User-Agent": "sumo-banzuke-ai/1.0 (educational)" }, next: { revalidate: 86400 * 7 } }
    );
    if (!r.ok) return null;
    html = await r.text();
  } catch {
    return null;
  }

  // テキストセグメントを解析
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const segs: string[] = [];
  for (const m of html.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)) {
    const text = stripTags(m[1]);
    if (text) segs.push(text);
  }

  function after(label: string): string | null {
    const idx = segs.findIndex((s) => s === label);
    return idx >= 0 ? segs[idx + 1] ?? null : null;
  }

  const hw = after("Height and Weight");
  const [height, weight] = hw ? hw.split(" ").filter((s) => s.includes("cm") || s.includes("kg")) : [null, null];

  return {
    realName:    after("Real Name"),
    birthDate:   after("Birth Date"),
    shusshin:    after("Shusshin"),
    heya:        after("Heya"),
    height:      height ?? null,
    weight:      weight ?? null,
    hatsudohyo:  after("Hatsu Dohyo"),
    intai:       after("Intai"),
    highestRank: after("Highest Rank"),
  };
});

export async function getRikishiHistory(rikishiName: string): Promise<BanzukeRow[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("banzuke")
    .select("*")
    .eq("rikishi_name", rikishiName)
    .eq("division", "Makuuchi")
    .order("basho", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as BanzukeRow[];
}

// ─── 勝敗・優勝者データ ────────────────────────────────────────────────────

export type TorikumiEntry = {
  day: number;
  matchNo: number;
  eastId: number;
  eastShikona: string;
  westId: number;
  westShikona: string;
  kimarite: string | null;
  winnerId: number | null;
};

export type YushoEntry = {
  type: string;
  rikishiId: number;
  shikonaEn: string;
  shikonaJp: string;
};

export type SanshoEntry = {
  type: string;
  rikishiId: number;
  shikonaEn: string;
  shikonaJp: string;
};

export type BashoResultsData = {
  yusho: YushoEntry[];
  specialPrizes: SanshoEntry[];
  torikumi: TorikumiEntry[];
};

const API_HEADERS = { "User-Agent": "sumo-banzuke-ai/1.0 (educational)" };

export async function getBashoResults(basho: string, division: string): Promise<BashoResultsData> {
  // 全15日を並列取得
  const dayResults = await Promise.all(
    Array.from({ length: 15 }, (_, i) => i + 1).map(async (day) => {
      try {
        const r = await fetch(
          `https://sumo-api.com/api/basho/${basho}/torikumi/${division}/${day}`,
          { headers: API_HEADERS, next: { revalidate: 86400 } }
        );
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    })
  );

  const firstValid = dayResults.find((d) => d !== null);
  const yusho: YushoEntry[] = firstValid?.yusho ?? [];
  const specialPrizes: SanshoEntry[] = firstValid?.specialPrizes ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const torikumi: TorikumiEntry[] = dayResults
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap((d: any) => d.torikumi ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((b: any) => ({
      day: b.day,
      matchNo: b.matchNo,
      eastId: b.eastId,
      eastShikona: b.eastShikona,
      westId: b.westId,
      westShikona: b.westShikona,
      kimarite: b.kimarite ?? null,
      winnerId: b.winnerId ?? null,
    }));

  return { yusho, specialPrizes, torikumi };
}

// ─── 力士別取組詳細 ────────────────────────────────────────────────────────

export type BoutDetail = {
  day: number;
  opponent: string;
  result: "win" | "loss" | null;
  kimarite: string | null;
};

export const getWrestlerBouts = cache(async (
  basho: string,
  rikishiName: string,
  division: string,
): Promise<BoutDetail[]> => {
  const supabase = getServerClient();

  // Supabase torikumi テーブルから取得
  const { data: dbData, error } = await supabase
    .from("torikumi")
    .select("day, east_name, west_name, kimarite, winner")
    .eq("basho", basho)
    .or(`east_name.eq.${rikishiName},west_name.eq.${rikishiName}`)
    .order("day");

  if (!error && dbData && dbData.length > 0) {
    return dbData.map((b) => {
      const isEast = b.east_name === rikishiName;
      const won = b.winner === null ? null : b.winner === (isEast ? "East" : "West");
      return {
        day:      b.day,
        opponent: isEast ? b.west_name : b.east_name,
        result:   won === null ? null : won ? "win" : "loss",
        kimarite: b.kimarite ?? null,
      };
    });
  }

  // フォールバック: sumo-api.com から取得
  const bashoData = await getBashoResults(basho, division);
  return bashoData.torikumi
    .filter((b) => b.eastShikona === rikishiName || b.westShikona === rikishiName)
    .map((b) => {
      const isEast = b.eastShikona === rikishiName;
      const won = b.winnerId === null ? null
        : isEast ? b.winnerId === b.eastId
                 : b.winnerId === b.westId;
      const result: "win" | "loss" | null = won === null ? null : won ? "win" : "loss";
      return {
        day:      b.day,
        opponent: isEast ? b.westShikona : b.eastShikona,
        result,
        kimarite: b.kimarite,
      };
    })
    .sort((a, b) => a.day - b.day);
});

// ─── 力士別場所成績（勝敗数）────────────────────────────────────────────────

export type BashoWinLoss = Record<string, { wins: number; losses: number }>;

export async function getRikishiWinLoss(rikishiName: string): Promise<BashoWinLoss> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("torikumi")
    .select("basho, east_name, west_name, winner")
    .or(`east_name.eq.${rikishiName},west_name.eq.${rikishiName}`);

  if (error || !data) return {};

  const result: BashoWinLoss = {};
  for (const b of data) {
    if (!result[b.basho]) result[b.basho] = { wins: 0, losses: 0 };
    const isEast = b.east_name === rikishiName;
    const won = b.winner === (isEast ? "East" : "West");
    if (b.winner !== null) {
      if (won) result[b.basho].wins++;
      else result[b.basho].losses++;
    }
  }
  return result;
}

// ─── 特定場所の全力士勝敗一括取得 ────────────────────────────────────────────

export async function getBashoAllWinLoss(
  basho: string
): Promise<Record<string, { wins: number; losses: number }>> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("torikumi")
    .select("east_name, west_name, winner")
    .eq("basho", basho);

  if (error || !data) return {};

  const result: Record<string, { wins: number; losses: number }> = {};
  for (const b of data) {
    if (!result[b.east_name]) result[b.east_name] = { wins: 0, losses: 0 };
    if (!result[b.west_name]) result[b.west_name] = { wins: 0, losses: 0 };
    if (b.winner === "East") {
      result[b.east_name].wins++;
      result[b.west_name].losses++;
    } else if (b.winner === "West") {
      result[b.west_name].wins++;
      result[b.east_name].losses++;
    }
  }
  return result;
}

export async function getAvailableBashos(): Promise<string[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("banzuke")
    .select("basho")
    .eq("division", "Makuuchi")
    .order("basho", { ascending: false });

  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  return (data ?? []).filter((r) => {
    if (seen.has(r.basho)) return false;
    seen.add(r.basho);
    return true;
  }).map((r) => r.basho);
}
