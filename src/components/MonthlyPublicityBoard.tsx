import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  FilePlus2,
  FileText,
  Megaphone,
  ShieldAlert,
  ThumbsUp,
  Trophy,
} from 'lucide-react';
import { Phase2Section, PublicityRecord } from '../types/phase2';
import { PublicityDetailModal } from './PublicityDetailModal';

interface MonthlyPublicityBoardProps {
  records: PublicityRecord[];
  localKudosVotedIds: Record<string, boolean>;
  localAckVotedIds: Record<string, boolean>;
  onToggleKudos: (recordId: string) => void;
  onToggleAck: (recordId: string) => void;
  onNavigate: (section: Phase2Section) => void;
}

export const MonthlyPublicityBoard: React.FC<MonthlyPublicityBoardProps> = ({
  records,
  localKudosVotedIds,
  localAckVotedIds,
  onToggleKudos,
  onToggleAck,
  onNavigate,
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [modalPromptConfirm, setModalPromptConfirm] = useState(false);
  const [showAllRewards, setShowAllRewards] = useState(false);
  const [showAllPunishments, setShowAllPunishments] = useState(false);

  const selectedModalRecord = useMemo(
    () =>
      selectedRecordId
        ? records.find((r) => r.id === selectedRecordId) ?? null
        : null,
    [records, selectedRecordId]
  );

  const openDetailModal = (id: string, promptConfirm = false) => {
    setSelectedRecordId(id);
    setModalPromptConfirm(promptConfirm);
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => r.month === '2026-11');
  }, [records]);

  const rewards = useMemo(
    () =>
      filteredRecords
        .filter((r) => r.category === 'reward')
        .sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    [filteredRecords]
  );

  const punishments = useMemo(
    () =>
      filteredRecords
        .filter((r) => r.category === 'punishment')
        .sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    [filteredRecords]
  );

  const visibleRewards = useMemo(
    () => (showAllRewards ? rewards : rewards.slice(0, 4)),
    [rewards, showAllRewards]
  );

  const visiblePunishments = useMemo(
    () => (showAllPunishments ? punishments : punishments.slice(0, 4)),
    [punishments, showAllPunishments]
  );

  const monthLabel = '2026年11月（当月）';

  return (
    <div className="space-y-5">
      {/* Atmospheric Light-Blue Publicity Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[#D6E6FF] bg-gradient-to-r from-[#EBF3FF] via-[#F4F8FF] to-[#E5F0FF] px-6 pt-6 pb-4 sm:px-8 sm:pt-7 sm:pb-5 min-h-[132px] shadow-xs flex flex-col justify-between">
        {/* Uploaded Campus & Light-Wave Banner Background */}
        <img
          src="./assets/aistudio/image_697e063d.png"
          alt="恒翼能企业园区背景"
          referrerPolicy="no-referrer"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center select-none"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#F3F8FF]/80 via-[#F8FBFF]/55 to-[#EFF6FF]/20"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4 flex-1">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0 lg:self-center">
            {/* Blue Megaphone Emblem */}
            <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#3B82F6] via-[#2F6FE4] to-[#1D4ED8] text-white flex items-center justify-center shadow-lg shadow-[#1E62D0]/25 shrink-0">
              <Megaphone className="w-6 h-6 sm:w-7 sm:h-7 -rotate-12" />
            </div>

            <div className="space-y-1 min-w-0">
              <h1 className="text-xl sm:text-[26px] font-bold text-slate-900 tracking-tight text-balance">
                {monthLabel}奖惩公示栏
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-700">
                公平 · 透明 · 共建共享
              </p>
            </div>
          </div>

          {/* Bottom-Right Corner: Motto + OA Submission CTA */}
          <div className="flex flex-wrap items-center justify-end gap-4 shrink-0 lg:self-end lg:pt-8">
            <div className="flex flex-col items-end shrink-0">
              <div className="text-[15px] sm:text-[16px] font-bold tracking-wide text-[#173F8F] leading-snug whitespace-nowrap drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">
                以奋斗者为本，让优秀被看见
              </div>
              <svg
                aria-hidden="true"
                viewBox="0 0 210 12"
                className="w-40 h-2.5 mt-0.5"
                fill="none"
              >
                <path
                  d="M3 8.5C58 2.5 142 1.5 207 6.5"
                  stroke="#F97316"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('policy')}
              className="px-3.5 py-2 text-xs font-medium text-[#1E62D0] bg-white/90 border border-[#BFD8FD] hover:bg-[#EEF5FF] rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>积分与制度规则</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('oa')}
              className="btn-brand px-4 py-2 text-xs font-medium rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>发起奖惩提报 OA</span>
            </button>
          </div>
        </div>
      </section>

      {/* Primary Centerpiece: Side-by-Side Vibrant Dual Boards */}
      <section className="grid gap-6 items-stretch grid-cols-1 lg:grid-cols-2">
        {/* LEFT HERO BOARD: Positive Recognition & Honor Wall */}
          <div className="bg-white border border-emerald-200/90 rounded-2xl overflow-hidden flex flex-col shadow-xs">
            {/* Emerald/Teal Header */}
            <div className="bg-gradient-to-r from-[#008F63] via-[#05A670] to-[#10B981] text-white px-6 py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/18 border border-white/25 text-white flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    正向表彰光荣榜
                  </h2>
                  <p className="text-xs text-emerald-50/95 mt-0.5">
                    为优秀的同事点赞致敬，见证他们的闪光时刻
                  </p>
                </div>
              </div>

              <div className="text-xs font-medium text-emerald-50/95 font-mono-tabular shrink-0 whitespace-nowrap">
                共 {rewards.length} 项
              </div>
            </div>

            {/* Body Rows */}
            {rewards.length === 0 ? (
              <div className="p-12 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
                <Award className="w-9 h-9 text-emerald-300" />
                <div className="text-sm font-medium text-slate-700">
                  当月暂无正向表彰公示
                </div>
                <p className="text-xs text-slate-500">
                  可通过 OA 入口提报优秀同事事迹
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="divide-y divide-slate-100 px-5 sm:px-6">
                  {visibleRewards.map((rec, index) => {
                    const voted = Boolean(localKudosVotedIds[rec.id]);
                    const rankText = String(index + 1).padStart(2, '0');
                    return (
                      <article
                        key={rec.id}
                        onClick={() => openDetailModal(rec.id)}
                        className="py-4 sm:py-5 space-y-2.5 cursor-pointer hover:bg-emerald-50/35 -mx-5 sm:-mx-6 px-5 sm:px-6 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3.5">
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            {/* Rank Square */}
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 font-mono-tabular font-semibold text-sm flex items-center justify-center shrink-0 mt-0.5">
                              {rankText}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[15px] font-semibold text-slate-900">
                                  {rec.employeeName} — {rec.departmentName}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                                  {rec.gradeName}
                                </span>
                              </div>

                              <h3 className="text-xs sm:text-[13px] font-medium text-slate-800 leading-snug">
                                {rec.title}
                              </h3>

                              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                                {rec.summary}
                              </p>
                            </div>
                          </div>

                          {/* Right Points + Kudos Counter */}
                          <div className="text-right shrink-0 space-y-1.5 pl-2">
                            <div className="text-lg sm:text-xl font-bold text-emerald-600 font-mono-tabular leading-none">
                              +{Math.abs(rec.points)} 分
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono-tabular">
                              已赞 {rec.kudosCount} 次
                            </div>
                          </div>
                        </div>

                        {/* Interactive Row Footer */}
                        <div className="pl-12.5 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailModal(rec.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50/75 hover:bg-emerald-100 text-emerald-800 text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <span>查看详情</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailModal(rec.id, true);
                            }}
                            disabled={voted}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                              voted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span className="font-mono-tabular">
                              {voted ? '已点赞致敬' : '点赞致敬'} ({rec.kudosCount})
                            </span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Bottom Card Action Strip */}
                <div className="p-4 pt-2">
                  {rewards.length > 4 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllRewards((prev) => !prev)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-50/90 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>
                        {showAllRewards
                          ? '收起部分正向表彰'
                          : `查看更多优秀同事（全部 ${rewards.length} 项）`}
                      </span>
                      {showAllRewards ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate('oa')}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-50/90 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>举荐优秀同事 · 发起正向表彰提报</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        {/* RIGHT HERO BOARD: Disciplinary Warning & Review Wall */}
          <div className="bg-white border border-rose-200/90 rounded-2xl overflow-hidden flex flex-col shadow-xs">
            {/* Crimson/Rose Header */}
            <div className="bg-gradient-to-r from-[#D92638] via-[#E11D48] to-[#EF4444] text-white px-6 py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/18 border border-white/25 text-white flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    惩处警示与复盘台
                  </h2>
                  <p className="text-xs text-rose-50/95 mt-0.5">
                    明底线、以案促改 · 推动合规改进，共建更高效的工作环境
                  </p>
                </div>
              </div>

              <div className="text-xs font-medium text-rose-50/95 font-mono-tabular shrink-0 whitespace-nowrap">
                共 {punishments.length} 项
              </div>
            </div>

            {/* Body Rows */}
            {punishments.length === 0 ? (
              <div className="p-12 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
                <ShieldAlert className="w-9 h-9 text-rose-300" />
                <div className="text-sm font-medium text-slate-700">
                  当月暂无惩处警示公示
                </div>
                <p className="text-xs text-slate-500">
                  保持规范作业与流程闭环，或通过 OA 入口提报
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="divide-y divide-slate-100 px-5 sm:px-6">
                  {visiblePunishments.map((rec, index) => {
                    const acked = Boolean(localAckVotedIds[rec.id]);
                    const rankText = String(index + 1).padStart(2, '0');
                    return (
                      <article
                        key={rec.id}
                        onClick={() => openDetailModal(rec.id)}
                        className="py-4 sm:py-5 space-y-2.5 cursor-pointer hover:bg-rose-50/35 -mx-5 sm:-mx-6 px-5 sm:px-6 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3.5">
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            {/* Rank Square */}
                            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 font-mono-tabular font-semibold text-sm flex items-center justify-center shrink-0 mt-0.5">
                              {rankText}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[15px] font-semibold text-slate-900">
                                  {rec.employeeName} — {rec.departmentName}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-semibold">
                                  {rec.gradeName}
                                </span>
                              </div>

                              <h3 className="text-xs sm:text-[13px] font-medium text-slate-800 leading-snug">
                                {rec.title}
                              </h3>

                              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                                {rec.summary}
                              </p>
                            </div>
                          </div>

                          {/* Right Points + Ack Counter */}
                          <div className="text-right shrink-0 space-y-1.5 pl-2">
                            <div className="text-lg sm:text-xl font-bold text-rose-600 font-mono-tabular leading-none">
                              -{Math.abs(rec.points)} 分
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono-tabular">
                              已阅 {rec.ackCount} 次
                            </div>
                          </div>
                        </div>

                        {/* Interactive Row Footer */}
                        <div className="pl-12.5 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailModal(rec.id);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-50/90 hover:bg-rose-100 text-rose-700 text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <span>查看详情</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailModal(rec.id, true);
                            }}
                            disabled={acked}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                              acked
                                ? 'bg-rose-600 text-white'
                                : 'bg-white border border-rose-200 text-rose-800 hover:bg-rose-50'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="font-mono-tabular">
                              {acked ? '已阅警示' : '标记已阅'} ({rec.ackCount})
                            </span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Bottom Card Action Strip */}
                <div className="p-4 pt-2">
                  {punishments.length > 4 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllPunishments((prev) => !prev)}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-50/90 hover:bg-rose-100 text-rose-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>
                        {showAllPunishments
                          ? '收起部分警示复盘'
                          : `查看更多公示内容（全部 ${punishments.length} 项）`}
                      </span>
                      {showAllPunishments ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate('policy')}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-50/90 hover:bg-rose-100 text-rose-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>查看制度红线与合规复盘指引</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
      </section>

      {/* Clickable Detail Popup Modal */}
      <PublicityDetailModal
        record={selectedModalRecord}
        votedOrAcked={
          selectedModalRecord
            ? selectedModalRecord.category === 'reward'
              ? Boolean(localKudosVotedIds[selectedModalRecord.id])
              : Boolean(localAckVotedIds[selectedModalRecord.id])
            : false
        }
        promptConfirm={modalPromptConfirm}
        onClose={() => {
          setSelectedRecordId(null);
          setModalPromptConfirm(false);
        }}
        onToggleKudos={onToggleKudos}
        onToggleAck={onToggleAck}
      />
    </div>
  );
};
