"use server";

import { createClient } from "@supabase/supabase-js";

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
