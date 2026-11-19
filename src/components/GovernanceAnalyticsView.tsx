import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  FilterX,
  Layers,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import {
  AccountabilityTicket,
  AppealCase,
  AuditLogEntry,
  Department,
  PolicyGrade,
  RewardNomination,
} from '../types/platform';
import {
  AnalyticsFilterState,
  AnalyticsMetric,
  AnalyticsScope,
  computeAnalyticsDataset,
  formatTimeBucketLabel,
} from '../utils/analytics';
import { ACCOUNTABILITY_STATUS_META } from '../utils/labels';
import { CustomSelect, SelectOption } from './CustomSelect';
import {
  CrossDeptMatrixChart,
  DeptComparisonBarChart,
  GradeSpectrumChart,
  TrendAreaChart,
  WorkflowStatusChart,
} from './GovernanceCharts';

interface GovernanceAnalyticsViewProps {
  tickets: AccountabilityTicket[];
  rewards: RewardNomination[];
  appeals: AppealCase[];
  departments: Department[];
  policyGrades: PolicyGrade[];
  auditLogs: AuditLogEntry[];
  onOpenTicket: (ticketId: string) => void;
  onNavigateRewards: () => void;
}

const DEFAULT_FILTERS: AnalyticsFilterState = {
  scope: 'all',
  metric: 'count',
  selectedDeptId: 'all',
  selectedStatus: 'all',
  timeGranularity: 'week',
  selectedTimeBucket: 'all',
};

