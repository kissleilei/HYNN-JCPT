import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart2,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FilePlus2,
  LogIn,
  LogOut,
  Megaphone,
  Settings,
  Share2,
} from 'lucide-react';
import { AdminOaConsole } from './components/AdminOaConsole';
import { MonthlyPublicityBoard } from './components/MonthlyPublicityBoard';
import { OaSubmissionPortal } from './components/OaSubmissionPortal';
import { PolicyLearningCenter } from './components/PolicyLearningCenter';
import { SharePublishModal } from './components/SharePublishModal';
import { PolicyRubricItem } from './data/policyRubricData';
import { usePhase2Platform } from './hooks/usePhase2Platform';
import { Phase2Section } from './types/phase2';

function getInitialTab(): Phase2Section {
  if (typeof window === 'undefined') return 'publicity';
  const param = new URLSearchParams(window.location.search).get('tab');
  if (param === 'publicity' || param === 'policy' || param === 'oa' || param === 'admin') {
    return param;
  }
  return 'publicity';
}

export function App() {
  const {
    user,
    isAdmin,
    publicityRecords,
    publicityFromDb,
    dingtalkMembers,
    directoryFromDb,
    oaSubmissions,
    dingtalkStatus,
    localKudosVotedIds,
    localAckVotedIds,
    busyAction,
    signInWithGoogle,
    signOutUser,
    toggleKudos,
    toggleAck,
    submitMultiOaApplications,
    advanceOaSubmission,
    seedDatabaseDefaults,
    syncDingTalkDirectory,
    addDingTalkMember,
  } = usePhase2Platform();

  const [activeTab, setActiveTab] = useState<Phase2Section>(getInitialTab);
  const [prefilledRubric, setPrefilledRubric] = useState<PolicyRubricItem | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const notify = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const navigateTab = useCallback((tab: Phase2Section) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleToggleKudos = useCallback(
    async (recordId: string) => {
      try {
        const res = await toggleKudos(recordId);
        if (res.ok) {
          notify(
            res.persisted
              ? '已点赞致敬优秀同事并同步至云端公示台账'
              : '已点赞致敬优秀同事'
          );
        }
      } catch (err) {
        notify(err instanceof Error ? err.message : '点赞操作未完成');
      }
    },
    [notify, toggleKudos]
  );

  const handleToggleAck = useCallback(
    async (recordId: string) => {
      try {
        const res = await toggleAck(recordId);
        if (res.ok) {
          notify(
            res.persisted
              ? '已标记警示复盘已阅并同步至云端台账'
              : '已标记警示复盘已阅'
          );
        }
      } catch (err) {
        notify(err instanceof Error ? err.message : '标记已阅未完成');
      }
    },
    [notify, toggleAck]
  );

  const handleApplyRubricToOa = useCallback(
    (item: PolicyRubricItem) => {
      setPrefilledRubric(item);
      navigateTab('oa');
      notify(`已将条款【${item.itemNo}】带入 OA 提报单`);
    },
    [navigateTab, notify]
  );

  const monthCounts = useMemo(() => {
    const nov = publicityRecords.filter((r) => r.month === '2026-11');
    return {
      reward: nov.filter((r) => r.category === 'reward').length,
      punishment: nov.filter((r) => r.category === 'punishment').length,
    };
  }, [publicityRecords]);

  const navItems: {
    id: 'publicity' | 'policy' | 'oa';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'publicity', label: '奖惩公示栏', icon: BarChart2 },
    { id: 'policy', label: '制度与规则', icon: BookOpen },
    { id: 'oa', label: '奖惩提报与OA', icon: FilePlus2 },
  ];

  const activeSectionLabel =
    activeTab === 'publicity'
      ? '奖惩公示栏'
      : activeTab === 'policy'
      ? '制度与规则'
      : activeTab === 'oa'
      ? '奖惩提报与OA'
      : '后台与钉钉';

  return (
    <div className="min-h-screen text-slate-900 flex flex-col md:flex-row">
      {/* Left Sidebar Navigation (3 Core Sections) */}
      <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 md:shrink-0 md:sticky md:top-0 md:h-screen bg-white border-r border-slate-200/80 relative overflow-hidden">
        {/* Sidebar Brand */}
        <div className="h-16 px-5 flex items-center border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => navigateTab('publicity')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FE4] rounded-lg"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2F6FE4] to-[#1E62D0] text-white flex items-center justify-center shadow-sm shadow-[#1E62D0]/25 shrink-0">
              <Megaphone className="w-4 h-4 -rotate-12" />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900 whitespace-nowrap">
              恒翼能奖惩平台
            </span>
          </button>
        </div>

        {/* 3 Primary Navigation Items */}
        <nav aria-label="主导航" className="flex-1 px-3 py-5 space-y-1.5 relative z-10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTab(item.id)}
                className={`relative w-full h-11 px-3.5 rounded-xl text-[13.5px] flex items-center gap-3 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FE4] ${
                  active
                    ? 'bg-[#EBF3FF] text-[#1E62D0] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#2F6FE4]"
                  />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-[#1E62D0]' : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Subtle Atmospheric Bottom Skyline Graphic */}
        <div className="relative mt-auto pt-12 pb-4 px-5 shrink-0">
          <svg
            aria-hidden="true"
            viewBox="0 0 260 150"
            className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-36 opacity-80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 120C55 98 115 135 185 110C220 98 242 102 260 108V150H0V120Z"
              fill="url(#sidebarWave)"
            />
            <rect x="24" y="68" width="38" height="62" rx="3" fill="#E0ECFF" />
            <rect x="70" y="42" width="48" height="88" rx="3" fill="#CFE2FF" />
            <rect x="126" y="76" width="34" height="54" rx="3" fill="#E0ECFF" />
            <path
              d="M0 132C70 118 145 145 260 116V150H0V132Z"
              fill="#60A5FA"
              fillOpacity="0.22"
            />
            <defs>
              <linearGradient id="sidebarWave" x1="0" y1="90" x2="260" y2="150" gradientUnits="userSpaceOnUse">
                <stop stopColor="#EFF6FF" />
                <stop offset="1" stopColor="#DBEAFE" />
              </linearGradient>
            </defs>
          </svg>
          <div className="relative z-10 text-[11px] font-medium text-slate-500 leading-snug">
            广东恒翼能科技股份有限公司
          </div>
        </div>
      </aside>

      {/* Right Workspace Column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Utility & Breadcrumb Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-7 h-16 flex items-center justify-between gap-6">
            {/* Left: Mobile Brand / Desktop Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => navigateTab('publicity')}
                className="md:hidden flex items-center gap-2 whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FE4] rounded-lg"
              >
                <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#2F6FE4] to-[#1E62D0] text-white flex items-center justify-center shrink-0">
                  <Megaphone className="w-3.5 h-3.5 -rotate-12" />
                </span>
                <span className="text-sm font-bold tracking-tight text-slate-900">
                  恒翼能奖惩平台
                </span>
              </button>

              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                <span className="font-medium text-slate-500">
                  恒翼能奖惩公示与 OA 协同平台
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900">
                  {activeSectionLabel}
                </span>
              </div>
            </div>

            {/* Right: Share & Account Controls */}
            <div className="flex items-center gap-2.5 shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigateTab(activeTab === 'admin' ? 'publicity' : 'admin')}
                  title="后台审批与钉钉管理"
                  aria-label="后台审批与钉钉管理"
                  className={`p-2 rounded-xl border transition-colors ${
                    activeTab === 'admin'
                      ? 'bg-[#EEF5FF] border-[#BFD8FD] text-[#1E62D0]'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#2F6FE4]/40 hover:text-[#1E62D0]'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-[#2F6FE4]/40 hover:text-[#1E62D0] hover:bg-[#EEF5FF]/60 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-[#1E62D0]" />
                <span className="hidden sm:inline">分享公布</span>
              </button>

              {user ? (
                <div className="flex items-center gap-2 pl-2.5 border-l border-slate-200">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-semibold text-slate-900 max-w-[130px] truncate">
                      {user.displayName || user.email?.split('@')[0]}
                    </div>
                    <div className="text-[11px] text-slate-500 whitespace-nowrap">
                      {isAdmin ? '管理员权限' : '在职员工'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => signOutUser()}
                    title="退出登录"
                    aria-label="退出登录"
                    className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl bg-white transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => signInWithGoogle()}
                  disabled={busyAction === 'auth'}
                  className="btn-brand px-4 py-2 text-xs font-medium rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{busyAction === 'auth' ? '登录中...' : '员工登录'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile 3-Item Nav Strip */}
          <div className="md:hidden border-t border-slate-100 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto bg-white/95">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-[#EEF5FF] text-[#1E62D0] font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-7 py-5 sm:py-6">
          <div key={activeTab} className="animate-panel-in">
          {activeTab === 'publicity' && (
            <MonthlyPublicityBoard
              records={publicityRecords}
              localKudosVotedIds={localKudosVotedIds}
              localAckVotedIds={localAckVotedIds}
              onToggleKudos={handleToggleKudos}
              onToggleAck={handleToggleAck}
              onNavigate={navigateTab}
            />
          )}

          {activeTab === 'policy' && (
            <PolicyLearningCenter onApplyRubricToOa={handleApplyRubricToOa} />
          )}

          {activeTab === 'oa' && (
            <OaSubmissionPortal
              user={user}
              dingtalkMembers={dingtalkMembers}
              dingtalkStatus={dingtalkStatus}
              prefilledRubric={prefilledRubric}
              busyAction={busyAction}
              onClearPrefill={() => setPrefilledRubric(null)}
              onSignIn={signInWithGoogle}
              onSubmitMultiOa={submitMultiOaApplications}
              onNotify={notify}
            />
          )}

          {activeTab === 'admin' && (
            <AdminOaConsole
              user={user}
              isAdmin={isAdmin}
              publicityFromDb={publicityFromDb}
              directoryFromDb={directoryFromDb}
              dingtalkStatus={dingtalkStatus}
              dingtalkMembers={dingtalkMembers}
              oaSubmissions={oaSubmissions}
              busyAction={busyAction}
              onSignIn={signInWithGoogle}
              onSeedDefaults={seedDatabaseDefaults}
              onSyncDingTalk={syncDingTalkDirectory}
              onAddMember={addDingTalkMember}
              onAdvanceOa={advanceOaSubmission}
              onNotify={notify}
            />
          )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/80 bg-white/80">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-7 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>广东恒翼能科技股份有限公司 · 奖惩公示与钉钉 OA 协同平台（二期）</div>
            <div>全员透明公开 · 制度量化引导 · 钉钉审核/抄送/归档闭环</div>
          </div>
        </footer>
      </div>

      {/* Share & Publish Modal */}
      <SharePublishModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        activeSection={activeTab}
        monthRewardCount={monthCounts.reward}
        monthPunishmentCount={monthCounts.punishment}
        onCopied={notify}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 max-w-md border border-slate-800"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="leading-relaxed">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
