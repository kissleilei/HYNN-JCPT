export type PlatformRole =
  | 'employee'
  | 'm8_plus'
  | 'dept_leader'
  | 'hrbp'
  | 'er_lead'
  | 'hrd'
  | 'executive';

export interface RoleMeta {
  id: PlatformRole;
  label: string;
  shortLabel: string;
  permissionsSummary: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headId: string;
  headName: string;
  headcount: number;
  parentDept?: string;
}

export interface Employee {
  id: string;
  empNo: string;
  name: string;
  departmentId: string;
  departmentName: string;
  rank: string; // e.g. 'P6', 'M7', 'M8', 'M9', 'M10'
  isM8Plus: boolean;
  isDeptLeader: boolean;
  role: PlatformRole;
  title: string;
  dingTalkUserId: string;
  hrbpId?: string;
}

export type ExecutionMode = 'fixed_amount' | 'perf_score' | 'perf_ratio';

export type PublicityScope =
  | 'targeted_only' // 定向通知（当事人、双方部门领导及HR）
  | 'team_dept' // 团队/部门内可见
  | 'all_staff_dingtalk' // 全员公示栏 + 钉钉群喜报
  | 'desensitized_warning'; // HR脱敏案例警示

export interface PolicyGrade {
  id: string;
  category: 'punishment' | 'reward';
  name: string; // 表扬 / 嘉奖 / 记功 / 口头警告 / 书面警告 / 记过 / 记大过
  code: string;
  defaultExecutionMode: ExecutionMode;
  defaultAmountYuan: number; // 正数为奖励，负数为扣款
  defaultPerfScore: number; // 绩效分数增减
  defaultPerfRatioPercent: number; // 绩效系数比例调整（%）
  leaderAdjustCapYuan: number; // 部门领导微调授权上限（元绝对值）
  leaderAdjustCapScore: number; // 部门领导微调授权上限（分绝对值）
  leaderAdjustCapRatio: number; // 部门领导微调授权上限（%绝对值）
  impactPeriodMonths: number; // 处分影响期（月），奖励为0
  defaultPublicity: PublicityScope;
  requiresExecutiveApproval: boolean; // 是否默认需总经理/董事长审批
  description: string;
}

export type AccountabilityStatus =
  | 'pending_confirm' // 待双方部门确认与被问责人陈述
  | 'er_investigation' // ER团队介入调查核实中
  | 'major_escalation' // 重大事故上报总经理及董事长终审
  | 'pending_hr_exec' // 待HR定级与执行归档
  | 'archived' // 已执行并记入档案
  | 'appealing' // 申诉复核中
  | 'appeal_resolved'; // 申诉已裁决

