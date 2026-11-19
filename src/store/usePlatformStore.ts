import { useEffect, useState } from 'react';
import {
  INITIAL_APPEALS,
  INITIAL_AUDIT_LOGS,
  INITIAL_DEPARTMENTS,
  INITIAL_EMPLOYEES,
  INITIAL_NOTIFICATIONS,
  INITIAL_POLICY_GRADES,
  INITIAL_REWARDS,
  INITIAL_TICKETS,
} from '../data/seedData';
import {
  AccountabilityTicket,
  AppealCase,
  AuditActionType,
  AuditLogEntry,
  Department,
  DingTalkNotification,
  Employee,
  ExecutionAdjustment,
  PlatformRole,
  PolicyGrade,
  PublicityScope,
  RewardNomination,
} from '../types/platform';

const STORAGE_KEY = 'hengyineng_accountability_platform_v2';

interface PlatformState {
  currentEmployeeId: string;
  departments: Department[];
  employees: Employee[];
  policyGrades: PolicyGrade[];
  tickets: AccountabilityTicket[];
  rewards: RewardNomination[];
  appeals: AppealCase[];
  auditLogs: AuditLogEntry[];
  notifications: DingTalkNotification[];
  revealedConfidentialTicketIds: string[]; // 当前会话或已留痕解锁查看的保密工单
}

function nowFormatted(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addMonthsIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function createInitialState(): PlatformState {
  return {
    currentEmployeeId: 'emp-user',
    departments: INITIAL_DEPARTMENTS,
    employees: INITIAL_EMPLOYEES,
    policyGrades: INITIAL_POLICY_GRADES,
    tickets: INITIAL_TICKETS,
    rewards: INITIAL_REWARDS,
    appeals: INITIAL_APPEALS,
    auditLogs: INITIAL_AUDIT_LOGS,
    notifications: INITIAL_NOTIFICATIONS,
    revealedConfidentialTicketIds: [],
  };
}

function getInitialRoleEmployeeId(employees: Employee[]): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const roleParam = new URLSearchParams(window.location.search).get('role');
    if (!roleParam) return null;
    const match = employees.find((e) => e.role === roleParam);
    return match ? match.id : null;
  } catch {
    return null;
  }
}

function loadState(): PlatformState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base =
      raw && (() => {
        const parsed = JSON.parse(raw) as PlatformState;
        return parsed.tickets && parsed.employees && parsed.policyGrades ? parsed : null;
      })();
    const state = base || createInitialState();
    const overrideEmpId = getInitialRoleEmployeeId(state.employees);
    if (overrideEmpId) {
      return { ...state, currentEmployeeId: overrideEmpId };
    }
    return state;
  } catch {
    const state = createInitialState();
    const overrideEmpId = getInitialRoleEmployeeId(state.employees);
    return overrideEmpId ? { ...state, currentEmployeeId: overrideEmpId } : state;
  }
}

