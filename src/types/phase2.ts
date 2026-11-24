export type Phase2Section = 'publicity' | 'policy' | 'oa' | 'admin';

export type RecordCategory = 'reward' | 'punishment';

export interface PublicityRecord {
  id: string;
  recordNo: string;
  month: string; // YYYY-MM
  category: RecordCategory;
  title: string;
  employeeName: string;
  departmentName: string;
  gradeName: string;
  points: number;
  summary: string;
  lessonOrHighlight?: string;
  dingtalkApproverName?: string;
  dingtalkExecutorName?: string;
  isPublished: boolean;
  kudosCount: number;
  ackCount: number;
  authorUid: string;
  createdAt?: string;
}

export interface PolicyDoc {
  id: string;
  code: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  orderIndex: number;
  isPublished: boolean;
  updatedByUid: string;
}

export interface PointTierRule {
  id: string;
  category: RecordCategory;
  gradeName: string;
  pointRange: string;
  defaultPoints: number;
  criteriaSummary: string;
  impactNote: string;
}

export interface PolicyQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LearningRecord {
  id: string;
  userUid: string;
  learnerName: string;
  completedModuleIds: string[];
  quizScore: number;
  quizPassed: boolean;
}

export type OaSubmissionStatus =
  | 'pending_approval'
  | 'pending_execution'
  | 'executed_published'
  | 'rejected';

export type DingTalkSyncStatus = 'synced_live' | 'queued_sandbox' | 'pending';

export interface OaSubmission {
  id: string;
  submissionNo: string;
  category: RecordCategory;
  title: string;
  targetDingtalkUserId: string;
  targetName: string;
  targetDeptName: string;
  rubricCode?: string;
  gradeName: string;
  points: number;
  factDescription: string;
  evidenceName?: string;
  publicityMode: 'all_staff_public' | 'desensitized_warning' | 'dept_only';
  isConfidential: boolean;
  approverDingtalkUserId: string;
  approverName: string;
  executorDingtalkUserId: string;
  executorName: string;
  ccNames: string[];
  status: OaSubmissionStatus;
  dingtalkSyncStatus: DingTalkSyncStatus;
  dingtalkProcessInstanceId?: string;
  reviewNote?: string;
  submitterName: string;
  authorUid: string;
  createdAt?: string;
}

export type DingTalkRoleTag = 'staff' | 'approver' | 'executor' | 'cc_default';

export interface DingTalkMember {
  id: string;
  dingtalkUserId: string;
  empNo: string;
  name: string;
  deptName: string;
  title: string;
  oaRoleTag: DingTalkRoleTag;
  isActive: boolean;
  updatedByUid: string;
}

export interface DingTalkStatus {
  configured: boolean;
  hasProcessCode: boolean;
  hasWebhook: boolean;
  mode: 'live' | 'sandbox';
  message: string;
}
