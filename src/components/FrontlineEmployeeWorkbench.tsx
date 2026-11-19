import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BellRing,
  BookOpen,
  CheckCircle2,
  FolderArchive,
  HelpCircle,
  Loader2,
  Megaphone,
  MessageSquarePlus,
  Scale,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { COMPANY_POLICY_META } from '../data/policyRubricData';
import {
  AccountabilityTicket,
  AppealCase,
  Employee,
  RewardNomination,
} from '../types/platform';
import { ACCOUNTABILITY_STATUS_META } from '../utils/labels';
import { NavSection } from './Sidebar';

interface FrontlineEmployeeWorkbenchProps {
  currentUser: Employee;
  tickets: AccountabilityTicket[];
  rewards: RewardNomination[];
  appeals: AppealCase[];
  getDisplayReporterName: (ticket: AccountabilityTicket) => string;
  isActionPending?: (key: string) => boolean;
  onNavigate: (section: NavSection) => void;
  onOpenTicket: (ticketId: string) => void;
  onOpenNewAccountability: () => void;
  onUrgeTicket: (ticketId: string) => void | Promise<void>;
}

const ROLLOUT_FAQ_ITEMS = [
  {
    id: 'confidential',
    label: '保密提报真匿名吗？',
    title: '实名保密提报 · 部门领导与 HRBP 全程不可见',
    answer:
      '勾选【实名保密提报】后，系统对发起人部门领导、被问责人部门领导、普通 HRBP 及被问责人均隐藏您的真实姓名与工号（仅显示脱敏匿名代号）；仅 ER 负责人或 HRD 在核查真伪时可申请解密，且每次解密都会强制写入不可篡改的强审计日志。',
    ctaLabel: '立即体验保密反馈提报',
    action: 'new_ticket' as const,
  },
  {
    id: 'defense',
    label: '被误报问责怎么办？',
    title: '同步开启在线陈述 + 3 日内三阶申诉复核',
    answer:
      '工单发起后不会单方面直接处罚：系统会同步开放【被问责人在线陈述】节点，您可以直接上传聊天记录、工单截图等反证材料并标记异议；一旦存在争议将自动转入 ER 独立调查。即便处分归档，您仍可在收到通知 3 日内发起在线申诉（如涉 HRD 利益冲突，强制回避升级至总经理终裁）。',
    ctaLabel: '了解申诉复核与公示机制',
    action: 'appeals' as const,
  },
  {
    id: 'points',
    label: '积分和奖金池怎么算？',
    title: '1 积分 = ¥100 元人民币，处罚金 100% 反哺奖金池',
    answer:
      '依据恒翼能奖惩制度：表扬 +1~3 分、嘉奖 +4~5 分、记功 +6~20 分（1 分折合 ¥100）；批评 -1~3 分、警告 -4~5 分、记过 -6~20 分。所有员工处罚金 100% 汇入财务独立托管的奖金池用于正向激励发放，每季度审计公示收支明细。',
    ctaLabel: '查阅 105 项量化积分标尺',
    action: 'standards' as const,
  },
  {
    id: 'reward',
    label: '一线员工怎么拿表彰？',
    title: '获奖人不限职级，跨部门协作与降本均可获赞',
    answer:
      '虽然奖励表彰需由 M8 及以上负责人发起申报，但所有一线员工均为核心获奖主体。无论是 BOM 降本增效、DFMEA 风险预判、跨部门主动补位还是现场质量把关，均可对照《附件一》标尺留存邮件/钉钉/交付凭证，由团队 M8+ 负责人提报「表扬 / 嘉奖 / 记功」并同步全员喜报。',
    ctaLabel: '查看全员表彰喜报与申请',
    action: 'rewards' as const,
  },
];