export function usePlatformStore() {
  const [state, setState] = useState<PlatformState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  const currentUser =
    state.employees.find((e) => e.id === state.currentEmployeeId) ?? state.employees[0];

  const appendAudit = (
    prev: PlatformState,
    actionType: AuditActionType,
    targetNo: string,
    detail: string,
    isSensitiveAudit = false
  ): AuditLogEntry => ({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowFormatted(),
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    actionType,
    targetNo,
    detail,
    isSensitiveAudit,
  });

  const switchRolePersona = (role: PlatformRole) => {
    const match = state.employees.find((e) => e.role === role);
    if (!match) return;
    setState((prev) => ({
      ...prev,
      currentEmployeeId: match.id,
      // 切换账号时清空未保存的临时揭秘视图状态，保障合规演示严谨性
      revealedConfidentialTicketIds: [],
    }));
  };

  const switchEmployeeById = (empId: string) => {
    const match = state.employees.find((e) => e.id === empId);
    if (!match) return;
    setState((prev) => ({
      ...prev,
      currentEmployeeId: match.id,
      revealedConfidentialTicketIds: [],
    }));
  };

  const resetDemoData = () => {
    const fresh = createInitialState();
    setState(fresh);
  };

  // 保密提报人可见性判定逻辑
  const canRevealConfidentialIdentity = (role: PlatformRole) =>
    role === 'er_lead' || role === 'hrd';

  const getDisplayReporterName = (ticket: AccountabilityTicket): string => {
    if (!ticket.isConfidential) return ticket.reporterName;
    // 提报人本人可见自己
    if (ticket.reporterId === currentUser.id) {
      return `${ticket.reporterName}（本人实名保密提报）`;
    }
    // 普通员工、部门领导、普通HRBP均不可见
    if (!canRevealConfidentialIdentity(currentUser.role)) {
      return '保密提报人（已脱敏保护）';
    }
    // ER负责人或HRD必须点击“解密查看”并写审计日志后才显示真实姓名
    if (state.revealedConfidentialTicketIds.includes(ticket.id)) {
      return `${ticket.reporterName}（已留痕解密）`;
    }
    return '保密提报人（需授权解密并记录审计日志）';
  };

  const revealConfidentialReporter = (ticketId: string, purpose: string) => {
    if (!canRevealConfidentialIdentity(currentUser.role)) return;
    setState((prev) => {
      const ticket = prev.tickets.find((t) => t.id === ticketId);
      if (!ticket) return prev;
      const log = appendAudit(
        prev,
        'VIEW_CONFIDENTIAL_REPORTER',
        ticket.ticketNo,
        `【强审计留痕】${currentUser.name}（${currentUser.title}）解密查看了保密工单 ${ticket.ticketNo} 的提报人真实身份（${ticket.reporterName}）。事由：${purpose || '合规核查'}`,
        true
      );
      return {
        ...prev,
        revealedConfidentialTicketIds: Array.from(
          new Set([...prev.revealedConfidentialTicketIds, ticketId])
        ),
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  // 1. 发起问责提报
  const submitAccountabilityTicket = (payload: {
    title: string;
    factDescription: string;
    incidentDate: string;
    isConfidential: boolean;
    accusedEmpId: string;
    accusedDeptIds: string[];
    isMajorAccident: boolean;
    evidenceName: string;
    evidenceSummary: string;
    extraEvidences?: { name: string; summary: string }[];
  }) => {
    setState((prev) => {
      const accusedEmp = prev.employees.find((e) => e.id === payload.accusedEmpId)!;
      const accusedDepts = prev.departments.filter((d) =>
        payload.accusedDeptIds.includes(d.id)
      );
      const isMultiDepartment = accusedDepts.length > 1;
      const reporterDept = prev.departments.find(
        (d) => d.id === currentUser.departmentId
      );
      const primaryAccusedDept = accusedDepts[0];

      // 判断领导本人被问责的自动回避规则（覆盖多部门场景）
      const reporterLeaderSkipped =
        reporterDept?.headId === accusedEmp.id;
      const accusedLeaderSkipped =
        accusedDepts.some((d) => d.headId === accusedEmp.id);

      const ticketNo = `WZ-2026-${String(413 + prev.tickets.length).padStart(4, '0')}`;
      const ts = nowFormatted();

      const evidencesList = [];
      if (payload.evidenceName) {
        evidencesList.push({
          id: `ev-${Date.now()}`,
          name: payload.evidenceName,
          type: 'document' as const,
          summary: payload.evidenceSummary || '提报阶段上传事实佐证材料',
          uploadedBy: payload.isConfidential ? '保密提报人' : currentUser.name,
          uploadedAt: ts,
        });
      }
      if (payload.extraEvidences && payload.extraEvidences.length > 0) {
        payload.extraEvidences.forEach((ev, idx) => {
          evidencesList.push({
            id: `ev-${Date.now()}-${idx}`,
            name: ev.name,
            type: 'document' as const,
            summary: ev.summary || '补充佐证附件',
            uploadedBy: payload.isConfidential ? '保密提报人' : currentUser.name,
            uploadedAt: ts,
          });
        });
      }

      const newTicket: AccountabilityTicket = {
        id: `tkt-${Date.now()}`,
        ticketNo,
        title: payload.title,
        factDescription: payload.factDescription,
        incidentDate: payload.incidentDate,
        reporterId: currentUser.id,
        reporterName: currentUser.name,
        reporterDeptId: currentUser.departmentId,
        reporterDeptName: currentUser.departmentName,
        isConfidential: payload.isConfidential,
        accusedEmpId: accusedEmp.id,
        accusedEmpName: accusedEmp.name,
        accusedDeptIds: accusedDepts.map((d) => d.id),
        accusedDeptNames: accusedDepts.map((d) => d.name),
        isMultiDepartment,
        isMajorAccident: payload.isMajorAccident,
        hrIntervenedProactively: false,
        status: payload.isMajorAccident ? 'er_investigation' : 'pending_confirm',
        evidences: evidencesList,
        reporterDeptConfirm: {
          confirmed: reporterLeaderSkipped,
          leaderId: reporterDept?.headId || '',
          leaderName: reporterDept?.headName || '部门负责人',
          autoSkippedDueToSelfAccused: reporterLeaderSkipped,
          hasDispute: false,
          comment: reporterLeaderSkipped
            ? '【系统自动回避】部门领导本人涉事，自动跳过其审批节点。'
            : '',
          confirmedAt: reporterLeaderSkipped ? ts : undefined,
        },
        accusedDeptConfirm: {
          confirmed: accusedLeaderSkipped,
          leaderId: primaryAccusedDept?.headId || '',
          leaderName: primaryAccusedDept?.headName || '部门负责人',
          autoSkippedDueToSelfAccused: accusedLeaderSkipped,
          hasDispute: false,
          comment: accusedLeaderSkipped
            ? '【系统自动回避】被问责人系本部门领导，系统自动跳过其审批节点。'
            : '',
          confirmedAt: accusedLeaderSkipped ? ts : undefined,
        },
        respondentStatement: {
          submitted: false,
          agreesWithFacts: null,
          statementText: '',
          counterEvidence: [],
        },
        publicityScope: payload.isMajorAccident ? 'desensitized_warning' : 'targeted_only',
        urgeCount: 0,
        urgedStages: [],
        manualEscalated: false,
        createdAt: ts,
        updatedAt: ts,
      };

      const log = appendAudit(
        prev,
        'SUBMIT_ACCOUNTABILITY',
        ticketNo,
        `${payload.isConfidential ? '【实名保密提报】' : currentUser.name} 发起跨部门问责工单：${payload.title}（被问责人：${accusedEmp.name} / ${accusedDepts.map((d) => d.name).join('、')}）`,
        payload.isConfidential
      );

      const notif: DingTalkNotification = {
        id: `dt-${Date.now()}`,
        recipientRoleOrName: `${primaryAccusedDept?.headName || '部门领导'} & ${accusedEmp.name}`,
        cardType: 'todo',
        title: `【问责待办】新工单 ${ticketNo} 需部门确认与陈述`,
        summary: `${payload.title}。${accusedLeaderSkipped ? '已自动触发领导回避路由。' : '请双方部门领导确认事实，并请被问责人同步在线陈述。'}`,
        relatedNo: ticketNo,
        createdAt: ts,
        read: false,
      };

      return {
        ...prev,
        tickets: [newTicket, ...prev.tickets],
        auditLogs: [log, ...prev.auditLogs],
        notifications: [notif, ...prev.notifications],
      };
    });
  };

  // 2. 部门领导确认（双方部门节点）
  const confirmDepartmentSide = (
    ticketId: string,
    side: 'reporter' | 'accused',
    hasDispute: boolean,
    comment: string
  ) => {
    setState((prev) => {
      const ts = nowFormatted();
      let targetNo = '';
      const updated = prev.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        targetNo = t.ticketNo;
        const nextTicket: AccountabilityTicket = {
          ...t,
          updatedAt: ts,
        };
        if (side === 'reporter') {
          nextTicket.reporterDeptConfirm = {
            ...t.reporterDeptConfirm,
            confirmed: true,
            hasDispute,
            comment: comment || '已核实事实。',
            confirmedAt: ts,
          };
        } else {
          nextTicket.accusedDeptConfirm = {
            ...t.accusedDeptConfirm,
            confirmed: true,
            hasDispute,
            comment: comment || '已核实事实。',
            confirmedAt: ts,
          };
        }

        // 自动分流判定（Mode A Step 3）
        const bothConfirmed =
          nextTicket.reporterDeptConfirm.confirmed &&
          nextTicket.accusedDeptConfirm.confirmed;
        const anyDispute =
          nextTicket.reporterDeptConfirm.hasDispute ||
          nextTicket.accusedDeptConfirm.hasDispute ||
          nextTicket.respondentStatement.agreesWithFacts === false;

        if (nextTicket.isMajorAccident) {
          nextTicket.status = 'er_investigation';
        } else if (anyDispute || nextTicket.isMultiDepartment || nextTicket.hrIntervenedProactively) {
          nextTicket.status = 'er_investigation';
        } else if (
          bothConfirmed &&
          nextTicket.respondentStatement.submitted &&
          nextTicket.respondentStatement.agreesWithFacts === true
        ) {
          nextTicket.status = 'pending_hr_exec';
        }
        return nextTicket;
      });

      const log = appendAudit(
        prev,
        'DEPT_CONFIRM',
        targetNo,
        `${currentUser.name} 完成${side === 'reporter' ? '发起人部门' : '被问责人部门'}确认（${hasDispute ? '存在异议，触发ER介入' : '事实无异议'}）：${comment}`
      );
      return {
        ...prev,
        tickets: updated,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  // 3. 被问责人在线陈述
  const submitRespondentStatement = (
    ticketId: string,
    agreesWithFacts: boolean,
    statementText: string,
    counterEvidenceName?: string
  ) => {
    setState((prev) => {
      const ts = nowFormatted();
      let targetNo = '';
      const updated = prev.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        targetNo = t.ticketNo;
        const counterEvidence = counterEvidenceName
          ? [
              ...t.respondentStatement.counterEvidence,
              {
                id: `cev-${Date.now()}`,
                name: counterEvidenceName,
                type: 'document' as const,
                summary: '被问责人在线陈述补充反证材料',
                uploadedBy: currentUser.name,
                uploadedAt: ts,
              },
            ]
          : t.respondentStatement.counterEvidence;

        const nextTicket: AccountabilityTicket = {
          ...t,
          updatedAt: ts,
          respondentStatement: {
            submitted: true,
            agreesWithFacts,
            statementText,
            counterEvidence,
            submittedAt: ts,
          },
        };

        const bothConfirmed =
          nextTicket.reporterDeptConfirm.confirmed &&
          nextTicket.accusedDeptConfirm.confirmed;

        if (!agreesWithFacts || nextTicket.isMultiDepartment || nextTicket.isMajorAccident || nextTicket.hrIntervenedProactively) {
          nextTicket.status = 'er_investigation';
        } else if (
          bothConfirmed &&
          !nextTicket.reporterDeptConfirm.hasDispute &&
          !nextTicket.accusedDeptConfirm.hasDispute
        ) {
          nextTicket.status = 'pending_hr_exec';
        }
        return nextTicket;
      });

      const log = appendAudit(
        prev,
        'RESPONDENT_STATEMENT',
        targetNo,
        `${currentUser.name} 提交在线陈述（${agreesWithFacts ? '认同事实' : '存在异议，工单自动转入ER调查'}）：${statementText}`
      );
      return {
        ...prev,
        tickets: updated,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  // 4. HR (ER团队) 主动抽查介入
  const triggerErProactiveIntervention = (ticketId: string, reason: string) => {
    setState((prev) => {
      const ts = nowFormatted();
      let targetNo = '';
      const updated = prev.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        targetNo = t.ticketNo;
        return {
          ...t,
          hrIntervenedProactively: true,
          status: 'er_investigation' as const,
          erInvestigatorName: currentUser.name,
          updatedAt: ts,
        };
      });
      const log = appendAudit(
        prev,
        'ER_INTERVENTION',
        targetNo,
        `${currentUser.name} 触发【HR主动抽查/介入】，工单转入 ER 团队核查。说明：${reason}`
      );
      return {
        ...prev,
        tickets: updated,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  // 5. ER 调查报告提交 / 定级执行 / 重大事故上报
  const executeOrEscalateTicket = (
    ticketId: string,
    payload: {
      erReport?: string;
      gradeId: string;
      executionMode: ExecutionAdjustment['executionMode'];
      amountYuan: number;
      perfScore: number;
      perfRatioPercent: number;
      isAdjusted: boolean;
      adjustmentReason: string;
      publicityScope: PublicityScope;
      desensitizedCaseSummary?: string;
      escalateMajor: boolean;
    }
  ) => {
    setState((prev) => {
      const ts = nowFormatted();
      const grade = prev.policyGrades.find((g) => g.id === payload.gradeId)!;
      const ticket = prev.tickets.find((t) => t.id === ticketId)!;

      const exceedsLeaderCap =
        Math.abs(payload.amountYuan - grade.defaultAmountYuan) > grade.leaderAdjustCapYuan ||
        Math.abs(payload.perfScore - grade.defaultPerfScore) > grade.leaderAdjustCapScore ||
        Math.abs(payload.perfRatioPercent - grade.defaultPerfRatioPercent) >
          grade.leaderAdjustCapRatio;

      const needsExecutive =
        payload.escalateMajor ||
        ticket.isMajorAccident ||
        grade.requiresExecutiveApproval ||
        (exceedsLeaderCap && currentUser.role !== 'executive');

      const execution: ExecutionAdjustment = {
        gradeId: grade.id,
        gradeName: grade.name,
        executionMode: payload.executionMode,
        amountYuan: payload.amountYuan,
        perfScore: payload.perfScore,
        perfRatioPercent: payload.perfRatioPercent,
        isAdjusted: payload.isAdjusted,
        adjustmentReason: payload.adjustmentReason,
        exceedsLeaderCap,
        escalatedToExecutive: needsExecutive,
        impactPeriodMonths: grade.impactPeriodMonths,
        impactExpiresAt: needsExecutive
          ? undefined
          : grade.impactPeriodMonths > 0
          ? addMonthsIso(grade.impactPeriodMonths)
          : undefined,
      };

      const nextStatus = needsExecutive ? 'major_escalation' : 'archived';

      const updated = prev.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          isMajorAccident: payload.escalateMajor || t.isMajorAccident,
          erInvestigationReport: payload.erReport || t.erInvestigationReport,
          erInvestigatorName: t.erInvestigatorName || currentUser.name,
          erInvestigatedAt: ts,
          execution,
          publicityScope: payload.publicityScope,
          desensitizedCaseSummary: payload.desensitizedCaseSummary,
          status: nextStatus as AccountabilityTicket['status'],
          updatedAt: ts,
          archivedAt: nextStatus === 'archived' ? ts : undefined,
        };
      });

      const log = appendAudit(
        prev,
        needsExecutive ? 'MAJOR_ACCIDENT_ESCALATION' : 'EXECUTE_ARCHIVE',
        ticket.ticketNo,
        needsExecutive
          ? `${currentUser.name} 汇总调查并上报总经理及董事长终审（等级：${grade.name}${exceedsLeaderCap ? '，且微调超授权上限' : ''}）。`
          : `${currentUser.name} 完成制度定级与执行归档（等级：${grade.name}，金额 ¥${payload.amountYuan}，绩效分 ${payload.perfScore}，影响期 ${grade.impactPeriodMonths} 个月）。`,
        needsExecutive || payload.isAdjusted
      );

      const notif: DingTalkNotification = {
        id: `dt-${Date.now()}`,
        recipientRoleOrName: needsExecutive ? '顾长风（总经理）' : `${ticket.accusedEmpName} 及双方部门领导`,
        cardType: needsExecutive ? 'escalation' : 'warning_notice',
        title: needsExecutive
          ? `【重大事故/超权终审】工单 ${ticket.ticketNo} 待裁决`
          : `【问责执行归档】工单 ${ticket.ticketNo} 已生效`,
        summary: needsExecutive
          ? `定级建议：${grade.name}，请进入终审台审阅调查报告并裁决。`
          : `处理结果：${grade.name}（影响期 ${grade.impactPeriodMonths} 个月），已记入员工奖惩档案。`,
        relatedNo: ticket.ticketNo,
        createdAt: ts,
        read: false,
      };

      return {
        ...prev,
        tickets: updated,
        auditLogs: [log, ...prev.auditLogs],
        notifications: [notif, ...prev.notifications],
      };
    });
  };

  // 6. 总经理/董事长终审裁决
  const executiveDecideTicket = (
    ticketId: string,
    decisionNote: string,
    desensitizedSummary?: string
  ) => {
    setState((prev) => {
      const ts = nowFormatted();
      const ticket = prev.tickets.find((t) => t.id === ticketId)!;
      const impactMonths = ticket.execution?.impactPeriodMonths || 12;

      const updated = prev.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          status: 'archived' as const,
          executiveDecisionNote: decisionNote,
          executiveDecidedBy: currentUser.name,
          executiveDecidedAt: ts,
          desensitizedCaseSummary: desensitizedSummary || t.desensitizedCaseSummary,
          execution: t.execution
            ? {
                ...t.execution,
                impactExpiresAt: addMonthsIso(impactMonths),
              }
            : undefined,
          updatedAt: ts,
          archivedAt: ts,
        };
      });

      const log = appendAudit(
        prev,
        'EXECUTE_ARCHIVE',
        ticket.ticketNo,
        `总经理/董事长 ${currentUser.name} 完成重大事故/超权终审裁决并归档生效：${decisionNote}`,
        true
      );

      return {
        ...prev,
        tickets: updated,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  // 7. 人工催办 / 手动升级（钉钉卡片提醒，防止同一节点无限重复催办）
  const urgeOrEscalateTicket = (ticketId: string, manualEscalate = false): boolean => {
    const currentTicket = state.tickets.find((t) => t.id === ticketId);
    if (!currentTicket) return false;
    if (
      currentTicket.status === 'archived' ||
      currentTicket.status === 'appeal_resolved'
    ) {
      return false;
    }
    const alreadyUrgedStage = (currentTicket.urgedStages || []).includes(
      currentTicket.status
    );
    if (!manualEscalate && alreadyUrgedStage) {
      return false;
    }
    if (manualEscalate && currentTicket.manualEscalated) {
      return false;
    }

    setState((prev) => {
      const ts = nowFormatted();
      const target = prev.tickets.find((t) => t.id === ticketId);
      if (!target) return prev;
      const targetNo = target.ticketNo;
      const targetTitle = target.title;

      const updated = prev.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const nextStatus =
          manualEscalate && t.status === 'pending_confirm'
            ? ('er_investigation' as const)
            : t.status;
        const nextUrgedStages = manualEscalate
          ? t.urgedStages || []
          : Array.from(new Set([...(t.urgedStages || []), t.status]));
        return {
          ...t,
          urgeCount: t.urgeCount + 1,
          urgedStages: nextUrgedStages,
          lastUrgedAt: ts,
          manualEscalated: t.manualEscalated || manualEscalate,
          status: nextStatus,
          updatedAt: ts,
        };
      });

      const log = appendAudit(
        prev,
        'DINGTALK_URGE',
        targetNo,
        `${currentUser.name} 发起${manualEscalate ? '手动升级至ER/高层并推送钉钉紧急提醒' : '钉钉人工催办消息卡片推送'}。`
      );

      const notif: DingTalkNotification = {
        id: `dt-${Date.now()}`,
        recipientRoleOrName: manualEscalate ? 'ER负责人 & 部门总监' : '当前待处理节点责任人',
        cardType: manualEscalate ? 'escalation' : 'urge',
        title: manualEscalate
          ? `【手动升级提醒】工单 ${targetNo} 已人工升级督办`
          : `【钉钉待办催办】工单 ${targetNo} 请尽快处理`,
        summary: `${targetTitle}（发起催办人：${currentUser.name}）`,
        relatedNo: targetNo,
        createdAt: ts,
        read: false,
      };

      return {
        ...prev,
        tickets: updated,
        auditLogs: [log, ...prev.auditLogs],
        notifications: [notif, ...prev.notifications],
      };
    });
    return true;
  };

  // 8. M8+ 发起奖励表彰
  const submitRewardNomination = (payload: {
    title: string;
    deedDescription: string;
    winnerId: string;
    isInternalException: boolean;
    internalExceptionReason?: string;
    gradeId: string;
    executionMode: ExecutionAdjustment['executionMode'];
    amountYuan: number;
    perfScore: number;
    perfRatioPercent: number;
    isAdjusted: boolean;
    adjustmentReason?: string;
    evidenceName: string;
    evidenceSummary: string;
  }) => {
    if (!currentUser.isM8Plus && currentUser.role !== 'm8_plus' && currentUser.role !== 'hrd' && currentUser.role !== 'executive') {
      return;
    }
    setState((prev) => {
      const ts = nowFormatted();
      const winner = prev.employees.find((e) => e.id === payload.winnerId)!;
      const grade = prev.policyGrades.find((g) => g.id === payload.gradeId)!;
      const isCrossDepartment = winner.departmentId !== currentUser.departmentId;
      const rewardNo = `JL-2026-${String(195 + prev.rewards.length).padStart(4, '0')}`;

      const newReward: RewardNomination = {
        id: `rew-${Date.now()}`,
        rewardNo,
        title: payload.title,
        deedDescription: payload.deedDescription,
        nominatorId: currentUser.id,
        nominatorName: currentUser.name,
        nominatorRank: currentUser.rank,
        nominatorDeptId: currentUser.departmentId,
        nominatorDeptName: currentUser.departmentName,
        winnerId: winner.id,
        winnerName: winner.name,
        winnerRank: winner.rank,
        winnerDeptId: winner.departmentId,
        winnerDeptName: winner.departmentName,
        isCrossDepartment,
        isInternalException: !isCrossDepartment && payload.isInternalException,
        internalExceptionReason: payload.internalExceptionReason,
        gradeId: grade.id,
        gradeName: grade.name,
        executionMode: payload.executionMode,
        amountYuan: payload.amountYuan,
        perfScore: payload.perfScore,
        perfRatioPercent: payload.perfRatioPercent,
        isAdjusted: payload.isAdjusted,
        adjustmentReason: payload.adjustmentReason,
        evidences: [
          {
            id: `rev-${Date.now()}`,
            name: payload.evidenceName || '事迹佐证附件.pdf',
            type: 'document',
            summary: payload.evidenceSummary || '里程碑验收或客户感谢材料',
            uploadedBy: currentUser.name,
            uploadedAt: ts,
          },
        ],
        publicityScope: grade.defaultPublicity,
        status: !isCrossDepartment ? 'pending_special_approval' : 'pending_dept_confirm',
        urgeCount: 0,
        urgedStages: [],
        createdAt: ts,
      };

      const log = appendAudit(
        prev,
        'SUBMIT_REWARD',
        rewardNo,
        `${currentUser.name}（${currentUser.rank}）提报奖励表彰【${grade.name}】给 ${winner.name}（${isCrossDepartment ? '跨部门协作' : '内部例外特批通道'}）：${payload.title}`
      );

      const notif: DingTalkNotification = {
        id: `dt-${Date.now()}`,
        recipientRoleOrName: !isCrossDepartment ? 'HRD & 授权高层（内部特批）' : `${winner.departmentName}负责人`,
        cardType: 'todo',
        title: `【奖励审批待办】${rewardNo} · ${grade.name}提报`,
        summary: `提报人 ${currentUser.name} 提名 ${winner.name}，请按流程核实事迹与佐证材料。`,
        relatedNo: rewardNo,
        createdAt: ts,
        read: false,
      };

      return {
        ...prev,
        rewards: [newReward, ...prev.rewards],
        auditLogs: [log, ...prev.auditLogs],
        notifications: [notif, ...prev.notifications],
      };
    });
  };

  const advanceRewardStatus = (rewardId: string) => {
    setState((prev) => {
      const ts = nowFormatted();
      const target = prev.rewards.find((r) => r.id === rewardId);
      if (!target) return prev;

      const rewardNo = target.rewardNo;
      const rewardTitle = target.title;
      const winnerName = target.winnerName;
      const gradeName = target.gradeName;
      const publicity: PublicityScope = target.publicityScope;
      let becameApproved = false;

      const updated = prev.rewards.map((r) => {
        if (r.id !== rewardId) return r;
        const grade = prev.policyGrades.find((g) => g.id === r.gradeId);

        if (r.status === 'pending_dept_confirm' || r.status === 'pending_special_approval') {
          return {
            ...r,
            status: 'pending_hr_review' as const,
            deptConfirmedBy: currentUser.name,
          };
        }
        if (r.status === 'pending_hr_review') {
          if (grade?.requiresExecutiveApproval || r.isInternalException) {
            return {
              ...r,
              status: 'pending_exec_approval' as const,
              hrReviewedBy: currentUser.name,
            };
          }
          becameApproved = true;
          return {
            ...r,
            status: 'approved_archived' as const,
            hrReviewedBy: currentUser.name,
            execApprovedBy: currentUser.name,
            approvedAt: ts,
          };
        }
        if (r.status === 'pending_exec_approval') {
          becameApproved = true;
          return {
            ...r,
            status: 'approved_archived' as const,
            execApprovedBy: currentUser.name,
            approvedAt: ts,
          };
        }
        return r;
      });

      const log = appendAudit(
        prev,
        'APPROVE_REWARD',
        rewardNo,
        `${currentUser.name} 审批推进奖励表彰申报单 ${rewardNo}（${becameApproved ? '已终审通过并生效公示' : '流转至下一审批节点'}）。`
      );

      const notifications = [...prev.notifications];
      if (becameApproved && publicity === 'all_staff_dingtalk') {
        notifications.unshift({
          id: `dt-${Date.now()}`,
          recipientRoleOrName: '全员公告与钉钉群喜报',
          cardType: 'reward_cheer',
          title: `【全员喜报】${winnerName} 荣获「${gradeName}」表彰`,
          summary: rewardTitle,
          relatedNo: rewardNo,
          createdAt: ts,
          read: false,
        });
      }

      return {
        ...prev,
        rewards: updated,
        auditLogs: [log, ...prev.auditLogs],
        notifications,
      };
    });
  };

  // 9. 发起在线申诉（自动检测 HRD 利益冲突并强制回避，防止重复与越权申诉）
  const submitAppeal = (payload: {
    ticketId: string;
    reason: string;
    evidenceName?: string;
  }): boolean => {
    const currentTicket = state.tickets.find((t) => t.id === payload.ticketId);
    if (!currentTicket || currentTicket.status !== 'archived') return false;
    if (currentTicket.accusedEmpId !== currentUser.id) return false;
    if (
      state.appeals.some(
        (a) => a.ticketId === currentTicket.id && a.status === 'pending_review'
      )
    ) {
      return false;
    }

    setState((prev) => {
      const ts = nowFormatted();
      const ticket = prev.tickets.find((t) => t.id === payload.ticketId);
      if (!ticket || ticket.status !== 'archived') return prev;
      if (prev.appeals.some((a) => a.ticketId === ticket.id && a.status === 'pending_review')) {
        return prev;
      }
      const hrdEmp = prev.employees.find((e) => e.role === 'hrd');

      // 检测利益冲突：原调查由 HRD 牵头 或 涉及其直属人力资源部团队
      const hrdInvolved =
        ticket.erInvestigatorName === hrdEmp?.name ||
        ticket.accusedDeptIds.includes('dept-hr');

      const appealNo = `SS-2026-${String(59 + prev.appeals.length).padStart(4, '0')}`;

      const newAppeal: AppealCase = {
        id: `apl-${Date.now()}`,
        appealNo,
        ticketId: ticket.id,
        ticketNo: ticket.ticketNo,
        ticketTitle: ticket.title,
        appellantId: ticket.accusedEmpId,
        appellantName: ticket.accusedEmpName,
        appellantDeptName: ticket.accusedDeptNames[0] || currentUser.departmentName,
        originalGradeName: ticket.execution?.gradeName || '书面警告',
        originalAmountYuan: ticket.execution?.amountYuan || 0,
        reason: payload.reason,
        supplementEvidence: payload.evidenceName
          ? [
              {
                id: `aev-${Date.now()}`,
                name: payload.evidenceName,
                type: 'document',
                summary: '申诉补充佐证材料',
                uploadedBy: currentUser.name,
                uploadedAt: ts,
              },
            ]
          : [],
        assignedReviewerRole: hrdInvolved ? 'executive' : 'hrd',
        assignedReviewerName: hrdInvolved
          ? '顾长风（总经理终裁 · HRD强制回避）'
          : `${hrdEmp?.name || '沈亦安'}（HRD 统一复核）`,
        hrdConflictTriggered: hrdInvolved,
        hrdConflictReason: hrdInvolved
          ? '检测到原调查由 HRD 牵头或涉及 HRD 直属人力资源团队，触发强制利益冲突回避规则，自动升级至总经理终裁。'
          : undefined,
        status: 'pending_review',
        createdAt: ts,
      };

      const updatedTickets = prev.tickets.map((t) =>
        t.id === ticket.id ? { ...t, status: 'appealing' as const, updatedAt: ts } : t
      );

      const log = appendAudit(
        prev,
        'SUBMIT_APPEAL',
        appealNo,
        `${currentUser.name} 对工单 ${ticket.ticketNo} 发起在线申诉。${hrdInvolved ? '【触发HRD强制回避，升级至总经理终裁】' : '分配至 HRD 统一复核。'}`,
        hrdInvolved
      );

      return {
        ...prev,
        tickets: updatedTickets,
        appeals: [newAppeal, ...prev.appeals],
        auditLogs: [log, ...prev.auditLogs],
      };
    });
    return true;
  };

  // 10. 申诉裁决（维持原判 / 变更等级 / 撤销处分）
  const decideAppeal = (
    appealId: string,
    outcome: 'upheld' | 'modified' | 'revoked',
    decisionNote: string,
    newGradeId?: string
  ) => {
    setState((prev) => {
      const ts = nowFormatted();
      const appeal = prev.appeals.find((a) => a.id === appealId)!;
      const newGrade = newGradeId
        ? prev.policyGrades.find((g) => g.id === newGradeId)
        : undefined;

      const updatedAppeals = prev.appeals.map((a) => {
        if (a.id !== appealId) return a;
        return {
          ...a,
          status: outcome,
          decisionNote,
          newGradeId: newGrade?.id,
          newGradeName: outcome === 'revoked' ? '已撤销处分' : newGrade?.name,
          newAmountYuan: outcome === 'revoked' ? 0 : newGrade?.defaultAmountYuan,
          decidedBy: currentUser.name,
          decidedAt: ts,
        };
      });

      const updatedTickets = prev.tickets.map((t) => {
        if (t.id !== appeal.ticketId) return t;
        if (outcome === 'upheld') {
          return { ...t, status: 'appeal_resolved' as const, updatedAt: ts };
        }
        if (outcome === 'revoked') {
          return {
            ...t,
            status: 'appeal_resolved' as const,
            execution: t.execution
              ? {
                  ...t.execution,
                  gradeName: '已撤销处分',
                  amountYuan: 0,
                  perfScore: 0,
                  perfRatioPercent: 0,
                  impactPeriodMonths: 0,
                  impactExpiresAt: undefined,
                }
              : undefined,
            updatedAt: ts,
          };
        }
        return {
          ...t,
          status: 'appeal_resolved' as const,
          execution:
            t.execution && newGrade
              ? {
                  ...t.execution,
                  gradeId: newGrade.id,
                  gradeName: newGrade.name,
                  amountYuan: newGrade.defaultAmountYuan,
                  perfScore: newGrade.defaultPerfScore,
                  perfRatioPercent: newGrade.defaultPerfRatioPercent,
                  impactPeriodMonths: newGrade.impactPeriodMonths,
                  impactExpiresAt:
                    newGrade.impactPeriodMonths > 0
                      ? addMonthsIso(newGrade.impactPeriodMonths)
                      : undefined,
                }
              : t.execution,
          updatedAt: ts,
        };
      });

      const outcomeText =
        outcome === 'upheld'
          ? '维持原判'
          : outcome === 'revoked'
          ? '撤销处分并同步清零员工档案影响期'
          : `变更处分等级为【${newGrade?.name}】`;

      const log = appendAudit(
        prev,
        'APPEAL_DECISION',
        appeal.appealNo,
        `${currentUser.name} 裁决申诉单 ${appeal.appealNo}：${outcomeText}。裁决说明：${decisionNote}`,
        true
      );

      return {
        ...prev,
        appeals: updatedAppeals,
        tickets: updatedTickets,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  // 11. 更新制度参数配置
  const updatePolicyGrade = (updatedGrade: PolicyGrade) => {
    setState((prev) => {
      const log = appendAudit(
        prev,
        'POLICY_UPDATE',
        updatedGrade.code,
        `${currentUser.name} 更新制度等级参数【${updatedGrade.name}】（金额 ¥${updatedGrade.defaultAmountYuan}，绩效分 ${updatedGrade.defaultPerfScore}，影响期 ${updatedGrade.impactPeriodMonths} 个月）。`,
        true
      );
      return {
        ...prev,
        policyGrades: prev.policyGrades.map((g) =>
          g.id === updatedGrade.id ? updatedGrade : g
        ),
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  // 12. 组织与M8+花名册批量导入或新增
  const importEmployees = (newEmps: Employee[]) => {
    setState((prev) => {
      const existingNos = new Set(prev.employees.map((e) => e.empNo));
      const merged = [
        ...prev.employees,
        ...newEmps.filter((e) => !existingNos.has(e.empNo)),
      ];
      const log = appendAudit(
        prev,
        'ROSTER_IMPORT',
        'ORG-SYNC',
        `${currentUser.name} 导入维护组织花名册与职级标签，新增 ${newEmps.filter((e) => !existingNos.has(e.empNo)).length} 名员工记录。`
      );
      return {
        ...prev,
        employees: merged,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  const recordPayrollExport = (rowCount: number, monthLabel: string) => {
    setState((prev) => {
      const log = appendAudit(
        prev,
        'PAYROLL_EXPORT',
        `PAYROLL-${monthLabel}`,
        `${currentUser.name} 导出 ${monthLabel} 标准算薪与绩效奖惩执行明细表（共 ${rowCount} 条生效记录）。`
      );
      return {
        ...prev,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  };

  const urgeReward = (rewardId: string): boolean => {
    const current = state.rewards.find((r) => r.id === rewardId);
    if (!current || current.status === 'approved_archived') return false;
    if ((current.urgedStages || []).includes(current.status)) return false;

    setState((prev) => {
      const ts = nowFormatted();
      const target = prev.rewards.find((r) => r.id === rewardId);
      if (!target) return prev;
      const updated = prev.rewards.map((r) =>
        r.id === rewardId
          ? {
              ...r,
              urgeCount: r.urgeCount + 1,
              urgedStages: Array.from(new Set([...(r.urgedStages || []), r.status])),
            }
          : r
      );
      const log = appendAudit(
        prev,
        'DINGTALK_URGE',
        target.rewardNo,
        `${currentUser.name} 对奖励表彰申报单 ${target.rewardNo} 发送钉钉催办提醒。`
      );
      const notif: DingTalkNotification = {
        id: `dt-${Date.now()}`,
        recipientRoleOrName: '当前奖励审批节点责任人',
        cardType: 'urge',
        title: `【奖励审批催办】${target.rewardNo} 请及时审核`,
        summary: `${target.title}（催办人：${currentUser.name}）`,
        relatedNo: target.rewardNo,
        createdAt: ts,
        read: false,
      };
      return {
        ...prev,
        rewards: updated,
        auditLogs: [log, ...prev.auditLogs],
        notifications: [notif, ...prev.notifications],
      };
    });
    return true;
  };

  const toggleEmployeeTag = (empId: string, field: 'isM8Plus' | 'isDeptLeader') => {
    if (currentUser.role !== 'hrd' && currentUser.role !== 'executive') return;
    setState((prev) => {
      const emp = prev.employees.find((e) => e.id === empId);
      if (!emp) return prev;
      const updated = prev.employees.map((e) => {
        if (e.id !== empId) return e;
        const nextVal = !e[field];
        return {
          ...e,
          [field]: nextVal,
        };
      });
      const log = appendAudit(
        prev,
        'ROSTER_IMPORT',
        emp.empNo,
        `${currentUser.name} 维护员工 ${emp.name}（${emp.empNo}）的治理权限标签（${
          field === 'isM8Plus' ? 'M8+ 奖励提报权' : '部门领导审批节点'
        }）。`
      );
      return {
        ...prev,
        employees: updated,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  };

  return {
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
  };
}
