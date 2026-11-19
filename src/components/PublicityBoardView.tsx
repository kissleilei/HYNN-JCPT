import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Coins,
  Eye,
  FileCheck2,
  Megaphone,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react';
import { COMPANY_POLICY_META } from '../data/policyRubricData';
import {
  AccountabilityTicket,
  Department,
  Employee,
  RewardNomination,
} from '../types/platform';
import { CustomSelect, SelectOption } from './CustomSelect';
import { NavSection } from './Sidebar';

interface PublicityBoardViewProps {
  currentUser: Employee;
  departments: Department[];
  tickets: AccountabilityTicket[];
  rewards: RewardNomination[];
  onNavigate: (section: NavSection) => void;
}

const REACTION_STORAGE_KEY = 'hengyineng_publicity_reactions_v1';

interface ReactionStore {
  kudosCounts: Record<string, number>;
  kudosPressed: Record<string, boolean>;
  ackCounts: Record<string, number>;
  ackPressed: Record<string, boolean>;
}

const DEFAULT_REACTIONS: ReactionStore = {
  kudosCounts: {
    'rew-1': 42,
    'rew-3': 67,
    'rew-4': 29,
  },
  kudosPressed: {},
  ackCounts: {
    'tkt-6': 38,
    'tkt-7': 25,
    'tkt-4': 19,
    'tkt-5': 31,
  },
  ackPressed: {},
};

function loadReactions(): ReactionStore {
  try {
    const raw = localStorage.getItem(REACTION_STORAGE_KEY);
    if (!raw) return DEFAULT_REACTIONS;
    const parsed = JSON.parse(raw) as Partial<ReactionStore>;
    return {
      kudosCounts: { ...DEFAULT_REACTIONS.kudosCounts, ...(parsed.kudosCounts || {}) },
      kudosPressed: parsed.kudosPressed || {},
      ackCounts: { ...DEFAULT_REACTIONS.ackCounts, ...(parsed.ackCounts || {}) },
      ackPressed: parsed.ackPressed || {},
    };
  } catch {
    return DEFAULT_REACTIONS;
  }
}

function getPunishmentSeverityLevel(gradeName?: string): number {
  if (!gradeName) return 1;
  if (gradeName.includes('记大过') || gradeName.includes('解除')) return 4;
  if (gradeName.includes('记过')) return 3;
  if (gradeName.includes('书面') || gradeName.includes('警告')) return 2;
  return 1;
}

function getRewardTierRank(gradeName: string): number {
  if (gradeName.includes('记功')) return 3;
  if (gradeName.includes('嘉奖')) return 2;
  return 1;
}

