import { getBanzuke } from "@/lib/actions";
import { BanzukeRow, bashoLabel, DIVISIONS, BASHO_MONTHS, MONTH_NAMES } from "@/lib/utils";
import BanzukeTable from "@/components/BanzukeTable";
import BanzukeSearch from "@/components/BanzukeSearch";

type Props = {
  searchParams: Promise<{ basho?: string; div?: string }>;
};

export default async function BanzukePage({ searchParams }: Props) {
  const { basho, div } = await searchParams;
  const currentDiv = div && DIVISIONS.find((d) => d.key === div) ? div : "Makuuchi";

  let rows: BanzukeRow[] = [];
  let error = "";
  let searched = "";

  if (basho && /^\d{6}$/.test(basho)) {
    searched = basho;
    try {
      rows = (await getBanzuke(basho, currentDiv)) as BanzukeRow[];
    } catch (e) {
      error = String(e);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-[0.2em] mb-1">番付照会</h1>
        <p className="text-sm text-[#1a1008]/50">1958年〜現在の番付を検索できます</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-[#c0392b]/40" />
        <span className="text-[#c0392b]">◉</span>
        <div className="flex-1 h-px bg-[#c0392b]/40" />
      </div>

      {/* 検索フォーム（Client Component） */}
      <BanzukeSearch currentBasho={basho} currentDiv={currentDiv} />

      {/* 結果 */}
      {error && (
        <div className="text-center py-8 bg-white/40 rounded-lg border border-red-200 mt-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {searched && !error && rows.length === 0 && (
        <div className="text-center py-8 bg-white/40 rounded-lg border border-stone-200 mt-6">
          <p className="text-[#1a1008]/50 text-sm">
            {bashoLabel(searched)} のデータが見つかりませんでした
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold tracking-widest">{bashoLabel(searched)}</h2>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#c0392b]/30" />
            <span className="text-[#c0392b]/60 text-sm">◉</span>
            <div className="flex-1 h-px bg-[#c0392b]/30" />
          </div>
          <BanzukeTable rows={rows} />
        </div>
      )}
    </div>
  );
}
