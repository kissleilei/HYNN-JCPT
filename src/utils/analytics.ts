import {
  AccountabilityStatus,
  AccountabilityTicket,
  AppealCase,
  AuditLogEntry,
  Department,
  PolicyGrade,
  RewardNomination,
} from '../types/platform';
import { ACCOUNTABILITY_STATUS_META } from './labels';

export type AnalyticsMetric = 'count' | 'amount' | 'perf_score' | 'per_100_headcount';
export type AnalyticsScope = 'all' | 'cross_dept' | 'confidential_or_sensitive' | 'major_or_disputed';
export type TimeGranularity = 'week' | 'month';

export interface AnalyticsFilterState {
  scope: AnalyticsScope;
  metric: AnalyticsMetric;
  selectedDeptId: string; // 'all' or department id
  selectedStatus: AccountabilityStatus | 'all';
  timeGranularity: TimeGranularity;
  selectedTimeBucket: string; // 'all' or bucket key
}

export interface DeptDimensionRow {
  deptId: string;
  deptName: string;
  deptCode: string;
  headName: string;
  headcount: number;
  accountabilityCount: number;
  rewardCount: number;
  totalEvents: number;
  punishmentAmountYuan: number;
  rewardAmountYuan: number;
  netAmountYuan: number;
  punishmentPerfScore: number;
  rewardPerfScore: number;
  netPerfScore: number;
  per100AccRate: number;
  per100RewRate: number;
  activeImpactCount: number;
  majorOrDisputedCount: number;
}

