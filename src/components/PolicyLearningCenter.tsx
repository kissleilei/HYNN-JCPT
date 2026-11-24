import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  BookOpen,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { PHASE2_POINT_TIERS } from '../data/phase2SeedData';
import {
  POLICY_RUBRIC_CATEGORIES,
  POLICY_RUBRIC_ITEMS,
  PolicyRubricItem,
  TERMINATION_REDLINES,
} from '../data/policyRubricData';
import { SectionHeader } from './SectionHeader';

interface PolicyLearningCenterProps {
  onApplyRubricToOa: (item: PolicyRubricItem) => void;
}

export const PolicyLearningCenter: React.FC<PolicyLearningCenterProps> = ({
  onApplyRubricToOa,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    POLICY_RUBRIC_CATEGORIES[0]?.id ?? 'rd'
  );
  const [directionFilter, setDirectionFilter] = useState<'all' | 'reward' | 'punishment'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRedlines, setShowRedlines] = useState(false);

  const filteredRubricItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return POLICY_RUBRIC_ITEMS.filter((item) => {
      if (item.categoryId !== selectedCategory) return false;
      if (directionFilter === 'reward' && item.direction === 'punishment') return false;
      if (directionFilter === 'punishment' && item.direction === 'reward') return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.itemNo.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, directionFilter, searchQuery]);

  const rewardTiers = PHASE2_POINT_TIERS.filter((t) => t.category === 'reward');
  const punishmentTiers = PHASE2_POINT_TIERS.filter((t) => t.category === 'punishment');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="space-y-1.5 max-w-3xl">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight text-balance">
            制度与积分规则中心
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            全体员工可在此查阅最新奖惩积分标尺（「表扬 / 嘉奖 / 记功」与「批评 / 警告 / 记过」）、按九大业务域检索《附件一》细则条款，并了解集团 15 条零容忍红线。
          </p>
        </div>
      </section>

      {/* Rebuilt Phase 2 Point Tier Matrix */}
      <section className="space-y-3.5">
        <div className="px-1">
          <SectionHeader
            icon={Award}
            title="一、恒翼能二期全新积分等级体系（取代旧版现金标价）"
            subtitle="以积分累计评价绩效与评优评先资格，累积 3 次同级惩处自动升级且不再重复扣分"
            extra={
              <div className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                升级法则：3 次批评 → 1 次警告 → 3 次警告 → 1 次记过 → 3 次记过解除合同
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Reward Tiers */}
          <div className="bg-white border border-emerald-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-700">
                <Award className="w-3.5 h-3.5" />
              </span>
              <span>正向激励积分三档</span>
            </div>
            <div className="divide-y divide-slate-100">
              {rewardTiers.map((tier) => (
                <div key={tier.id} className="py-3 first:pt-1 last:pb-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      {tier.gradeName}
                    </span>
                    <span className="text-sm font-semibold text-emerald-700 font-mono-tabular">
                      {tier.pointRange}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{tier.criteriaSummary}</p>
                  <div className="text-[11px] text-slate-500">{tier.impactNote}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Punishment Tiers */}
          <div className="bg-white border border-rose-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/12 text-rose-700">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <span>违纪警示积分三档与升级规则</span>
            </div>
            <div className="divide-y divide-slate-100">
              {punishmentTiers.map((tier) => (
                <div key={tier.id} className="py-3 first:pt-1 last:pb-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      {tier.gradeName}
                    </span>
                    <span className="text-sm font-semibold text-rose-700 font-mono-tabular">
                      {tier.pointRange}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{tier.criteriaSummary}</p>
                  <div className="text-[11px] text-slate-500">{tier.impactNote}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Searchable Policy Rubric Matrix */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <SectionHeader
            icon={BookOpen}
            title="二、全场景奖惩积分细则"
            subtitle="检索具体条款后可直接点击「带入提报 OA」，自动预填审批单定级依据"
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex border border-slate-200 rounded-xl p-0.5 bg-slate-100/80">
              {(
                [
                  { id: 'all', label: '全部方向' },
                  { id: 'reward', label: '含奖励项' },
                  { id: 'punishment', label: '含惩处项' },
                ] as const
              ).map((dir) => (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => setDirectionFilter(dir.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                    directionFilter === dir.id
                      ? 'bg-white text-[#1E62D0] font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {dir.label}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="检索条款名称或编号..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FE4]"
              />
            </div>
          </div>
        </div>

        {/* Category filter chips (1-9 domains) */}
        <div className="flex flex-wrap gap-1.5">
          {POLICY_RUBRIC_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-[#1E62D0] border-[#1E62D0] text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.orderLabel}、{cat.name}
            </button>
          ))}
        </div>

        {/* Rubric Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">编号 / 域</th>
                <th className="py-2.5 px-3 font-semibold">场景事实与评估标准</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">表扬 / 批评</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">嘉奖 / 警告</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">记功 / 记过</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                  协同操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRubricItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    无匹配条款，请尝试更换检索词
                  </td>
                </tr>
              ) : (
                filteredRubricItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 whitespace-nowrap align-top">
                      <div className="font-mono-tabular font-semibold text-slate-800">
                        {item.itemNo}
                      </div>
                      <div className="text-[11px] text-slate-500">{item.categoryName}</div>
                    </td>
                    <td className="py-2.5 px-3 align-top text-slate-800 leading-relaxed">
                      <span>{item.title}</span>
                      {item.hasTerminationRisk && (
                        <span className="ml-2 text-[11px] font-semibold text-rose-700">
                          [含解除合同红线]
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap align-top font-mono-tabular text-slate-700">
                      {item.tier1Label}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap align-top font-mono-tabular text-slate-700">
                      {item.tier2Label}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap align-top font-mono-tabular text-slate-700">
                      {item.tier3Label}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap align-top text-right">
                      <button
                        type="button"
                        onClick={() => onApplyRubricToOa(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1E62D0] bg-[#EEF5FF] border border-[#BFD8FD] hover:bg-[#DBE9FE] rounded-lg whitespace-nowrap"
                      >
                        <span>带入提报 OA</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 15 Redlines Toggle (Moved to Bottom) */}
      <section className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowRedlines((prev) => !prev)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/12 text-rose-700 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                集团 15 条零容忍红线条款（触犯可依法解除劳动合同）
              </div>
              <div className="text-xs text-slate-500">
                含虚假履历、数据造假、泄密、受贿、连续旷工及累计三次记过等刚性约束
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#1E62D0] shrink-0 whitespace-nowrap">
            {showRedlines ? '收起条款' : '展开全部 15 条'}
          </span>
        </button>

        {showRedlines && (
          <div className="px-5 pb-5 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {TERMINATION_REDLINES.map((line) => (
              <div
                key={line.no}
                className="text-xs text-slate-700 bg-rose-50/60 rounded-xl px-3.5 py-2.5 flex items-start gap-2"
              >
                <span className="font-mono-tabular font-semibold text-rose-800 shrink-0">
                  {String(line.no).padStart(2, '0')}.
                </span>
                <span>{line.content}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
