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

export const RANK_ORDER: Record<string, number> = {
  Yokozuna: 1, Ozeki: 2, Sekiwake: 3, Komusubi: 4, Maegashira: 5,
  Juryo: 6, Makushita: 7, Sandanme: 8, Jonidan: 9, Jonokuchi: 10,
};

export const RANK_JA: Record<string, string> = {
  Yokozuna: "横綱", Ozeki: "大関", Sekiwake: "関脇", Komusubi: "小結",
  Maegashira: "前頭", Juryo: "十両", Makushita: "幕下",
  Sandanme: "三段目", Jonidan: "序二段", Jonokuchi: "序ノ口",
};

export const DIVISIONS = [
  { key: "Makuuchi",  label: "幕内" },
  { key: "Juryo",     label: "十両" },
  { key: "Makushita", label: "幕下" },
  { key: "Sandanme",  label: "三段目" },
  { key: "Jonidan",   label: "序二段" },
  { key: "Jonokuchi", label: "序ノ口" },
];

export const RANK_COLORS: Record<string, string> = {
  Yokozuna:   "bg-amber-50  border-amber-400  text-amber-900",
  Ozeki:      "bg-orange-50 border-orange-400 text-orange-900",
  Sekiwake:   "bg-emerald-50 border-emerald-500 text-emerald-900",
  Komusubi:   "bg-sky-50    border-sky-400    text-sky-900",
  Maegashira: "bg-stone-50  border-stone-300  text-stone-800",
  Juryo:      "bg-indigo-50 border-indigo-300 text-indigo-800",
  Makushita:  "bg-stone-50  border-stone-300  text-stone-700",
  Sandanme:   "bg-stone-50  border-stone-200  text-stone-600",
  Jonidan:    "bg-stone-50  border-stone-200  text-stone-600",
  Jonokuchi:  "bg-stone-50  border-stone-200  text-stone-600",
};

export const BASHO_MONTHS = [1, 3, 5, 7, 9, 11];
export const MONTH_NAMES: Record<number, string> = {
  1: "初場所", 3: "春場所", 5: "夏場所", 7: "名古屋場所", 9: "秋場所", 11: "九州場所",
};

export function bashoLabel(basho: string): string {
  const year = basho.slice(0, 4);
  const month = parseInt(basho.slice(4));
  return `${year}年${MONTH_NAMES[month] ?? month + "月場所"}`;
}

export function toKanjiNum(n: number): string {
  if (n <= 0) return "";
  const ones = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (n < 10) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return (t === 1 ? "十" : ones[t] + "十") + ones[o];
}

export function rankCenterLabel(rank: string, rankNum: number): string {
  const ja = RANK_JA[rank] ?? rank;
  if (["Yokozuna", "Ozeki", "Sekiwake", "Komusubi"].includes(rank)) return ja;
  if (rankNum === 1) return `${ja}筆頭`;
  return `${ja}${toKanjiNum(rankNum)}枚目`;
}

export function rankLabel(row: { rank: string; rank_number: number }): string {
  if (row.rank === "Maegashira") return `前頭${row.rank_number}枚目`;
  if (row.rank === "Juryo") return `十両${row.rank_number}枚目`;
  if (["Makushita", "Sandanme", "Jonidan", "Jonokuchi"].includes(row.rank)) {
    return `${RANK_JA[row.rank]}${row.rank_number}枚目`;
  }
  return RANK_JA[row.rank] ?? row.rank;
}

export function rankValue(row: { rank: string; rank_number: number; side: string }): number {
  return RANK_ORDER[row.rank] * 1000 + row.rank_number * 2 + (row.side === "East" ? 0 : 1);
}

export function displayName(row: BanzukeRow): string {
  const name = row.rikishi_name_jp || row.rikishi_name;
  // 読み仮名を削除: "栃大海(とちたいかい)" → "栃大海"
  return name.replace(/[（(][^）)]*[）)]/g, "").trim();
}
