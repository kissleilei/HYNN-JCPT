import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Clock,
  Download,
  FolderArchive,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  AccountabilityTicket,
  AuditLogEntry,
  Department,
  Employee,
  RewardNomination,
} from '../types/platform';
import { AnalyticsMetric, computeAnalyticsDataset } from '../utils/analytics';
import { AUDIT_ACTION_LABELS, downloadCsvFile } from '../utils/labels';
import { CustomSelect, SelectOption } from './CustomSelect';
import { CrossDeptMatrixChart, DeptComparisonBarChart } from './GovernanceCharts';

interface ArchivesAndAuditViewProps {
  currentUser: Employee;
  employees: Employee[];
  departments: Department[];
  tickets: AccountabilityTicket[];
  rewards: RewardNomination[];
  auditLogs: AuditLogEntry[];
}

export const ArchivesAndAuditView: React.FC<ArchivesAndAuditViewProps> = ({
  currentUser,
  employees,
  departments,
  tickets,
  rewards,
  auditLogs,
}) => {
  const isEmployeeRole = currentUser.role === 'employee';
  const [subTab, setSubTab] = useState<'archives' | 'audit' | 'analytics'>(
    'archives'
  );
  const [searchEmp, setSearchEmp] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    employees[0]?.id || ''
  );
  const [onlySensitiveAudit, setOnlySensitiveAudit] = useState(false);
  const [analyticsMetric, setAnalyticsMetric] = useState<AnalyticsMetric>('count');
  const [analyticsDeptId, setAnalyticsDeptId] = useState<string>('all');

  const analyticsDataset = useMemo(
    () =>
      computeAnalyticsDataset({
        tickets,
        rewards,
        appeals: [],
        departments,
        policyGrades: [],
        auditLogs,
        filters: {
          scope: 'all',
          metric: analyticsMetric,
          selectedDeptId: analyticsDeptId,
          selectedStatus: 'all',
          timeGranularity: 'week',
          selectedTimeBucket: 'all',
        },
      }),
    [tickets, rewards, departments, auditLogs, analyticsMetric, analyticsDeptId]
  );

  const deptOptions: SelectOption[] = [
    { value: 'all', label: '全部所属部门' },
    ...departments.map((d) => ({
      value: d.id,
      label: d.name,
      badgeText: `${d.headcount}人`,
    })),
  ];

  const filteredEmployees = employees.filter((e) => {
    const matchDept = deptFilter === 'all' || e.departmentId === deptFilter;
    const q = searchEmp.trim().toLowerCase();
    const matchQ =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.empNo.toLowerCase().includes(q) ||
      e.departmentName.toLowerCase().includes(q);
    return matchDept && matchQ;
  });

  const effectiveTab = isEmployeeRole ? 'archives' : subTab;
  const selectedEmp = isEmployeeRole
    ? currentUser
    : employees.find((e) => e.id === selectedEmpId) || filteredEmployees[0] || null;

  // Compute selected employee's archive records
  const empTickets = selectedEmp
    ? tickets.filter(
        (t) =>
          t.accusedEmpId === selectedEmp.id &&
          (t.status === 'archived' ||
            t.status === 'appealing' ||
            t.status === 'appeal_resolved')
      )
    : [];
  const empRewards = selectedEmp
    ? rewards.filter(
        (r) => r.winnerId === selectedEmp.id && r.status === 'approved_archived'
      )
    : [];

  const totalAmountYuan =
    empTickets.reduce((sum, t) => sum + (t.execution?.amountYuan || 0), 0) +
    empRewards.reduce((sum, r) => sum + r.amountYuan, 0);

  const totalPerfScore =
    empTickets.reduce((sum, t) => sum + (t.execution?.perfScore || 0), 0) +
    empRewards.reduce((sum, r) => sum + r.perfScore, 0);

  const activeRestrictions = empTickets.filter(
    (t) =>
      t.execution &&
      t.execution.impactPeriodMonths > 0 &&
      t.execution.gradeName !== '已撤销处分'
  );

  const filteredAudits = onlySensitiveAudit
    ? auditLogs.filter((l) => l.isSensitiveAudit)
    : auditLogs;

  const handleExportAuditCsv = () => {
    downloadCsvFile(
      '合规审计与保密查看日志.csv',
      ['时间戳', '操作人', '审计动作', '关联单号', '是否强审计', '留痕详情'],
      filteredAudits.map((l) => [
        l.timestamp,
        l.actorName,
        AUDIT_ACTION_LABELS[l.actionType],
        l.targetNo,
        l.isSensitiveAudit ? '强审计' : '常规',
        l.detail,
      ])
    );
  };

  const handleExportEmpArchive = () => {
    if (!selectedEmp) return;
    const rows: (string | number)[][] = [
      ...empRewards.map((r) => [
        r.rewardNo,
        '正向奖励',
        r.gradeName,
        r.title,
        `+${r.amountYuan}`,
        `+${r.perfScore}`,
        r.approvedAt || r.createdAt,
      ]),
      ...empTickets.map((t) => [
        t.ticketNo,
        '问责处分',
        t.execution?.gradeName || '已处理',
        t.title,
        t.execution?.amountYuan ?? 0,
        t.execution?.perfScore ?? 0,
        t.archivedAt || t.updatedAt,
      ]),
    ];
    downloadCsvFile(
      `员工长期奖惩档案_${selectedEmp.empNo}_${selectedEmp.name}.csv`,
      ['单号', '类别', '定级', '事由标题', '金额变动(元)', '绩效分值', '归档时间'],
      rows
    );
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      {isEmployeeRole ? (
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              我的个人长期奖惩档案（{currentUser.name} · {currentUser.empNo}）
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              为保护全员隐私，一线员工仅可查看本人奖惩记录与影响期状态，其他同事档案与 HR 审计日志仅对授权管理/HR 角色开放。
            </p>
          </div>
          <span className="text-xs text-emerald-700 font-medium">
            个人隐私边界已启用
          </span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setSubTab('archives')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                effectiveTab === 'archives'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              员工长期奖惩档案
            </button>
            <button
              type="button"
              onClick={() => setSubTab('audit')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                effectiveTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              合规审计与保密查看日志（{auditLogs.length}）
            </button>
            <button
              type="button"
              onClick={() => setSubTab('analytics')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                effectiveTab === 'analytics'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              部门协作与奖惩分布统计
            </button>
          </div>

          <div className="text-xs text-slate-500">
            沉淀晋升资格校验、年度绩效校准及处分影响期核心数据依据
          </div>
        </div>
      )}

      {effectiveTab === 'archives' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Employee Roster List (hidden for frontline employees) */}
          {!isEmployeeRole && (
            <div className="xl:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-slate-200 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchEmp}
                    onChange={(e) => setSearchEmp(e.target.value)}
                    placeholder="搜索员工姓名、工号或部门..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md"
                  />
                </div>
                <CustomSelect
                  value={deptFilter}
                  onChange={setDeptFilter}
                  options={deptOptions}
                  size="sm"
                />
              </div>
              <div className="divide-y divide-slate-100 max-h-[64vh] overflow-y-auto">
                {filteredEmployees.map((emp) => {
                  const activeCount = tickets.filter(
                    (t) =>
                      t.accusedEmpId === emp.id &&
                      t.execution &&
                      t.execution.impactPeriodMonths > 0 &&
                      t.execution.gradeName !== '已撤销处分' &&
                      (t.status === 'archived' ||
                        t.status === 'appealing' ||
                        t.status === 'appeal_resolved')
                  ).length;

                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedEmpId(emp.id)}
                      className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between ${
                        selectedEmp?.id === emp.id
                          ? 'bg-blue-50/70'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {emp.name}{' '}
                          <span className="font-mono-tabular text-xs text-slate-500">
                            {emp.empNo}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {emp.departmentName} · {emp.rank}
                        </div>
                      </div>
                      {activeCount > 0 && (
                        <span className="text-[11px] font-medium text-amber-700">
                          影响期中({activeCount})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Employee Long-Term Archive Profile */}
          <div
            className={`${
              isEmployeeRole ? 'xl:col-span-12' : 'xl:col-span-8'
            } bg-white border border-slate-200 rounded-lg p-6 space-y-6`}
          >
            {!selectedEmp ? (
              <div className="py-12 text-center text-sm text-slate-500">
                请选择员工查看长期档案
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
                      {selectedEmp.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        {selectedEmp.name}{' '}
                        <span className="font-mono-tabular text-xs text-slate-500 font-normal">
                          ({selectedEmp.empNo})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedEmp.departmentName} · {selectedEmp.title} · 职级{' '}
                        {selectedEmp.rank}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <div className="text-slate-500">晋升与评优资格校验状态</div>
                      <div
                        className={`font-semibold mt-0.5 ${
                          activeRestrictions.length > 0
                            ? 'text-red-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {activeRestrictions.length > 0
                          ? `限制晋升/评优（存在 ${activeRestrictions.length} 项生效处分影响期）`
                          : '资格正常（无处分影响期限制）'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportEmpArchive}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>导出档案</span>
                    </button>
                  </div>
                </div>

                {/* Cumulative Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-xs text-slate-500">累计奖励表彰</div>
                    <div className="text-lg font-semibold text-emerald-700 font-mono-tabular mt-1">
                      {empRewards.length} 次
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-xs text-slate-500">累计生效问责</div>
                    <div className="text-lg font-semibold text-slate-900 font-mono-tabular mt-1">
                      {empTickets.length} 次
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-xs text-slate-500">净奖惩金额</div>
                    <div className="text-lg font-semibold text-slate-900 font-mono-tabular mt-1">
                      {totalAmountYuan >= 0
                        ? `+¥${totalAmountYuan}`
                        : `-¥${Math.abs(totalAmountYuan)}`}
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-xs text-slate-500">净绩效分值</div>
                    <div className="text-lg font-semibold text-slate-900 font-mono-tabular mt-1">
                      {totalPerfScore >= 0 ? `+${totalPerfScore}` : totalPerfScore} 分
                    </div>
                  </div>
                </div>

                {/* Active Impact Periods */}
                {activeRestrictions.length > 0 && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
                    <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>生效中的【处分影响期】明细（到期自动解除限制）</span>
                    </div>
                    {activeRestrictions.map((t) => (
                      <div
                        key={t.id}
                        className="text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 rounded border border-amber-200"
                      >
                        <span>
                          <span className="font-mono-tabular font-semibold">
                            {t.ticketNo}
                          </span>{' '}
                          · {t.execution?.gradeName}（限制晋升与年度评优）
                        </span>
                        <span className="font-mono-tabular">
                          影响期 {t.execution?.impactPeriodMonths} 个月 · 到期日{' '}
                          {t.execution?.impactExpiresAt || '计算中'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chronological Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <FolderArchive className="w-4 h-4 text-slate-600" />
                      <span>个人历史奖惩全生命周期记录</span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      二期将支持【功过相抵】线上申请流
                    </span>
                  </div>

                  {empRewards.length === 0 && empTickets.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                      该员工当前暂无已归档生效的奖惩档案记录
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                      {empRewards.map((r) => (
                        <div
                          key={r.id}
                          className="p-3.5 flex items-start justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-semibold text-emerald-700">
                              奖励 · {r.gradeName}（{r.rewardNo}）
                            </div>
                            <div className="text-slate-900 font-medium">{r.title}</div>
                            <div className="text-slate-500">
                              提报人：{r.nominatorName}（{r.nominatorDeptName}）
                            </div>
                          </div>
                          <div className="text-right font-mono-tabular shrink-0">
                            <div className="text-emerald-700 font-semibold">
                              +¥{r.amountYuan} / +{r.perfScore}分
                            </div>
                            <div className="text-slate-400 mt-0.5">
                              {r.approvedAt}
                            </div>
                          </div>
                        </div>
                      ))}

                      {empTickets.map((t) => (
                        <div
                          key={t.id}
                          className="p-3.5 flex items-start justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-semibold text-red-700">
                              问责 · {t.execution?.gradeName || '已处理'}（{t.ticketNo}）
                            </div>
                            <div className="text-slate-900 font-medium">{t.title}</div>
                            <div className="text-slate-500">
                              涉及部门：{t.accusedDeptNames.join('、')} · 影响期：
                              {t.execution?.impactPeriodMonths || 0} 个月
                            </div>
                          </div>
                          <div className="text-right font-mono-tabular shrink-0">
                            <div className="text-red-700 font-semibold">
                              ¥{t.execution?.amountYuan ?? 0} /{' '}
                              {t.execution?.perfScore ?? 0}分
                            </div>
                            <div className="text-slate-400 mt-0.5">
                              {t.archivedAt || t.updatedAt}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {subTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <span className="text-sm font-semibold text-slate-900">
                不可篡改合规审计日志
              </span>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlySensitiveAudit}
                  onChange={(e) => setOnlySensitiveAudit(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>仅看强审计事件（保密解密、申诉改判、回避、制度变更）</span>
              </label>
              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出日志 CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="py-2.5 px-4 font-medium">时间戳</th>
                  <th className="py-2.5 px-4 font-medium">操作人</th>
                  <th className="py-2.5 px-4 font-medium">审计动作类型</th>
                  <th className="py-2.5 px-4 font-medium">关联单号</th>
                  <th className="py-2.5 px-4 font-medium">留痕详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAudits.map((log) => (
                  <tr
                    key={log.id}
                    className={
                      log.isSensitiveAudit ? 'bg-amber-50/40' : 'hover:bg-slate-50'
                    }
                  >
                    <td className="py-3 px-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {log.actorName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          log.isSensitiveAudit ? 'text-amber-800' : 'text-slate-700'
                        }`}
                      >
                        {log.isSensitiveAudit && <Lock className="w-3 h-3" />}
                        {AUDIT_ACTION_LABELS[log.actionType]}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-blue-900 whitespace-nowrap">
                      {log.targetNo}
                    </td>
                    <td className="py-3 px-4 text-slate-700 leading-relaxed">
                      {log.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-900" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    各部门问责与激励维度对比图
                  </h3>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(
                    [
                      { id: 'count', label: '单据件数' },
                      { id: 'amount', label: '金额(¥)' },
                      { id: 'perf_score', label: '绩效分' },
                      { id: 'per_100_headcount', label: '百人密度' },
                    ] as { id: AnalyticsMetric; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAnalyticsMetric(m.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        analyticsMetric === m.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <DeptComparisonBarChart
                rows={analyticsDataset.deptRows}
                metric={analyticsMetric}
                selectedDeptId={analyticsDeptId}
                onSelectDept={setAnalyticsDeptId}
              />
            </div>

            <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">
                  跨部门协作流向矩阵
                </h3>
                {analyticsDeptId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setAnalyticsDeptId('all')}
                    className="text-xs text-blue-800 hover:underline font-medium"
                  >
                    清除部门选中
                  </button>
                )}
              </div>
              <CrossDeptMatrixChart
                departments={departments}
                cells={analyticsDataset.matrixCells}
                selectedDeptId={analyticsDeptId}
                onSelectDept={setAnalyticsDeptId}
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-900" />
                <h3 className="text-sm font-semibold text-slate-900">
                  各部门跨部门问责与正向激励实况汇总表
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                基于当前平台真实流转数据实时汇总
              </span>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="py-2.5 px-4 font-medium">部门名称</th>
                  <th className="py-2.5 px-4 font-medium">部门负责人</th>
                  <th className="py-2.5 px-4 font-medium text-right">人员编制</th>
                  <th className="py-2.5 px-4 font-medium text-right">涉事问责单</th>
                  <th className="py-2.5 px-4 font-medium text-right">获奖励表彰</th>
                  <th className="py-2.5 px-4 font-medium">协作失误占比条</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((dept) => {
                  const deptAccused = tickets.filter((t) =>
                    t.accusedDeptIds.includes(dept.id)
                  ).length;
                  const deptRewards = rewards.filter(
                    (r) => r.winnerDeptId === dept.id
                  ).length;
                  const maxTickets = Math.max(
                    1,
                    ...departments.map(
                      (d) =>
                        tickets.filter((t) => t.accusedDeptIds.includes(d.id))
                          .length
                    )
                  );
                  const ratioPct = Math.round((deptAccused / maxTickets) * 100);

                  return (
                    <tr key={dept.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {dept.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{dept.headName}</td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-slate-700">
                        {dept.headcount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-amber-700">
                        {deptAccused}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-emerald-700">
                        {deptRewards}
                      </td>
                      <td className="py-3 px-4 w-48">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-800 rounded-full"
                            style={{ width: `${ratioPct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};
