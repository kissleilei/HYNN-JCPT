import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpCircle,
  BellRing,
  CheckCircle2,
  Eye,
  FileText,
  FileUp,
  Loader2,
  Lock,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  AccountabilityStatus,
  AccountabilityTicket,
  Department,
  Employee,
  ExecutionMode,
  PolicyGrade,
  PublicityScope,
} from '../types/platform';
import {
  ACCOUNTABILITY_STATUS_META,
  EXECUTION_MODE_LABELS,
  PUBLICITY_SCOPE_LABELS,
} from '../utils/labels';
import { CustomSelect, SelectOption } from './CustomSelect';

interface AccountabilityViewProps {
  currentUser: Employee;
  tickets: AccountabilityTicket[];
  departments: Department[];
  policyGrades: PolicyGrade[];
  selectedTicketId: string | null;
  onSelectTicket: (id: string | null) => void;
  onOpenNewModal: () => void;
  canRevealConfidentialIdentity: (role: Employee['role']) => boolean;
  revealedConfidentialTicketIds: string[];
  getDisplayReporterName: (ticket: AccountabilityTicket) => string;
  isActionPending?: (key: string) => boolean;
  onRevealConfidential: (ticketId: string, purpose: string) => void | Promise<void>;
  onConfirmDept: (
    ticketId: string,
    side: 'reporter' | 'accused',
    hasDispute: boolean,
    comment: string
  ) => void | Promise<void>;
  onSubmitStatement: (
    ticketId: string,
    agreesWithFacts: boolean,
    statementText: string,
    counterEvidenceName?: string
  ) => void | Promise<void>;
  onErIntervene: (ticketId: string, reason: string) => void | Promise<void>;
  onExecuteOrEscalate: (
    ticketId: string,
    payload: {
      erReport?: string;
      gradeId: string;
      executionMode: ExecutionMode;
      amountYuan: number;
      perfScore: number;
      perfRatioPercent: number;
      isAdjusted: boolean;
      adjustmentReason: string;
      publicityScope: PublicityScope;
      desensitizedCaseSummary?: string;
      escalateMajor: boolean;
    }
  ) => void | Promise<void>;
  onExecutiveDecide: (
    ticketId: string,
    decisionNote: string,
    desensitizedSummary?: string
  ) => void | Promise<void>;
  onUrgeOrEscalate: (ticketId: string, manualEscalate?: boolean) => void | Promise<void>;
  onSubmitAppeal: (payload: {
    ticketId: string;
    reason: string;
    evidenceName?: string;
  }) => boolean | Promise<boolean>;
  onSwitchEmployee: (empId: string) => void;
}

const FILTER_TABS: { id: 'all' | AccountabilityStatus; label: string }[] = [
  { id: 'all', label: '全部工单' },
  { id: 'pending_confirm', label: '待确认/陈述' },
  { id: 'er_investigation', label: 'ER调查中' },
  { id: 'major_escalation', label: '重大事故终审' },
  { id: 'pending_hr_exec', label: '待HR执行' },
  { id: 'archived', label: '已归档' },
];

