import { getBanzuke } from "@/lib/actions";
import { BanzukeRow, bashoLabel, DIVISIONS } from "@/lib/utils";
import BanzukeTable from "@/components/BanzukeTable";
import DivisionTabs from "@/components/DivisionTabs";

const PREDICTED_BASHO = "202605";
export const revalidate = 3600;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ div?: string }>;
}) {
  const { div } = await searchParams;
  const currentDiv = div && DIVISIONS.find((d) => d.key === div) ? div : "Makuuchi";

  let rows: BanzukeRow[] = [];
  let error = "";
  try {
    rows = (await getBanzuke(PREDICTED_BASHO, currentDiv)) as BanzukeRow[];
  } catch (e) {
    error = String(e);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* タイトル */}
      <div className="text-center mb-6">
        <p className="text-[11px] tracking-[0.4em] text-[#c0392b] mb-1 uppercase">AI Prediction</p>
        <h1 className="text-3xl font-bold tracking-[0.2em] mb-1">
          {bashoLabel(PREDICTED_BASHO)}
        </h1>
        <p className="text-sm text-[#1a1008]/50 tracking-wider">予想番付表</p>
      </div>

      {/* 罫線 */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-[#c0392b]/40" />
        <span className="text-[#c0392b] text-lg">◉</span>
        <div className="flex-1 h-px bg-[#c0392b]/40" />
      </div>

      {/* 階級タブ */}
      <DivisionTabs currentDiv={currentDiv} basePath="/" />

      {error ? (
        <div className="text-center py-16 bg-white/40 rounded-lg border border-red-200 mt-4">
          <p className="text-red-600 text-sm mb-1">データ取得エラー</p>
          <p className="text-xs text-[#1a1008]/40">{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white/40 rounded-lg border border-stone-200 mt-4">
          <p className="text-[#1a1008]/40 text-sm">このデータはまだありません</p>
          <p className="text-xs text-[#1a1008]/30 mt-1">Supabase に階級データをインポート後に表示されます</p>
        </div>
      ) : (
        <div className="mt-4">
          <BanzukeTable rows={rows} isPredicted />
        </div>
      )}

      <p className="text-center text-[11px] text-[#1a1008]/30 mt-6 tracking-wider">
        力士名をクリックすると番付履歴が表示されます
      </p>
    </div>
  );
}
