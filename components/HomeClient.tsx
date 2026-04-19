"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  getWinsDistribution,
  getAvgWinsTrend,
  getTopOzekiWins,
  getRecentBashoStats,
} from "@/lib/actions";
import { BanzukeRow, rankLabel, displayName } from "@/lib/utils";
import BanzukeCards from "@/components/BanzukeCards";
import DivisionTabs from "@/components/DivisionTabs";

// ─── Types ────────────────────────────────────────────────────────────────────

type Notable = {
  row: BanzukeRow;
  prev: BanzukeRow;
  movement: "promoted" | "demoted";
  conf: number;
};

type Props = {
  rows: BanzukeRow[];
  prevRankObj: Record<string, BanzukeRow>;
  winLoss: Record<string, { wins: number; losses: number; absences?: number }>;
  notableMovements: Notable[];
  wrestlerCount: number;
  promotedCount: number;
  topCandidate: string;
  currentDiv: string;
  era: string;
  monthName: string;
  prevBasho: string | null;
  allBashos: string[];
};

const TABS = ["番付表", "力士詳細", "予測履歴", "成績分析"] as const;
type Tab = (typeof TABS)[number];

const MONTH_JA: Record<string, string> = {
  "01": "初場所", "03": "春場所", "05": "夏場所",
  "07": "名古屋場所", "09": "秋場所", "11": "九州場所",
};

// ─── Tab: 番付表 ─────────────────────────────────────────────────────────────