export interface StatusSegment {
  status: AccountabilityStatus;
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface MatrixCell {
  fromDeptId: string;
  fromDeptName: string;
  toDeptId: string;
  toDeptName: string;
  isInternal: boolean;
  ticketCount: number;
  rewardCount: number;
  netAmountYuan: number;
  ticketNos: string[];
  rewardNos: string[];
}

export interface TimeBucketPoint {
  key: string;
  label: string;
  ticketCount: number;
  rewardCount: number;
  appealCount: number;
  sensitiveAuditCount: number;
  netAmountYuan: number;
}

export interface GradeSpectrumItem {
  gradeId: string;
  gradeName: string;
  category: 'punishment' | 'reward';
  count: number;
  totalAmountYuan: number;
  totalPerfScore: number;
}

export interface UnifiedDrilldownRecord {
  kind: 'ticket' | 'reward';
  id: string;
  docNo: string;
  title: string;
  deptNames: string;
  actorName: string;
  statusLabel: string;
  statusTone: 'emerald' | 'amber' | 'red' | 'blue' | 'slate';
  amountYuan: number;
  perfScore: number;
  dateStr: string;
  isCrossDept: boolean;
  isConfidential: boolean;
}

const STATUS_COLORS: Record<AccountabilityStatus, string> = {
  pending_confirm: '#D97706', // amber-600
  er_investigation: '#2563EB', // blue-600
  major_escalation: '#DC2626', // red-600
  pending_hr_exec: '#4F46E5', // indigo-600
  archived: '#059669', // emerald-600
  appealing: '#EA580C', // orange-600
  appeal_resolved: '#475569', // slate-600
};

function extractDatePart(ts: string): string {
  return (ts || '').slice(0, 10);
}

export function getTimeBucketKey(dateStr: string, granularity: TimeGranularity): string {
  const clean = extractDatePart(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return '未知日期';
  if (granularity === 'month') {
    return clean.slice(0, 7); // YYYY-MM
  }
  const [y, m, d] = clean.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  // Monday-based week start
  const day = dt.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(dt);
  mon.setDate(dt.getDate() + diffToMon);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`;
}

export function formatTimeBucketLabel(key: string, granularity: TimeGranularity): string {
  if (granularity === 'month') {
    const [y, m] = key.split('-');
    return y && m ? `${y.slice(2)}/${Number(m)}月` : key;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const [y, m, d] = key.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(start.getMonth() + 1)}/${pad(start.getDate())}–${pad(end.getMonth() + 1)}/${pad(end.getDate())}`;
  }
  return key;
}

export function filterByScope(
  tickets: AccountabilityTicket[],
  rewards: RewardNomination[],
  scope: AnalyticsScope
): { scopedTickets: AccountabilityTicket[]; scopedRewards: RewardNomination[] } {
  if (scope === 'all') {
    return { scopedTickets: tickets, scopedRewards: rewards };
  }
  if (scope === 'cross_dept') {
    return {
      scopedTickets: tickets.filter(
        (t) => !t.accusedDeptIds.includes(t.reporterDeptId) || t.isMultiDepartment
      ),
      scopedRewards: rewards.filter((r) => r.isCrossDepartment),
    };
  }
  if (scope === 'confidential_or_sensitive') {
    return {
      scopedTickets: tickets.filter(
        (t) =>
          t.isConfidential ||
          t.reporterDeptConfirm.autoSkippedDueToSelfAccused ||
          t.accusedDeptConfirm.autoSkippedDueToSelfAccused
      ),
      scopedRewards: rewards.filter((r) => r.isInternalException),
    };
  }
  // major_or_disputed
  return {
    scopedTickets: tickets.filter(
      (t) =>
        t.isMajorAccident ||
        t.hrIntervenedProactively ||
        t.status === 'er_investigation' ||
        t.status === 'major_escalation' ||
        t.status === 'appealing'
    ),
    scopedRewards: rewards.filter((r) => r.gradeId === 'grade-r3' || r.isInternalException),
  };
}

export function computeAnalyticsDataset(params: {
  tickets: AccountabilityTicket[];
  rewards: RewardNomination[];
  appeals: AppealCase[];
  departments: Department[];
  policyGrades: PolicyGrade[];
  auditLogs: AuditLogEntry[];
  filters: AnalyticsFilterState;
}) {
  const { tickets, rewards, appeals, departments, policyGrades, auditLogs, filters } = params;
  const { scopedTickets, scopedRewards } = filterByScope(tickets, rewards, filters.scope);

  // Apply optional time bucket filter to secondary slices
  const matchesBucket = (dateStr: string) =>
    filters.selectedTimeBucket === 'all' ||
    getTimeBucketKey(dateStr, filters.timeGranularity) === filters.selectedTimeBucket;

  const bucketFilteredTickets = scopedTickets.filter((t) => matchesBucket(t.createdAt));
  const bucketFilteredRewards = scopedRewards.filter((r) => matchesBucket(r.createdAt));

  // Status distribution (before status filter so user sees all segments and can click one)
  const statusOrder: AccountabilityStatus[] = [
    'pending_confirm',
    'er_investigation',
    'major_escalation',
    'pending_hr_exec',
    'archived',
    'appealing',
    'appeal_resolved',
  ];

  const deptMatchedTicketsForStatus =
    filters.selectedDeptId === 'all'
      ? bucketFilteredTickets
      : bucketFilteredTickets.filter(
          (t) =>
            t.accusedDeptIds.includes(filters.selectedDeptId) ||
            t.reporterDeptId === filters.selectedDeptId
        );

  const totalStatusCount = deptMatchedTicketsForStatus.length;
  const statusSegments: StatusSegment[] = statusOrder
    .map((st) => {
      const count = deptMatchedTicketsForStatus.filter((t) => t.status === st).length;
      return {
        status: st,
        label: ACCOUNTABILITY_STATUS_META[st].label,
        count,
        pct: totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0,
        color: STATUS_COLORS[st],
      };
    })
    .filter((s) => s.count > 0);

  // Apply status filter to tickets
  const statusMatchedTickets =
    filters.selectedStatus === 'all'
      ? bucketFilteredTickets
      : bucketFilteredTickets.filter((t) => t.status === filters.selectedStatus);

  // Department comparison rows
  const deptRows: DeptDimensionRow[] = departments.map((dept) => {
    const deptTickets = statusMatchedTickets.filter((t) => t.accusedDeptIds.includes(dept.id));
    const deptRewards = bucketFilteredRewards.filter((r) => r.winnerDeptId === dept.id);

    const punishmentAmountYuan = deptTickets.reduce(
      (sum, t) => sum + (t.execution?.amountYuan || 0),
      0
    );
    const rewardAmountYuan = deptRewards.reduce((sum, r) => sum + r.amountYuan, 0);

    const punishmentPerfScore = deptTickets.reduce(
      (sum, t) => sum + (t.execution?.perfScore || 0),
      0
    );
    const rewardPerfScore = deptRewards.reduce((sum, r) => sum + r.perfScore, 0);

    const activeImpactCount = deptTickets.filter(
      (t) =>
        t.execution &&
        t.execution.impactPeriodMonths > 0 &&
        t.execution.gradeName !== '已撤销处分' &&
        (t.status === 'archived' || t.status === 'appealing' || t.status === 'appeal_resolved')
    ).length;

    const majorOrDisputedCount = deptTickets.filter(
      (t) =>
        t.isMajorAccident ||
        t.status === 'er_investigation' ||
        t.status === 'major_escalation' ||
        t.status === 'appealing'
    ).length;

    const headcount = Math.max(1, dept.headcount);

    return {
      deptId: dept.id,
      deptName: dept.name,
      deptCode: dept.code,
      headName: dept.headName,
      headcount: dept.headcount,
      accountabilityCount: deptTickets.length,
      rewardCount: deptRewards.length,
      totalEvents: deptTickets.length + deptRewards.length,
      punishmentAmountYuan,
      rewardAmountYuan,
      netAmountYuan: punishmentAmountYuan + rewardAmountYuan,
      punishmentPerfScore,
      rewardPerfScore,
      netPerfScore: punishmentPerfScore + rewardPerfScore,
      per100AccRate: Number(((deptTickets.length / headcount) * 100).toFixed(2)),
      per100RewRate: Number(((deptRewards.length / headcount) * 100).toFixed(2)),
      activeImpactCount,
      majorOrDisputedCount,
    };
  });

  // Cross-department interaction matrix (Reporter/Nominator -> Accused/Winner)
  const matrixCells: MatrixCell[] = [];
  departments.forEach((fromDept) => {
    departments.forEach((toDept) => {
      const cellTickets = statusMatchedTickets.filter(
        (t) => t.reporterDeptId === fromDept.id && t.accusedDeptIds.includes(toDept.id)
      );
      const cellRewards = bucketFilteredRewards.filter(
        (r) => r.nominatorDeptId === fromDept.id && r.winnerDeptId === toDept.id
      );
      const netAmountYuan =
        cellTickets.reduce((s, t) => s + (t.execution?.amountYuan || 0), 0) +
        cellRewards.reduce((s, r) => s + r.amountYuan, 0);
      matrixCells.push({
        fromDeptId: fromDept.id,
        fromDeptName: fromDept.name,
        toDeptId: toDept.id,
        toDeptName: toDept.name,
        isInternal: fromDept.id === toDept.id,
        ticketCount: cellTickets.length,
        rewardCount: cellRewards.length,
        netAmountYuan,
        ticketNos: cellTickets.map((t) => t.ticketNo),
        rewardNos: cellRewards.map((r) => r.rewardNo),
      });
    });
  });

  // Time series buckets (computed across all scoped records so user can pick any time bucket)
  const bucketMap = new Map<string, TimeBucketPoint>();
  const ensureBucket = (dateStr: string) => {
    const key = getTimeBucketKey(dateStr, filters.timeGranularity);
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        key,
        label: formatTimeBucketLabel(key, filters.timeGranularity),
        ticketCount: 0,
        rewardCount: 0,
        appealCount: 0,
        sensitiveAuditCount: 0,
        netAmountYuan: 0,
      });
    }
    return bucketMap.get(key)!;
  };

  const deptTicketsForSeries =
    filters.selectedDeptId === 'all'
      ? scopedTickets
      : scopedTickets.filter(
          (t) =>
            t.accusedDeptIds.includes(filters.selectedDeptId) ||
            t.reporterDeptId === filters.selectedDeptId
        );
  const deptRewardsForSeries =
    filters.selectedDeptId === 'all'
      ? scopedRewards
      : scopedRewards.filter(
          (r) =>
            r.winnerDeptId === filters.selectedDeptId ||
            r.nominatorDeptId === filters.selectedDeptId
        );

  deptTicketsForSeries.forEach((t) => {
    if (filters.selectedStatus !== 'all' && t.status !== filters.selectedStatus) return;
    const b = ensureBucket(t.createdAt);
    b.ticketCount += 1;
    b.netAmountYuan += t.execution?.amountYuan || 0;
  });

  deptRewardsForSeries.forEach((r) => {
    const b = ensureBucket(r.createdAt);
    b.rewardCount += 1;
    b.netAmountYuan += r.amountYuan;
  });

  appeals.forEach((a) => {
    const b = ensureBucket(a.createdAt);
    b.appealCount += 1;
  });

  auditLogs
    .filter((l) => l.isSensitiveAudit)
    .forEach((l) => {
      const b = ensureBucket(l.timestamp);
      b.sensitiveAuditCount += 1;
    });

  const timeSeries = Array.from(bucketMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  // Grade spectrum
  const gradeSpectrum: GradeSpectrumItem[] = policyGrades.map((g) => {
    if (g.category === 'punishment') {
      const matched = statusMatchedTickets.filter(
        (t) =>
          t.execution?.gradeId === g.id &&
          (filters.selectedDeptId === 'all' ||
            t.accusedDeptIds.includes(filters.selectedDeptId) ||
            t.reporterDeptId === filters.selectedDeptId)
      );
      return {
        gradeId: g.id,
        gradeName: g.name,
        category: 'punishment',
        count: matched.length,
        totalAmountYuan: matched.reduce((s, t) => s + (t.execution?.amountYuan || 0), 0),
        totalPerfScore: matched.reduce((s, t) => s + (t.execution?.perfScore || 0), 0),
      };
    }
    const matchedRew = bucketFilteredRewards.filter(
      (r) =>
        r.gradeId === g.id &&
        (filters.selectedDeptId === 'all' ||
          r.winnerDeptId === filters.selectedDeptId ||
          r.nominatorDeptId === filters.selectedDeptId)
    );
    return {
      gradeId: g.id,
      gradeName: g.name,
      category: 'reward',
      count: matchedRew.length,
      totalAmountYuan: matchedRew.reduce((s, r) => s + r.amountYuan, 0),
      totalPerfScore: matchedRew.reduce((s, r) => s + r.perfScore, 0),
    };
  });

  // Final filtered records for KPI strip & drilldown ledger
  const finalTickets =
    filters.selectedDeptId === 'all'
      ? statusMatchedTickets
      : statusMatchedTickets.filter(
          (t) =>
            t.accusedDeptIds.includes(filters.selectedDeptId) ||
            t.reporterDeptId === filters.selectedDeptId
        );

  const finalRewards =
    filters.selectedDeptId === 'all'
      ? bucketFilteredRewards
      : bucketFilteredRewards.filter(
          (r) =>
            r.winnerDeptId === filters.selectedDeptId ||
            r.nominatorDeptId === filters.selectedDeptId
        );

  const drilldownRecords: UnifiedDrilldownRecord[] = [
    ...finalTickets.map((t): UnifiedDrilldownRecord => {
      const tone: UnifiedDrilldownRecord['statusTone'] =
        t.status === 'archived'
          ? 'emerald'
          : t.status === 'major_escalation'
          ? 'red'
          : t.status === 'er_investigation' || t.status === 'pending_hr_exec'
          ? 'blue'
          : t.status === 'appeal_resolved'
          ? 'slate'
          : 'amber';
      return {
        kind: 'ticket',
        id: t.id,
        docNo: t.ticketNo,
        title: t.title,
        deptNames: `${t.reporterDeptName} → ${t.accusedDeptNames.join('、')}`,
        actorName: t.accusedEmpName,
        statusLabel: ACCOUNTABILITY_STATUS_META[t.status].label,
        statusTone: tone,
        amountYuan: t.execution?.amountYuan || 0,
        perfScore: t.execution?.perfScore || 0,
        dateStr: t.createdAt,
        isCrossDept: !t.accusedDeptIds.includes(t.reporterDeptId) || t.isMultiDepartment,
        isConfidential: t.isConfidential,
      };
    }),
    ...finalRewards.map((r): UnifiedDrilldownRecord => ({
      kind: 'reward',
      id: r.id,
      docNo: r.rewardNo,
      title: r.title,
      deptNames: `${r.nominatorDeptName} → ${r.winnerDeptName}`,
      actorName: r.winnerName,
      statusLabel:
        r.status === 'approved_archived'
          ? `已批准公示 · ${r.gradeName}`
          : `审批中 · ${r.gradeName}`,
      statusTone: r.status === 'approved_archived' ? 'emerald' : 'blue',
      amountYuan: r.amountYuan,
      perfScore: r.perfScore,
      dateStr: r.createdAt,
      isCrossDept: r.isCrossDepartment,
      isConfidential: false,
    })),
  ].sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  // Governance health & compliance rates (all real ratios)
  const totalT = finalTickets.length;
  const totalR = finalRewards.length;
  const crossDeptCount =
    finalTickets.filter((t) => !t.accusedDeptIds.includes(t.reporterDeptId) || t.isMultiDepartment)
      .length + finalRewards.filter((r) => r.isCrossDepartment).length;
  const totalAll = totalT + totalR;

  const governanceIndicators = {
    totalTickets: totalT,
    totalRewards: totalR,
    netAmountYuan:
      finalTickets.reduce((s, t) => s + (t.execution?.amountYuan || 0), 0) +
      finalRewards.reduce((s, r) => s + r.amountYuan, 0),
    netPerfScore:
      finalTickets.reduce((s, t) => s + (t.execution?.perfScore || 0), 0) +
      finalRewards.reduce((s, r) => s + r.perfScore, 0),
    crossDeptSharePct: totalAll > 0 ? Math.round((crossDeptCount / totalAll) * 100) : 0,
    confidentialSharePct:
      totalT > 0
        ? Math.round((finalTickets.filter((t) => t.isConfidential).length / totalT) * 100)
        : 0,
    erInterventionPct:
      totalT > 0
        ? Math.round(
            (finalTickets.filter(
              (t) =>
                t.hrIntervenedProactively ||
                t.status === 'er_investigation' ||
                Boolean(t.erInvestigationReport)
            ).length /
              totalT) *
              100
          )
        : 0,
    selfSkipCount: finalTickets.filter(
      (t) =>
        t.reporterDeptConfirm.autoSkippedDueToSelfAccused ||
        t.accusedDeptConfirm.autoSkippedDueToSelfAccused
    ).length,
    archivedClosurePct:
      totalT > 0
        ? Math.round(
            (finalTickets.filter(
              (t) => t.status === 'archived' || t.status === 'appeal_resolved'
            ).length /
              totalT) *
              100
          )
        : 0,
    sensitiveAuditCount: auditLogs.filter((l) => l.isSensitiveAudit).length,
  };

  return {
    deptRows,
    statusSegments,
    matrixCells,
    timeSeries,
    gradeSpectrum,
    drilldownRecords,
    governanceIndicators,
  };
}
