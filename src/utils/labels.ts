import {
  AccountabilityStatus,
  AppealStatus,
  AuditActionType,
  ExecutionMode,
  PublicityScope,
  RewardStatus,
} from '../types/platform';

export const ACCOUNTABILITY_STATUS_META: Record<
  AccountabilityStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  pending_confirm: {
    label: '待双方部门确认与陈述',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  er_investigation: {
    label: 'ER 调查核实中',
    textClass: 'text-blue-700',
    bgClass: 'bg-blue-50 border-blue-200',
  },
  major_escalation: {
    label: '重大事故/超权待高层终审',
    textClass: 'text-red-700',
    bgClass: 'bg-red-50 border-red-200',
  },
  pending_hr_exec: {
    label: '待 HR 定级执行与归档',
    textClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50 border-indigo-200',
  },
  archived: {
    label: '已执行并记入档案',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  appealing: {
    label: '申诉复核中',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  appeal_resolved: {
    label: '申诉已裁决归档',
    textClass: 'text-slate-700',
    bgClass: 'bg-slate-100 border-slate-200',
  },
};

export const REWARD_STATUS_META: Record<
  RewardStatus,
  { label: string; textClass: string }
> = {
  pending_dept_confirm: {
    label: '待获奖人部门确认',
    textClass: 'text-amber-700',
  },
  pending_special_approval: {
    label: '内部例外特批审核中',
    textClass: 'text-amber-700',
  },
  pending_hr_review: {
    label: '待 HR 审核',
    textClass: 'text-blue-700',
  },
  pending_exec_approval: {
    label: '待授权高层终审',
    textClass: 'text-indigo-700',
  },
  approved_archived: {
    label: '已批准并生效公示',
    textClass: 'text-emerald-700',
  },
};

export const APPEAL_STATUS_META: Record<
  AppealStatus,
  { label: string; textClass: string }
> = {
  pending_review: { label: '待复核裁决', textClass: 'text-amber-700' },
  upheld: { label: '维持原判', textClass: 'text-slate-700' },
  modified: { label: '变更处分等级', textClass: 'text-blue-700' },
  revoked: { label: '撤销处分', textClass: 'text-emerald-700' },
};

export const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
  fixed_amount: '固定金额奖惩（元）',
  perf_score: '绩效分数增减（分）',
  perf_ratio: '绩效系数比例调整（%）',
};

export const PUBLICITY_SCOPE_LABELS: Record<PublicityScope, string> = {
  targeted_only: '严格定向通知（当事人、双方部门领导及HR）',
  team_dept: '团队 / 部门内可见',
  all_staff_dingtalk: '全员公示栏 + 钉钉群喜报推送',
  desensitized_warning: 'HR 脱敏处理后发布内部案例警示',
};

export const AUDIT_ACTION_LABELS: Record<AuditActionType, string> = {
  SUBMIT_ACCOUNTABILITY: '发起问责提报',
  VIEW_CONFIDENTIAL_REPORTER: '解密查看保密提报人',
  DEPT_CONFIRM: '部门领导事实确认',
  RESPONDENT_STATEMENT: '被问责人在线陈述',
  ER_INTERVENTION: 'ER 主动抽查与调查介入',
  MAJOR_ACCIDENT_ESCALATION: '重大事故/超权上报终审',
  EXECUTE_ARCHIVE: '执行定级与档案归档',
  SUBMIT_REWARD: '发起 M8+ 奖励表彰',
  APPROVE_REWARD: '奖励表彰审批推进',
  SUBMIT_APPEAL: '发起在线申诉',
  APPEAL_DECISION: '申诉复核裁决',
  POLICY_UPDATE: '制度参数调整',
  DINGTALK_URGE: '钉钉人工催办/手动升级',
  ROSTER_IMPORT: '组织花名册导入维护',
  PAYROLL_EXPORT: 'HR 算薪执行明细导出',
};

export function downloadCsvFile(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
