import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  Megaphone,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  AccountabilityTicket,
  AppealCase,
  AppealStatus,
  Employee,
  PolicyGrade,
  RewardNomination,
} from '../types/platform';
import { APPEAL_STATUS_META } from '../utils/labels';
import { CustomSelect, SelectOption } from './CustomSelect';

interface AppealsAndPublicityViewProps {
  currentUser: Employee;
  appeals: AppealCase[];
  tickets: AccountabilityTicket[];
  rewards: RewardNomination[];
  policyGrades: PolicyGrade[];
  isActionPending?: (key: string) => boolean;
  onSubmitAppeal: (payload: {
    ticketId: string;
    reason: string;
    evidenceName?: string;
  }) => void | Promise<void>;
  onDecideAppeal: (
    appealId: string,
    outcome: 'upheld' | 'modified' | 'revoked',
    decisionNote: string,
    newGradeId?: string
  ) => void | Promise<void>;
  onSwitchEmployee: (empId: string) => void;
  onNavigatePublicity?: () => void;
}

export const AppealsAndPublicityView: React.FC<AppealsAndPublicityViewProps> = ({
  currentUser,
  appeals,
  tickets,
  rewards,
  policyGrades,
  isActionPending = () => false,
  onSubmitAppeal,
  onDecideAppeal,
  onSwitchEmployee,
  onNavigatePublicity,
}) => {
  const [tab, setTab] = useState<'appeals' | 'publicity'>('appeals');
  const [appealStatusFilter, setAppealStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [search, setSearch] = useState('');
  const [selectedAppealId, setSelectedAppealId] = useState<string>(
    appeals[0]?.id || ''
  );
  const [decisionNote, setDecisionNote] = useState('');
  const [newGradeId, setNewGradeId] = useState('grade-p1');
  const [error, setError] = useState('');

  // New Appeal Modal
  const [showNewAppealModal, setShowNewAppealModal] = useState(false);
  const archivedTickets = tickets.filter(
    (t) =>
      t.status === 'archived' &&
      !appeals.some((a) => a.ticketId === t.id && a.status === 'pending_review')
  );
  const [appealTicketId, setAppealTicketId] = useState(archivedTickets[0]?.id || '');
  const [newAppealReason, setNewAppealReason] = useState('');
  const [newAppealEvidence, setNewAppealEvidence] = useState('');
  const [modalError, setModalError] = useState('');

  const punishmentGrades = policyGrades.filter((g) => g.category === 'punishment');
  const gradeOptions: SelectOption[] = punishmentGrades.map((g) => ({
    value: g.id,
    label: g.name,
    badgeText: `¥${g.defaultAmountYuan} / ${g.defaultPerfScore}分`,
    description: `影响期 ${g.impactPeriodMonths} 个月`,
  }));

  const archivedTicketOptions: SelectOption[] = archivedTickets.map((t) => ({
    value: t.id,
    label: `${t.ticketNo} · ${t.title}`,
    badgeText: t.execution?.gradeName,
    description: `被问责人：${t.accusedEmpName}（${t.accusedDeptNames.join('、')}）`,
  }));

  const isEmployeeRole = currentUser.role === 'employee';
  const scopedAppeals = isEmployeeRole
    ? appeals.filter((a) => a.appellantId === currentUser.id)
    : appeals;

  const filteredAppeals = scopedAppeals.filter((a) => {
    const matchStatus =
      appealStatusFilter === 'all'
        ? true
        : appealStatusFilter === 'pending'
        ? a.status === 'pending_review'
        : a.status !== 'pending_review';
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      a.appealNo.toLowerCase().includes(q) ||
      a.ticketNo.toLowerCase().includes(q) ||
      a.appellantName.toLowerCase().includes(q) ||
      a.ticketTitle.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const selectedAppeal =
    scopedAppeals.find((a) => a.id === selectedAppealId) ||
    filteredAppeals[0] ||
    null;

  useEffect(() => {
    setDecisionNote('');
    setError('');
    setNewGradeId(punishmentGrades[0]?.id || 'grade-p1');
  }, [selectedAppeal?.id]);

  const publicRewards = rewards.filter(
    (r) =>
      r.status === 'approved_archived' &&
      (r.publicityScope === 'all_staff_dingtalk' || r.publicityScope === 'team_dept')
  );
  const desensitizedWarnings = tickets.filter(
    (t) =>
      t.publicityScope === 'desensitized_warning' &&
      (t.desensitizedCaseSummary || t.status === 'archived')
  );

  const canReviewAppeal = (a: AppealCase) => {
    if (a.status !== 'pending_review') return false;
    if (a.hrdConflictTriggered) {
      return currentUser.role === 'executive';
    }
    return currentUser.role === 'hrd' || currentUser.role === 'executive';
  };

  const selectedArchivedTicket = archivedTickets.find(
    (t) => t.id === appealTicketId
  );
  const canSubmitForSelectedArchived = Boolean(
    selectedArchivedTicket && selectedArchivedTicket.accusedEmpId === currentUser.id
  );

  const handleOpenAppealModal = () => {
    const myArchived = archivedTickets.find((t) => t.accusedEmpId === currentUser.id);
    setAppealTicketId(myArchived?.id || archivedTickets[0]?.id || '');
    setNewAppealReason('');
    setNewAppealEvidence('');
    setModalError('');
    setShowNewAppealModal(true);
  };

  const isCreatingAppeal = isActionPending(`appeal:create:${appealTicketId}`);

  const handleCreateAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingAppeal) return;
    if (!appealTicketId || !selectedArchivedTicket) {
      setModalError('当前暂无可发起申诉的已归档处分工单。');
      return;
    }
    if (selectedArchivedTicket.accusedEmpId !== currentUser.id) {
      setModalError(
        `仅被问责人本人（${selectedArchivedTicket.accusedEmpName}）可针对此工单发起申诉，请先切换身份视角。`
      );
      return;
    }
    if (!newAppealReason.trim()) {
      setModalError('请填写申诉事实理由。');
      return;
    }
    await onSubmitAppeal({
      ticketId: appealTicketId,
      reason: newAppealReason.trim(),
      evidenceName: newAppealEvidence.trim() || undefined,
    });
    setNewAppealReason('');
    setNewAppealEvidence('');
    setModalError('');
    setShowNewAppealModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Segmented Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('appeals')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'appeals'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEmployeeRole ? '我的申诉记录' : '申诉复核与回避裁决'}（{scopedAppeals.length}）
            </button>
            <button
              type="button"
              onClick={() => setTab('publicity')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'publicity'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              脱敏案例摘要速览
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigatePublicity && (
              <button
                type="button"
                onClick={onNavigatePublicity}
                className="px-3 py-2 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>打开当月全员奖惩公示栏看板</span>
              </button>
            )}
            {tab === 'appeals' && (
              <button
                type="button"
                onClick={handleOpenAppealModal}
                className="px-3.5 py-2 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>发起在线申诉</span>
              </button>
            )}
          </div>
        </div>

        {tab === 'appeals' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: '全部申诉' },
                  { id: 'pending', label: '待复核' },
                  { id: 'resolved', label: '已裁决' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAppealStatusFilter(f.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    appealStatusFilter === f.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索申诉单号、原单号或申诉人..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        )}
      </div>

      {tab === 'appeals' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left Appeal Queue */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>申诉复核工单</span>
              <span className="font-mono-tabular">{filteredAppeals.length} 宗</span>
            </div>
            {filteredAppeals.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                当前筛选条件下暂无申诉案件
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredAppeals.map((a) => {
                  const meta = APPEAL_STATUS_META[a.status];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAppealId(a.id)}
                      className={`w-full text-left p-4 transition-colors block ${
                        selectedAppeal?.id === a.id
                          ? 'bg-amber-50/50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono-tabular font-semibold text-slate-700">
                          {a.appealNo} · 关联 {a.ticketNo}
                        </span>
                        <span className={`font-medium ${meta.textClass}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-900 line-clamp-1 mb-1">
                        {a.ticketTitle}
                      </div>
                      <div className="text-xs text-slate-500">
                        申诉人：{a.appellantName}（{a.appellantDeptName}） · 复核：{a.assignedReviewerName}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Appeal Detail & Decision Workspace */}
          <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            {!selectedAppeal ? (
              <div className="py-12 text-center text-sm text-slate-500">
                请选择左侧申诉单查看详情
              </div>
            ) : (
              <>
                <div className="pb-4 border-b border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono-tabular font-semibold text-slate-800">
                      {selectedAppeal.appealNo} · 原工单 {selectedAppeal.ticketNo}
                    </span>
                    <span
                      className={`font-semibold ${
                        APPEAL_STATUS_META[selectedAppeal.status].textClass
                      }`}
                    >
                      {APPEAL_STATUS_META[selectedAppeal.status].label}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedAppeal.ticketTitle}
                  </h3>
                </div>

                {selectedAppeal.hrdConflictTriggered && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-900">
                    <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">
                        已触发【HRD 利益冲突强制回避规则】
                      </div>
                      <p className="mt-0.5 text-red-800">
                        {selectedAppeal.hrdConflictReason}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
                  <div>
                    <div className="text-slate-500">申诉人</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {selectedAppeal.appellantName}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">原处分定级</div>
                    <div className="font-semibold text-red-700 mt-0.5">
                      {selectedAppeal.originalGradeName}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">原金额变动</div>
                    <div className="font-mono-tabular font-semibold text-slate-900 mt-0.5">
                      ¥{selectedAppeal.originalAmountYuan}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">指定复核裁决方</div>
                    <div className="font-semibold text-blue-900 mt-0.5">
                      {selectedAppeal.assignedReviewerName}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-1.5">
                    申诉理由陈述
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    {selectedAppeal.reason}
                  </p>
                </div>

                {selectedAppeal.supplementEvidence.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-slate-700">
                      申诉补充证据
                    </h4>
                    {selectedAppeal.supplementEvidence.map((ev) => (
                      <div
                        key={ev.id}
                        className="px-3 py-2 border border-slate-200 rounded-md text-xs flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2 font-medium text-slate-800">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          {ev.name}
                        </span>
                        <span className="font-mono-tabular text-slate-400">
                          {ev.uploadedAt}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedAppeal.status === 'pending_review' ? (
                  canReviewAppeal(selectedAppeal) ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Scale className="w-4 h-4 text-blue-900" />
                        <span>复核裁决操作台</span>
                      </div>
                      {error && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded">
                          {error}
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          裁决说明（将永久写入员工档案与审计链）*
                        </label>
                        <textarea
                          rows={2}
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          placeholder="说明核查依据及维持、变更或撤销决定..."
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 w-full sm:w-64">
                          <span className="text-xs text-slate-600 shrink-0">
                            变更为：
                          </span>
                          <div className="flex-1 min-w-0">
                            <CustomSelect
                              value={newGradeId}
                              onChange={setNewGradeId}
                              options={gradeOptions}
                              size="sm"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const isDeciding = isActionPending(
                              `appeal:decide:${selectedAppeal.id}`
                            );
                            return (
                              <>
                                <button
                                  type="button"
                                  disabled={isDeciding}
                                  onClick={async () => {
                                    if (!decisionNote.trim()) {
                                      setError('请填写裁决说明。');
                                      return;
                                    }
                                    setError('');
                                    await onDecideAppeal(
                                      selectedAppeal.id,
                                      'upheld',
                                      decisionNote.trim()
                                    );
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {isDeciding && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  <span>{isDeciding ? '裁决中...' : '维持原判'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeciding}
                                  onClick={async () => {
                                    if (!decisionNote.trim()) {
                                      setError('请填写裁决说明。');
                                      return;
                                    }
                                    setError('');
                                    await onDecideAppeal(
                                      selectedAppeal.id,
                                      'modified',
                                      decisionNote.trim(),
                                      newGradeId
                                    );
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <span>变更处分等级</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeciding}
                                  onClick={async () => {
                                    if (!decisionNote.trim()) {
                                      setError('请填写裁决说明。');
                                      return;
                                    }
                                    setError('');
                                    await onDecideAppeal(
                                      selectedAppeal.id,
                                      'revoked',
                                      decisionNote.trim()
                                    );
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <span>撤销处分</span>
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                      {selectedAppeal.hrdConflictTriggered
                        ? '由于已触发 HRD 强制回避，请切换左侧身份为【总经理及董事长】进行终审裁决。'
                        : '请切换左侧身份为【HRD（人力资源总监）】或【总经理及董事长】执行申诉复核裁决。'}
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1 text-xs">
                    <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        已裁决：{APPEAL_STATUS_META[selectedAppeal.status].label}
                        {selectedAppeal.newGradeName
                          ? `（调整为：${selectedAppeal.newGradeName}）`
                          : ''}
                      </span>
                    </div>
                    <p className="text-slate-700">
                      裁决说明：{selectedAppeal.decisionNote}
                    </p>
                    <div className="text-slate-500 font-mono-tabular">
                      裁决人：{selectedAppeal.decidedBy} · 时间：
                      {selectedAppeal.decidedAt}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* Publicity & Desensitized Warning Bulletin */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <Award className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-slate-900">
                全员正向激励表彰喜报栏
              </h3>
            </div>
            {publicRewards.length === 0 ? (
              <div className="text-xs text-slate-500 py-8 text-center">
                暂无全员公示奖励记录
              </div>
            ) : (
              <div className="space-y-3">
                {publicRewards.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 border border-slate-200 rounded-lg bg-slate-50/40 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-emerald-700">
                        【{r.gradeName}】{r.winnerName} · {r.winnerDeptName}
                      </span>
                      <span className="font-mono-tabular">{r.approvedAt}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {r.title}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {r.deedDescription}
                    </p>
                    <div className="text-[11px] text-slate-500">
                      提报人：{r.nominatorName}（{r.nominatorDeptName}） · 同步推送钉钉全员群喜报
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <Megaphone className="w-4 h-4 text-amber-700" />
              <h3 className="text-sm font-semibold text-slate-900">
                内部脱敏警示案例宣导栏
              </h3>
            </div>
            {desensitizedWarnings.length === 0 ? (
              <div className="text-xs text-slate-500 py-8 text-center">
                暂无已脱敏发布的警示宣导案例
              </div>
            ) : (
              <div className="space-y-3">
                {desensitizedWarnings.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 border border-slate-200 rounded-lg bg-amber-50/30 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-amber-800 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        典型合规警示（人员身份已脱敏）
                      </span>
                      <span className="font-mono-tabular">{t.incidentDate}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {t.title}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t.desensitizedCaseSummary ||
                        '经 ER 与质量合规部门联合复盘，未执行双人复核与跨部门变更同步机制导致生产窗口风险。各研发与交付团队须引以为戒，严守发布护栏制度。'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* New Appeal Modal */}
      {showNewAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-700" />
                <h2 className="text-base font-semibold text-slate-900">
                  发起在线申诉复核
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAppealModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppeal} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  选择已生效归档的问责工单 *
                </label>
                {archivedTicketOptions.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                    当前暂无处于已归档状态的处分工单。
                  </div>
                ) : (
                  <div className="space-y-2">
                    <CustomSelect
                      value={appealTicketId}
                      onChange={(id) => {
                        setAppealTicketId(id);
                        setModalError('');
                      }}
                      options={archivedTicketOptions}
                      searchable
                      searchPlaceholder="输入单号或责任人搜索..."
                    />
                    {selectedArchivedTicket && !canSubmitForSelectedArchived && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                        <span>
                          此工单被问责人为「{selectedArchivedTicket.accusedEmpName}」，需本人发起申诉。
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchEmployee(selectedArchivedTicket.accusedEmpId);
                            setModalError('');
                          }}
                          className="px-2.5 py-1 bg-white border border-amber-300 rounded font-medium text-amber-900 hover:bg-amber-100 whitespace-nowrap"
                        >
                          一键切换为 {selectedArchivedTicket.accusedEmpName}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  申诉理由与诉求 *
                </label>
                <textarea
                  rows={3}
                  value={newAppealReason}
                  onChange={(e) => setNewAppealReason(e.target.value)}
                  placeholder="陈述复核事实理由（系统将自动检测是否存在 HRD 利益冲突并触发强制回避）..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    补充申诉证据（可选）
                  </label>
                  <label className="text-xs font-medium text-blue-800 hover:text-blue-950 cursor-pointer inline-flex items-center gap-1">
                    <FileUp className="w-3 h-3" />
                    <span>选择文件</span>
                    <input
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setNewAppealEvidence(f.name);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={newAppealEvidence}
                  onChange={(e) => setNewAppealEvidence(e.target.value)}
                  placeholder="补充证据文件名"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isCreatingAppeal}
                  onClick={() => setShowNewAppealModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAppeal}
                  className="px-4 py-2 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCreatingAppeal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isCreatingAppeal ? '提交中...' : '提交申诉'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
