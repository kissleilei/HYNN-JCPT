import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Megaphone,
  Scale,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  AccountabilityStatus,
  AccountabilityTicket,
  AppealCase,
  AuditLogEntry,
  Department,
  Employee,
  PolicyGrade,
  RewardNomination,
} from '../types/platform';
import { AnalyticsMetric, computeAnalyticsDataset } from '../utils/analytics';
import {
  ACCOUNTABILITY_STATUS_META,
  APPEAL_STATUS_META,
  REWARD_STATUS_META,
} from '../utils/labels';
import {
  CrossDeptMatrixChart,
  DeptComparisonBarChart,
  TrendAreaChart,
  WorkflowStatusChart,
} from './GovernanceCharts';
import { FrontlineEmployeeWorkbench } from './FrontlineEmployeeWorkbench';
import { NavSection } from './Sidebar';

interface WorkbenchViewProps {
  currentUser: Employee;
  tickets: AccountabilityTicket[];
  rewards: RewardNomination[];
  appeals: AppealCase[];
  departments: Department[];
  policyGrades: PolicyGrade[];
  auditLogs: AuditLogEntry[];
  getDisplayReporterName: (ticket: AccountabilityTicket) => string;
  isActionPending?: (key: string) => boolean;
  onNavigate: (section: NavSection) => void;
  onOpenTicket: (ticketId: string) => void;
  onOpenNewAccountability: () => void;
  onUrgeTicket: (ticketId: string) => void | Promise<void>;
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({
  currentUser,
  tickets,
  rewards,
  appeals,
  departments,
  policyGrades,
  auditLogs,
  getDisplayReporterName,
  isActionPending = () => false,
  onNavigate,
  onOpenTicket,
  onOpenNewAccountability,
  onUrgeTicket,
}) => {
  const [workbenchMode, setWorkbenchMode] = useState<'governance' | 'personal'>('governance');
  const [queueFilter, setQueueFilter] = useState<'mine' | 'all_active' | 'reported'>('mine');
  const [showFlowGuide, setShowFlowGuide] = useState(false);
  const [vizDimension, setVizDimension] = useState<'dept' | 'status' | 'trend' | 'matrix'>('dept');
  const [vizMetric, setVizMetric] = useState<AnalyticsMetric>('count');
  const [vizDeptId, setVizDeptId] = useState<string>('all');
  const [vizStatus, setVizStatus] = useState<AccountabilityStatus | 'all'>('all');
  const [vizTimeBucket, setVizTimeBucket] = useState<string>('all');

  const isFrontlineOnly = currentUser.role === 'employee';
  const canTogglePersonal =
    currentUser.role === 'm8_plus' || currentUser.role === 'dept_leader';

  const analyticsData = useMemo(
    () =>
      computeAnalyticsDataset({
        tickets,
        rewards,
        appeals,
        departments,
        policyGrades,
        auditLogs,
        filters: {
          scope: 'all',
          metric: vizMetric,
          selectedDeptId: vizDeptId,
          selectedStatus: vizStatus,
          timeGranularity: 'week',
          selectedTimeBucket: vizTimeBucket,
        },
      }),
    [tickets, rewards, appeals, departments, policyGrades, auditLogs, vizMetric, vizDeptId, vizStatus, vizTimeBucket]
  );

  if (isFrontlineOnly) {
    return (
      <FrontlineEmployeeWorkbench
        currentUser={currentUser}
        tickets={tickets}
        rewards={rewards}
        appeals={appeals}
        getDisplayReporterName={getDisplayReporterName}
        isActionPending={isActionPending}
        onNavigate={onNavigate}
        onOpenTicket={onOpenTicket}
        onOpenNewAccountability={onOpenNewAccountability}
        onUrgeTicket={onUrgeTicket}
      />
    );
  }

  const activeTickets = tickets.filter(
    (t) => t.status !== 'archived' && t.status !== 'appeal_resolved'
  );
  const pendingRewards = rewards.filter((r) => r.status !== 'approved_archived');
  const pendingAppeals = appeals.filter((a) => a.status === 'pending_review');

  const myTodos = activeTickets.filter((t) => {
    if (currentUser.role === 'executive') return t.status === 'major_escalation';
    if (currentUser.role === 'er_lead' || currentUser.role === 'hrd') {
      return t.status === 'er_investigation' || t.status === 'pending_hr_exec';
    }
    if (currentUser.role === 'dept_leader') {
      const isReporterLead =
        t.reporterDeptConfirm.leaderId === currentUser.id && !t.reporterDeptConfirm.confirmed;
      const isAccusedLead =
        t.accusedDeptConfirm.leaderId === currentUser.id &&
        !t.accusedDeptConfirm.confirmed &&
        !t.accusedDeptConfirm.autoSkippedDueToSelfAccused;
      return isReporterLead || isAccusedLead || t.accusedDeptIds.includes(currentUser.departmentId);
    }
    if (currentUser.role === 'hrbp') {
      return t.status === 'pending_confirm' || t.status === 'pending_hr_exec';
    }
    return t.reporterId === currentUser.id || t.accusedEmpId === currentUser.id;
  });

  const myReported = tickets.filter((t) => t.reporterId === currentUser.id);

  const displayedTickets =
    queueFilter === 'mine'
      ? myTodos
      : queueFilter === 'all_active'
      ? activeTickets
      : myReported;

  const canNominateReward =
    currentUser.isM8Plus ||
    currentUser.role === 'm8_plus' ||
    currentUser.role === 'hrd' ||
    currentUser.role === 'executive';

  if (canTogglePersonal && workbenchMode === 'personal') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-2.5">
          <span className="text-xs text-slate-600">
            正在预览「个人员工视角工作台」· 随时切回部门管理视图
          </span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setWorkbenchMode('governance')}
              className="px-3 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900"
            >
              管理治理视图
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchMode('personal')}
              className="px-3 py-1 text-xs font-medium rounded-md bg-white text-slate-900 shadow-xs"
            >
              个人员工视图
            </button>
          </div>
        </div>
        <FrontlineEmployeeWorkbench
          currentUser={currentUser}
          tickets={tickets}
          rewards={rewards}
          appeals={appeals}
          getDisplayReporterName={getDisplayReporterName}
          isActionPending={isActionPending}
          onNavigate={onNavigate}
          onOpenTicket={onOpenTicket}
          onOpenNewAccountability={onOpenNewAccountability}
          onUrgeTicket={onUrgeTicket}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canTogglePersonal && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-2.5">
          <span className="text-xs text-slate-600">
            当前为「{currentUser.title}」管理治理视图，可切换至个人一线视角查看本人积分与待办
          </span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setWorkbenchMode('governance')}
              className="px-3 py-1 text-xs font-medium rounded-md bg-white text-slate-900 shadow-xs"
            >
              管理治理视图
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchMode('personal')}
              className="px-3 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900"
            >
              个人员工视图
            </button>
          </div>
        </div>
      )}
      {/* Top 4-column interactive KPI summary strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('accountability')}
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-lg p-5 text-left transition-colors group"
        >
          <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
            <span>进行中问责工单</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-700 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900 font-mono-tabular">
              {activeTickets.length}
            </span>
            <span className="text-xs text-slate-500">
              累计 {tickets.length} 单
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('rewards')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-lg p-5 text-left transition-colors group"
        >
          <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
            <span>审批中奖励表彰</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900 font-mono-tabular">
              {pendingRewards.length}
            </span>
            <span className="text-xs text-emerald-700 font-medium">
              已批准 {rewards.length - pendingRewards.length} 项
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('appeals')}
          className="bg-white border border-slate-200 hover:border-amber-300 rounded-lg p-5 text-left transition-colors group"
        >
          <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
            <span>待复核申诉案件</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-700 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900 font-mono-tabular">
              {pendingAppeals.length}
            </span>
            <span className="text-xs text-amber-700 font-medium">
              含回避转交 {appeals.filter((a) => a.hrdConflictTriggered).length} 单
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('admin')}
          className="bg-white border border-slate-200 hover:border-slate-400 rounded-lg p-5 text-left transition-colors group"
        >
          <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
            <span>组织规模与覆盖部门</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900 font-mono-tabular">
              2,000
            </span>
            <span className="text-xs text-slate-500">6 大核心协作体系</span>
          </div>
        </button>
      </section>

      {/* Dynamic Multi-Dimensional Visualization Overview */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-900" />
              <span>动态多维治理可视化概览</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              切换部门、流转状态、周度趋势或跨部门协作矩阵维度，实时透视平台问责与激励实况
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Dimension Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'dept', label: '部门分布' },
                  { id: 'status', label: '流转状态' },
                  { id: 'trend', label: '周度趋势' },
                  { id: 'matrix', label: '跨部门矩阵' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setVizDimension(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    vizDimension === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {vizDimension === 'dept' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'count', label: '件数' },
                    { id: 'amount', label: '金额(¥)' },
                    { id: 'perf_score', label: '绩效分' },
                    { id: 'per_100_headcount', label: '百人率' },
                  ] as { id: AnalyticsMetric; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setVizMetric(m.id)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      vizMetric === m.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md flex items-center gap-1 whitespace-nowrap"
            >
              <span>全维度分析看板</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            {vizDimension === 'dept' && (
              <DeptComparisonBarChart
                rows={analyticsData.deptRows}
                metric={vizMetric}
                selectedDeptId={vizDeptId}
                onSelectDept={setVizDeptId}
                height={220}
              />
            )}
            {vizDimension === 'status' && (
              <WorkflowStatusChart
                segments={analyticsData.statusSegments}
                selectedStatus={vizStatus}
                onSelectStatus={setVizStatus}
                mode="donut"
              />
            )}
            {vizDimension === 'trend' && (
              <TrendAreaChart
                series={analyticsData.timeSeries}
                selectedTimeBucket={vizTimeBucket}
                onSelectTimeBucket={setVizTimeBucket}
                height={215}
              />
            )}
            {vizDimension === 'matrix' && (
              <CrossDeptMatrixChart
                departments={departments}
                cells={analyticsData.matrixCells}
                selectedDeptId={vizDeptId}
                onSelectDept={setVizDeptId}
              />
            )}
          </div>

          {/* Governance Real-time Health Ratios */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">治理运行维度指标</span>
              {(vizDeptId !== 'all' || vizStatus !== 'all' || vizTimeBucket !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setVizDeptId('all');
                    setVizStatus('all');
                    setVizTimeBucket('all');
                  }}
                  className="text-blue-800 hover:underline font-medium"
                >
                  重置下钻
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">跨部门协同/关联事件占比</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {analyticsData.governanceIndicators.crossDeptSharePct}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-800 rounded-full transition-all duration-300"
                    style={{ width: `${analyticsData.governanceIndicators.crossDeptSharePct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">实名保密保护启用率</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {analyticsData.governanceIndicators.confidentialSharePct}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${analyticsData.governanceIndicators.confidentialSharePct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">ER 调查与抽查介入率</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {analyticsData.governanceIndicators.erInterventionPct}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-600 rounded-full transition-all duration-300"
                    style={{ width: `${analyticsData.governanceIndicators.erInterventionPct}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-slate-400">当前净奖惩金额</div>
                  <div
                    className={`font-mono-tabular font-semibold text-sm mt-0.5 ${
                      analyticsData.governanceIndicators.netAmountYuan >= 0
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {analyticsData.governanceIndicators.netAmountYuan >= 0
                      ? `+¥${analyticsData.governanceIndicators.netAmountYuan.toLocaleString()}`
                      : `-¥${Math.abs(
                          analyticsData.governanceIndicators.netAmountYuan
                        ).toLocaleString()}`}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">自动回避与强审计</div>
                  <div className="font-mono-tabular font-semibold text-sm text-slate-900 mt-0.5">
                    {analyticsData.governanceIndicators.selfSkipCount} 次 /{' '}
                    {analyticsData.governanceIndicators.sensitiveAuditCount} 条
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collapsible Mode A & Reward Workflow Guide */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFlowGuide((prev) => !prev)}
          className="w-full px-5 py-3 flex items-center justify-between text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>跨部门问责闭环（Mode A）与 M8+ 激励机制流转规则导览</span>
          <span className="flex items-center gap-1 text-blue-800">
            <span>{showFlowGuide ? '收起规则' : '展开查看'}</span>
            {showFlowGuide ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        </button>
        {showFlowGuide && (
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/70 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
            <div>
              <div className="font-semibold text-slate-900 mb-1">
                1. 问责提报与前端分流
              </div>
              <p>
                全员可发起（可选实名保密脱敏）。双方部门领导确认与被问责人在线陈述同步开启；领导本人涉事自动回避。无异议直接定级归档，存在争议/多部门/重大事故自动转入 ER 调查。
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-1">
                2. M8+ 奖励表彰与特批通道
              </div>
              <p>
                仅 M8 及以上职级可发起，获奖人不限职级。优先鼓励跨部门协作，部门内部提报须走【内部例外特批通道】。按等级自动匹配部门、全员公示及钉钉群喜报。
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-1">
                3. 申诉复核与长期档案
              </div>
              <p>
                生效后可发起申诉，由 HRD 统一复核（涉 HRD 利益冲突时强制回避至总经理终裁）。所有记录计入员工长期档案与处分影响期，并支持 HR 按月导出算薪明细。
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Main split: Personal / Role Pending Queue + Quick Action Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 columns: Role Pending Queue */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                我的待办与流转跟踪（{currentUser.name} · {currentUser.title}）
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                不设硬性超时自动流转 SLA，支持人工催办提醒与手动升级督办
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setQueueFilter('mine')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  queueFilter === 'mine'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                待我处理 ({myTodos.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter('all_active')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  queueFilter === 'all_active'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全部进行中 ({activeTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter('reported')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  queueFilter === 'reported'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                我发起的 ({myReported.length})
              </button>
            </div>
          </div>

          {displayedTickets.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-slate-900">
                当前视图下暂无工单记录
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                您可切换上方筛选查看全部进行中工单，或发起新的跨部门问责提报。
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setQueueFilter('all_active')}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  查看全部进行中工单
                </button>
                <button
                  type="button"
                  onClick={onOpenNewAccountability}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg"
                >
                  发起问责提报
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayedTickets.map((ticket) => {
                const statusMeta = ACCOUNTABILITY_STATUS_META[ticket.status];
                return (
                  <div
                    key={ticket.id}
                    className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500">
                        <span className="font-mono-tabular font-medium text-slate-700">
                          {ticket.ticketNo}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{ticket.accusedDeptNames.join(' / ')}</span>
                        <span aria-hidden="true">·</span>
                        <span>提报人：{getDisplayReporterName(ticket)}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-medium ${statusMeta.textClass}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenTicket(ticket.id)}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-800 text-left block truncate max-w-full"
                      >
                        {ticket.title}
                      </button>
                      <div className="text-xs text-slate-500">
                        被问责人：{ticket.accusedEmpName} · 已催办{' '}
                        <span className="font-mono-tabular">{ticket.urgeCount}</span> 次
                        {ticket.isMajorAccident && ' · 重大事故直报'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ticket.status !== 'archived' &&
                        ticket.status !== 'appeal_resolved' && (() => {
                          const stageUrged = (ticket.urgedStages || []).includes(ticket.status);
                          const isUrging = isActionPending(`ticket:urge:${ticket.id}`);
                          return (
                            <button
                              type="button"
                              disabled={stageUrged || isUrging}
                              onClick={() => onUrgeTicket(ticket.id)}
                              title={stageUrged ? '当前节点已催办过，请等待流转至下一节点后再催办' : '推送钉钉人工催办卡片'}
                              className={`px-3 py-1.5 text-xs font-medium border rounded-md flex items-center gap-1 whitespace-nowrap ${
                                stageUrged || isUrging
                                  ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                                  : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {isUrging ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                              ) : (
                                <BellRing
                                  className={`w-3.5 h-3.5 ${
                                    stageUrged ? 'text-slate-400' : 'text-amber-600'
                                  }`}
                                />
                              )}
                              <span>
                                {isUrging ? '催办中...' : stageUrged ? '本节点已催办' : '钉钉催办'}
                              </span>
                            </button>
                          );
                        })()}
                      <button
                        type="button"
                        onClick={() => onOpenTicket(ticket.id)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md whitespace-nowrap"
                      >
                        进入处理
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right column: Role Action Shortcuts & Pending Appeals/Rewards */}
        <div className="space-y-4">
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">
              高频业务入口
            </h2>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onOpenNewAccountability}
                className="w-full p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 text-left transition-colors flex items-start gap-3"
              >
                <ShieldAlert className="w-4 h-4 text-blue-800 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    发起跨部门问责提报
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    全员可发起 · 支持实名保密脱敏与多部门定责
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('rewards')}
                className="w-full p-3 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50/30 text-left transition-colors flex items-start gap-3"
              >
                <Award className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    M8+ 奖励表彰与喜报公示
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {canNominateReward
                      ? '当前职级具备奖励提报权（跨部门优先）'
                      : '当前职级可浏览全员表彰与审批进度'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('publicity')}
                className="w-full p-3 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50/30 text-left transition-colors flex items-start gap-3"
              >
                <Megaphone className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    恒翼能全员奖惩公示栏（当月看板）
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    当月表彰光荣榜与惩处警示台双栏对比、部门柱图联动
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('appeals')}
                className="w-full p-3 border border-slate-200 rounded-lg hover:border-amber-300 hover:bg-amber-50/30 text-left transition-colors flex items-start gap-3"
              >
                <Scale className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    申诉复核与回避裁决中心
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    HRD 统一复核（利益冲突自动强制回避）
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="w-full p-3 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 text-left transition-colors flex items-start gap-3"
              >
                <TrendingUp className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    制度参数与 HR 算薪明细导出
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    配置奖惩金额/分值/影响期，导出算薪 CSV
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* Recent Rewards & Appeals snapshot */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              最新奖励与申诉动态
            </h2>
            <div className="divide-y divide-slate-100 text-xs">
              {rewards.slice(0, 2).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onNavigate('rewards')}
                  className="py-2.5 first:pt-0 w-full text-left hover:bg-slate-50 rounded transition-colors block"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-0.5">
                    <span className="font-mono-tabular">{r.rewardNo}</span>
                    <span className={REWARD_STATUS_META[r.status].textClass}>
                      {REWARD_STATUS_META[r.status].label}
                    </span>
                  </div>
                  <div className="font-medium text-slate-800 truncate">
                    {r.winnerName} · {r.gradeName}（{r.title}）
                  </div>
                </button>
              ))}
              {appeals.slice(0, 2).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onNavigate('appeals')}
                  className="py-2.5 last:pb-0 w-full text-left hover:bg-slate-50 rounded transition-colors block"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-0.5">
                    <span className="font-mono-tabular">{a.appealNo}</span>
                    <span className={APPEAL_STATUS_META[a.status].textClass}>
                      {APPEAL_STATUS_META[a.status].label}
                    </span>
                  </div>
                  <div className="font-medium text-slate-800 truncate">
                    {a.appellantName} 申诉 {a.ticketNo} · {a.assignedReviewerName}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
