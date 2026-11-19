import React, { useState } from 'react';
import {
  Download,
  Loader2,
  Lock,
  Plus,
  Save,
  Search,
  Settings2,
  Upload,
  Users,
} from 'lucide-react';
import {
  AccountabilityTicket,
  Department,
  Employee,
  PlatformRole,
  PolicyGrade,
  PublicityScope,
  RewardNomination,
} from '../types/platform';
import { downloadCsvFile, PUBLICITY_SCOPE_LABELS } from '../utils/labels';
import { CustomSelect, SelectOption } from './CustomSelect';

interface PolicyAndAdminViewProps {
  currentUser: Employee;
  policyGrades: PolicyGrade[];
  employees: Employee[];
  departments: Department[];
  tickets: AccountabilityTicket[];
  rewards: RewardNomination[];
  isActionPending?: (key: string) => boolean;
  onUpdatePolicyGrade: (grade: PolicyGrade) => void | Promise<void>;
  onImportEmployees: (emps: Employee[]) => void | Promise<void>;
  onToggleEmployeeTag: (empId: string, field: 'isM8Plus' | 'isDeptLeader') => void | Promise<void>;
  onRecordPayrollExport: (rowCount: number, monthLabel: string) => void | Promise<void>;
}

export const PolicyAndAdminView: React.FC<PolicyAndAdminViewProps> = ({
  currentUser,
  policyGrades,
  employees,
  departments,
  tickets,
  rewards,
  isActionPending = () => false,
  onUpdatePolicyGrade,
  onImportEmployees,
  onToggleEmployeeTag,
  onRecordPayrollExport,
}) => {
  const [tab, setTab] = useState<'policy' | 'org' | 'payroll'>('policy');
  const [editingGrade, setEditingGrade] = useState<PolicyGrade | null>(null);
  const [saveFeedback, setSaveFeedback] = useState('');

  // Org roster filters & manual add state
  const [orgSearch, setOrgSearch] = useState('');
  const [orgDeptFilter, setOrgDeptFilter] = useState('all');
  const [newName, setNewName] = useState('');
  const [newEmpNo, setNewEmpNo] = useState('');
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || 'dept-rd');
  const [newRank, setNewRank] = useState('M8');
  const [newTitle, setNewTitle] = useState('');
  const [newIsLeader, setNewIsLeader] = useState(false);

  // Payroll filters
  const [exportMonth, setExportMonth] = useState('all');
  const [payrollCategory, setPayrollCategory] = useState('all');

  const isPolicyAdmin =
    currentUser.role === 'hrd' || currentUser.role === 'executive';

  const publicityOptions: SelectOption[] = Object.entries(PUBLICITY_SCOPE_LABELS).map(
    ([k, label]) => ({
      value: k,
      label,
    })
  );

  const deptSelectOptions: SelectOption[] = departments.map((d) => ({
    value: d.id,
    label: d.name,
    badgeText: d.code,
  }));

  const orgFilterDeptOptions: SelectOption[] = [
    { value: 'all', label: '全部部门' },
    ...deptSelectOptions,
  ];

  const rankOptions: SelectOption[] = [
    { value: 'P6', label: 'P6', description: '普通序列' },
    { value: 'P7', label: 'P7', description: '普通序列' },
    { value: 'M7', label: 'M7', description: '基层管理' },
    { value: 'M8', label: 'M8', description: '具备奖励表彰提报权' },
    { value: 'M9', label: 'M9', description: '具备奖励表彰提报权' },
    { value: 'M10', label: 'M10', description: '高管序列 · 奖励提报权' },
  ];

  // Moved monthFilterOptions computation below allPayrollRows

  const categoryFilterOptions: SelectOption[] = [
    { value: 'all', label: '全部奖惩类别' },
    { value: '正向奖励', label: '仅正向奖励' },
    { value: '问责处罚', label: '仅问责处罚' },
  ];

  const filteredEmployees = employees.filter((emp) => {
    const matchDept = orgDeptFilter === 'all' || emp.departmentId === orgDeptFilter;
    const q = orgSearch.trim().toLowerCase();
    const matchQ =
      !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.empNo.toLowerCase().includes(q) ||
      emp.title.toLowerCase().includes(q);
    return matchDept && matchQ;
  });

  // Build standardized payroll & performance execution rows from archived tickets & rewards
  const settledTickets = tickets.filter(
    (t) =>
      (t.status === 'archived' || t.status === 'appeal_resolved') &&
      t.execution &&
      t.execution.gradeName !== '已撤销处分'
  );
  const settledRewards = rewards.filter((r) => r.status === 'approved_archived');

  const allPayrollRows = [
    ...settledRewards.map((r) => {
      const emp = employees.find((e) => e.id === r.winnerId);
      return {
        docNo: r.rewardNo,
        category: '正向奖励',
        gradeName: r.gradeName,
        empNo: emp?.empNo || 'E10000',
        empName: r.winnerName,
        deptName: r.winnerDeptName,
        amountYuan: r.amountYuan,
        perfScore: r.perfScore,
        perfRatioPercent: r.perfRatioPercent,
        effectiveDate: r.approvedAt || r.createdAt,
      };
    }),
    ...settledTickets.map((t) => {
      const emp = employees.find((e) => e.id === t.accusedEmpId);
      return {
        docNo: t.ticketNo,
        category: '问责处罚',
        gradeName: t.execution!.gradeName,
        empNo: emp?.empNo || 'E10000',
        empName: t.accusedEmpName,
        deptName: t.accusedDeptNames.join('/'),
        amountYuan: t.execution!.amountYuan,
        perfScore: t.execution!.perfScore,
        perfRatioPercent: t.execution!.perfRatioPercent,
        effectiveDate: t.archivedAt || t.updatedAt,
      };
    }),
  ];

  const uniqueMonths = Array.from(
    new Set(
      allPayrollRows
        .map((r) => r.effectiveDate.slice(0, 7))
        .filter((m) => /^\d{4}-\d{2}$/.test(m))
    )
  ).sort((a, b) => b.localeCompare(a));

  const monthFilterOptions: SelectOption[] = [
    { value: 'all', label: '全部生效月份' },
    ...uniqueMonths.map((m) => {
      const [y, mo] = m.split('-');
      return { value: m, label: `${y} 年 ${Number(mo)} 月` };
    }),
  ];

  const payrollRows = allPayrollRows.filter((row) => {
    const matchMonth =
      exportMonth === 'all' || row.effectiveDate.startsWith(exportMonth);
    const matchCat =
      payrollCategory === 'all' || row.category === payrollCategory;
    return matchMonth && matchCat;
  });

  const handleDownloadTemplate = () => {
    downloadCsvFile(
      '组织架构与M8职级花名册导入模板.csv',
      ['工号', '姓名', '部门名称', '职级', '职位名称', '是否部门领导(是/否)'],
      [
        ['E10881', '张宇航', '研发中心', 'M8', '架构师负责人', '否'],
        ['E10882', '李静姝', '企业客户销售部', 'P7', '大客户经理', '否'],
      ]
    );
  };

  const isImportingOrg = isActionPending('org:import');
  const isExportingPayroll = isActionPending('payroll:export');

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isPolicyAdmin || isImportingOrg) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || '');
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const parsed: Employee[] = [];
      lines.slice(1).forEach((line, idx) => {
        const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 4 && cols[0] && cols[1]) {
          const dept =
            departments.find((d) => d.name === cols[2]) || departments[0];
          const rank = cols[3] || 'P6';
          const isM8Plus = /^M(8|9|10|11|12)/i.test(rank);
          const isDeptLeader = cols[5] === '是';
          const role: PlatformRole = isDeptLeader
            ? 'dept_leader'
            : isM8Plus
            ? 'm8_plus'
            : 'employee';
          parsed.push({
            id: `emp-imp-${Date.now()}-${idx}`,
            empNo: cols[0],
            name: cols[1],
            departmentId: dept.id,
            departmentName: dept.name,
            rank,
            isM8Plus,
            isDeptLeader,
            role,
            title: cols[4] || '业务骨干',
            dingTalkUserId: `dt_${cols[0]}`,
          });
        }
      });
      if (parsed.length > 0) {
        await onImportEmployees(parsed);
        setSaveFeedback(`成功解析并导入 ${parsed.length} 条员工花名册记录。`);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleManualAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPolicyAdmin || isImportingOrg) return;
    if (!newName.trim() || !newEmpNo.trim()) {
      setSaveFeedback('请完整填写员工工号与姓名。');
      return;
    }
    if (employees.some((emp) => emp.empNo === newEmpNo.trim())) {
      setSaveFeedback(`工号 ${newEmpNo.trim()} 已存在于组织花名册中，请核对后重试。`);
      return;
    }
    const dept = departments.find((d) => d.id === newDeptId) || departments[0];
    const isM8Plus = /^M(8|9|10|11|12)/i.test(newRank);
    const role: PlatformRole = newIsLeader
      ? 'dept_leader'
      : isM8Plus
      ? 'm8_plus'
      : 'employee';
    await onImportEmployees([
      {
        id: `emp-man-${Date.now()}`,
        empNo: newEmpNo.trim(),
        name: newName.trim(),
        departmentId: dept.id,
        departmentName: dept.name,
        rank: newRank,
        isM8Plus,
        isDeptLeader: newIsLeader,
        role,
        title: newTitle.trim() || '部门成员',
        dingTalkUserId: `dt_${newEmpNo.trim()}`,
      },
    ]);
    setNewName('');
    setNewEmpNo('');
    setNewTitle('');
    setNewIsLeader(false);
    setSaveFeedback(`已新增员工 ${newName.trim()}（${newRank}）至组织花名册。`);
  };

  const handleExportPayroll = async () => {
    if (isExportingPayroll) return;
    const label = exportMonth === 'all' ? '全期' : exportMonth;
    await onRecordPayrollExport(payrollRows.length, label);
    downloadCsvFile(
      `HR算薪与绩效奖惩执行明细_${label}.csv`,
      [
        '单据编号',
        '奖惩类别',
        '制度定级',
        '员工工号',
        '员工姓名',
        '所属部门',
        '固定金额变动(元)',
        '绩效分数增减(分)',
        '绩效系数调整(%)',
        '生效归档时间',
      ],
      payrollRows.map((r) => [
        r.docNo,
        r.category,
        r.gradeName,
        r.empNo,
        r.empName,
        r.deptName,
        r.amountYuan,
        r.perfScore,
        r.perfRatioPercent,
        r.effectiveDate,
      ])
    );
    setSaveFeedback(`已导出 ${label} 算薪与绩效执行明细表（${payrollRows.length} 条）。`);
  };

  return (
    <div className="space-y-5">
      {/* Segmented Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setTab('policy');
              setEditingGrade(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'policy'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            制度参数配置引擎
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('org');
              setEditingGrade(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'org'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            组织架构与 M8+ 花名册导入
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('payroll');
              setEditingGrade(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'payroll'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            HR 算薪与绩效明细导出
          </button>
        </div>

        {saveFeedback && (
          <div className="text-xs font-medium text-emerald-700">
            {saveFeedback}
          </div>
        )}
      </div>

      {/* Tab 1: Configurable Policy Engine */}
      {tab === 'policy' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-visible">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-900" />
                <span>奖惩分级标准、微调授权上限与处分影响期配置表</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                制度参数由 HRD 或高层直接配置生效，支持金额（元）、绩效分（分）、系数比例（%）三类执行标准。
              </p>
            </div>
            {!isPolicyAdmin && (
              <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>当前仅可只读浏览，切换【HRD】可编辑配置</span>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="py-2.5 px-4 font-medium">类别 / 等级名称</th>
                  <th className="py-2.5 px-4 font-medium text-right">默认金额(元)</th>
                  <th className="py-2.5 px-4 font-medium text-right">绩效分值</th>
                  <th className="py-2.5 px-4 font-medium text-right">绩效系数(%)</th>
                  <th className="py-2.5 px-4 font-medium text-right">领导微调上限</th>
                  <th className="py-2.5 px-4 font-medium text-right">处分影响期</th>
                  <th className="py-2.5 px-4 font-medium">默认公示范围</th>
                  <th className="py-2.5 px-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policyGrades.map((g) => {
                  const isEditing = editingGrade?.id === g.id;
                  return (
                    <tr key={g.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {g.name}{' '}
                          <span className="font-mono-tabular text-slate-400 font-normal">
                            {g.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {g.category === 'reward' ? '正向激励' : '问责处分'}
                          {g.requiresExecutiveApproval ? ' · 必经高层终审' : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingGrade.defaultAmountYuan}
                            onChange={(e) =>
                              setEditingGrade({
                                ...editingGrade,
                                defaultAmountYuan: Number(e.target.value) || 0,
                              })
                            }
                            className="w-20 px-2 py-1 border border-blue-400 rounded text-right"
                          />
                        ) : (
                          <span
                            className={
                              g.defaultAmountYuan >= 0
                                ? 'text-emerald-700 font-semibold'
                                : 'text-red-700 font-semibold'
                            }
                          >
                            ¥{g.defaultAmountYuan}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingGrade.defaultPerfScore}
                            onChange={(e) =>
                              setEditingGrade({
                                ...editingGrade,
                                defaultPerfScore: Number(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-2 py-1 border border-blue-400 rounded text-right"
                          />
                        ) : (
                          `${g.defaultPerfScore} 分`
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingGrade.defaultPerfRatioPercent}
                            onChange={(e) =>
                              setEditingGrade({
                                ...editingGrade,
                                defaultPerfRatioPercent: Number(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-2 py-1 border border-blue-400 rounded text-right"
                          />
                        ) : (
                          `${g.defaultPerfRatioPercent}%`
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-slate-600">
                        ±¥{g.leaderAdjustCapYuan} / ±{g.leaderAdjustCapScore}分
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editingGrade.impactPeriodMonths}
                            onChange={(e) =>
                              setEditingGrade({
                                ...editingGrade,
                                impactPeriodMonths: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-16 px-2 py-1 border border-blue-400 rounded text-right"
                          />
                        ) : (
                          `${g.impactPeriodMonths} 个月`
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 min-w-[210px]">
                        {isEditing ? (
                          <CustomSelect
                            value={editingGrade.defaultPublicity}
                            onChange={(val) =>
                              setEditingGrade({
                                ...editingGrade,
                                defaultPublicity: val as PublicityScope,
                              })
                            }
                            options={publicityOptions}
                            size="sm"
                          />
                        ) : (
                          PUBLICITY_SCOPE_LABELS[g.defaultPublicity]
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isPolicyAdmin ? (
                          isEditing ? (() => {
                            const isSavingPolicy = isActionPending(
                              `policy:update:${editingGrade.id}`
                            );
                            return (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isSavingPolicy}
                                  onClick={() => setEditingGrade(null)}
                                  className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingPolicy}
                                  onClick={async () => {
                                    await onUpdatePolicyGrade(editingGrade);
                                    setEditingGrade(null);
                                    setSaveFeedback(
                                      `已更新制度等级【${editingGrade.name}】参数并记录审计日志。`
                                    );
                                  }}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-blue-900 rounded hover:bg-blue-800 inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {isSavingPolicy ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3" />
                                  )}
                                  <span>{isSavingPolicy ? '保存中...' : '保存'}</span>
                                </button>
                              </div>
                            );
                          })() : (
                            <button
                              type="button"
                              onClick={() => setEditingGrade(g)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-50 rounded"
                            >
                              编辑参数
                            </button>
                          )
                        ) : (
                          <span className="text-slate-400">只读</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Org & M8+ Roster Import */}
      {tab === 'org' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-900" />
                    <span>一期组织花名册与 M8+ 职级标签台账</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    支持 CSV/Excel 模板批量导入部门树、部门领导标识与 M8+ 奖励权限标签（二期自动对接企业 HRIS/钉钉通讯录）。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下载导入模板</span>
                  </button>
                  {isPolicyAdmin ? (
                    <label
                      className={`px-3 py-1.5 text-xs font-medium text-white bg-blue-900 rounded-md flex items-center gap-1 ${
                        isImportingOrg
                          ? 'opacity-60 cursor-not-allowed pointer-events-none'
                          : 'hover:bg-blue-800 cursor-pointer'
                      }`}
                    >
                      {isImportingOrg ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{isImportingOrg ? '导入中...' : '上传 CSV 导入'}</span>
                      <input
                        type="file"
                        accept=".csv"
                        disabled={isImportingOrg}
                        onChange={handleCsvUpload}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <span className="px-3 py-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>仅 HRD/高层可维护花名册</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    placeholder="检索姓名、工号或职位..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <CustomSelect
                  value={orgDeptFilter}
                  onChange={setOrgDeptFilter}
                  options={orgFilterDeptOptions}
                  size="sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[58vh] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="py-2.5 px-4 font-medium">工号</th>
                    <th className="py-2.5 px-4 font-medium">姓名</th>
                    <th className="py-2.5 px-4 font-medium">所属部门</th>
                    <th className="py-2.5 px-4 font-medium">职位</th>
                    <th className="py-2.5 px-4 font-medium">职级</th>
                    <th className="py-2.5 px-4 font-medium">治理权限标签维护</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono-tabular text-slate-600">
                        {emp.empNo}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {emp.name}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {emp.departmentName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{emp.title}</td>
                      <td className="py-2.5 px-4 font-mono-tabular font-semibold text-slate-800">
                        {emp.rank}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const togglingM8 = isActionPending(
                              `org:tag:${emp.id}:isM8Plus`
                            );
                            const togglingLead = isActionPending(
                              `org:tag:${emp.id}:isDeptLeader`
                            );
                            return (
                              <>
                                <button
                                  type="button"
                                  disabled={!isPolicyAdmin || togglingM8}
                                  onClick={() => onToggleEmployeeTag(emp.id, 'isM8Plus')}
                                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors inline-flex items-center gap-1 ${
                                    emp.isM8Plus
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : 'bg-white border-slate-200 text-slate-500'
                                  } ${
                                    isPolicyAdmin && !togglingM8
                                      ? 'hover:opacity-90'
                                      : 'opacity-60 cursor-not-allowed'
                                  }`}
                                >
                                  {togglingM8 && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  <span>
                                    {togglingM8
                                      ? '更新中...'
                                      : emp.isM8Plus
                                      ? 'M8+ 奖励权已开启'
                                      : '开通 M8+ 权'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  disabled={!isPolicyAdmin || togglingLead}
                                  onClick={() =>
                                    onToggleEmployeeTag(emp.id, 'isDeptLeader')
                                  }
                                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors inline-flex items-center gap-1 ${
                                    emp.isDeptLeader
                                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                                      : 'bg-white border-slate-200 text-slate-500'
                                  } ${
                                    isPolicyAdmin && !togglingLead
                                      ? 'hover:opacity-90'
                                      : 'opacity-60 cursor-not-allowed'
                                  }`}
                                >
                                  {togglingLead && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  <span>
                                    {togglingLead
                                      ? '更新中...'
                                      : emp.isDeptLeader
                                      ? '部门领导'
                                      : '设为领导'}
                                  </span>
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isPolicyAdmin ? (
            <form
              onSubmit={handleManualAddEmployee}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-3.5"
            >
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-900" />
                <span>人工维护新增人员</span>
              </h3>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  工号 *
                </label>
                <input
                  type="text"
                  value={newEmpNo}
                  onChange={(e) => setNewEmpNo(e.target.value)}
                  placeholder="例如：E10920"
                  className="w-full px-3 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  姓名 *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="输入员工姓名"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  所属部门
                </label>
                <CustomSelect
                  value={newDeptId}
                  onChange={setNewDeptId}
                  options={deptSelectOptions}
                  size="sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    职级标签
                  </label>
                  <CustomSelect
                    value={newRank}
                    onChange={setNewRank}
                    options={rankOptions}
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    职位名称
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="如：高级架构师"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newIsLeader}
                  onChange={(e) => setNewIsLeader(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>设为部门领导审批节点</span>
              </label>
              <button
                type="submit"
                disabled={isImportingOrg}
                className="w-full py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md inline-flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isImportingOrg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isImportingOrg ? '保存中...' : '添加至花名册'}</span>
              </button>
            </form>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2 text-xs text-slate-600">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-700" />
                <span>花名册维护权限提示</span>
              </div>
              <p className="leading-relaxed">
                组织架构导入、新增人员及 M8+/部门领导权限标签调整仅限【HRD】或【总经理及董事长】操作，当前身份仅支持检索与模板下载。
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: HR Payroll & Performance Execution Export */}
      {tab === 'payroll' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                标准化奖惩算薪与绩效执行明细表（一期导出联动算薪）
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                自动剔除申诉已撤销处分，支持按归档月份与奖惩类别筛选并导出 CSV 明细表。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-36">
                <CustomSelect
                  value={exportMonth}
                  onChange={setExportMonth}
                  options={monthFilterOptions}
                  size="sm"
                />
              </div>
              <div className="w-36">
                <CustomSelect
                  value={payrollCategory}
                  onChange={setPayrollCategory}
                  options={categoryFilterOptions}
                  size="sm"
                />
              </div>
              <button
                type="button"
                disabled={isExportingPayroll}
                onClick={handleExportPayroll}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isExportingPayroll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>
                  {isExportingPayroll
                    ? '导出生成中...'
                    : `导出算薪明细 CSV（${payrollRows.length}）`}
                </span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="py-2.5 px-4 font-medium">执行单号</th>
                  <th className="py-2.5 px-4 font-medium">类别 / 定级</th>
                  <th className="py-2.5 px-4 font-medium">员工工号 / 姓名</th>
                  <th className="py-2.5 px-4 font-medium">所属部门</th>
                  <th className="py-2.5 px-4 font-medium text-right">算薪金额变动</th>
                  <th className="py-2.5 px-4 font-medium text-right">绩效分值</th>
                  <th className="py-2.5 px-4 font-medium text-right">绩效系数</th>
                  <th className="py-2.5 px-4 font-medium">归档生效时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      当前筛选月份/类别下暂无已生效的算薪执行记录
                    </td>
                  </tr>
                ) : (
                  payrollRows.map((row) => (
                    <tr key={row.docNo} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono-tabular font-medium text-slate-800">
                        {row.docNo}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            row.category === '正向奖励'
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }`}
                        >
                          {row.category} · {row.gradeName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-900">
                        <span className="font-mono-tabular text-slate-500 mr-1.5">
                          {row.empNo}
                        </span>
                        {row.empName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{row.deptName}</td>
                      <td
                        className={`py-3 px-4 text-right font-mono-tabular font-semibold ${
                          row.amountYuan >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {row.amountYuan >= 0
                          ? `+¥${row.amountYuan}`
                          : `-¥${Math.abs(row.amountYuan)}`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-slate-700">
                        {row.perfScore >= 0 ? `+${row.perfScore}` : row.perfScore} 分
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-slate-700">
                        {row.perfRatioPercent >= 0
                          ? `+${row.perfRatioPercent}%`
                          : `${row.perfRatioPercent}%`}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-500">
                        {row.effectiveDate}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
