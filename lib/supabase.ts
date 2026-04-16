import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type BanzukeRow = {
  id: number;
  basho: string;
  side: "East" | "West";
  rank: "Yokozuna" | "Ozeki" | "Sekiwake" | "Komusubi" | "Maegashira";
  rank_number: number;
  rikishi_name: string;
};

export const RANK_ORDER: Record<string, number> = {
  Yokozuna: 1,
  Ozeki: 2,
  Sekiwake: 3,
  Komusubi: 4,
  Maegashira: 5,
};

export const RANK_JA: Record<string, string> = {
  Yokozuna: "横綱",
  Ozeki: "大関",
  Sekiwake: "関脇",
  Komusubi: "小結",
  Maegashira: "前頭",
};

export function bashoLabel(basho: string): string {
  const year = basho.slice(0, 4);
  const month = parseInt(basho.slice(4));
  const tournamentNames: Record<number, string> = {
    1: "初場所",
    3: "春場所",
    5: "夏場所",
    7: "名古屋場所",
    9: "秋場所",
    11: "九州場所",
  };
  return `${year}年 ${tournamentNames[month] ?? month + "月場所"}`;
}

export async function fetchBanzuke(basho: string): Promise<BanzukeRow[]> {
  const { data, error } = await supabase
    .from("banzuke")
    .select("*")
    .eq("basho", basho)
    .order("rank_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchRikishiHistory(
  rikishiName: string
): Promise<BanzukeRow[]> {
  const { data, error } = await supabase
    .from("banzuke")
    .select("*")
    .eq("rikishi_name", rikishiName)
    .order("basho", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function rankValue(row: BanzukeRow): number {
  return RANK_ORDER[row.rank] * 1000 + row.rank_number * 2 + (row.side === "East" ? 0 : 1);
}

export function rankLabel(row: BanzukeRow): string {
  if (row.rank === "Maegashira") {
    return `前頭${row.rank_number}`;
  }
  return RANK_JA[row.rank] ?? row.rank;
}
