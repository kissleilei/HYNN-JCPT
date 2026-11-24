import React, { useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  HeartHandshake,
  ShieldAlert,
  Sparkles,
  Star,
  ThumbsUp,
  Trophy,
  X,
} from 'lucide-react';
import { PublicityRecord } from '../types/phase2';

interface PublicityDetailModalProps {
  record: PublicityRecord | null;
  votedOrAcked: boolean;
  promptConfirm?: boolean;
  onClose: () => void;
  onToggleKudos: (recordId: string) => void;
  onToggleAck: (recordId: string) => void;
}

export const PublicityDetailModal: React.FC<PublicityDetailModalProps> = ({
  record,
  votedOrAcked,
  promptConfirm = false,
  onClose,
  onToggleKudos,
  onToggleAck,
}) => {
  useEffect(() => {
    if (!record) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [record, onClose]);

  if (!record) return null;

  const isReward = record.category === 'reward';
  const monthText =
    record.month === '2026-11'
      ? '2026-11（当月）'
      : record.month;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publicity-detail-title"
        onClick={(e) => e.stopPropagation()}
        className="animate-panel-in w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col"
      >
        {/* Top Ceremonial / Warning Hero Header */}
        <div
          className={`relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7 text-white shrink-0 ${
            isReward
              ? 'bg-gradient-to-r from-[#008F63] via-[#05A670] to-[#10B981]'
              : 'bg-gradient-to-r from-[#B91C1C] via-[#E11D48] to-[#F97316]'
          }`}
        >
          {/* Decorative Flowing Wave & Emblem */}
          <svg
            aria-hidden="true"
            viewBox="0 0 800 180"
            className="pointer-events-none absolute inset-0 w-full h-full opacity-25"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M0 135C180 95 360 175 560 120C670 90 745 105 800 125V180H0V135Z"
              fill="#FFFFFF"
            />
            <path
              d="M280 0C420 55 560 35 800 95V0H280Z"
              fill="#FFFFFF"
              fillOpacity="0.4"
            />
          </svg>

          <button
            type="button"
            onClick={onClose}
            aria-label="关闭详情弹窗"
            className="relative z-20 float-right p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10 flex items-center justify-between gap-4 pr-8">
            <div className="flex items-center gap-4 min-w-0">
              {/* Medal / Shield Emblem */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/18 border border-white/30 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-lg">
                {isReward ? (
                  <Award className="w-8 h-8 text-amber-300" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-amber-200" />
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="text-xs font-semibold text-white/90 tracking-wide font-mono-tabular">
                  {isReward ? '正向表彰公示' : '惩处警示与复盘公示'} · {record.gradeName} · {monthText} · {record.recordNo}
                </div>
                <h2
                  id="publicity-detail-title"
                  className="text-xl sm:text-2xl font-bold text-white tracking-tight text-balance"
                >
                  {record.employeeName} — {record.departmentName}
                </h2>
                <p className="text-xs sm:text-sm text-white/90 leading-snug">
                  {isReward
                    ? '以奋斗与创新之力，推动组织效能与客户价值持续提升！'
                    : '明底线、以案促改，严格落实作业规范与跨部门防呆复盘！'}
                </p>
              </div>
            </div>

            {/* Right Decorative Trophy / Shield Graphic */}
            <div className="hidden sm:flex w-20 h-20 rounded-2xl bg-white/12 border border-white/20 items-center justify-center shrink-0">
              {isReward ? (
                <Trophy className="w-11 h-11 text-amber-300 drop-shadow-sm" />
              ) : (
                <ShieldAlert className="w-11 h-11 text-white/95 drop-shadow-sm" />
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 space-y-5">
          {/* Main 2-Column Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Left Focal Showcase Column (Event & Review with distinct borders & bold hierarchy) */}
            <div className="md:col-span-7 space-y-3.5">
              <div
                className={`rounded-xl border p-4 space-y-2.5 ${
                  isReward
                    ? 'border-emerald-200/90 bg-emerald-50/35'
                    : 'border-rose-200/90 bg-rose-50/35'
                }`}
              >
                <div
                  className={`flex items-center gap-2 pb-2 border-b ${
                    isReward ? 'border-emerald-200/70' : 'border-rose-200/70'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isReward
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight">
                    {isReward ? '事迹简介' : '事实经过与影响'}
                  </h3>
                </div>
                <div className="text-sm sm:text-[15px] font-bold text-slate-950 leading-snug">
                  {record.title}
                </div>
                <p className="text-[13px] sm:text-sm text-slate-700 leading-relaxed">
                  {record.summary}
                </p>
              </div>

              <div
                className={`rounded-xl border p-4 space-y-2.5 bg-white ${
                  isReward ? 'border-emerald-200/90' : 'border-rose-200/90'
                }`}
              >
                <div
                  className={`flex items-center gap-2 pb-2 border-b ${
                    isReward ? 'border-emerald-100' : 'border-rose-100'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isReward
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight">
                    {isReward ? '表彰理由与宣导亮点' : '根因分析与警示复盘'}
                  </h3>
                </div>
                <p className="text-[13px] sm:text-sm font-medium text-slate-800 leading-relaxed">
                  {record.lessonOrHighlight ||
                    (isReward
                      ? '专业能力突出，主动跨部门协同补位，为团队按期高质量交付提供关键保障。'
                      : '请各部门举一反三，严格对照作业指导书与变更管理规范执行双人核验。')}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-slate-900">
                    {isReward ? '积分奖励' : '积分扣减'}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    （定级：{record.gradeName}）
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xl font-bold font-mono-tabular ${
                    isReward ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  <Star
                    className={`w-5 h-5 ${
                      isReward ? 'text-amber-400 fill-amber-400' : 'text-rose-500'
                    }`}
                  />
                  <span>
                    {isReward
                      ? `+${Math.abs(record.points)} 分`
                      : `-${Math.abs(record.points)} 分`}
                  </span>
                </span>
              </div>
            </div>

            {/* Right Summary Card */}
            <div
              className={`md:col-span-5 rounded-2xl p-4 space-y-2.5 ${
                isReward ? 'bg-emerald-50/75' : 'bg-rose-50/75'
              }`}
            >
              <div className="text-xs font-semibold text-slate-800 pb-1">
                相关数据
              </div>

              <div className="bg-white rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs shadow-2xs">
                <span className="flex items-center gap-2 text-slate-600">
                  {isReward ? (
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>{isReward ? '点赞支持' : '警示已阅'}</span>
                </span>
                <span
                  className={`font-bold font-mono-tabular text-sm ${
                    isReward ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {isReward ? record.kudosCount : record.ackCount} 次
                </span>
              </div>

              <div className="bg-white rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs shadow-2xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <Award
                    className={`w-3.5 h-3.5 ${
                      isReward ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  />
                  <span>奖惩定级</span>
                </span>
                <span
                  className={`font-semibold ${
                    isReward ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {record.gradeName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Soft Wave Footer */}
        <div
          className={`px-6 py-4 sm:px-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isReward
              ? 'bg-gradient-to-r from-emerald-50 via-[#F8FCF9] to-emerald-50/90'
              : 'bg-gradient-to-r from-rose-50 via-[#FFF8F8] to-rose-50/90'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            {isReward ? (
              <>
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {votedOrAcked
                    ? '已完成本次点赞致敬，向优秀榜样致敬！'
                    : promptConfirm
                    ? '请先阅览上方表彰详情，再点击右侧「点赞致敬」完成交互'
                    : '向榜样致敬，期待更多优秀的你！'}
                </span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {votedOrAcked
                    ? '已完成警示复盘已阅确认，以案为鉴守牢底线！'
                    : promptConfirm
                    ? '请先阅览上方警示复盘，再点击右侧「标记已阅」完成确认'
                    : '以案为鉴，严格守牢质量与合规底线！'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {isReward ? (
              <button
                type="button"
                onClick={() => onToggleKudos(record.id)}
                disabled={votedOrAcked}
                className={`px-4 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  votedOrAcked
                    ? 'bg-emerald-600 text-white'
                    : promptConfirm
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25 ring-2 ring-emerald-300'
                    : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="font-mono-tabular">
                  {votedOrAcked ? '已点赞致敬' : '点赞致敬'} ({record.kudosCount})
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onToggleAck(record.id)}
                disabled={votedOrAcked}
                className={`px-4 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  votedOrAcked
                    ? 'bg-rose-600 text-white'
                    : promptConfirm
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/25 ring-2 ring-rose-300'
                    : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-mono-tabular">
                  {votedOrAcked ? '已阅警示' : '标记已阅'} ({record.ackCount})
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
                promptConfirm && !votedOrAcked
                  ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  : isReward
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20'
              }`}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