export const AccountabilityView: React.FC<AccountabilityViewProps> = ({
  currentUser,
  tickets,
  departments,
  policyGrades,
  selectedTicketId,
  onSelectTicket,
  onOpenNewModal,
  canRevealConfidentialIdentity,
  revealedConfidentialTicketIds,
  getDisplayReporterName,
  isActionPending = () => false,
  onRevealConfidential,
  onConfirmDept,
  onSubmitStatement,
  onErIntervene,
  onExecuteOrEscalate,
  onExecutiveDecide,
  onUrgeOrEscalate,
  onSubmitAppeal,
  onSwitchEmployee,
}) => {
  const [filter, setFilter] = useState<'all' | AccountabilityStatus>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Form states for active selected ticket
  const [confirmComment, setConfirmComment] = useState('');
  const [statementText, setStatementText] = useState('');
  const [counterEvidence, setCounterEvidence] = useState('');
  const [revealPurpose, setRevealPurpose] = useState('');
  const [showRevealPrompt, setShowRevealPrompt] = useState(false);

  const punishmentGrades = policyGrades.filter((g) => g.category === 'punishment');
  const [selectedGradeId, setSelectedGradeId] = useState(punishmentGrades[1]?.id || 'grade-p2');
  const [execMode, setExecMode] = useState<ExecutionMode>('fixed_amount');
  const [amountYuan, setAmountYuan] = useState<number>(-1000);
  const [perfScore, setPerfScore] = useState<number>(-5);
  const [perfRatio, setPerfRatio] = useState<number>(-5);
  const [adjustReason, setAdjustReason] = useState('');
  const [erReportText, setErReportText] = useState('');
  const [publicityScope, setPublicityScope] = useState<PublicityScope>('targeted_only');
  const [desensitizedSummary, setDesensitizedSummary] = useState('');
  const [escalateMajor, setEscalateMajor] = useState(false);
  const [execDecisionNote, setExecDecisionNote] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [appealEvidence, setAppealEvidence] = useState('');
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [formError, setFormError] = useState('');

  const deptFilterOptions: SelectOption[] = [
    { value: 'all', label: '全部责任部门' },
    ...departments.map((d) => ({
      value: d.id,
      label: d.name,
      badgeText: d.code,
    })),
  ];

  const tagFilterOptions: SelectOption[] = [
    { value: 'all', label: '全部工单属性' },
    { value: 'confidential', label: '仅实名保密工单' },
    { value: 'multi_dept', label: '仅多部门协同工单' },
    { value: 'major', label: '仅重大事故工单' },
  ];

  const gradeOptions: SelectOption[] = punishmentGrades.map((g) => ({
    value: g.id,
    label: g.name,
    badgeText: `¥${g.defaultAmountYuan} / ${g.defaultPerfScore}分`,
    description: `影响期 ${g.impactPeriodMonths} 个月 · 领导微调上限 ±¥${g.leaderAdjustCapYuan}`,
  }));

  const execModeOptions: SelectOption[] = Object.entries(EXECUTION_MODE_LABELS).map(
    ([k, label]) => ({
      value: k,
      label,
    })
  );

  const publicityOptions: SelectOption[] = [
    {
      value: 'targeted_only',
      label: '严格定向通知',
      description: '仅当事人、双方部门领导及 HR 可见',
    },
    {
      value: 'desensitized_warning',
      label: 'HR 脱敏案例警示',
      description: '隐去个人身份后发布至内部宣导栏',
    },
  ];

  const isEmployeeRole = currentUser.role === 'employee';
  const scopedTickets = isEmployeeRole
    ? tickets.filter(
        (t) => t.reporterId === currentUser.id || t.accusedEmpId === currentUser.id
      )
    : tickets;

  const filteredTickets = scopedTickets.filter((t) => {
    const matchFilter = filter === 'all' || t.status === filter;
    const matchDept = deptFilter === 'all' || t.accusedDeptIds.includes(deptFilter);
    const matchTag =
      tagFilter === 'all' ||
      (tagFilter === 'confidential' && t.isConfidential) ||
      (tagFilter === 'multi_dept' && t.isMultiDepartment) ||
      (tagFilter === 'major' && t.isMajorAccident);
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      t.ticketNo.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.accusedEmpName.toLowerCase().includes(q) ||
      t.accusedDeptNames.some((d) => d.toLowerCase().includes(q));
    return matchFilter && matchDept && matchTag && matchSearch;
  });

  const selectedTicket =
    scopedTickets.find((t) => t.id === selectedTicketId) ||
    filteredTickets[0] ||
    null;

  useEffect(() => {
    setFormError('');
    setShowRevealPrompt(false);
    setShowAppealForm(false);
    setConfirmComment('');
    setStatementText('');
    setCounterEvidence('');
    setRevealPurpose('');
    setAdjustReason('');
    setExecDecisionNote('');
    setAppealReason('');
    setAppealEvidence('');
    if (selectedTicket?.execution) {
      setSelectedGradeId(selectedTicket.execution.gradeId);
      setExecMode(selectedTicket.execution.executionMode);
      setAmountYuan(selectedTicket.execution.amountYuan);
      setPerfScore(selectedTicket.execution.perfScore);
      setPerfRatio(selectedTicket.execution.perfRatioPercent);
    } else {
      const defGrade = punishmentGrades[1] || punishmentGrades[0];
      if (defGrade) {
        setSelectedGradeId(defGrade.id);
        setExecMode(defGrade.defaultExecutionMode);
        setAmountYuan(defGrade.defaultAmountYuan);
        setPerfScore(defGrade.defaultPerfScore);
        setPerfRatio(defGrade.defaultPerfRatioPercent);
      }
    }
    setPublicityScope(selectedTicket?.publicityScope || 'targeted_only');
    setEscalateMajor(Boolean(selectedTicket?.isMajorAccident));
    setErReportText(selectedTicket?.erInvestigationReport || '');
    setDesensitizedSummary(selectedTicket?.desensitizedCaseSummary || '');
  }, [selectedTicket?.id]);

  const activeGrade =
    punishmentGrades.find((g) => g.id === selectedGradeId) || punishmentGrades[0];

  const isAdjusted =
    activeGrade &&
    (amountYuan !== activeGrade.defaultAmountYuan ||
      perfScore !== activeGrade.defaultPerfScore ||
      perfRatio !== activeGrade.defaultPerfRatioPercent);

  const exceedsLeaderCap =
    activeGrade &&
    (Math.abs(amountYuan - activeGrade.defaultAmountYuan) > activeGrade.leaderAdjustCapYuan ||
      Math.abs(perfScore - activeGrade.defaultPerfScore) > activeGrade.leaderAdjustCapScore ||
      Math.abs(perfRatio - activeGrade.defaultPerfRatioPercent) > activeGrade.leaderAdjustCapRatio);

  const handleSelectGrade = (gradeId: string) => {
    setSelectedGradeId(gradeId);
    const g = punishmentGrades.find((item) => item.id === gradeId);
    if (g) {
      setExecMode(g.defaultExecutionMode);
      setAmountYuan(g.defaultAmountYuan);
      setPerfScore(g.defaultPerfScore);
      setPerfRatio(g.defaultPerfRatioPercent);
      setPublicityScope(g.defaultPublicity);
      setEscalateMajor(g.requiresExecutiveApproval);
    }
  };

  const canHandleExecution =
    currentUser.role === 'er_lead' ||
    currentUser.role === 'hrd' ||
    currentUser.role === 'dept_leader';

  const canConfirmReporterSide = Boolean(
    selectedTicket &&
      !selectedTicket.reporterDeptConfirm.confirmed &&
      currentUser.id !== selectedTicket.accusedEmpId &&
      (currentUser.id === selectedTicket.reporterDeptConfirm.leaderId ||
        (currentUser.isDeptLeader &&
          currentUser.departmentId === selectedTicket.reporterDeptId) ||
        currentUser.role === 'hrd')
  );

  const canConfirmAccusedSide = Boolean(
    selectedTicket &&
      !selectedTicket.accusedDeptConfirm.confirmed &&
      !selectedTicket.accusedDeptConfirm.autoSkippedDueToSelfAccused &&
      currentUser.id !== selectedTicket.accusedEmpId &&
      (currentUser.id === selectedTicket.accusedDeptConfirm.leaderId ||
        (currentUser.isDeptLeader &&
          selectedTicket.accusedDeptIds.includes(currentUser.departmentId)) ||
        currentUser.role === 'hrd')
  );

  const isAccusedPerson = Boolean(
    selectedTicket && currentUser.id === selectedTicket.accusedEmpId
  );

  const canSubmitStatement = Boolean(
    selectedTicket &&
      !selectedTicket.respondentStatement.submitted &&
      isAccusedPerson
  );

  const stepIndex = !selectedTicket
    ? 0
    : selectedTicket.status === 'pending_confirm'
    ? 1
    : selectedTicket.status === 'er_investigation'
    ? 2
    : selectedTicket.status === 'major_escalation'
    ? 3
    : selectedTicket.status === 'pending_hr_exec'
    ? 3
    : 4;

  const WORKFLOW_STEPS = [
    '提报与举证',
    '双方部门确认 & 陈述',
    '分流评估 / ER 调查',
    '定级 / 高层终审',
    '执行与档案生效',
  ];

  return (
    <div className="space-y-5">
      {isEmployeeRole && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            隐私权限边界：一线员工仅可见本人发起的反馈或本人涉事的问责单据，无法查阅其他同事的问责记录。
          </span>
          <span className="font-mono-tabular text-blue-800">
            本人关联单据 {scopedTickets.length} 条
          </span>
        </div>
      )}
      {/* Toolbar: Segmented Filter + Dropdowns + Search + Create CTA */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenNewModal}
            className="px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增问责</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-2 border-t border-slate-100">
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索单号、事件标题、被问责人或部门..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="sm:col-span-3">
            <CustomSelect
              value={deptFilter}
              onChange={setDeptFilter}
              options={deptFilterOptions}
              size="sm"
            />
          </div>
          <div className="sm:col-span-3">
            <CustomSelect
              value={tagFilter}
              onChange={setTagFilter}
              options={tagFilterOptions}
              size="sm"
            />
          </div>
          <div className="sm:col-span-1 text-right">
            {(filter !== 'all' || deptFilter !== 'all' || tagFilter !== 'all' || search) && (
              <button
                type="button"
                onClick={() => {
                  setFilter('all');
                  setDeptFilter('all');
                  setTagFilter('all');
                  setSearch('');
                }}
                className="text-xs text-blue-800 hover:text-blue-950 font-medium whitespace-nowrap"
              >
                重置筛选
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Master-Detail Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left List */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>问责工单列表</span>
            <span className="font-mono-tabular">{filteredTickets.length} 条记录</span>
          </div>
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-3">
              <div>当前筛选条件下暂无工单</div>
              <button
                type="button"
                onClick={() => {
                  setFilter('all');
                  setDeptFilter('all');
                  setTagFilter('all');
                  setSearch('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                清空全部筛选条件
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[75vh] overflow-y-auto">
              {filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const meta = ACCOUNTABILITY_STATUS_META[t.status];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTicket(t.id)}
                    className={`w-full text-left p-4 transition-colors block ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <span className="font-mono-tabular font-semibold text-slate-700">
                        {t.ticketNo}
                        {t.isConfidential && ' · 实名保密'}
                        {t.isMajorAccident && ' · 重大事故'}
                      </span>
                      <span className={`font-medium ${meta.textClass}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 line-clamp-2 mb-1.5">
                      {t.title}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center justify-between">
                      <span>
                        被问责：{t.accusedEmpName}（{t.accusedDeptNames.join('、')}）
                      </span>
                      <span className="font-mono-tabular">{t.incidentDate}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Workspace */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          {!selectedTicket ? (
            <div className="py-16 text-center text-sm text-slate-500">
              请选择左侧工单查看全生命周期流转详情
            </div>
          ) : (
            <>
              {/* Header + Urge/Escalate controls */}
              <div className="space-y-3 pb-5 border-b border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono-tabular font-semibold text-slate-900">
                      {selectedTicket.ticketNo}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>事发 {selectedTicket.incidentDate}</span>
                    <span aria-hidden="true">·</span>
                    <span className={ACCOUNTABILITY_STATUS_META[selectedTicket.status].textClass + ' font-semibold'}>
                      {ACCOUNTABILITY_STATUS_META[selectedTicket.status].label}
                    </span>
                  </div>

                  {selectedTicket.status !== 'archived' &&
                    selectedTicket.status !== 'appeal_resolved' && (() => {
                      const stageUrged = (selectedTicket.urgedStages || []).includes(
                        selectedTicket.status
                      );
                      const isUrging = isActionPending(`ticket:urge:${selectedTicket.id}`);
                      const isEscalating = isActionPending(
                        `ticket:escalate:${selectedTicket.id}`
                      );
                      return (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={stageUrged || isUrging}
                            onClick={() => onUrgeOrEscalate(selectedTicket.id, false)}
                            title={
                              stageUrged
                                ? '当前节点已发起过人工催办，请等待流转至下一节点后再催办'
                                : '推送钉钉人工催办提醒'
                            }
                            className={`px-3 py-1.5 text-xs font-medium border rounded-md flex items-center gap-1 whitespace-nowrap ${
                              stageUrged || isUrging
                                ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                                : 'text-slate-700 bg-white border-slate-300 hover:bg-slate-50'
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
                              {isUrging
                                ? '催办中...'
                                : stageUrged
                                ? `本节点已催办（${selectedTicket.urgeCount}）`
                                : `人工催办（${selectedTicket.urgeCount}）`}
                            </span>
                          </button>
                          {!selectedTicket.manualEscalated && (
                            <button
                              type="button"
                              disabled={isEscalating}
                              onClick={() => onUrgeOrEscalate(selectedTicket.id, true)}
                              className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 flex items-center gap-1 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isEscalating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                              )}
                              <span>{isEscalating ? '升级中...' : '手动升级督办'}</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                </div>

                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedTicket.title}
                </h2>

                {/* 5-Stage Lifecycle Stepper */}
                <div className="pt-2">
                  <div className="grid grid-cols-5 gap-2">
                    {WORKFLOW_STEPS.map((step, idx) => {
                      const done = idx < stepIndex;
                      const current = idx === stepIndex;
                      return (
                        <div key={step} className="space-y-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-colors ${
                              done
                                ? 'bg-emerald-600'
                                : current
                                ? 'bg-blue-800'
                                : 'bg-slate-200'
                            }`}
                          />
                          <div
                            className={`text-[11px] truncate ${
                              current
                                ? 'font-semibold text-blue-900'
                                : done
                                ? 'text-emerald-700 font-medium'
                                : 'text-slate-400'
                            }`}
                          >
                            {idx + 1}. {step}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Facts & Confidential Reporter Identity Section */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div>
                    <span className="text-slate-500">提报人：</span>
                    <span className="font-medium text-slate-900">
                      {getDisplayReporterName(selectedTicket)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">提报部门：</span>
                    <span className="font-medium text-slate-900">
                      {selectedTicket.isConfidential &&
                      !canRevealConfidentialIdentity(currentUser.role) &&
                      selectedTicket.reporterId !== currentUser.id
                        ? '保密保护中'
                        : selectedTicket.reporterDeptName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">被问责人：</span>
                    <span className="font-medium text-slate-900">
                      {selectedTicket.accusedEmpName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">涉及责任部门：</span>
                    <span className="font-medium text-slate-900">
                      {selectedTicket.accusedDeptNames.join('、')}
                      {selectedTicket.isMultiDepartment && '（多部门协同事件）'}
                    </span>
                  </div>
                </div>

                {/* Confidential Identity Reveal Control for ER / HRD */}
                {selectedTicket.isConfidential &&
                  canRevealConfidentialIdentity(currentUser.role) &&
                  !revealedConfidentialTicketIds.includes(selectedTicket.id) && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2 text-xs text-amber-900">
                        <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">
                            此工单启用了【实名保密提报】保护
                          </div>
                          <div className="text-amber-800 mt-0.5">
                            仅 ER 负责人与 HRD 拥有解密权限，每次查看将永久写入不可篡改合规审计日志。
                          </div>
                        </div>
                      </div>
                      {!showRevealPrompt ? (
                        <button
                          type="button"
                          onClick={() => setShowRevealPrompt(true)}
                          className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-white border border-amber-300 rounded-md hover:bg-amber-100 flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>解密查看真实身份</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={revealPurpose}
                            onChange={(e) => setRevealPurpose(e.target.value)}
                            placeholder="填写查验事由（必填）"
                            className="px-2.5 py-1.5 text-xs border border-amber-300 rounded-md bg-white"
                          />
                          <button
                            type="button"
                            disabled={isActionPending(`ticket:reveal:${selectedTicket.id}`)}
                            onClick={async () => {
                              await onRevealConfidential(
                                selectedTicket.id,
                                revealPurpose || 'ER/HRD 事实核查需要'
                              );
                              setShowRevealPrompt(false);
                              setRevealPurpose('');
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-md whitespace-nowrap inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isActionPending(`ticket:reveal:${selectedTicket.id}`) && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            <span>
                              {isActionPending(`ticket:reveal:${selectedTicket.id}`)
                                ? '解密留痕中...'
                                : '确认解密并留痕'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-1.5">
                    事实描述与证据材料
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    {selectedTicket.factDescription}
                  </p>
                  {selectedTicket.evidences.length > 0 && (
                    <div className="space-y-1.5">
                      {selectedTicket.evidences.map((ev) => (
                        <div
                          key={ev.id}
                          className="px-3 py-2 border border-slate-200 rounded-md text-xs flex items-center justify-between gap-2 bg-slate-50/50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="font-medium text-slate-800 truncate">
                              {ev.name}
                            </span>
                            <span className="text-slate-500 truncate">
                              — {ev.summary}
                            </span>
                          </div>
                          <span className="text-slate-400 font-mono-tabular shrink-0">
                            {ev.uploadedAt}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Bilateral Dept Confirm + Respondent Online Statement */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">
                  双方部门领导确认与被问责人在线陈述（同步节点）
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Reporter Dept Confirmation */}
                  <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        发起人部门：{selectedTicket.reporterDeptConfirm.leaderName}
                      </span>
                      <span
                        className={
                          selectedTicket.reporterDeptConfirm.confirmed
                            ? 'text-emerald-700 font-medium'
                            : 'text-amber-700 font-medium'
                        }
                      >
                        {selectedTicket.reporterDeptConfirm.confirmed
                          ? '已确认'
                          : '待确认'}
                      </span>
                    </div>
                    {selectedTicket.reporterDeptConfirm.confirmed ? (
                      <p className="text-xs text-slate-600">
                        {selectedTicket.reporterDeptConfirm.comment}
                      </p>
                    ) : canConfirmReporterSide ? (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          value={confirmComment}
                          onChange={(e) => setConfirmComment(e.target.value)}
                          placeholder="填写部门核实意见..."
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                        />
                        <div className="flex gap-2">
                          {(() => {
                            const confirmingReporter = isActionPending(
                              `ticket:confirm:${selectedTicket.id}:reporter`
                            );
                            return (
                              <>
                                <button
                                  type="button"
                                  disabled={confirmingReporter}
                                  onClick={async () => {
                                    await onConfirmDept(
                                      selectedTicket.id,
                                      'reporter',
                                      false,
                                      confirmComment || '情况属实，无异议'
                                    );
                                    setConfirmComment('');
                                  }}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {confirmingReporter && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  <span>{confirmingReporter ? '提交中...' : '确认无异议'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={confirmingReporter}
                                  onClick={async () => {
                                    await onConfirmDept(
                                      selectedTicket.id,
                                      'reporter',
                                      true,
                                      confirmComment || '事实尚有争议，申请 ER 核查'
                                    );
                                    setConfirmComment('');
                                  }}
                                  className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <span>存疑转 ER</span>
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        等待发起人部门领导确认...
                      </p>
                    )}
                  </div>

                  {/* Accused Dept Confirmation (with auto-skip rule) */}
                  <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        被问责部门：{selectedTicket.accusedDeptConfirm.leaderName}
                      </span>
                      <span
                        className={
                          selectedTicket.accusedDeptConfirm.autoSkippedDueToSelfAccused
                            ? 'text-blue-700 font-medium'
                            : selectedTicket.accusedDeptConfirm.confirmed
                            ? 'text-emerald-700 font-medium'
                            : 'text-amber-700 font-medium'
                        }
                      >
                        {selectedTicket.accusedDeptConfirm.autoSkippedDueToSelfAccused
                          ? '已触发自动回避'
                          : selectedTicket.accusedDeptConfirm.confirmed
                          ? '已确认'
                          : '待确认'}
                      </span>
                    </div>
                    {selectedTicket.accusedDeptConfirm.confirmed ? (
                      <p className="text-xs text-slate-600">
                        {selectedTicket.accusedDeptConfirm.comment}
                      </p>
                    ) : canConfirmAccusedSide ? (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          value={confirmComment}
                          onChange={(e) => setConfirmComment(e.target.value)}
                          placeholder="填写部门核实意见..."
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                        />
                        <div className="flex gap-2">
                          {(() => {
                            const confirmingAccused = isActionPending(
                              `ticket:confirm:${selectedTicket.id}:accused`
                            );
                            return (
                              <>
                                <button
                                  type="button"
                                  disabled={confirmingAccused}
                                  onClick={async () => {
                                    await onConfirmDept(
                                      selectedTicket.id,
                                      'accused',
                                      false,
                                      confirmComment || '经核实认可责任归属'
                                    );
                                    setConfirmComment('');
                                  }}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {confirmingAccused && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  <span>
                                    {confirmingAccused ? '提交中...' : '认可事实无异议'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  disabled={confirmingAccused}
                                  onClick={async () => {
                                    await onConfirmDept(
                                      selectedTicket.id,
                                      'accused',
                                      true,
                                      confirmComment || '存在跨部门责任争议，请 ER 协调'
                                    );
                                    setConfirmComment('');
                                  }}
                                  className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <span>存在异议转 ER</span>
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        等待被问责部门领导确认（若领导本人被问责将自动回避跳过）
                      </p>
                    )}
                  </div>
                </div>

                {/* Respondent Statement Box */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      被问责人在线陈述（{selectedTicket.accusedEmpName}）
                    </span>
                    <span
                      className={
                        selectedTicket.respondentStatement.submitted
                          ? selectedTicket.respondentStatement.agreesWithFacts
                            ? 'text-emerald-700 font-medium'
                            : 'text-amber-700 font-medium'
                          : 'text-slate-500'
                      }
                    >
                      {selectedTicket.respondentStatement.submitted
                        ? selectedTicket.respondentStatement.agreesWithFacts
                          ? '已陈述 · 认同事实'
                          : '已陈述 · 存在异议（已转 ER 调查）'
                        : '待在线陈述'}
                    </span>
                  </div>

                  {selectedTicket.respondentStatement.submitted ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-100">
                        {selectedTicket.respondentStatement.statementText}
                      </p>
                      {selectedTicket.respondentStatement.counterEvidence.map((cev) => (
                        <div
                          key={cev.id}
                          className="text-xs text-slate-600 flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>反证附件：{cev.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : canSubmitStatement ? (
                    <div className="space-y-2.5">
                      {formError && selectedTicket.status === 'pending_confirm' && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                          {formError}
                        </div>
                      )}
                      <textarea
                        rows={2}
                        value={statementText}
                        onChange={(e) => setStatementText(e.target.value)}
                        placeholder="请填写本人陈述意见（如存在客观原因或跨部门接口争议，选择“存在异议”将自动触发 ER 介入核实）..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={counterEvidence}
                            onChange={(e) => setCounterEvidence(e.target.value)}
                            placeholder="反证材料名称（或右侧上传）"
                            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md w-48"
                          />
                          <label className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer inline-flex items-center gap-1">
                            <FileUp className="w-3.5 h-3.5" />
                            <span>上传</span>
                            <input
                              type="file"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setCounterEvidence(f.name);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const submittingStmt = isActionPending(
                              `ticket:statement:${selectedTicket.id}`
                            );
                            return (
                              <>
                                <button
                                  type="button"
                                  disabled={submittingStmt}
                                  onClick={async () => {
                                    if (!statementText.trim()) {
                                      setFormError('提交陈述时请填写陈述内容。');
                                      return;
                                    }
                                    setFormError('');
                                    await onSubmitStatement(
                                      selectedTicket.id,
                                      true,
                                      statementText.trim(),
                                      counterEvidence.trim() || undefined
                                    );
                                    setStatementText('');
                                    setCounterEvidence('');
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {submittingStmt && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  <span>
                                    {submittingStmt ? '提交中...' : '提交陈述（认同事实）'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingStmt}
                                  onClick={async () => {
                                    if (!statementText.trim()) {
                                      setFormError('提交异议陈述时请说明理由。');
                                      return;
                                    }
                                    setFormError('');
                                    await onSubmitStatement(
                                      selectedTicket.id,
                                      false,
                                      statementText.trim(),
                                      counterEvidence.trim() || undefined
                                    );
                                    setStatementText('');
                                    setCounterEvidence('');
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-md inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <span>存在异议（转 ER 调查）</span>
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        仅被问责人本人（{selectedTicket.accusedEmpName}）可提交在线陈述。
                      </p>
                      <button
                        type="button"
                        onClick={() => onSwitchEmployee(selectedTicket.accusedEmpId)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 whitespace-nowrap"
                      >
                        切换为 {selectedTicket.accusedEmpName} 视角提交陈述
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ER Proactive Intervention Button */}
              {(currentUser.role === 'er_lead' || currentUser.role === 'hrd') &&
                selectedTicket.status === 'pending_confirm' && (
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between gap-3">
                    <div className="text-xs text-blue-900">
                      <span className="font-semibold">HR（ER）抽查与主动介入权：</span>
                      可不等待前端确认完成，直接将此工单拉入 ER 调查核实。
                    </div>
                    <button
                      type="button"
                      disabled={isActionPending(`ticket:er_intervene:${selectedTicket.id}`)}
                      onClick={() =>
                        onErIntervene(
                          selectedTicket.id,
                          'ER 团队例行风险抽查主动介入核实'
                        )
                      }
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0 inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isActionPending(`ticket:er_intervene:${selectedTicket.id}`) && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      <span>
                        {isActionPending(`ticket:er_intervene:${selectedTicket.id}`)
                          ? '介入中...'
                          : '主动介入调查'}
                      </span>
                    </button>
                  </div>
                )}

              {/* Step 3 & 4: ER Investigation & Policy Grading + Authorized Fine-tuning */}
              {(selectedTicket.status === 'er_investigation' ||
                selectedTicket.status === 'pending_hr_exec') && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      制度定级、授权微调与执行归档
                    </h3>
                    <span className="text-xs text-slate-500">
                      支持固定金额 / 绩效分数 / 绩效系数调整
                    </span>
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                      {formError}
                    </div>
                  )}

                  {canHandleExecution ? (
                    <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                      {selectedTicket.status === 'er_investigation' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            ER 调查核实与协调定责结论
                          </label>
                          <textarea
                            rows={2}
                            value={erReportText}
                            onChange={(e) => setErReportText(e.target.value)}
                            placeholder="汇总双方证据、陈述核验结果及责任划分意见..."
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            制度预设处分等级
                          </label>
                          <CustomSelect
                            value={selectedGradeId}
                            onChange={handleSelectGrade}
                            options={gradeOptions}
                            size="sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            执行方式
                          </label>
                          <CustomSelect
                            value={execMode}
                            onChange={(v) => setExecMode(v as ExecutionMode)}
                            options={execModeOptions}
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            金额变动（元）
                            {execMode === 'fixed_amount' && (
                              <span className="text-blue-700 ml-1">主执行</span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={amountYuan}
                            onChange={(e) => setAmountYuan(Number(e.target.value) || 0)}
                            className={`w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border rounded-md ${
                              execMode === 'fixed_amount'
                                ? 'border-blue-500 ring-1 ring-blue-500/20'
                                : 'border-slate-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            绩效分数增减
                            {execMode === 'perf_score' && (
                              <span className="text-blue-700 ml-1">主执行</span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={perfScore}
                            onChange={(e) => setPerfScore(Number(e.target.value) || 0)}
                            className={`w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border rounded-md ${
                              execMode === 'perf_score'
                                ? 'border-blue-500 ring-1 ring-blue-500/20'
                                : 'border-slate-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            绩效系数调整（%）
                            {execMode === 'perf_ratio' && (
                              <span className="text-blue-700 ml-1">主执行</span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={perfRatio}
                            onChange={(e) => setPerfRatio(Number(e.target.value) || 0)}
                            className={`w-full px-3 py-1.5 text-xs font-mono-tabular bg-white border rounded-md ${
                              execMode === 'perf_ratio'
                                ? 'border-blue-500 ring-1 ring-blue-500/20'
                                : 'border-slate-300'
                            }`}
                          />
                        </div>
                      </div>

                      {isAdjusted && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-amber-800">
                            检测到额度/分值微调，制度强制要求填写调整理由 *
                          </label>
                          <input
                            type="text"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="说明微调依据（例如：当事人主动补救降低损失）"
                            className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-md"
                          />
                          {exceedsLeaderCap && (
                            <div className="text-xs text-red-700 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                微调幅度已超出本级授权上限（±¥{activeGrade?.leaderAdjustCapYuan} / ±{activeGrade?.leaderAdjustCapScore}分），提交后将自动逐级上报总经理/董事长审批。
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            公示与通知范围
                          </label>
                          <CustomSelect
                            value={publicityScope}
                            onChange={(v) => setPublicityScope(v as PublicityScope)}
                            options={publicityOptions}
                            size="sm"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-xs text-red-800 font-medium pt-4 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={escalateMajor}
                            onChange={(e) => setEscalateMajor(e.target.checked)}
                            className="rounded border-slate-300 text-red-700"
                          />
                          <span>认定为重大事故，上报总经理及董事长终审</span>
                        </label>
                      </div>

                      {publicityScope === 'desensitized_warning' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            HR 脱敏警示案例摘要（将发布至内部宣导栏）
                          </label>
                          <input
                            type="text"
                            value={desensitizedSummary}
                            onChange={(e) => setDesensitizedSummary(e.target.value)}
                            placeholder="隐藏真实姓名与工号，提炼跨部门协同规范教训..."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                          />
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={isActionPending(`ticket:execute:${selectedTicket.id}`)}
                          onClick={async () => {
                            if (isAdjusted && !adjustReason.trim()) {
                              setFormError('微调处罚额度时必须填写调整理由。');
                              return;
                            }
                            setFormError('');
                            await onExecuteOrEscalate(selectedTicket.id, {
                              erReport: erReportText.trim(),
                              gradeId: selectedGradeId,
                              executionMode: execMode,
                              amountYuan,
                              perfScore,
                              perfRatioPercent: perfRatio,
                              isAdjusted: Boolean(isAdjusted),
                              adjustmentReason: adjustReason.trim(),
                              publicityScope,
                              desensitizedCaseSummary: desensitizedSummary.trim(),
                              escalateMajor,
                            });
                          }}
                          className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isActionPending(`ticket:execute:${selectedTicket.id}`) && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          )}
                          <span>
                            {isActionPending(`ticket:execute:${selectedTicket.id}`)
                              ? '执行提交中...'
                              : escalateMajor ||
                                activeGrade?.requiresExecutiveApproval ||
                                exceedsLeaderCap
                              ? '提交调查报告并上报高层终审'
                              : '确认定级执行并记入员工档案'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                      当前工单正在由 ER 团队 / 人力资源部进行核实与制度定级处理。
                    </div>
                  )}
                </div>
              )}

              {/* Major Accident / Over-Cap Executive Decision */}
              {selectedTicket.status === 'major_escalation' && (
                <div className="p-4 bg-red-50/70 border border-red-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
                    <AlertTriangle className="w-4 h-4" />
                    <span>重大事故 / 超授权终审裁决区（总经理及董事长权限）</span>
                  </div>
                  {selectedTicket.erInvestigationReport && (
                    <div className="text-xs text-slate-700 bg-white p-3 rounded-md border border-red-100">
                      <div className="font-semibold text-slate-900 mb-1">
                        ER 汇总调查报告（调查人：{selectedTicket.erInvestigatorName}）：
                      </div>
                      <p>{selectedTicket.erInvestigationReport}</p>
                    </div>
                  )}
                  {selectedTicket.execution && (
                    <div className="text-xs text-slate-700 font-mono-tabular">
                      拟定等级：{selectedTicket.execution.gradeName} · 金额 ¥
                      {selectedTicket.execution.amountYuan} · 绩效分{' '}
                      {selectedTicket.execution.perfScore} · 影响期{' '}
                      {selectedTicket.execution.impactPeriodMonths} 个月
                    </div>
                  )}
                  {currentUser.role === 'executive' ? (
                    <div className="space-y-2.5 pt-1">
                      {formError && (
                        <div className="p-2.5 bg-red-100 border border-red-300 rounded-md text-xs text-red-800">
                          {formError}
                        </div>
                      )}
                      <textarea
                        rows={2}
                        value={execDecisionNote}
                        onChange={(e) => setExecDecisionNote(e.target.value)}
                        placeholder="输入总经理/董事长最终裁决意见..."
                        className="w-full px-3 py-2 text-xs bg-white border border-red-200 rounded-md"
                      />
                      <input
                        type="text"
                        value={desensitizedSummary}
                        onChange={(e) => setDesensitizedSummary(e.target.value)}
                        placeholder="脱敏警示案例宣导摘要（可选，用于全员警示栏）"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-red-200 rounded-md"
                      />
                      <button
                        type="button"
                        disabled={isActionPending(`ticket:exec_decide:${selectedTicket.id}`)}
                        onClick={async () => {
                          if (!execDecisionNote.trim()) {
                            setFormError('请填写最终裁决意见。');
                            return;
                          }
                          setFormError('');
                          await onExecutiveDecide(
                            selectedTicket.id,
                            execDecisionNote.trim(),
                            desensitizedSummary.trim() || undefined
                          );
                        }}
                        className="px-4 py-2 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isActionPending(`ticket:exec_decide:${selectedTicket.id}`) && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        <span>
                          {isActionPending(`ticket:exec_decide:${selectedTicket.id}`)
                            ? '签署提交中...'
                            : '签署终审裁决并归档生效'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-red-800">
                      请切换左侧角色为【总经理及董事长】执行最终裁决。
                    </div>
                  )}
                </div>
              )}

              {/* Archived Execution Summary & Appeal Trigger */}
              {(selectedTicket.status === 'archived' ||
                selectedTicket.status === 'appealing' ||
                selectedTicket.status === 'appeal_resolved') &&
                selectedTicket.execution && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        <span>已生效奖惩执行单据</span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono-tabular">
                        归档时间：{selectedTicket.archivedAt}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-slate-500">最终定级</div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {selectedTicket.execution.gradeName}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">金额 / 绩效</div>
                        <div className="font-mono-tabular font-semibold text-slate-900 mt-0.5">
                          ¥{selectedTicket.execution.amountYuan} /{' '}
                          {selectedTicket.execution.perfScore}分
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">处分影响期</div>
                        <div className="font-mono-tabular font-semibold text-slate-900 mt-0.5">
                          {selectedTicket.execution.impactPeriodMonths} 个月
                          {selectedTicket.execution.impactExpiresAt
                            ? `（至 ${selectedTicket.execution.impactExpiresAt}）`
                            : ''}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">通知范围</div>
                        <div className="font-medium text-slate-800 mt-0.5">
                          {selectedTicket.publicityScope === 'desensitized_warning'
                            ? '脱敏警示发布'
                            : '严格定向通知'}
                        </div>
                      </div>
                    </div>

                    {selectedTicket.execution.isAdjusted && (
                      <div className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                        <span className="font-medium text-slate-800">微调说明：</span>
                        {selectedTicket.execution.adjustmentReason}
                      </div>
                    )}

                    {selectedTicket.status === 'archived' && (
                      <div className="pt-2 border-t border-slate-200">
                        {!isAccusedPerson ? (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-slate-500">
                              仅被问责人本人（{selectedTicket.accusedEmpName}）可在档案生效后发起在线申诉（由 HRD 统一复核）。
                            </span>
                            <button
                              type="button"
                              onClick={() => onSwitchEmployee(selectedTicket.accusedEmpId)}
                              className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 whitespace-nowrap"
                            >
                              切换为 {selectedTicket.accusedEmpName} 发起申诉
                            </button>
                          </div>
                        ) : !showAppealForm ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-500">
                              如对调查事实或处分结果有异议，可在档案生效后发起在线申诉（由 HRD 统一复核）。
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormError('');
                                setShowAppealForm(true);
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 whitespace-nowrap"
                            >
                              发起在线申诉
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {formError && (
                              <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                                {formError}
                              </div>
                            )}
                            <textarea
                              rows={2}
                              value={appealReason}
                              onChange={(e) => setAppealReason(e.target.value)}
                              placeholder="请说明申诉事实理由与诉求（如涉及 HRD 利益冲突将自动回避升级）..."
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={appealEvidence}
                                  onChange={(e) => setAppealEvidence(e.target.value)}
                                  placeholder="补充申诉证据文件名（或上传）"
                                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md w-52"
                                />
                                <label className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer inline-flex items-center gap-1">
                                  <FileUp className="w-3.5 h-3.5" />
                                  <span>选择文件</span>
                                  <input
                                    type="file"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) setAppealEvidence(f.name);
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isActionPending(`ticket:appeal:${selectedTicket.id}`)}
                                  onClick={() => {
                                    setFormError('');
                                    setShowAppealForm(false);
                                  }}
                                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-md bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  disabled={isActionPending(`ticket:appeal:${selectedTicket.id}`)}
                                  onClick={async () => {
                                    if (!appealReason.trim()) {
                                      setFormError('请填写申诉事实理由与诉求。');
                                      return;
                                    }
                                    setFormError('');
                                    const ok = await onSubmitAppeal({
                                      ticketId: selectedTicket.id,
                                      reason: appealReason.trim(),
                                      evidenceName: appealEvidence.trim() || undefined,
                                    });
                                    if (ok) {
                                      setAppealReason('');
                                      setAppealEvidence('');
                                      setShowAppealForm(false);
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-md inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {isActionPending(`ticket:appeal:${selectedTicket.id}`) && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  <span>
                                    {isActionPending(`ticket:appeal:${selectedTicket.id}`)
                                      ? '提交申诉中...'
                                      : '提交申诉并进入复核'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