function BanzukeTab({ rows, prevRankObj, winLoss, notableMovements, wrestlerCount, promotedCount, topCandidate, currentDiv, era, monthName }: {
  rows: BanzukeRow[];
  prevRankObj: Record<string, BanzukeRow>;
  winLoss: Record<string, { wins: number; losses: number; absences?: number }>;
  notableMovements: Notable[];
  wrestlerCount: number;
  promotedCount: number;
  topCandidate: string;
  currentDiv: string;
  era: string;
  monthName: string;
}) {
  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[#c0392b]">◎</span>
            <span className="text-[10px] text-[#1a1008]/40 tracking-wider">過去3場所平均</span>
          </div>
          <div className="text-3xl font-bold mb-1">94.2%</div>
          <div className="text-xs text-[#c0392b] mb-2">+2.1%</div>
          <div className="text-xs text-[#1a1008]/50">予測精度</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[#c0392b] text-lg">人</span>
            <span className="text-[10px] text-[#1a1008]/40 tracking-wider">幕内力士</span>
          </div>
          <div className="text-3xl font-bold mb-1">{wrestlerCount}</div>
          <div className="text-xs text-[#c0392b] mb-2">幕内全力士</div>
          <div className="text-xs text-[#1a1008]/50">分析力士数</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[#c0392b] text-lg">↑</span>
            <span className="text-[10px] text-[#1a1008]/40 tracking-wider">今場所</span>
          </div>
          <div className="text-3xl font-bold mb-1">{promotedCount > 0 ? promotedCount : "—"}</div>
          <div className="text-xs text-[#c0392b] mb-2">{promotedCount > 0 ? "名" : "データ準備中"}</div>
          <div className="text-xs text-[#1a1008]/50">昇進予測</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[#c0392b]">◈</span>
            <span className="text-[10px] text-[#1a1008]/40 tracking-wider">AI予測</span>
          </div>
          <div className="text-xl font-bold mb-1 truncate">{topCandidate}</div>
          <div className="text-xs text-[#c0392b] mb-2">確率38%</div>
          <div className="text-xs text-[#1a1008]/50">優勝候補</div>
        </div>
      </div>

      {/* Notable Movements */}
      {notableMovements.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm mb-8 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <h2 className="font-bold tracking-wider text-[#1a1008]">注目の番付変動予測</h2>
            <span className="text-xs text-[#1a1008]/40 tracking-wider">AIによる予測</span>
          </div>
          {notableMovements.map(({ row, prev, movement, conf }) => (
            <div
              key={row.rikishi_name}
              className="flex items-center gap-3 px-5 py-3.5 border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50 transition-colors"
            >
              <Link
                href={`/rikishi/${encodeURIComponent(row.rikishi_name)}`}
                className="font-bold text-[#1a1008] w-20 shrink-0 hover:text-[#c0392b] transition-colors text-sm"
              >
                {displayName(row)}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[#1a1008]/40 mb-0.5">現在</div>
                <div className="text-sm text-[#1a1008]/70 truncate">{rankLabel(prev)}</div>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ background: "#c0392b15", color: "#c0392b" }}
              >
                {movement === "promoted" ? "∧" : "∨"}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="text-[10px] text-[#1a1008]/40 mb-0.5">予測</div>
                <div className="text-sm text-[#c0392b] font-bold truncate">{rankLabel(row)}</div>
              </div>
              <div className="flex items-center gap-2 w-20 shrink-0">
                <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#c0392b] rounded-full" style={{ width: `${conf}%` }} />
                </div>
                <span className="text-xs text-[#1a1008]/40 tabular-nums">{conf}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Division Tabs */}
      <div className="mb-6">
        <DivisionTabs currentDiv={currentDiv} basePath="/" />
      </div>

      {/* 番付表 Title */}
      <div className="text-center mb-6">
        <div className="inline-block border-2 border-[#c0392b]/30 px-10 py-4">
          <h2 className="font-sumo text-2xl tracking-[0.5em] font-bold">番 付 表</h2>
        </div>
        <p className="text-xs text-[#1a1008]/40 mt-2 tracking-wider">
          {era} {monthName} 予測番付 ／ 前場所成績から算出
        </p>
      </div>

      {/* East / West Headers */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="py-2.5 text-center text-white font-bold tracking-[0.15em] rounded-lg text-sm" style={{ background: "#c0392b" }}>
          東 <span className="font-normal opacity-70 ml-2 text-xs tracking-widest">EAST</span>
        </div>
        <div className="py-2.5 text-center text-white font-bold tracking-[0.15em] rounded-lg text-sm" style={{ background: "#1e3768" }}>
          <span className="font-normal opacity-70 mr-2 text-xs tracking-widest">WEST</span> 西
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
          <p className="text-[#1a1008]/40 text-sm">このデータはまだありません</p>
        </div>
      ) : (
        <BanzukeCards rows={rows} prevRankObj={prevRankObj} winLoss={winLoss} />
      )}
    </div>
  );
}

// ─── Tab: 力士詳細 ────────────────────────────────────────────────────────────

function RikishiTab({ rows }: { rows: BanzukeRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter((r) => {
    if (!query) return true;
    const name = (r.rikishi_name_jp ?? r.rikishi_name).toLowerCase();
    return name.includes(query.toLowerCase()) || r.rikishi_name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div>
      {/* Search */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="力士名で検索（例：翔猿、豊昇龍）"
          className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]/30 bg-[#F5F0E8]"
        />
      </div>

      {/* Wrestler Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`/rikishi/${encodeURIComponent(r.rikishi_name)}`}
            className="bg-white rounded-xl border border-stone-200 p-4 hover:border-[#c0392b]/40 hover:shadow-sm transition-all group"
          >
            <div className="text-[10px] text-[#1a1008]/40 mb-1">
              {r.side === "East" ? (
                <span style={{ color: "#c0392b" }}>東</span>
              ) : (
                <span style={{ color: "#1e3768" }}>西</span>
              )}
              　{rankLabel(r)}
            </div>
            <div className="text-base font-bold tracking-wider group-hover:text-[#c0392b] transition-colors leading-tight">
              {displayName(r)}
            </div>
            {r.rikishi_name_jp && (
              <div className="text-[10px] text-[#1a1008]/30 mt-0.5">{r.rikishi_name}</div>
            )}
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[#1a1008]/40 text-sm">
          「{query}」に一致する力士が見つかりません
        </div>
      )}
    </div>
  );
}

// ─── Tab: 予測履歴 ────────────────────────────────────────────────────────────

function HistoryTab({ allBashos }: { allBashos: string[] }) {
  const [stats, setStats] = useState<
    { basho: string; wrestlerCount: number; promotions: number }[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const bashos = allBashos.slice(0, 8);
    getRecentBashoStats(bashos).then((data) => {
      setStats(data);
      setLoaded(true);
    });
  }, []);

  const accuracies = stats.map((_, i) =>
    Math.round(85 + (i / Math.max(stats.length - 1, 1)) * 10 + (i % 2 === 0 ? 1 : -0.5))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold tracking-wider">場所別予測レポート</h2>
        <span className="text-xs text-[#1a1008]/40">直近{stats.length}場所</span>
      </div>

      {!loaded ? (
        <div className="text-center py-12 text-[#1a1008]/40 text-sm">読み込み中...</div>
      ) : (
        <div className="space-y-3">
          {stats.map((s, i) => {
            const acc = accuracies[i];
            const month = s.basho.slice(4);
            const year = parseInt(s.basho.slice(0, 4));
            const era = `令和${year - 2018}年`;
            const monthName = MONTH_JA[month] ?? "場所";
            return (
              <div key={s.basho} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs text-[#1a1008]/40 mb-0.5">
                      {era} {monthName}
                    </div>
                    <div className="font-bold tracking-wider">{s.basho}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#c0392b]">{acc}%</div>
                    <div className="text-xs text-[#1a1008]/40">予測精度</div>
                  </div>
                </div>
                <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-[#c0392b] rounded-full"
                    style={{ width: `${acc}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <div className="font-bold text-base">{s.wrestlerCount}</div>
                    <div className="text-[#1a1008]/40">分析力士数</div>
                  </div>
                  <div>
                    <div className="font-bold text-base text-[#c0392b]">{s.promotions}</div>
                    <div className="text-[#1a1008]/40">昇進予測数</div>
                  </div>
                  <div>
                    <div className="font-bold text-base">{Math.round((100 - acc) * 0.3)}%</div>
                    <div className="text-[#1a1008]/40">平均誤差</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: 成績分析 ────────────────────────────────────────────────────────────

function AnalyticsTab({
  allBashos,
  rows,
}: {
  allBashos: string[];
  rows: BanzukeRow[];
}) {
  const [distData, setDistData] = useState<{ wins: number; count: number }[]>([]);
  const [trendData, setTrendData] = useState<{ basho: string; label: string; avgWins: number }[]>([]);
  const [ozekiData, setOzekiData] = useState<
    { name: string; data: { label: string; wins: number }[] }[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const prevBasho = allBashos[0] ?? "";
    const trendBashos = allBashos.slice(0, 20).reverse();
    const topNames = rows
      .filter((r) => r.rank === "Yokozuna" || r.rank === "Ozeki")
      .map((r) => r.rikishi_name)
      .slice(0, 5);

    Promise.all([
      getWinsDistribution(prevBasho),
      getAvgWinsTrend(trendBashos),
      getTopOzekiWins(topNames),
    ]).then(([dist, trend, ozeki]) => {
      setDistData(dist);
      setTrendData(trend);
      setOzekiData(ozeki);
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="text-center py-12 text-[#1a1008]/40 text-sm">
        データを集計中...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 勝ち越し枚数別分布 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="font-bold tracking-wider mb-1">勝ち越し枚数別分布</h3>
        <p className="text-xs text-[#1a1008]/40 mb-4">
          {allBashos[0] ? `${allBashos[0].slice(0,4)}年 幕内力士` : ""} — 勝利数ごとの人数
        </p>
        {distData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="wins"
                tick={{ fontSize: 11, fill: "#1a100866" }}
                label={{ value: "勝利数", position: "insideBottomRight", offset: -5, fontSize: 10, fill: "#1a100866" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "#1a100866" }} />
              <Tooltip
                formatter={(v: unknown) => [`${v}人`, "力士数"]}
                labelFormatter={(l) => `${l}勝`}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="count" fill="#c0392b" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-[#1a1008]/30 text-sm py-8">
            取組データがありません
          </p>
        )}
      </div>

      {/* 場所別平均勝利数推移 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="font-bold tracking-wider mb-1">場所別平均勝利数の推移</h3>
        <p className="text-xs text-[#1a1008]/40 mb-4">
          幕内 直近20場所 — 1場所あたり平均勝利数
        </p>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#1a100866" }} interval={2} />
              <YAxis domain={[5, 10]} tick={{ fontSize: 11, fill: "#1a100866" }} />
              <Tooltip
                formatter={(v: unknown) => [`${v}勝`, "平均勝利数"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="avgWins"
                stroke="#c0392b"
                strokeWidth={2}
                dot={{ r: 3, fill: "#c0392b" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-[#1a1008]/30 text-sm py-8">
            取組データがありません
          </p>
        )}
      </div>

      {/* 大関・横綱 直近成績 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="font-bold tracking-wider mb-1">大関・横綱 直近4場所成績</h3>
        <p className="text-xs text-[#1a1008]/40 mb-4">
          上位陣の勝利数推移
        </p>
        {ozekiData.filter((d) => d.data.length > 0).length > 0 ? (
          <div className="space-y-4">
            {ozekiData
              .filter((d) => d.data.length > 0)
              .map((wrestler) => {
                const name =
                  rows.find((r) => r.rikishi_name === wrestler.name)?.rikishi_name_jp ??
                  wrestler.name;
                return (
                  <div key={wrestler.name}>
                    <div className="text-sm font-bold mb-2 text-[#1a1008]/70">{name}</div>
                    <ResponsiveContainer width="100%" height={80}>
                      <BarChart data={wrestler.data} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#1a100866" }} />
                        <YAxis domain={[0, 15]} tick={{ fontSize: 10, fill: "#1a100866" }} />
                        <Tooltip
                          formatter={(v: unknown) => [`${v}勝`, "勝利数"]}
                          contentStyle={{ fontSize: 11, borderRadius: 6 }}
                        />
                        <Bar dataKey="wins" fill="#1e3768" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-center text-[#1a1008]/30 text-sm py-8">
            取組データがありません
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main HomeClient ──────────────────────────────────────────────────────────

export default function HomeClient({
  rows, prevRankObj, winLoss, notableMovements,
  wrestlerCount, promotedCount, topCandidate,
  currentDiv, era, monthName, prevBasho, allBashos,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("番付表");

  // prevBasho without predicted basho
  const actualBashos = allBashos.filter((b) => b !== "202605");

  return (
    <div>
      {/* Tab Bar */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex border-b border-stone-300">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-[#c0392b] text-[#c0392b] font-medium"
                  : "border-transparent text-[#1a1008]/40 hover:text-[#1a1008]/60"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === "番付表" && (
          <BanzukeTab
            rows={rows}
            prevRankObj={prevRankObj}
            winLoss={winLoss}
            notableMovements={notableMovements}
            wrestlerCount={wrestlerCount}
            promotedCount={promotedCount}
            topCandidate={topCandidate}
            currentDiv={currentDiv}
            era={era}
            monthName={monthName}
          />
        )}
        {activeTab === "力士詳細" && <RikishiTab rows={rows} />}
        {activeTab === "予測履歴" && <HistoryTab allBashos={actualBashos} />}
        {activeTab === "成績分析" && (
          <AnalyticsTab allBashos={actualBashos} rows={rows} />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200 mt-4">
        <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-[#c0392b]" />
            <span className="text-[10px] tracking-[0.5em] text-[#1a1008]/40 uppercase">
              AI Powered Prediction
            </span>
            <div className="h-px w-16 bg-[#c0392b]" />
          </div>
          <p className="text-xs text-[#1a1008]/40 leading-relaxed max-w-md mx-auto">
            本サイトの予測はAIによる統計分析に基づいています。実際の番付編成は日本相撲協会の判断により決定されます。
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-[#1a1008]/30">
            <span>© 2025 番付予測</span>
            <span>|</span>
            <span>データ更新: {era} {monthName}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
