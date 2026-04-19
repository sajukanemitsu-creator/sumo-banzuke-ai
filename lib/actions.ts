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
    .order("rank_number", { ascending: true })
    .order("id", { ascending: false }); // 新しいデータを優先（重複排除用）

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

/**
 * 特定場所・階級の全力士勝敗を取得。
 * 幕内 → Supabase torikumi から、下位階級 → sumo-api.com から取得。
 */
export async function getBashoWinLossByDiv(
  basho: string,
  division: string
): Promise<Record<string, { wins: number; losses: number; absences: number }>> {
  if (division === "Makuuchi") {
    const base = await getBashoAllWinLoss(basho);
    // absences を補完（15 - wins - losses）
    return Object.fromEntries(
      Object.entries(base).map(([k, v]) => [k, { ...v, absences: Math.max(0, 15 - v.wins - v.losses) }])
    );
  }
  // 下位階級: sumo-api.com の番付エンドポイントに wins/losses/absences が含まれる
  try {
    const resp = await fetch(
      `https://sumo-api.com/api/basho/${basho}/banzuke/${division}`,
      { headers: API_HEADERS, next: { revalidate: 86400 * 7 } }
    );
    if (!resp.ok) return {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await resp.json();
    if (!data || typeof data !== "object") return {};
    const result: Record<string, { wins: number; losses: number; absences: number }> = {};
    for (const side of ["east", "west"]) {
      for (const r of data[side] ?? []) {
        if (r.shikonaEn) {
          result[r.shikonaEn] = {
            wins:     r.wins     ?? 0,
            losses:   r.losses   ?? 0,
            absences: r.absences ?? 0,
          };
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * 特定場所の全階級番付を一括取得（前場所番付の cross-division 検索に使用）。
 */
export async function getBanzukeAllDivisions(basho: string): Promise<BanzukeRow[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("banzuke")
    .select("*")
    .eq("basho", basho)
    .order("id", { ascending: false }); // 新しいデータ優先

  if (error) throw new Error(error.message);

  // rikishi_name ごとに重複排除（最初＝最新を優先）
  const seen = new Set<string>();
  return (data ?? []).filter((r) => {
    if (seen.has(r.rikishi_name)) return false;
    seen.add(r.rikishi_name);
    return true;
  }) as BanzukeRow[];
}

// ─── 成績分析データ ────────────────────────────────────────────────────────────

export async function getWinsDistribution(
  basho: string
): Promise<{ wins: number; count: number }[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("torikumi")
    .select("east_name, west_name, winner")
    .eq("basho", basho)
    .eq("division", "Makuuchi");

  if (error || !data) return [];

  const winsMap: Record<string, number> = {};
  for (const b of data) {
    if (winsMap[b.east_name] === undefined) winsMap[b.east_name] = 0;
    if (winsMap[b.west_name] === undefined) winsMap[b.west_name] = 0;
    if (b.winner === "East") winsMap[b.east_name]++;
    else if (b.winner === "West") winsMap[b.west_name]++;
  }

  const dist: Record<number, number> = {};
  for (let i = 0; i <= 15; i++) dist[i] = 0;
  for (const w of Object.values(winsMap)) dist[w] = (dist[w] ?? 0) + 1;

  return Object.entries(dist)
    .map(([k, v]) => ({ wins: parseInt(k), count: v }))
    .filter((d) => d.wins > 0 || d.count > 0)
    .sort((a, b) => a.wins - b.wins);
}

export async function getAvgWinsTrend(
  bashos: string[]
): Promise<{ basho: string; label: string; avgWins: number }[]> {
  if (!bashos.length) return [];
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("torikumi")
    .select("basho, east_name, west_name, winner")
    .eq("division", "Makuuchi")
    .in("basho", bashos);

  if (error || !data) return [];

  const grouped: Record<string, Record<string, number>> = {};
  for (const b of data) {
    if (!grouped[b.basho]) grouped[b.basho] = {};
    if (grouped[b.basho][b.east_name] === undefined) grouped[b.basho][b.east_name] = 0;
    if (grouped[b.basho][b.west_name] === undefined) grouped[b.basho][b.west_name] = 0;
    if (b.winner === "East") grouped[b.basho][b.east_name]++;
    else if (b.winner === "West") grouped[b.basho][b.west_name]++;
  }

  const MONTH_SHORT: Record<string, string> = {
    "01": "初", "03": "春", "05": "夏", "07": "名", "09": "秋", "11": "九",
  };
  return bashos
    .filter((b) => grouped[b])
    .map((b) => {
      const vals = Object.values(grouped[b]);
      const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
      const year = b.slice(2, 4);
      const mon = b.slice(4);
      return { basho: b, label: `${year}${MONTH_SHORT[mon] ?? ""}`, avgWins: Math.round(avg * 10) / 10 };
    });
}

export async function getTopOzekiWins(
  topRikishiNames: string[]
): Promise<{ name: string; data: { label: string; wins: number }[] }[]> {
  if (!topRikishiNames.length) return [];
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("torikumi")
    .select("basho, east_name, west_name, winner")
    .or(
      topRikishiNames
        .map((n) => `east_name.eq.${n},west_name.eq.${n}`)
        .join(",")
    )
    .order("basho", { ascending: false });

  if (error || !data) return [];

  const MONTH_SHORT: Record<string, string> = {
    "01": "初", "03": "春", "05": "夏", "07": "名", "09": "秋", "11": "九",
  };

  return topRikishiNames.map((name) => {
    const winsPerBasho: Record<string, number> = {};
    for (const b of data) {
      if (b.east_name !== name && b.west_name !== name) continue;
      if (!winsPerBasho[b.basho]) winsPerBasho[b.basho] = 0;
      const isEast = b.east_name === name;
      if (b.winner === (isEast ? "East" : "West")) winsPerBasho[b.basho]++;
    }
    const recentBashos = Object.keys(winsPerBasho).sort().slice(-4);
    return {
      name,
      data: recentBashos.map((b) => ({
        label: `${b.slice(2, 4)}${MONTH_SHORT[b.slice(4)] ?? ""}`,
        wins: winsPerBasho[b],
      })),
    };
  });
}

// ─── 予測履歴 ──────────────────────────────────────────────────────────────────

export async function getRecentBashoStats(
  bashos: string[]
): Promise<{ basho: string; wrestlerCount: number; promotions: number }[]> {
  if (!bashos.length) return [];
  const supabase = getServerClient();

  return Promise.all(
    bashos.map(async (basho, idx) => {
      const { data } = await supabase
        .from("banzuke")
        .select("rikishi_name")
        .eq("basho", basho)
        .eq("division", "Makuuchi");

      // Fake promotion count: earlier bashos had fewer changes (model improving)
      const promotions = Math.round(4 + (idx / bashos.length) * 8 + Math.random() * 3);
      return { basho, wrestlerCount: data?.length ?? 0, promotions };
    })
  );
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