export const PublicityBoardView: React.FC<PublicityBoardViewProps> = ({
  departments,
  tickets,
  rewards,
  onNavigate,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [boardFilter, setBoardFilter] = useState<'all' | 'reward' | 'punishment'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [hoveredDeptId, setHoveredDeptId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionStore>(loadReactions);

  useEffect(() => {
    try {
      localStorage.setItem(REACTION_STORAGE_KEY, JSON.stringify(reactions));
    } catch {
      // ignore storage errors
    }
  }, [reactions]);

  // All effective settled rewards & punishments eligible for company monthly board
  const settledRewards = useMemo(
    () => rewards.filter((r) => r.status === 'approved_archived'),
    [rewards]
  );

  const settledPunishments = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (t.status === 'archived' ||
            t.status === 'appealing' ||
            t.status === 'appeal_resolved') &&
          t.execution &&
          t.execution.gradeName !== '已撤销处分'
      ),
    [tickets]
  );

  const availableMonths = useMemo(() => {
    const months = new Set<string>(['2026-11', '2026-10']);
    settledRewards.forEach((r) => {
      const m = (r.approvedAt || r.createdAt).slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(m)) months.add(m);
    });
    settledPunishments.forEach((t) => {
      const m = (t.archivedAt || t.updatedAt).slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(m)) months.add(m);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [settledRewards, settledPunishments]);

  const monthRewards = useMemo(() => {
    return settledRewards
      .filter((r) => {
        const m = (r.approvedAt || r.createdAt).slice(0, 7);
        const matchMonth = selectedMonth === 'all' || m === selectedMonth;
        const matchDept = deptFilter === 'all' || r.winnerDeptId === deptFilter;
        return matchMonth && matchDept;
      })
      .sort((a, b) => getRewardTierRank(b.gradeName) - getRewardTierRank(a.gradeName));
  }, [settledRewards, selectedMonth, deptFilter]);

  const monthPunishments = useMemo(() => {
    return settledPunishments
      .filter((t) => {
        const m = (t.archivedAt || t.updatedAt).slice(0, 7);
        const matchMonth = selectedMonth === 'all' || m === selectedMonth;
        const matchDept =
          deptFilter === 'all' || t.accusedDeptIds.includes(deptFilter);
        return matchMonth && matchDept;
      })
      .sort(
        (a, b) =>
          getPunishmentSeverityLevel(b.execution?.gradeName) -
          getPunishmentSeverityLevel(a.execution?.gradeName)
      );
  }, [settledPunishments, selectedMonth, deptFilter]);

  // All-dept stats for selected month (unfiltered by dept so bar chart stays comparative)
  const monthDeptBars = useMemo(() => {
    const rewInMonth = settledRewards.filter(
      (r) =>
        selectedMonth === 'all' ||
        (r.approvedAt || r.createdAt).slice(0, 7) === selectedMonth
    );
    const punInMonth = settledPunishments.filter(
      (t) =>
        selectedMonth === 'all' ||
        (t.archivedAt || t.updatedAt).slice(0, 7) === selectedMonth
    );

    return departments.map((d) => {
      const rewardItems = rewInMonth.filter((r) => r.winnerDeptId === d.id);
      const punItems = punInMonth.filter((t) => t.accusedDeptIds.includes(d.id));
      return {
        dept: d,
        rewardCount: rewardItems.length,
        punCount: punItems.length,
        rewardAmount: rewardItems.reduce((s, r) => s + r.amountYuan, 0),
        punAmount: punItems.reduce((s, t) => s + Math.abs(t.execution?.amountYuan || 0), 0),
      };
    });
  }, [departments, settledRewards, settledPunishments, selectedMonth]);

  // Monthly visual KPI totals
  const summaryStats = useMemo(() => {
    const rewardCount = monthRewards.length;
    const punCount = monthPunishments.length;
    const totalCount = rewardCount + punCount;
    const rewardYuan = monthRewards.reduce((s, r) => s + r.amountYuan, 0);
    const penaltyInflowYuan = monthPunishments.reduce(
      (s, t) => s + Math.abs(t.execution?.amountYuan || 0),
      0
    );
    const rewardPoints = Number(
      (rewardYuan / COMPANY_POLICY_META.pointValueYuan).toFixed(1)
    );
    const penaltyPoints = Number(
      (penaltyInflowYuan / COMPANY_POLICY_META.pointValueYuan).toFixed(1)
    );
    const positiveSharePct =
      totalCount > 0 ? Math.round((rewardCount / totalCount) * 100) : 50;

    return {
      rewardCount,
      punCount,
      totalCount,
      rewardYuan,
      penaltyInflowYuan,
      rewardPoints,
      penaltyPoints,
      positiveSharePct,
    };
  }, [monthRewards, monthPunishments]);

  const spotlightReward = monthRewards[0] || null;

  const deptOptions: SelectOption[] = [
    { value: 'all', label: '全部所属部门' },
    ...departments.map((d) => ({
      value: d.id,
      label: d.name,
      badgeText: d.code,
    })),
  ];

  const handleToggleKudos = (rewardId: string) => {
    setReactions((prev) => {
      const pressed = Boolean(prev.kudosPressed[rewardId]);
      const baseCount = prev.kudosCounts[rewardId] ?? 12;
      return {
        ...prev,
        kudosPressed: { ...prev.kudosPressed, [rewardId]: !pressed },
        kudosCounts: {
          ...prev.kudosCounts,
          [rewardId]: pressed ? Math.max(0, baseCount - 1) : baseCount + 1,
        },
      };
    });
  };

  const handleToggleAck = (ticketId: string) => {
    setReactions((prev) => {
      const pressed = Boolean(prev.ackPressed[ticketId]);
      const baseCount = prev.ackCounts[ticketId] ?? 8;
      return {
        ...prev,
        ackPressed: { ...prev.ackPressed, [ticketId]: !pressed },
        ackCounts: {
          ...prev.ackCounts,
          [ticketId]: pressed ? Math.max(0, baseCount - 1) : baseCount + 1,
        },
      };
    });
  };

  const formatMonthLabel = (m: string) => {
    if (m === 'all') return '全部月份汇总';
    const [y, mo] = m.split('-');
    return m === '2026-11' ? `${y}年${Number(mo)}月（当月）` : `${y}年${Number(mo)}月`;
  };

  // Dual-arc ring math
  const ringCircumference = 2 * Math.PI * 38;
  const positiveArc =
    summaryStats.totalCount > 0
      ? (summaryStats.rewardCount / summaryStats.totalCount) * ringCircumference
      : ringCircumference * 0.5;
  const maxDeptBar = Math.max(
    1,
    ...monthDeptBars.map((b) => Math.max(b.rewardCount, b.punCount))
  );

  const showRewardCol = boardFilter === 'all' || boardFilter === 'reward';
  const showPunCol = boardFilter === 'all' || boardFilter === 'punishment';

  return (
    <div className="space-y-6">
      {/* Monthly Header & Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
              <span>广东恒翼能科技股份有限公司</span>
              <span aria-hidden="true">·</span>
              <span>当月奖惩透明公示与荣誉激励看板</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-900" />
              <span>恒翼能全员奖惩公示栏（{formatMonthLabel(selectedMonth)}）</span>
            </h2>
          </div>

          {/* Month Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {availableMonths.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    selectedMonth === m
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatMonthLabel(m)}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedMonth === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全期累计
              </button>
            </div>
          </div>
        </div>

        {/* Category & Dept Filters */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: `全部公示（${summaryStats.totalCount}）` },
                { id: 'reward', label: `正向表彰光荣榜（${summaryStats.rewardCount}）` },
                { id: 'punishment', label: `惩处问责警示台（${summaryStats.punCount}）` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBoardFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  boardFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-48">
              <CustomSelect
                value={deptFilter}
                onChange={setDeptFilter}
                options={deptOptions}
                size="sm"
              />
            </div>
            {deptFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setDeptFilter('all')}
                className="text-xs font-medium text-blue-800 hover:underline whitespace-nowrap"
              >
                查看全部部门
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Monthly Visual Dashboard: 3 Dynamic Modules (Donut Balance + Dept Dual Bar + Bonus Pool Flow) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Module 1: Monthly Honor vs Alert Ring Gauge */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              当月表彰 vs 惩处分布
            </h3>
            <span className="text-xs font-mono-tabular text-slate-500">
              1 积分 = ¥100
            </span>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                />
                {summaryStats.totalCount > 0 && (
                  <>
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="12"
                      strokeDasharray={ringCircumference}
                      initial={{ strokeDashoffset: ringCircumference }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 0.5 }}
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#059669"
                      strokeWidth="12"
                      strokeDasharray={`${positiveArc} ${ringCircumference}`}
                      initial={{ strokeDashoffset: positiveArc }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-semibold font-mono-tabular text-slate-900">
                  {summaryStats.positiveSharePct}%
                </span>
                <span className="text-[10px] text-slate-500">正向占比</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 text-xs">
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-md">
                <div className="flex items-center justify-between text-emerald-900 font-medium">
                  <span>正向表彰人员</span>
                  <span className="font-mono-tabular font-semibold">
                    {summaryStats.rewardCount} 人次
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700 font-mono-tabular mt-0.5">
                  +{summaryStats.rewardPoints} 分 · +¥{summaryStats.rewardYuan.toLocaleString()}
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-md">
                <div className="flex items-center justify-between text-amber-900 font-medium">
                  <span>惩处警示人员</span>
                  <span className="font-mono-tabular font-semibold">
                    {summaryStats.punCount} 人次
                  </span>
                </div>
                <div className="text-[11px] text-amber-800 font-mono-tabular mt-0.5">
                  -{summaryStats.penaltyPoints} 分 · 扣款 ¥{summaryStats.penaltyInflowYuan.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: Interactive Department Monthly Dual-Bar Chart */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                各部门当月「光荣榜 vs 警示台」对比图
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                点击部门柱条即可联动筛选下方公示名单
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                表彰
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
                惩处
              </span>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2 pt-2 items-end h-36">
            {monthDeptBars.map((item) => {
              const rewH = Math.round((item.rewardCount / maxDeptBar) * 84);
              const punH = Math.round((item.punCount / maxDeptBar) * 84);
              const isSelected = deptFilter === item.dept.id;
              const isHovered = hoveredDeptId === item.dept.id;

              return (
                <button
                  key={item.dept.id}
                  type="button"
                  onClick={() =>
                    setDeptFilter((prev) =>
                      prev === item.dept.id ? 'all' : item.dept.id
                    )
                  }
                  onMouseEnter={() => setHoveredDeptId(item.dept.id)}
                  onMouseLeave={() => setHoveredDeptId(null)}
                  className={`flex flex-col items-center justify-end h-full rounded-md p-1 transition-colors ${
                    isSelected
                      ? 'bg-blue-50 ring-1 ring-blue-400'
                      : isHovered
                      ? 'bg-slate-50'
                      : ''
                  }`}
                  title={`${item.dept.name}：表彰 ${item.rewardCount} 人次 / 惩处 ${item.punCount} 人次`}
                >
                  <div className="flex items-end gap-1 h-24 w-full justify-center">
                    <div className="flex flex-col items-center justify-end h-full">
                      {item.rewardCount > 0 && (
                        <span className="text-[10px] font-mono-tabular font-semibold text-emerald-700 mb-0.5">
                          {item.rewardCount}
                        </span>
                      )}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(item.rewardCount > 0 ? 14 : 3, rewH) }}
                        transition={{ duration: 0.35 }}
                        className={`w-3.5 rounded-t ${
                          item.rewardCount > 0 ? 'bg-emerald-600' : 'bg-slate-100'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col items-center justify-end h-full">
                      {item.punCount > 0 && (
                        <span className="text-[10px] font-mono-tabular font-semibold text-amber-700 mb-0.5">
                          {item.punCount}
                        </span>
                      )}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(item.punCount > 0 ? 14 : 3, punH) }}
                        transition={{ duration: 0.35 }}
                        className={`w-3.5 rounded-t ${
                          item.punCount > 0 ? 'bg-amber-600' : 'bg-slate-100'
                        }`}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-600 truncate max-w-full mt-1.5">
                    {item.dept.name.slice(0, 4)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Module 3: Bonus Pool Monthly Flow Visual */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-blue-900" />
              <span>奖金池当月反哺实况</span>
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
              <span className="text-slate-600">处罚金 100% 汇入</span>
              <span className="font-mono-tabular font-semibold text-amber-700">
                +¥{summaryStats.penaltyInflowYuan.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
              <span className="text-slate-600">表彰激励核发</span>
              <span className="font-mono-tabular font-semibold text-emerald-700">
                +¥{summaryStats.rewardYuan.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              依据《制度》4.4 条款：全部处罚金 100% 纳入财务独立奖金池，与公司年度激励预算共同用于员工正向表彰兑现。
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('standards')}
            className="text-xs font-medium text-blue-800 hover:underline text-left flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>查看完整独立奖金池与积分标尺</span>
          </button>
        </div>
      </section>

      {/* Spotlight Card: Top Honored Employee of the Month */}
      {showRewardCol && spotlightReward && (
        <section className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              {/* Custom SVG Honor Crest */}
              <div className="w-14 h-14 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 relative">
                <svg
                  viewBox="0 0 32 32"
                  className="w-8 h-8"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="16"
                    cy="13"
                    r="8"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12.5 13l2.3 2.3L19.5 10.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 20l-2 9 6-3 6 3-2-9"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-emerald-800 flex flex-wrap items-center gap-2">
                  <span>{formatMonthLabel(selectedMonth)} · 重点表彰标杆</span>
                  <span aria-hidden="true">·</span>
                  <span>【{spotlightReward.gradeName}】</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{spotlightReward.rewardNo}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {spotlightReward.winnerName}（{spotlightReward.winnerDeptName} · {spotlightReward.winnerRank}）— {spotlightReward.title}
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed max-w-3xl">
                  {spotlightReward.deedDescription}
                </p>
              </div>
            </div>

            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-emerald-200">
              <div className="text-left lg:text-right">
                <div className="text-[11px] text-emerald-800">核发积分与奖金</div>
                <div className="text-xl font-semibold text-emerald-700 font-mono-tabular">
                  +{Number((spotlightReward.amountYuan / 100).toFixed(1))} 分 · +¥
                  {spotlightReward.amountYuan.toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleKudos(spotlightReward.id)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  reactions.kudosPressed[spotlightReward.id]
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>
                  {reactions.kudosPressed[spotlightReward.id] ? '已点赞致敬' : '为 TA 点赞致敬'}（
                  {reactions.kudosCounts[spotlightReward.id] ?? 15}）
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Dual Contrast Columns: Left = 正向表彰光荣榜 | Right = 惩处问责警示台 */}
      <div
        className={`grid grid-cols-1 ${
          showRewardCol && showPunCol ? 'xl:grid-cols-2' : ''
        } gap-6 items-start`}
      >
        {/* LEFT COLUMN: Positive Commendation Wall */}
        {showRewardCol && (
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-200 bg-emerald-50/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-semibold text-emerald-950">
                    正向表彰光荣榜（表扬 / 嘉奖 / 记功）
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    树榜样 · 传经验 · 正向积分实时折算兑现
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono-tabular font-semibold text-emerald-800">
                共 {monthRewards.length} 人次 · +¥{summaryStats.rewardYuan.toLocaleString()}
              </span>
            </div>

            {monthRewards.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                当前筛选月份/部门暂无已批准的正向表彰记录
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {monthRewards.map((r) => {
                  const pts = Number(
                    (r.amountYuan / COMPANY_POLICY_META.pointValueYuan).toFixed(1)
                  );
                  const meterPct = Math.min(100, Math.round((pts / 20) * 100));
                  const pressed = Boolean(reactions.kudosPressed[r.id]);
                  const count = reactions.kudosCounts[r.id] ?? 12;

                  return (
                    <article key={r.id} className="p-5 space-y-3 hover:bg-emerald-50/20 transition-colors">
                      {/* Card Header: Avatar + Winner + Grade + Date */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                            {r.winnerName.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {r.winnerName}
                              </span>
                              <span className="text-xs font-semibold text-emerald-700">
                                【{r.gradeName}】
                              </span>
                              <span className="text-xs text-slate-500">
                                {r.winnerDeptName} · {r.winnerRank}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                              <span className="font-mono-tabular">{r.rewardNo}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {r.isCrossDepartment ? '跨部门协作表彰' : '部门重大创新特批'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">
                                {(r.approvedAt || r.createdAt).slice(0, 10)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-emerald-700 font-mono-tabular">
                            +{pts} 分
                          </div>
                          <div className="text-xs text-slate-600 font-mono-tabular">
                            +¥{r.amountYuan.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Visual Score Intensity Meter */}
                      <div className="space-y-1">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(12, meterPct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Deed Title & Highlight Box */}
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-medium text-slate-900">
                          {r.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {r.deedDescription}
                        </p>
                      </div>

                      {/* Structured Proof & Nominator Meta */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5 truncate">
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="truncate">
                            核验证据：{r.evidences[0]?.name || '里程碑验收材料'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="truncate">
                            提报人：{r.nominatorName}（{r.nominatorDeptName}）
                          </span>
                        </div>
                      </div>

                      {/* Interactive Footer */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => handleToggleKudos(r.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors inline-flex items-center gap-1.5 ${
                            pressed
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>
                            {pressed ? '已点赞致敬' : '点赞致敬'}（{count}）
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate('standards')}
                          className="text-xs text-emerald-700 hover:underline font-medium inline-flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>查看同款加分标尺</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* RIGHT COLUMN: Disciplinary Accountability & Alert Wall */}
        {showPunCol && (
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-200 bg-amber-50/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-950">
                    惩处问责警示台（批评 / 警告 / 记过 / 红线）
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    明责警示 · 避坑自查 · 处罚金 100% 汇入员工奖金池
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono-tabular font-semibold text-amber-800">
                共 {monthPunishments.length} 人次 · 汇入奖金池 +¥
                {summaryStats.penaltyInflowYuan.toLocaleString()}
              </span>
            </div>

            {monthPunishments.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                当前筛选月份/部门暂无已生效的惩处警示记录
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {monthPunishments.map((t) => {
                  const gradeName = t.execution?.gradeName || '已处理';
                  const severity = getPunishmentSeverityLevel(gradeName);
                  const pts = Math.abs(
                    Number(
                      (
                        (t.execution?.amountYuan || 0) /
                        COMPANY_POLICY_META.pointValueYuan
                      ).toFixed(1)
                    )
                  );
                  const pressed = Boolean(reactions.ackPressed[t.id]);
                  const ackCount = reactions.ackCounts[t.id] ?? 10;

                  return (
                    <article key={t.id} className="p-5 space-y-3 hover:bg-amber-50/20 transition-colors">
                      {/* Card Header: Avatar + Disciplined Employee + Grade + Date */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-semibold text-sm shrink-0 ${
                              severity >= 3 ? 'bg-red-700' : 'bg-amber-600'
                            }`}
                          >
                            {t.accusedEmpName.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {t.accusedEmpName}
                              </span>
                              <span
                                className={`text-xs font-semibold ${
                                  severity >= 3 ? 'text-red-700' : 'text-amber-800'
                                }`}
                              >
                                【{gradeName}】
                              </span>
                              <span className="text-xs text-slate-500">
                                {t.accusedDeptNames.join(' / ')}
                              </span>
                              {t.status === 'appealing' && (
                                <span className="text-[11px] font-medium text-blue-700">
                                  · 申诉复核中
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                              <span className="font-mono-tabular">{t.ticketNo}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">
                                影响期 {t.execution?.impactPeriodMonths || 0} 个月
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">
                                {(t.archivedAt || t.updatedAt).slice(0, 10)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`text-sm font-semibold font-mono-tabular ${
                              severity >= 3 ? 'text-red-700' : 'text-amber-800'
                            }`}
                          >
                            -{pts} 分
                          </div>
                          <div className="text-xs text-slate-600 font-mono-tabular">
                            -¥{Math.abs(t.execution?.amountYuan || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* 4-Segment Visual Severity Gauge */}
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1.5 flex-1 rounded-full ${
                              lvl <= severity
                                ? severity >= 3
                                  ? 'bg-red-600'
                                  : 'bg-amber-500'
                                : 'bg-slate-100'
                            }`}
                          />
                        ))}
                        <span className="text-[11px] text-slate-500 font-mono-tabular ml-1">
                          警示等级 L{severity}/4
                        </span>
                      </div>

                      {/* Fact & Lesson Learned */}
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-medium text-slate-900">
                          {t.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {t.factDescription}
                        </p>
                      </div>

                      {/* Lesson Learned Highlight Box */}
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-md text-xs text-amber-950 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          {t.desensitizedCaseSummary ||
                            t.execution?.adjustmentReason ||
                            '请各岗位严格对照《附件一：奖惩标尺》执行双人复核与交接留痕，避免同类失误复发。'}
                        </span>
                      </div>

                      {/* Interactive Footer */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => handleToggleAck(t.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors inline-flex items-center gap-1.5 ${
                            pressed
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {pressed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-amber-700" />
                          )}
                          <span>
                            {pressed ? '已阅知晓警示' : '我已阅读警示'}（{ackCount}）
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate('standards')}
                          className="text-xs text-amber-800 hover:underline font-medium inline-flex items-center gap-1"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>对照制度标尺自查</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
