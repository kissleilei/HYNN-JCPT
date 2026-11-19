import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  ArrowRight,
  BookOpen,
  Coins,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  Wallet,
} from 'lucide-react';
import {
  COMPANY_POLICY_META,
  POLICY_RUBRIC_CATEGORIES,
  POLICY_RUBRIC_ITEMS,
  PolicyRubricItem,
  TERMINATION_REDLINES,
} from '../data/policyRubricData';
import {
  AccountabilityTicket,
  Employee,
  RewardNomination,
} from '../types/platform';

interface PolicyStandardsViewProps {
  currentUser: Employee;
  employees: Employee[];
  tickets: AccountabilityTicket[];
  rewards: RewardNomination[];
  onStartAccountabilityFromRubric: (rubric: PolicyRubricItem) => void;
  onStartRewardFromRubric: (rubric: PolicyRubricItem) => void;
}

export const PolicyStandardsView: React.FC<PolicyStandardsViewProps> = ({
  currentUser,
  employees,
  tickets,
  rewards,
  onStartAccountabilityFromRubric,
  onStartRewardFromRubric,
}) => {
  const [subTab, setSubTab] = useState<'rubric' | 'charter' | 'pool'>('rubric');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<
    'all' | 'reward' | 'punishment' | 'redline'
  >('all');
  const [search, setSearch] = useState('');
  const [annualBudgetYuan, setAnnualBudgetYuan] = useState<number>(
    COMPANY_POLICY_META.annualBudgetPoolYuan
  );

  const filteredRubrics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return POLICY_RUBRIC_ITEMS.filter((item) => {
      const matchCat = selectedCat === 'all' || item.categoryId === selectedCat;
      const matchDir =
        directionFilter === 'all'
          ? true
          : directionFilter === 'redline'
          ? Boolean(item.hasTerminationRisk)
          : item.direction === directionFilter || item.direction === 'both';
      const matchQ =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.itemNo.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q);
      return matchCat && matchDir && matchQ;
    });
  }, [selectedCat, directionFilter, search]);

  // Bonus pool live ledger calculation (Clause 4.4: 100% penalties + annual budget - approved rewards)
  const poolStats = useMemo(() => {
    const effectivePenaltyTickets = tickets.filter(
      (t) =>
        (t.status === 'archived' ||
          t.status === 'appealing' ||
          t.status === 'appeal_resolved') &&
        t.execution &&
        t.execution.gradeName !== '已撤销处分' &&
        t.execution.amountYuan < 0
    );

    const penaltyInflowYuan = effectivePenaltyTickets.reduce(
      (sum, t) => sum + Math.abs(t.execution?.amountYuan || 0),
      0
    );

    const approvedRewards = rewards.filter(
      (r) => r.status === 'approved_archived' && r.amountYuan > 0
    );
    const rewardOutflowYuan = approvedRewards.reduce(
      (sum, r) => sum + r.amountYuan,
      0
    );

    const pendingRewardsYuan = rewards
      .filter((r) => r.status !== 'approved_archived' && r.amountYuan > 0)
      .reduce((sum, r) => sum + r.amountYuan, 0);

    const totalPoolInflow = annualBudgetYuan + penaltyInflowYuan;
    const balanceYuan = totalPoolInflow - rewardOutflowYuan;

    // Employee cumulative upgrade status
    const employeeLedger = employees.map((emp) => {
      const empPunishments = tickets.filter(
        (t) =>
          t.accusedEmpId === emp.id &&
          (t.status === 'archived' ||
            t.status === 'appealing' ||
            t.status === 'appeal_resolved') &&
          t.execution &&
          t.execution.gradeName !== '已撤销处分'
      );
      const empRewards = approvedRewards.filter((r) => r.winnerId === emp.id);

      const netAmountYuan =
        empPunishments.reduce((s, t) => s + (t.execution?.amountYuan || 0), 0) +
        empRewards.reduce((s, r) => s + r.amountYuan, 0);
      const equivalentPoints = Number(
        (netAmountYuan / COMPANY_POLICY_META.pointValueYuan).toFixed(1)
      );

      // Count punishment grades for cumulative upgrade tracking (3批评->1警告->1记过->解除)
      const minorCount = empPunishments.filter((t) =>
        ['口头警告', '批评'].includes(t.execution?.gradeName || '')
      ).length;
      const warnCount = empPunishments.filter((t) =>
        ['书面警告', '警告'].includes(t.execution?.gradeName || '')
      ).length;
      const demeritCount = empPunishments.filter((t) =>
        ['记过', '记大过'].includes(t.execution?.gradeName || '')
      ).length;

      return {
        emp,
        punishmentCount: empPunishments.length,
        rewardCount: empRewards.length,
        netAmountYuan,
        equivalentPoints,
        minorCount,
        warnCount,
        demeritCount,
      };
    });

    return {
      effectivePenaltyTickets,
      approvedRewards,
      penaltyInflowYuan,
      rewardOutflowYuan,
      pendingRewardsYuan,
      totalPoolInflow,
      balanceYuan,
      employeeLedger,
    };
  }, [tickets, rewards, employees, annualBudgetYuan]);

  const canNominateReward =
    currentUser.isM8Plus ||
    currentUser.role === 'm8_plus' ||
    currentUser.role === 'hrd' ||
    currentUser.role === 'executive';

  return (
    <div className="space-y-5">
      {/* Header Banner & Segmented Switcher */}
      <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-900" />
              <span>{COMPANY_POLICY_META.companyName} · 奖惩管理制度与标尺库</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              原则：{COMPANY_POLICY_META.principles.join(' · ')} ｜ 积分换算基准：
              <span className="font-mono-tabular font-semibold text-slate-800">
                1 积分 = ¥{COMPANY_POLICY_META.pointValueYuan} 元人民币
              </span>
              ｜ 奖惩委 2 日内复核 · 3 日内三阶申诉
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setSubTab('rubric')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                subTab === 'rubric'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              《附件一》奖惩标尺检索（{POLICY_RUBRIC_ITEMS.length}项）
            </button>
            <button
              type="button"
              onClick={() => setSubTab('charter')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                subTab === 'charter'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              运作机制与 15 条红线
            </button>
            <button
              type="button"
              onClick={() => setSubTab('pool')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                subTab === 'pool'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              独立奖金池与积分累积台账
            </button>
          </div>
        </div>
      </section>

      {/* TAB 1: Interactive Annex I Rubric Search & Direct Citation */}
      {subTab === 'rubric' && (
        <div className="space-y-4">
          {/* Category Quick Selector & Search */}
          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="检索标尺条款关键词（如：ECN、泄密、造假、安全、钉钉、迟到、降本）..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'all', label: '全部条款' },
                    { id: 'reward', label: '正向加分' },
                    { id: 'punishment', label: '负向扣分' },
                    { id: 'redline', label: '含解除合同红线' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDirectionFilter(f.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      directionFilter === f.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 9 Business Domains Strip */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCat('all')}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  selectedCat === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 font-medium'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                全部 9 大板块
              </button>
              {POLICY_RUBRIC_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat.id)}
                  title={cat.summary}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    selectedCat === cat.id
                      ? 'bg-blue-900 text-white border-blue-900 font-medium'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat.orderLabel}、{cat.name}
                </button>
              ))}
            </div>
          </section>

          {/* Rubric Table */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                共匹配{' '}
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {filteredRubrics.length}
                </span>{' '}
                条量化奖惩标尺（惩处条款可一键发起问责工单，正向条款可一键发起表彰申报单）
              </span>
              <span className="font-mono-tabular">
                积分折算参考：1 分 = ¥100
              </span>
            </div>

            {filteredRubrics.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                未检索到匹配的奖惩标尺条款，请尝试更换关键词。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <th className="py-2.5 px-4 font-medium whitespace-nowrap">条款编号</th>
                      <th className="py-2.5 px-4 font-medium whitespace-nowrap">业务板块</th>
                      <th className="py-2.5 px-4 font-medium">考核内容与量化细则</th>
                      <th className="py-2.5 px-4 font-medium text-center whitespace-nowrap">
                        表扬 / 批评
                      </th>
                      <th className="py-2.5 px-4 font-medium text-center whitespace-nowrap">
                        嘉奖 / 警告
                      </th>
                      <th className="py-2.5 px-4 font-medium text-center whitespace-nowrap">
                        记功 / 记过
                      </th>
                      <th className="py-2.5 px-4 font-medium text-right whitespace-nowrap">
                        依据条款发起
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRubrics.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-800 whitespace-nowrap">
                          {item.itemNo}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {item.categoryName}
                        </td>
                        <td className="py-3 px-4 text-slate-900 leading-relaxed max-w-xl">
                          <span>{item.title}</span>
                          {item.hasTerminationRisk && (
                            <span className="ml-2 text-[11px] font-semibold text-red-700">
                              · 严重情形可解除劳动合同
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono-tabular font-medium text-slate-700 whitespace-nowrap">
                          {item.tier1Label}
                        </td>
                        <td className="py-3 px-4 text-center font-mono-tabular font-medium text-slate-700 whitespace-nowrap">
                          {item.tier2Label}
                        </td>
                        <td className="py-3 px-4 text-center font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                          {item.tier3Label}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {(item.direction === 'punishment' ||
                              item.direction === 'both') && (
                              <button
                                type="button"
                                onClick={() => onStartAccountabilityFromRubric(item)}
                                title="依据本条款的负向扣分/惩处情形发起问责工单"
                                className="px-2.5 py-1 text-[11px] font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded inline-flex items-center gap-1"
                              >
                                <ShieldAlert className="w-3 h-3" />
                                <span>发起问责</span>
                              </button>
                            )}
                            {(item.direction === 'reward' ||
                              item.direction === 'both') && (
                              <button
                                type="button"
                                onClick={() => onStartRewardFromRubric(item)}
                                title={
                                  canNominateReward
                                    ? '依据本条款的正向加分/表彰情形发起奖励表彰申报单'
                                    : '点击带入本条款跳转奖励表彰页（需 M8+ 职级发起申报）'
                                }
                                className="px-2.5 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded inline-flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>发起表彰</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: Governance Charter, Cumulative Escalation & 15 Redlines */}
      {subTab === 'charter' && (
        <div className="space-y-5">
          {/* 4 Organizational Responsibilities */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {COMPANY_POLICY_META.orgResponsibilities.map((org) => (
              <div
                key={org.role}
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-2"
              >
                <div className="text-sm font-semibold text-slate-900">{org.role}</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  成员：{org.composition}
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {org.duty}
                </div>
              </div>
            ))}
          </section>

          {/* Cumulative Upgrade & 3-Stage Appeal Chain */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-900" />
                <span>4.1.3 惩处累积升级机制与积分规则</span>
              </h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded text-slate-800">
                    批评 × 3 次
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-amber-900">
                    升级为 1 次警告
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded text-orange-900">
                    警告 × 3 升级为记过
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-red-800 font-semibold">
                    记过 × 3 解除合同
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  注：因累计次数触发的惩处升级，不再额外重复核减绩效分；1 积分折合 ¥100 人民币，月度工资结算时统一兑现。
                </p>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {COMPANY_POLICY_META.gradePointRules.map((rule) => (
                  <div
                    key={rule.grade}
                    className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <span
                        className={`font-semibold ${
                          rule.category === 'reward' ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {rule.grade}
                      </span>
                      <span className="text-slate-500 ml-2">{rule.note}</span>
                    </div>
                    <div className="font-mono-tabular text-slate-800 font-medium">
                      {rule.pointsRange} · {rule.yuanRange}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Appeal & Execution Flow + Redlines preview */}
            <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-700" />
                <span>九、解除劳动合同情形（15 条制度高压红线）</span>
              </h3>
              <p className="text-xs text-slate-500">
                以下行为视为严重违反劳动纪律或公司规章制度，依法予以解除劳动合同且不作任何经济补偿或赔偿：
              </p>
              <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs">
                {TERMINATION_REDLINES.map((r) => (
                  <div key={r.no} className="px-3.5 py-2.5 flex items-start gap-2.5">
                    <span className="font-mono-tabular font-semibold text-red-700 shrink-0">
                      {String(r.no).padStart(2, '0')}.
                    </span>
                    <span className="text-slate-800 leading-relaxed">{r.content}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 3: Independent Bonus Pool & Cumulative Employee Points Ledger */}
      {subTab === 'pool' && (
        <div className="space-y-5">
          {/* Bonus Pool Overview Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
                <span>公司年度激励预算</span>
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl font-semibold text-slate-900 font-mono-tabular">
                  ¥{annualBudgetYuan.toLocaleString()}
                </span>
                <input
                  type="number"
                  step={10000}
                  min={0}
                  value={annualBudgetYuan}
                  onChange={(e) =>
                    setAnnualBudgetYuan(Math.max(0, Number(e.target.value) || 0))
                  }
                  aria-label="调整年度激励预算金额"
                  className="w-24 px-2 py-1 text-xs font-mono-tabular border border-slate-200 rounded text-right"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-medium text-slate-500 mb-2">
                员工处罚金 100% 汇入
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-semibold text-amber-700 font-mono-tabular">
                  +¥{poolStats.penaltyInflowYuan.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-mono-tabular">
                  来源 {poolStats.effectivePenaltyTickets.length} 笔惩处问责
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-medium text-slate-500 mb-2">
                已核发奖励池支出
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-semibold text-emerald-700 font-mono-tabular">
                  -¥{poolStats.rewardOutflowYuan.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-mono-tabular">
                  待审批锁定 ¥{poolStats.pendingRewardsYuan.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
                <span>财务独立账户当前结余</span>
                <Coins className="w-3.5 h-3.5 text-blue-800" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-semibold text-blue-900 font-mono-tabular">
                  ¥{poolStats.balanceYuan.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">每季度审计公示</span>
              </div>
            </div>
          </section>

          {/* Employee Points & Cumulative Escalation Ledger */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {currentUser.role === 'employee'
                    ? '我的个人积分与累积升级水位'
                    : '综合管理部 · 员工积分台账与惩处累积升级预警'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentUser.role === 'employee'
                    ? '依据《奖惩管理制度》4.1.3 & 4.3 条款：1 积分 = ¥100；为保障员工隐私，一线员工仅可查看本人积分台账'
                    : '依据《奖惩管理制度》4.1.3 & 4.3 条款：1 积分 = ¥100，实时追踪批评/警告/记过累计次数与升级阈值'}
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono-tabular">
                {currentUser.role === 'employee'
                  ? `仅本人（${currentUser.name}）`
                  : `在册样本员工 ${poolStats.employeeLedger.length} 人`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="py-2.5 px-4 font-medium">工号 / 姓名</th>
                    <th className="py-2.5 px-4 font-medium">所属部门</th>
                    <th className="py-2.5 px-4 font-medium text-right">表彰次数</th>
                    <th className="py-2.5 px-4 font-medium text-right">问责次数</th>
                    <th className="py-2.5 px-4 font-medium text-right">等效净积分</th>
                    <th className="py-2.5 px-4 font-medium text-right">折合金额(元)</th>
                    <th className="py-2.5 px-4 font-medium">累积升级预警状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(currentUser.role === 'employee'
                    ? poolStats.employeeLedger.filter((r) => r.emp.id === currentUser.id)
                    : poolStats.employeeLedger
                  ).map((row) => {
                    const nearUpgrade =
                      row.minorCount >= 2 || row.warnCount >= 2 || row.demeritCount >= 2;
                    return (
                      <tr key={row.emp.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono-tabular text-slate-500 mr-1.5">
                            {row.emp.empNo}
                          </span>
                          <span className="font-medium text-slate-900">
                            {row.emp.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {row.emp.departmentName} · {row.emp.rank}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular text-emerald-700 font-medium">
                          {row.rewardCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular text-amber-700 font-medium">
                          {row.punishmentCount}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono-tabular font-semibold ${
                            row.equivalentPoints >= 0
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }`}
                        >
                          {row.equivalentPoints >= 0
                            ? `+${row.equivalentPoints}`
                            : row.equivalentPoints}{' '}
                          分
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">
                          {row.netAmountYuan >= 0
                            ? `+¥${row.netAmountYuan}`
                            : `-¥${Math.abs(row.netAmountYuan)}`}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {row.punishmentCount === 0 ? (
                            <span className="text-slate-400">正常 · 无处分累积</span>
                          ) : nearUpgrade ? (
                            <span className="text-red-700 font-medium">
                              临近累积升级阈值（警告 {row.warnCount}/3 · 记过 {row.demeritCount}/3）
                            </span>
                          ) : (
                            <span className="text-amber-700">
                              累计记录（口头/批评 {row.minorCount}/3 · 警告 {row.warnCount}/3 · 记过 {row.demeritCount}/3）
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