export const GovernanceAnalyticsView: React.FC<GovernanceAnalyticsViewProps> = ({
  tickets,
  rewards,
  appeals,
  departments,
  policyGrades,
  auditLogs,
  onOpenTicket,
  onNavigateRewards,
}) => {
  const [filters, setFilters] = useState<AnalyticsFilterState>(DEFAULT_FILTERS);
  const [barLayout, setBarLayout] = useState<'grouped' | 'stacked'>('grouped');
  const [rightChartMode, setRightChartMode] = useState<'donut' | 'funnel' | 'grade'>('donut');
  const [matrixMode, setMatrixMode] = useState<'all' | 'tickets' | 'rewards'>('all');

  const dataset = useMemo(
    () =>
      computeAnalyticsDataset({
        tickets,
        rewards,
        appeals,
        departments,
        policyGrades,
        auditLogs,
        filters,
      }),
    [tickets, rewards, appeals, departments, policyGrades, auditLogs, filters]
  );

  const deptOptions: SelectOption[] = [
    { value: 'all', label: '全部所属部门' },
    ...departments.map((d) => ({
      value: d.id,
      label: d.name,
      badgeText: `${d.headcount}人`,
    })),
  ];

  const hasDrilldown =
    filters.scope !== 'all' ||
    filters.selectedDeptId !== 'all' ||
    filters.selectedStatus !== 'all' ||
    filters.selectedTimeBucket !== 'all';

  const selectedDeptName =
    departments.find((d) => d.id === filters.selectedDeptId)?.name || '';

  const { governanceIndicators: gi } = dataset;

  return (
    <div className="space-y-6">
      {/* Global Multi-Dimensional Control Toolbar */}
      <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'count', label: '单据件数' },
                  { id: 'amount', label: '奖惩金额(¥)' },
                  { id: 'perf_score', label: '绩效分值' },
                  { id: 'per_100_headcount', label: '百人发生率' },
                ] as { id: AnalyticsMetric; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, metric: m.id }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    filters.metric === m.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: '全部业务' },
                  { id: 'cross_dept', label: '仅跨部门' },
                  { id: 'confidential_or_sensitive', label: '保密/自回避/特批' },
                  { id: 'major_or_disputed', label: '重大/争议/ER' },
                ] as { id: AnalyticsScope; label: string }[]
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, scope: s.id }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    filters.scope === s.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-44">
              <CustomSelect
                value={filters.selectedDeptId}
                onChange={(val) => setFilters((f) => ({ ...f, selectedDeptId: val }))}
                options={deptOptions}
                size="sm"
              />
            </div>

            {hasDrilldown && (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>重置维度下钻</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Dimension Summary Line (Zero-pill clean text) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>当前分析维度：</span>
            <span className="font-medium text-slate-800">
              {filters.selectedDeptId === 'all' ? '全公司 6 大部门' : selectedDeptName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-800">
              {filters.selectedStatus === 'all'
                ? '全部流程状态'
                : ACCOUNTABILITY_STATUS_META[filters.selectedStatus].label}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-800">
              {filters.selectedTimeBucket === 'all'
                ? '全周期时间范围'
                : `周期 ${formatTimeBucketLabel(
                    filters.selectedTimeBucket,
                    filters.timeGranularity
                  )}`}
            </span>
          </div>
          <span className="text-slate-400">
            提示：直接点击图表中的部门柱条、状态扇区或时间节点，即可多维联动穿透明细
          </span>
        </div>
      </section>

      {/* Dynamic 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">当前维度事件总量</div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900 font-mono-tabular">
              {gi.totalTickets + gi.totalRewards}
            </span>
            <span className="text-xs text-slate-600 font-mono-tabular">
              问责 {gi.totalTickets} · 奖励 {gi.totalRewards}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">净奖惩财务影响</div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-semibold font-mono-tabular ${
                gi.netAmountYuan >= 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {gi.netAmountYuan >= 0
                ? `+¥${gi.netAmountYuan.toLocaleString()}`
                : `-¥${Math.abs(gi.netAmountYuan).toLocaleString()}`}
            </span>
            <span className="text-xs text-slate-500 font-mono-tabular">
              净绩效 {gi.netPerfScore >= 0 ? `+${gi.netPerfScore}` : gi.netPerfScore} 分
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">跨部门协同事件占比</div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-blue-900 font-mono-tabular">
              {gi.crossDeptSharePct}%
            </span>
            <span className="text-xs text-slate-500 font-mono-tabular">
              保密提报占 {gi.confidentialSharePct}%
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">闭环归档与 ER 介入率</div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900 font-mono-tabular">
              {gi.archivedClosurePct}%
            </span>
            <span className="text-xs text-slate-500 font-mono-tabular">
              ER介入 {gi.erInterventionPct}% · 自回避 {gi.selfSkipCount} 次
            </span>
          </div>
        </div>
      </section>

      {/* Main 2x2 Interactive Visualizations */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Chart 1: Department Comparison */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-900" />
                  <span>部门维度奖惩对比分析</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  对比各部门问责涉事与正向激励分布（支持按人数编制折算百人密度）
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBarLayout('grouped')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    barLayout === 'grouped'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  分组对比
                </button>
                <button
                  type="button"
                  onClick={() => setBarLayout('stacked')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    barLayout === 'stacked'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  堆叠总览
                </button>
              </div>
            </div>

            <DeptComparisonBarChart
              rows={dataset.deptRows}
              metric={filters.metric}
              selectedDeptId={filters.selectedDeptId}
              onSelectDept={(deptId) =>
                setFilters((f) => ({ ...f, selectedDeptId: deptId }))
              }
              layoutMode={barLayout}
            />
          </div>
        </section>

        {/* Chart 2: Workflow Status Donut / Funnel / Grade Spectrum */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-900" />
                  <span>流转阶段与奖惩定级分布</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  切换查看 Mode A 状态环图、阶段漏斗及制度定级光谱
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setRightChartMode('donut')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    rightChartMode === 'donut'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  状态环图
                </button>
                <button
                  type="button"
                  onClick={() => setRightChartMode('funnel')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    rightChartMode === 'funnel'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  闭环漏斗
                </button>
                <button
                  type="button"
                  onClick={() => setRightChartMode('grade')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    rightChartMode === 'grade'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  定级光谱
                </button>
              </div>
            </div>

            {rightChartMode === 'grade' ? (
              <GradeSpectrumChart
                items={dataset.gradeSpectrum}
                metric={filters.metric}
              />
            ) : (
              <WorkflowStatusChart
                segments={dataset.statusSegments}
                selectedStatus={filters.selectedStatus}
                onSelectStatus={(st) =>
                  setFilters((f) => ({ ...f, selectedStatus: st }))
                }
                mode={rightChartMode}
              />
            )}
          </div>
        </section>

        {/* Chart 3: Time Trend Series */}
        <section className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-900" />
                <span>时间维度动态演进趋势</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                追踪问责发起、M8+ 奖励表彰与强审计/申诉事件的周期性波动
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    timeGranularity: 'week',
                    selectedTimeBucket: 'all',
                  }))
                }
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 whitespace-nowrap ${
                  filters.timeGranularity === 'week'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>按周度</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    timeGranularity: 'month',
                    selectedTimeBucket: 'all',
                  }))
                }
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filters.timeGranularity === 'month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                按月度
              </button>
            </div>
          </div>

          <TrendAreaChart
            series={dataset.timeSeries}
            selectedTimeBucket={filters.selectedTimeBucket}
            onSelectTimeBucket={(key) =>
              setFilters((f) => ({ ...f, selectedTimeBucket: key }))
            }
          />
        </section>

        {/* Chart 4: Cross-Dept Interaction Matrix */}
        <section className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-900" />
                <span>跨部门协同与责任流向热力矩阵</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                透视部门间相互提报问责与交叉推荐奖励的真实流向网络
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: '综合流向' },
                  { id: 'tickets', label: '仅问责' },
                  { id: 'rewards', label: '仅奖励' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMatrixMode(m.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    matrixMode === m.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <CrossDeptMatrixChart
            departments={departments}
            cells={dataset.matrixCells}
            selectedDeptId={filters.selectedDeptId}
            onSelectDept={(deptId) =>
              setFilters((f) => ({ ...f, selectedDeptId: deptId }))
            }
            matrixMode={matrixMode}
          />
        </section>
      </div>

      {/* Synchronized Drilldown Ledger */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              维度穿透明细台账（共 {dataset.drilldownRecords.length} 条匹配记录）
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              随上方图表选中的部门、状态、业务口径及时间节点实时联动刷新
            </p>
          </div>
          {hasDrilldown && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs font-medium text-blue-800 hover:underline"
            >
              显示全部记录
            </button>
          )}
        </div>

        {dataset.drilldownRecords.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            当前组合维度下暂无匹配的问责或奖励记录，请尝试放宽筛选条件。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="py-2.5 px-4 font-medium">单号与类别</th>
                  <th className="py-2.5 px-4 font-medium">事件摘要</th>
                  <th className="py-2.5 px-4 font-medium">部门流向</th>
                  <th className="py-2.5 px-4 font-medium">涉事/获奖人</th>
                  <th className="py-2.5 px-4 font-medium">当前状态</th>
                  <th className="py-2.5 px-4 font-medium text-right">金额影响</th>
                  <th className="py-2.5 px-4 font-medium text-right">绩效分值</th>
                  <th className="py-2.5 px-4 font-medium text-right">发起时间</th>
                  <th className="py-2.5 px-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataset.drilldownRecords.map((rec) => {
                  const toneText =
                    rec.statusTone === 'emerald'
                      ? 'text-emerald-700'
                      : rec.statusTone === 'red'
                      ? 'text-red-700'
                      : rec.statusTone === 'blue'
                      ? 'text-blue-700'
                      : rec.statusTone === 'amber'
                      ? 'text-amber-700'
                      : 'text-slate-600';

                  return (
                    <tr key={`${rec.kind}-${rec.id}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono-tabular font-semibold text-slate-900">
                          {rec.docNo}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {rec.kind === 'reward' ? '正向奖励' : '问责工单'}
                          {rec.isCrossDept ? ' · 跨部门' : ' · 部门内'}
                          {rec.isConfidential ? ' · 保密' : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-900 truncate">
                          {rec.title}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {rec.deptNames}
                      </td>
                      <td className="py-3 px-4 text-slate-800 whitespace-nowrap">
                        {rec.actorName}
                      </td>
                      <td className={`py-3 px-4 font-medium whitespace-nowrap ${toneText}`}>
                        {rec.statusLabel}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular whitespace-nowrap">
                        {rec.amountYuan === 0 ? (
                          <span className="text-slate-400">¥0</span>
                        ) : rec.amountYuan > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            +¥{rec.amountYuan}
                          </span>
                        ) : (
                          <span className="text-red-700 font-semibold">
                            -¥{Math.abs(rec.amountYuan)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular whitespace-nowrap">
                        {rec.perfScore === 0 ? (
                          <span className="text-slate-400">0</span>
                        ) : rec.perfScore > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            +{rec.perfScore}
                          </span>
                        ) : (
                          <span className="text-red-700 font-semibold">
                            {rec.perfScore}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-slate-500 whitespace-nowrap">
                        {rec.dateStr}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            rec.kind === 'ticket'
                              ? onOpenTicket(rec.id)
                              : onNavigateRewards()
                          }
                          className="text-blue-800 hover:text-blue-900 font-medium inline-flex items-center gap-0.5"
                        >
                          <span>查看</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
