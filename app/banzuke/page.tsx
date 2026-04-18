import { getBanzuke } from "@/lib/actions";
import { BanzukeRow, bashoLabel, DIVISIONS } from "@/lib/utils";
import BanzukeTable from "@/components/BanzukeTable";
import BanzukeSearch from "@/components/BanzukeSearch";
import BashoResults from "@/components/BashoResults";

type Props = {
  searchParams: Promise<{ basho?: string; div?: string }>;
};

export default async function BanzukePage({ searchParams }: Props) {
  const { basho, div } = await searchParams;
  const currentDiv =
    div && DIVISIONS.find((d) => d.key === div) ? div : "Makuuchi";

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
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-[0.2em] mb-2">番付照会</h1>
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="h-px w-16 bg-[#c0392b]/40" />
          <span className="text-[10px] tracking-[0.5em] text-[#c0392b]/60 uppercase">
            Banzuke Archive
          </span>
          <div className="h-px w-16 bg-[#c0392b]/40" />
        </div>
        <p className="text-xs text-[#1a1008]/40 tracking-wider">
          1958年〜現在の番付を検索できます
        </p>
      </div>

      {/* 検索フォーム */}
      <BanzukeSearch currentBasho={basho} currentDiv={currentDiv} />

      {/* エラー */}
      {error && (
        <div className="text-center py-8 bg-white rounded-xl border border-red-200 shadow-sm mt-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* データなし */}
      {searched && !error && rows.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-stone-200 shadow-sm mt-6">
          <p className="text-[#1a1008]/40 text-sm">
            {bashoLabel(searched)} のデータが見つかりませんでした
          </p>
        </div>
      )}

      {/* 結果 */}
      {rows.length > 0 && (
        <div className="mt-8">
          {/* 番付表タイトル */}
          <div className="text-center mb-6">
            <div className="inline-block border-2 border-[#c0392b]/30 px-8 py-4 mb-3">
              <h2 className="text-xl tracking-[0.4em] font-bold">番 付 表</h2>
            </div>
            <p className="text-sm text-[#1a1008]/60 font-bold tracking-widest mt-2">
              {bashoLabel(searched)}
            </p>
          </div>

          {/* East / West headers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div
              className="py-2.5 text-center text-white font-bold tracking-[0.15em] rounded-lg text-sm"
              style={{ background: "#c0392b" }}
            >
              東{" "}
              <span className="font-normal opacity-70 ml-2 text-xs tracking-widest">
                EAST
              </span>
            </div>
            <div
              className="py-2.5 text-center text-white font-bold tracking-[0.15em] rounded-lg text-sm"
              style={{ background: "#1e3768" }}
            >
              <span className="font-normal opacity-70 mr-2 text-xs tracking-widest">
                WEST
              </span>{" "}
              西
            </div>
          </div>

          <BanzukeTable rows={rows} basho={searched} division={currentDiv} />
          <BashoResults basho={searched} division={currentDiv} rows={rows} />

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-stone-200 text-center">
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="h-px w-12 bg-[#c0392b]/30" />
              <span className="text-[10px] tracking-[0.4em] text-[#1a1008]/30 uppercase">
                AI Powered Prediction
              </span>
              <div className="h-px w-12 bg-[#c0392b]/30" />
            </div>
            <p className="text-xs text-[#1a1008]/30">
              データ出典: sumo-api.com
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