export interface EvidenceItem {
  id: string;
  name: string;
  type: 'screenshot' | 'log' | 'document' | 'client_letter';
  summary: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface DeptConfirmation {
  confirmed: boolean;
  leaderId: string;
  leaderName: string;
  autoSkippedDueToSelfAccused: boolean; // 若部门领导本人被问责，自动跳过
  hasDispute: boolean;
  comment: string;
  confirmedAt?: string;
}

export interface RespondentStatement {
  submitted: boolean;
  agreesWithFacts: boolean | null;
  statementText: string;
  counterEvidence: EvidenceItem[];
  submittedAt?: string;
}

export interface ExecutionAdjustment {
  gradeId: string;
  gradeName: string;
  executionMode: ExecutionMode;
  amountYuan: number;
  perfScore: number;
  perfRatioPercent: number;
  isAdjusted: boolean;
  adjustmentReason: string;
  exceedsLeaderCap: boolean;
  escalatedToExecutive: boolean;
  impactPeriodMonths: number;
  impactExpiresAt?: string;
}

export interface AccountabilityTicket {
  id: string;
  ticketNo: string;
  title: string;
  factDescription: string;
  incidentDate: string;
  reporterId: string;
  reporterName: string;
  reporterDeptId: string;
  reporterDeptName: string;
  isConfidential: boolean; // 实名保密提报
  accusedEmpId: string;
  accusedEmpName: string;
  accusedDeptIds: string[]; // 支持多部门责任
  accusedDeptNames: string[];
  isMultiDepartment: boolean;
  isMajorAccident: boolean;
  hrIntervenedProactively: boolean; // HR主动抽查/介入
  status: AccountabilityStatus;
  evidences: EvidenceItem[];
  reporterDeptConfirm: DeptConfirmation;
  accusedDeptConfirm: DeptConfirmation;
  respondentStatement: RespondentStatement;
  erInvestigationReport?: string;
  erInvestigatorName?: string;
  erInvestigatedAt?: string;
  executiveDecisionNote?: string;
  executiveDecidedBy?: string;
  executiveDecidedAt?: string;
  execution?: ExecutionAdjustment;
  publicityScope: PublicityScope;
  desensitizedCaseSummary?: string; // 若发布警示案例，由HR脱敏
  urgeCount: number;
  urgedStages?: string[];
  lastUrgedAt?: string;
  manualEscalated: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export type RewardStatus =
  | 'pending_dept_confirm' // 待获奖人部门确认
  | 'pending_special_approval' // 部门内部特批通道审核中
  | 'pending_hr_review' // 待HR审核
  | 'pending_exec_approval' // 待授权高层终审
  | 'approved_archived'; // 已批准并全员/定向公示

export interface RewardNomination {
  id: string;
  rewardNo: string;
  title: string;
  deedDescription: string; // 详实事迹说明
  nominatorId: string;
  nominatorName: string;
  nominatorRank: string;
  nominatorDeptId: string;
  nominatorDeptName: string;
  winnerId: string;
  winnerName: string;
  winnerRank: string;
  winnerDeptId: string;
  winnerDeptName: string;
  isCrossDepartment: boolean; // 是否跨部门协作
  isInternalException: boolean; // 内部例外特批通道
  internalExceptionReason?: string;
  gradeId: string;
  gradeName: string;
  executionMode: ExecutionMode;
  amountYuan: number;
  perfScore: number;
  perfRatioPercent: number;
  isAdjusted: boolean;
  adjustmentReason?: string;
  evidences: EvidenceItem[];
  publicityScope: PublicityScope;
  status: RewardStatus;
  deptConfirmedBy?: string;
  hrReviewedBy?: string;
  execApprovedBy?: string;
  urgeCount: number;
  urgedStages?: string[];
  createdAt: string;
  approvedAt?: string;
}

export type AppealStatus = 'pending_review' | 'upheld' | 'modified' | 'revoked';

export interface AppealCase {
  id: string;
  appealNo: string;
  ticketId: string;
  ticketNo: string;
  ticketTitle: string;
  appellantId: string;
  appellantName: string;
  appellantDeptName: string;
  originalGradeName: string;
  originalAmountYuan: number;
  reason: string;
  supplementEvidence: EvidenceItem[];
  assignedReviewerRole: 'hrd' | 'executive';
  assignedReviewerName: string;
  hrdConflictTriggered: boolean; // HRD利益冲突强制回避
  hrdConflictReason?: string;
  status: AppealStatus;
  decisionNote?: string;
  newGradeId?: string;
  newGradeName?: string;
  newAmountYuan?: number;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
}

export type AuditActionType =
  | 'SUBMIT_ACCOUNTABILITY'
  | 'VIEW_CONFIDENTIAL_REPORTER'
  | 'DEPT_CONFIRM'
  | 'RESPONDENT_STATEMENT'
  | 'ER_INTERVENTION'
  | 'MAJOR_ACCIDENT_ESCALATION'
  | 'EXECUTE_ARCHIVE'
  | 'SUBMIT_REWARD'
  | 'APPROVE_REWARD'
  | 'SUBMIT_APPEAL'
  | 'APPEAL_DECISION'
  | 'POLICY_UPDATE'
  | 'DINGTALK_URGE'
  | 'ROSTER_IMPORT'
  | 'PAYROLL_EXPORT';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: PlatformRole;
  actionType: AuditActionType;
  targetNo: string;
  detail: string;
  isSensitiveAudit: boolean; // 保密身份查看、改判、超权审批等强审计标记
}

export interface DingTalkNotification {
  id: string;
  recipientRoleOrName: string;
  cardType: 'todo' | 'urge' | 'escalation' | 'reward_cheer' | 'warning_notice';
  title: string;
  summary: string;
  relatedNo: string;
  createdAt: string;
  read: boolean;
}
