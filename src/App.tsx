import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AccountabilityView } from './components/AccountabilityView';
import { AppealsAndPublicityView } from './components/AppealsAndPublicityView';
import { ArchivesAndAuditView } from './components/ArchivesAndAuditView';
import { DingTalkDrawer } from './components/DingTalkDrawer';
import { GovernanceAnalyticsView } from './components/GovernanceAnalyticsView';
import { NewAccountabilityModal } from './components/NewAccountabilityModal';
import { PolicyAndAdminView } from './components/PolicyAndAdminView';
import { PolicyStandardsView } from './components/PolicyStandardsView';
import { PublicityBoardView } from './components/PublicityBoardView';
import { RewardsView } from './components/RewardsView';
import { SharePublishModal } from './components/SharePublishModal';
import { isSectionAllowedForRole, NavSection, Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { WorkbenchView } from './components/WorkbenchView';
import { PolicyRubricItem } from './data/policyRubricData';
import { usePlatformStore } from './store/usePlatformStore';

const ACTION_DELAY_MS = 280;

const VALID_SECTIONS: NavSection[] = [
  'workbench',
  'publicity',
  'analytics',
  'accountability',
  'rewards',
  'appeals',
  'archives',
  'standards',
  'admin',
];

function getInitialSectionFromUrl(): NavSection {
  try {
    if (typeof window === 'undefined') return 'workbench';
    const sec = new URLSearchParams(window.location.search).get('section') as NavSection | null;
    if (sec && VALID_SECTIONS.includes(sec)) return sec;
  } catch {
    // ignore URL parse errors
  }
  return 'workbench';
}

export default function App() {
  const {
    state,
    currentUser,
    switchRolePersona,
    switchEmployeeById,
    resetDemoData,
    canRevealConfidentialIdentity,
    getDisplayReporterName,
    revealConfidentialReporter,
    submitAccountabilityTicket,
    confirmDepartmentSide,
    submitRespondentStatement,
    triggerErProactiveIntervention,
    executeOrEscalateTicket,
    executiveDecideTicket,
    urgeOrEscalateTicket,
    submitRewardNomination,
    advanceRewardStatus,
    urgeReward,
    submitAppeal,
    decideAppeal,
    updatePolicyGrade,
    importEmployees,
    toggleEmployeeTag,
    recordPayrollExport,
    markAllNotificationsRead,
  } = usePlatformStore();

  const [activeSection, setActiveSection] = useState<NavSection>(getInitialSectionFromUrl);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    state.tickets[0]?.id || null
  );
  const [dingTalkOpen, setDingTalkOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [newAccModalOpen, setNewAccModalOpen] = useState(false);
  const [prefillRubric, setPrefillRubric] = useState<PolicyRubricItem | null>(null);
  const [prefillRewardRubric, setPrefillRewardRubric] = useState<PolicyRubricItem | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const pendingRef = useRef<Set<string>>(new Set());

  const isActionPending = (key: string) => Boolean(pendingActions[key]);

  const runGuardedAction = async <T,>(
    key: string,
    action: () => T | Promise<T>
  ): Promise<T | undefined> => {
    if (pendingRef.current.has(key)) return undefined;
    pendingRef.current.add(key);
    setPendingActions((prev) => ({ ...prev, [key]: true }));
    try {
      await new Promise((resolve) => setTimeout(resolve, ACTION_DELAY_MS));
      return await action();
    } finally {
      pendingRef.current.delete(key);
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  useEffect(() => {
    if (!isSectionAllowedForRole(activeSection, currentUser.role)) {
      setActiveSection('workbench');
    }
  }, [activeSection, currentUser.role]);

  const unreadDingTalkCount = state.notifications.filter((n) => !n.read).length;

  const isEmployeeRole = currentUser.role === 'employee';
  const pendingCount = {
    accountability: state.tickets.filter(
      (t) =>
        t.status !== 'archived' &&
        t.status !== 'appeal_resolved' &&
        (!isEmployeeRole ||
          t.reporterId === currentUser.id ||
          t.accusedEmpId === currentUser.id)
    ).length,
    rewards: state.rewards.filter((r) => r.status !== 'approved_archived').length,
    appeals: state.appeals.filter(
      (a) =>
        a.status === 'pending_review' &&
        (!isEmployeeRole || a.appellantId === currentUser.id)
    ).length,
  };

  const handleJumpToRelated = (relatedNo: string) => {
    if (relatedNo.startsWith('WZ-')) {
      const found = state.tickets.find((t) => t.ticketNo === relatedNo);
      if (found) setSelectedTicketId(found.id);
      setActiveSection('accountability');
    } else if (relatedNo.startsWith('JL-')) {
      setActiveSection('rewards');
    } else if (relatedNo.startsWith('SS-')) {
      setActiveSection('appeals');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen">
        <Sidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          currentUser={currentUser}
          employees={state.employees}
          onSwitchRole={(role) => {
            switchRolePersona(role);
            showToast('已切换钉钉免登身份视角');
          }}
          pendingCount={pendingCount}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="relative z-10">
            <Sidebar
              activeSection={activeSection}
              onSelectSection={(sec) => {
                setActiveSection(sec);
                setMobileNavOpen(false);
              }}
              currentUser={currentUser}
              employees={state.employees}
              onSwitchRole={(role) => {
                switchRolePersona(role);
                setMobileNavOpen(false);
              }}
              pendingCount={pendingCount}
            />
          </div>
          <button
            type="button"
            aria-label="关闭侧边栏"
            onClick={() => setMobileNavOpen(false)}
            className="flex-1 bg-slate-900/40"
          />
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center lg:block bg-white border-b border-slate-200 lg:border-b-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="切换导航菜单"
            className="lg:hidden p-4 text-slate-700 hover:text-slate-900"
          >
            {mobileNavOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <TopBar
              activeSection={activeSection}
              currentUserRole={currentUser.role}
              unreadDingTalkCount={unreadDingTalkCount}
              isResetting={isActionPending('demo:reset')}
              onOpenDingTalk={() => setDingTalkOpen(true)}
              onOpenShare={() => setShareModalOpen(true)}
              onOpenNewAccountability={() => {
                setPrefillRubric(null);
                setNewAccModalOpen(true);
              }}
              onResetDemo={async () => {
                await runGuardedAction('demo:reset', () => {
                  resetDemoData();
                  showToast('已恢复初始企业演示数据');
                });
              }}
            />
          </div>
        </div>

        <main className="flex-1 p-5 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeSection === 'workbench' && (
            <WorkbenchView
              currentUser={currentUser}
              tickets={state.tickets}
              rewards={state.rewards}
              appeals={state.appeals}
              departments={state.departments}
              policyGrades={state.policyGrades}
              auditLogs={state.auditLogs}
              getDisplayReporterName={getDisplayReporterName}
              isActionPending={isActionPending}
              onNavigate={setActiveSection}
              onOpenTicket={(id) => {
                setSelectedTicketId(id);
                setActiveSection('accountability');
              }}
              onOpenNewAccountability={() => {
                setPrefillRubric(null);
                setNewAccModalOpen(true);
              }}
              onUrgeTicket={async (id) => {
                await runGuardedAction(`ticket:urge:${id}`, () => {
                  const ok = urgeOrEscalateTicket(id, false);
                  showToast(
                    ok
                      ? '已推送钉钉人工催办消息卡片'
                      : '当前节点已催办过，请等待流转后再催办'
                  );
                });
              }}
            />
          )}

          {activeSection === 'publicity' && (
            <PublicityBoardView
              currentUser={currentUser}
              departments={state.departments}
              tickets={state.tickets}
              rewards={state.rewards}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'analytics' && (
            <GovernanceAnalyticsView
              tickets={state.tickets}
              rewards={state.rewards}
              appeals={state.appeals}
              departments={state.departments}
              policyGrades={state.policyGrades}
              auditLogs={state.auditLogs}
              onOpenTicket={(id) => {
                setSelectedTicketId(id);
                setActiveSection('accountability');
              }}
              onNavigateRewards={() => setActiveSection('rewards')}
            />
          )}

          {activeSection === 'accountability' && (
            <AccountabilityView
              currentUser={currentUser}
              tickets={state.tickets}
              departments={state.departments}
              policyGrades={state.policyGrades}
              selectedTicketId={selectedTicketId}
              onSelectTicket={setSelectedTicketId}
              onOpenNewModal={() => {
                setPrefillRubric(null);
                setNewAccModalOpen(true);
              }}
              canRevealConfidentialIdentity={canRevealConfidentialIdentity}
              revealedConfidentialTicketIds={state.revealedConfidentialTicketIds}
              getDisplayReporterName={getDisplayReporterName}
              isActionPending={isActionPending}
              onRevealConfidential={async (id, purpose) => {
                await runGuardedAction(`ticket:reveal:${id}`, () => {
                  revealConfidentialReporter(id, purpose);
                  showToast('已解密提报人真实身份并写入强审计日志');
                });
              }}
              onConfirmDept={async (id, side, hasDispute, comment) => {
                await runGuardedAction(`ticket:confirm:${id}:${side}`, () => {
                  confirmDepartmentSide(id, side, hasDispute, comment);
                  showToast(
                    hasDispute ? '已标记争议，工单自动转入 ER 调查' : '部门确认已完成'
                  );
                });
              }}
              onSubmitStatement={async (id, agrees, text, counterEv) => {
                await runGuardedAction(`ticket:statement:${id}`, () => {
                  submitRespondentStatement(id, agrees, text, counterEv);
                  showToast(
                    agrees ? '陈述已提交（认同事实）' : '已提交异议陈述，工单转入 ER 调查'
                  );
                });
              }}
              onErIntervene={async (id, reason) => {
                await runGuardedAction(`ticket:er_intervene:${id}`, () => {
                  triggerErProactiveIntervention(id, reason);
                  showToast('HR（ER）已主动抽查介入调查');
                });
              }}
              onExecuteOrEscalate={async (id, payload) => {
                await runGuardedAction(`ticket:execute:${id}`, () => {
                  executeOrEscalateTicket(id, payload);
                  showToast('工单定级/上报处理已提交');
                });
              }}
              onExecutiveDecide={async (id, note, summary) => {
                await runGuardedAction(`ticket:exec_decide:${id}`, () => {
                  executiveDecideTicket(id, note, summary);
                  showToast('终审裁决已签署并归档生效');
                });
              }}
              onUrgeOrEscalate={async (id, manualEsc) => {
                const actionKey = manualEsc
                  ? `ticket:escalate:${id}`
                  : `ticket:urge:${id}`;
                await runGuardedAction(actionKey, () => {
                  const ok = urgeOrEscalateTicket(id, manualEsc);
                  showToast(
                    ok
                      ? manualEsc
                        ? '已手动升级督办并发送钉钉通知'
                        : '已发送钉钉人工催办提醒'
                      : manualEsc
                      ? '该工单已升级督办，请勿重复操作'
                      : '当前节点已催办过，请等待流转至下一节点后再催办'
                  );
                });
              }}
              onSubmitAppeal={async (payload) => {
                const ok = await runGuardedAction(
                  `ticket:appeal:${payload.ticketId}`,
                  () => submitAppeal(payload)
                );
                if (ok) {
                  setActiveSection('appeals');
                  showToast('在线申诉已提交至复核中心');
                } else if (ok === false) {
                  showToast('仅被问责人本人可对已归档工单发起申诉');
                }
                return Boolean(ok);
              }}
              onSwitchEmployee={(empId) => {
                switchEmployeeById(empId);
                showToast('已切换演示员工身份视角');
              }}
            />
          )}

          {activeSection === 'rewards' && (
            <RewardsView
              currentUser={currentUser}
              employees={state.employees}
              policyGrades={state.policyGrades}
              rewards={state.rewards}
              initialRubric={prefillRewardRubric}
              onClearInitialRubric={() => setPrefillRewardRubric(null)}
              isActionPending={isActionPending}
              onSubmitReward={async (payload) => {
                await runGuardedAction('reward:create', () => {
                  submitRewardNomination(payload);
                  showToast('M8+ 奖励表彰申报单已提交');
                });
              }}
              onAdvanceReward={async (id) => {
                await runGuardedAction(`reward:advance:${id}`, () => {
                  advanceRewardStatus(id);
                  showToast('奖励表彰审批节点已推进');
                });
              }}
              onUrgeReward={async (id) => {
                await runGuardedAction(`reward:urge:${id}`, () => {
                  const ok = urgeReward(id);
                  showToast(
                    ok
                      ? '已推送奖励审批钉钉催办卡片'
                      : '当前审批节点已催办过，请等待流转后再催办'
                  );
                });
              }}
            />
          )}

          {activeSection === 'appeals' && (
            <AppealsAndPublicityView
              currentUser={currentUser}
              appeals={state.appeals}
              tickets={state.tickets}
              rewards={state.rewards}
              policyGrades={state.policyGrades}
              isActionPending={isActionPending}
              onSubmitAppeal={async (payload) => {
                const ok = await runGuardedAction(
                  `appeal:create:${payload.ticketId}`,
                  () => submitAppeal(payload)
                );
                if (ok !== undefined) {
                  showToast(
                    ok
                      ? '在线申诉已提交至复核中心'
                      : '仅被问责人本人可对已归档工单发起申诉'
                  );
                }
              }}
              onDecideAppeal={async (id, outcome, note, gradeId) => {
                await runGuardedAction(`appeal:decide:${id}`, () => {
                  decideAppeal(id, outcome, note, gradeId);
                  showToast('申诉复核裁决已生效并同步更新员工档案');
                });
              }}
              onSwitchEmployee={(empId) => {
                switchEmployeeById(empId);
                showToast('已切换演示员工身份视角');
              }}
              onNavigatePublicity={() => setActiveSection('publicity')}
            />
          )}

          {activeSection === 'archives' && (
            <ArchivesAndAuditView
              currentUser={currentUser}
              employees={state.employees}
              departments={state.departments}
              tickets={state.tickets}
              rewards={state.rewards}
              auditLogs={state.auditLogs}
            />
          )}

          {activeSection === 'standards' && (
            <PolicyStandardsView
              currentUser={currentUser}
              employees={state.employees}
              tickets={state.tickets}
              rewards={state.rewards}
              onStartAccountabilityFromRubric={(rubric) => {
                setPrefillRubric(rubric);
                setNewAccModalOpen(true);
              }}
              onStartRewardFromRubric={(rubric) => {
                setPrefillRewardRubric(rubric);
                setActiveSection('rewards');
                const hasM8 =
                  currentUser.isM8Plus ||
                  currentUser.role === 'm8_plus' ||
                  currentUser.role === 'hrd' ||
                  currentUser.role === 'executive';
                if (!hasM8) {
                  showToast(
                    '已带入表彰标尺跳转奖励表彰页；当前职级无 M8+ 提报权，可在左下角切换 M8+ 视角发起申报'
                  );
                }
              }}
            />
          )}

          {activeSection === 'admin' && (
            <PolicyAndAdminView
              currentUser={currentUser}
              policyGrades={state.policyGrades}
              employees={state.employees}
              departments={state.departments}
              tickets={state.tickets}
              rewards={state.rewards}
              isActionPending={isActionPending}
              onUpdatePolicyGrade={async (g) => {
                await runGuardedAction(`policy:update:${g.id}`, () => {
                  updatePolicyGrade(g);
                  showToast(`已更新制度参数：${g.name}`);
                });
              }}
              onImportEmployees={async (emps) => {
                await runGuardedAction('org:import', () => {
                  importEmployees(emps);
                  showToast(`已更新组织花名册（+${emps.length}）`);
                });
              }}
              onToggleEmployeeTag={async (empId, field) => {
                await runGuardedAction(`org:tag:${empId}:${field}`, () => {
                  toggleEmployeeTag(empId, field);
                  showToast('已更新员工权限标签并记录审计日志');
                });
              }}
              onRecordPayrollExport={async (count, month) => {
                await runGuardedAction('payroll:export', () => {
                  recordPayrollExport(count, month);
                  showToast(`已导出 ${month} 算薪执行明细 CSV`);
                });
              }}
            />
          )}
        </main>
      </div>

      {/* Drawers & Modals */}
      <DingTalkDrawer
        open={dingTalkOpen}
        onClose={() => setDingTalkOpen(false)}
        notifications={state.notifications}
        isMarkingRead={isActionPending('notif:mark_read')}
        onMarkAllRead={async () => {
          await runGuardedAction('notif:mark_read', () => {
            markAllNotificationsRead();
          });
        }}
        onJumpToRelated={handleJumpToRelated}
      />

      <NewAccountabilityModal
        open={newAccModalOpen}
        onClose={() => {
          setNewAccModalOpen(false);
          setPrefillRubric(null);
        }}
        currentUser={currentUser}
        employees={state.employees}
        departments={state.departments}
        initialRubric={prefillRubric}
        isSubmitting={isActionPending('ticket:create')}
        onSubmit={async (payload) => {
          await runGuardedAction('ticket:create', () => {
            submitAccountabilityTicket(payload);
            setActiveSection('accountability');
            showToast('问责工单已提交并推送钉钉待办');
          });
        }}
      />

      <SharePublishModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        activeSection={activeSection}
        currentUserRole={currentUser.role}
        monthRewardCount={
          state.rewards.filter(
            (r) =>
              r.status === 'approved_archived' &&
              (r.approvedAt || r.createdAt).startsWith('2026-11')
          ).length
        }
        monthPunishmentCount={
          state.tickets.filter(
            (t) =>
              (t.status === 'archived' ||
                t.status === 'appealing' ||
                t.status === 'appeal_resolved') &&
              t.execution &&
              t.execution.gradeName !== '已撤销处分' &&
              (t.archivedAt || t.updatedAt).startsWith('2026-11')
          ).length
        }
        onCopied={showToast}
      />

      {/* Non-intrusive bottom-right toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg border border-slate-700">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