export const FrontlineEmployeeWorkbench: React.FC<FrontlineEmployeeWorkbenchProps> = ({
  currentUser,
  tickets,
  rewards,
  appeals,
  getDisplayReporterName,
  isActionPending = () => false,
  onNavigate,
  onOpenTicket,
  onOpenNewAccountability,
  onUrgeTicket,
}) => {
  const [myQueueTab, setMyQueueTab] = useState<'action_needed' | 'reported' | 'involved'>(
    'action_needed'
  );
  const [activeFaqId, setActiveFaqId] = useState<string>(ROLLOUT_FAQ_ITEMS[0].id);

  // Strict personal scope: only tickets initiated by me or involving me
  const personalStats = useMemo(() => {
    const myReported = tickets.filter((t) => t.reporterId === currentUser.id);
    const myInvolved = tickets.filter((t) => t.accusedEmpId === currentUser.id);

    const needsMyStatement = myInvolved.filter(
      (t) =>
        t.status === 'pending_confirm' && !t.respondentStatement?.submitted
    );
    const appealableTickets = myInvolved.filter(
      (t) =>
        t.status === 'archived' &&
        !appeals.some((a) => a.ticketId === t.id && a.status === 'pending_review')
    );
    const myActiveReported = myReported.filter(
      (t) => t.status !== 'archived' && t.status !== 'appeal_resolved'
    );

    const actionNeededMap = new Map<string, AccountabilityTicket>();
    [...needsMyStatement, ...appealableTickets, ...myActiveReported].forEach((t) =>
      actionNeededMap.set(t.id, t)
    );
    const actionNeeded = Array.from(actionNeededMap.values());

    // Effective archived punishment & reward records for personal points ledger
    const effectivePunishments = myInvolved.filter(
      (t) =>
        (t.status === 'archived' ||
          t.status === 'appealing' ||
          t.status === 'appeal_resolved') &&
        t.execution &&
        t.execution.gradeName !== '已撤销处分'
    );
    const myApprovedRewards = rewards.filter(
      (r) => r.winnerId === currentUser.id && r.status === 'approved_archived'
    );
    const myPendingRewards = rewards.filter(
      (r) => r.winnerId === currentUser.id && r.status !== 'approved_archived'
    );

    const rewardYuan = myApprovedRewards.reduce((s, r) => s + r.amountYuan, 0);
    const punishmentYuan = effectivePunishments.reduce(
      (s, t) => s + (t.execution?.amountYuan || 0),
      0
    );
    const netYuan = rewardYuan + punishmentYuan;
    const netPoints = Number(
      (netYuan / COMPANY_POLICY_META.pointValueYuan).toFixed(1)
    );
    const rewardPoints = Number(
      (rewardYuan / COMPANY_POLICY_META.pointValueYuan).toFixed(1)
    );
    const punishmentPoints = Number(
      (Math.abs(punishmentYuan) / COMPANY_POLICY_META.pointValueYuan).toFixed(1)
    );

    const activeRestrictions = effectivePunishments.filter(
      (t) => t.execution && t.execution.impactPeriodMonths > 0
    );

    const minorCount = effectivePunishments.filter((t) =>
      ['口头警告', '批评'].includes(t.execution?.gradeName || '')
    ).length;
    const warnCount = effectivePunishments.filter((t) =>
      ['书面警告', '警告'].includes(t.execution?.gradeName || '')
    ).length;
    const demeritCount = effectivePunishments.filter((t) =>
      ['记过', '记大过'].includes(t.execution?.gradeName || '')
    ).length;

    return {
      myReported,
      myInvolved,
      myActiveReported,
      needsMyStatement,
      appealableTickets,
      actionNeeded,
      effectivePunishments,
      myApprovedRewards,
      myPendingRewards,
      netYuan,
      netPoints,
      rewardYuan,
      rewardPoints,
      punishmentYuan,
      punishmentPoints,
      activeRestrictions,
      minorCount,
      warnCount,
      demeritCount,
    };
  }, [tickets, rewards, appeals, currentUser.id]);

  const publicRewards = useMemo(
    () =>
      rewards
        .filter(
          (r) =>
            r.status === 'approved_archived' &&
            (r.publicityScope === 'all_staff_dingtalk' ||
              r.publicityScope === 'team_dept')
        )
        .slice(0, 2),
    [rewards]
  );

  const desensitizedWarnings = useMemo(
    () =>
      tickets
        .filter(
          (t) =>
            t.publicityScope === 'desensitized_warning' &&
            (t.desensitizedCaseSummary || t.status === 'archived')
        )
        .slice(0, 2),
    [tickets]
  );

  const displayedTickets =
    myQueueTab === 'action_needed'
      ? personalStats.actionNeeded
      : myQueueTab === 'reported'
      ? personalStats.myReported
      : personalStats.myInvolved;

  const activeFaq =
    ROLLOUT_FAQ_ITEMS.find((item) => item.id === activeFaqId) || ROLLOUT_FAQ_ITEMS[0];

  const getTicketStepProgress = (t: AccountabilityTicket) => {
    if (t.status === 'pending_confirm') return 1;
    if (t.status === 'er_investigation') return 2;
    if (t.status === 'pending_hr_exec' || t.status === 'major_escalation') return 3;
    return 4;
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Welcome & Primary Rollout CTA */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span>{currentUser.departmentName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{currentUser.empNo}</span>
            <span aria-hidden="true">·</span>
            <span>{currentUser.title}（{currentUser.rank}）</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            你好，{currentUser.name} — 欢迎使用恒翼能个人奖惩与协作反馈工作台
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            本工作台仅展示与您本人相关的积分档案、协作反馈进度与当月公开奖惩动态；发起跨部门反馈时可选「实名保密」，部门领导与普通 HRBP 全程不可见您的身份。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('publicity')}
            className="px-3.5 py-2 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Megaphone className="w-3.5 h-3.5 text-emerald-700" />
            <span>查看当月奖惩公示栏</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('standards')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-800" />
            <span>查阅积分与红线标尺</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewAccountability}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>发起问题反馈 / 问责（支持保密）</span>
          </button>
        </div>
      </section>

      {/* Row 1: 4 Personal KPI Cards (Strictly Personal Data Only) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('archives')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-lg p-5 text-left transition-colors group"
        >
          <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
            <span>我的当前净积分（1分=¥100）</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`text-2xl font-semibold font-mono-tabular ${
                personalStats.netPoints >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {personalStats.netPoints >= 0
                ? `+${personalStats.netPoints}`
                : personalStats.netPoints}{' '}
              分
            </span>
            <span className="text-xs text-slate-500 font-mono-tabular">
              折合{' '}
              {personalStats.netYuan >= 0
                ? `+¥${personalStats.netYuan.toLocaleString()}`
                : `-¥${Math.abs(personalStats.netYuan).toLocaleString()}`}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMyQueueTab('action_needed')}
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-lg p-5 text-left transition-colors group"
        >
          <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
            <span>待我陈述 / 需跟进事项</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-700 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold text-slate-900 font-mono-tabular">
              {personalStats.actionNeeded.length}
            </span>
            <span className="text-xs text-slate-500">
              {personalStats.needsMyStatement.length > 0
                ? `含 ${personalStats.needsMyStatement.length} 项待在线陈述`
                : personalStats.myActiveReported.length > 0
                ? `${personalStats.myActiveReported.length} 项提报流转中`
                : '当前状态良好'}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('rewards')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-lg p-5 text-left transition-colors group"
        >
          <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
            <span>我获得的表彰与奖励</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold text-slate-900 font-mono-tabular">
              {personalStats.myApprovedRewards.length} 次
            </span>
            <span className="text-xs text-emerald-700 font-medium">
              {personalStats.myPendingRewards.length > 0
                ? `另有 ${personalStats.myPendingRewards.length} 项审批中`
                : `累计 +¥${personalStats.rewardYuan.toLocaleString()}`}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('archives')}
          className="bg-white border border-slate-200 hover:border-slate-400 rounded-lg p-5 text-left transition-colors group"
        >
          <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
            <span>晋升评优资格与安全水位</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`text-base font-semibold ${
                personalStats.activeRestrictions.length > 0
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {personalStats.activeRestrictions.length > 0
                ? `影响期中（${personalStats.activeRestrictions.length}项）`
                : '资格正常'}
            </span>
            <span className="text-xs text-slate-500 font-mono-tabular">
              批评 {personalStats.minorCount}/3 · 警告 {personalStats.warnCount}/3
            </span>
          </div>
        </button>
      </section>

      {/* Row 2: My Personal Queue (7 cols) + Self-Service & Safety Meter (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Personal Action & Tracking Queue */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                与我相关的单据与进度跟踪
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                仅显示本人发起的反馈或涉我记录；支持一键钉钉催办与在线陈述举证
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              <button
                type="button"
                onClick={() => setMyQueueTab('action_needed')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  myQueueTab === 'action_needed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                需关注/进行中 ({personalStats.actionNeeded.length})
              </button>
              <button
                type="button"
                onClick={() => setMyQueueTab('reported')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  myQueueTab === 'reported'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                我发起的 ({personalStats.myReported.length})
              </button>
              <button
                type="button"
                onClick={() => setMyQueueTab('involved')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  myQueueTab === 'involved'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                涉我记录 ({personalStats.myInvolved.length})
              </button>
            </div>
          </div>

          {displayedTickets.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-slate-900">
                {myQueueTab === 'involved'
                  ? '您暂无任何被问责或涉事记录'
                  : '当前分类下暂无待处理单据'}
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-4 max-w-md mx-auto leading-relaxed">
                在跨部门协作中如遇交付推诿、标准未执行或质量隐患，您可以随时发起反馈提报（可选实名保密保护）。
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('standards')}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  查阅奖惩标尺
                </button>
                <button
                  type="button"
                  onClick={onOpenNewAccountability}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg"
                >
                  发起反馈 / 问责提报
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayedTickets.map((ticket) => {
                const statusMeta = ACCOUNTABILITY_STATUS_META[ticket.status];
                const isMyReport = ticket.reporterId === currentUser.id;
                const isAccusedMe = ticket.accusedEmpId === currentUser.id;
                const needsStatement =
                  isAccusedMe &&
                  ticket.status === 'pending_confirm' &&
                  !ticket.respondentStatement?.submitted;
                const canAppealNow =
                  isAccusedMe &&
                  ticket.status === 'archived' &&
                  !appeals.some(
                    (a) => a.ticketId === ticket.id && a.status === 'pending_review'
                  );
                const isActive =
                  ticket.status !== 'archived' && ticket.status !== 'appeal_resolved';
                const stageUrged = (ticket.urgedStages || []).includes(ticket.status);
                const isUrging = isActionPending(`ticket:urge:${ticket.id}`);
                const step = getTicketStepProgress(ticket);

                return (
                  <div
                    key={ticket.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500">
                          <span className="font-mono-tabular font-semibold text-slate-800">
                            {ticket.ticketNo}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {isMyReport ? '我发起的提报' : '涉我单据'}
                          </span>
                          {ticket.isConfidential && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-blue-800 font-medium">
                                实名保密保护中
                              </span>
                            </>
                          )}
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
                          涉及部门：{ticket.accusedDeptNames.join(' / ')} · 提报人：
                          {isMyReport
                            ? `${currentUser.name}（本人）`
                            : getDisplayReporterName(ticket)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isMyReport && isActive && (
                          <button
                            type="button"
                            disabled={stageUrged || isUrging}
                            onClick={() => onUrgeTicket(ticket.id)}
                            title={
                              stageUrged
                                ? '当前节点已催办过，请等待流转后再催办'
                                : '推送钉钉人工催办提醒'
                            }
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
                              {isUrging
                                ? '催办中...'
                                : stageUrged
                                ? '已催办'
                                : '钉钉催办'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenTicket(ticket.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                            needsStatement
                              ? 'text-white bg-blue-900 hover:bg-blue-800'
                              : canAppealNow
                              ? 'text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                              : 'text-white bg-slate-900 hover:bg-slate-800'
                          }`}
                        >
                          {needsStatement
                            ? '立即在线陈述'
                            : canAppealNow
                            ? '3日内在线申诉'
                            : '查看详情'}
                        </button>
                      </div>
                    </div>

                    {/* 4-step visual progress bar */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {['1. 提报受理', '2. 确认与陈述', '3. 核查定级', '4. 归档生效'].map(
                        (label, idx) => {
                          const done = idx + 1 < step || (step === 4 && idx === 3);
                          const current = idx + 1 === step && step < 4;
                          return (
                            <div key={label} className="space-y-1">
                              <div
                                className={`h-1 rounded-full ${
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
                                    ? 'text-emerald-700'
                                    : 'text-slate-400'
                                }`}
                              >
                                {label}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Quick Self-Service & Personal Points / Compliance Meter */}
        <div className="lg:col-span-5 space-y-5">
          {/* Self-service actions */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              一线员工常用自助服务
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigate('publicity')}
                className="w-full p-3 border border-emerald-200 bg-emerald-50/40 rounded-lg hover:border-emerald-300 hover:bg-emerald-50/70 text-left transition-colors flex items-start gap-3"
              >
                <Megaphone className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    当月全员奖惩公示栏（光荣榜 & 警示台）
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    图文直观对比当月表彰人物与惩处警示名单，支持为同事点赞致敬
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenNewAccountability}
                className="w-full p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 text-left transition-colors flex items-start gap-3"
              >
                <ShieldAlert className="w-4 h-4 text-blue-800 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    发起跨部门问题反馈 / 问责提报
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    全员可发起 · 勾选「实名保密」即对部门领导与 HRBP 匿名脱敏
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('standards')}
                className="w-full p-3 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50/30 text-left transition-colors flex items-start gap-3"
              >
                <BookOpen className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    查一查：105 项积分标尺与 15 条红线
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    按研发/质量/变更/安全快速检索，明确哪些加分、哪些不能碰
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
                    我有异议：3 日内在线申诉复核
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    支持补充证据材料 · HRD 复核（利益冲突自动回避至总经理）
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('archives')}
                className="w-full p-3 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 text-left transition-colors flex items-start gap-3"
              >
                <FolderArchive className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    我的长期奖惩档案与明细导出
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    随时核对本人历次表彰加分、处分影响期与折算金额
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* Personal Points & Upgrade Threshold Safety Meter */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>个人积分与累积安全水位</span>
              </h3>
              <span className="text-xs font-mono-tabular text-slate-500">
                1 分 = ¥100
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div>
                <div className="text-slate-500">累计表彰加分</div>
                <div className="text-base font-semibold text-emerald-700 font-mono-tabular mt-0.5">
                  +{personalStats.rewardPoints} 分（+¥{personalStats.rewardYuan.toLocaleString()}）
                </div>
              </div>
              <div>
                <div className="text-slate-500">累计问责扣分</div>
                <div className="text-base font-semibold text-slate-800 font-mono-tabular mt-0.5">
                  {personalStats.punishmentPoints > 0
                    ? `-${personalStats.punishmentPoints} 分（-¥${Math.abs(
                        personalStats.punishmentYuan
                      ).toLocaleString()}）`
                    : '0 分（零违纪记录）'}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { label: '批评累积（满 3 次升级警告）', count: personalStats.minorCount },
                { label: '警告累积（满 3 次升级记过）', count: personalStats.warnCount },
                { label: '记过累积（满 3 次解除合同）', count: personalStats.demeritCount },
              ].map((tier) => {
                const pct = Math.min(100, Math.round((tier.count / 3) * 100));
                return (
                  <div key={tier.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-600">{tier.label}</span>
                      <span
                        className={`font-mono-tabular font-semibold ${
                          tier.count >= 2
                            ? 'text-red-700'
                            : tier.count === 1
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {tier.count} / 3
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          tier.count >= 2
                            ? 'bg-red-600'
                            : tier.count === 1
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(pct, tier.count === 0 ? 4 : pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Row 3: Rollout Guide (30-Second Employee Onboarding) + Public Praise & Desensitized Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Rollout FAQ / Trust Builders */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-900" />
              <span>普及必看 · 一线员工 30 秒看懂机制与权益保障</span>
            </h3>
            <span className="text-xs text-slate-500">
              点击下方问题快速了解规则
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg">
            {ROLLOUT_FAQ_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveFaqId(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeFaq.id === item.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="text-sm font-semibold text-slate-900">
              {activeFaq.title}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeFaq.answer}
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  if (activeFaq.action === 'new_ticket') {
                    onOpenNewAccountability();
                  } else {
                    onNavigate(activeFaq.action);
                  }
                }}
                className="text-xs font-medium text-blue-800 hover:underline inline-flex items-center gap-1"
              >
                <span>{activeFaq.ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Right: Company Public Praise & Desensitized Warning Highlights */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-700" />
              <span>全员表彰喜报与避坑警示</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('publicity')}
              className="text-xs font-medium text-blue-800 hover:underline"
            >
              进入完整公示栏看板
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {publicRewards.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onNavigate('publicity')}
                className="py-2.5 first:pt-0 w-full text-left hover:bg-slate-50 rounded transition-colors block space-y-1"
              >
                <div className="flex items-center justify-between text-emerald-700 font-medium">
                  <span>
                    全员喜报 · 【{r.gradeName}】{r.winnerName}（{r.winnerDeptName}）
                  </span>
                  <span className="font-mono-tabular text-slate-400">
                    +¥{r.amountYuan}
                  </span>
                </div>
                <div className="text-slate-800 font-medium truncate">
                  {r.title}
                </div>
              </button>
            ))}

            {desensitizedWarnings.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onNavigate('publicity')}
                className="py-2.5 last:pb-0 w-full text-left hover:bg-slate-50 rounded transition-colors block space-y-1"
              >
                <div className="flex items-center justify-between text-amber-800 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Megaphone className="w-3 h-3" />
                    <span>脱敏避坑警示 · {t.accusedDeptNames.join('/')}</span>
                  </span>
                  <span className="font-mono-tabular text-slate-400">
                    {t.execution?.gradeName || '已处理'}
                  </span>
                </div>
                <div className="text-slate-600 line-clamp-2 leading-relaxed">
                  {t.desensitizedCaseSummary || t.title}
                </div>
              </button>
            ))}

            {publicRewards.length === 0 && desensitizedWarnings.length === 0 && (
              <div className="py-6 text-center text-slate-500">
                暂无全员公示喜报或警示案例
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
