import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AccountabilityStatus,
  Department,
} from '../types/platform';
import {
  AnalyticsMetric,
  DeptDimensionRow,
  GradeSpectrumItem,
  MatrixCell,
  StatusSegment,
  TimeBucketPoint,
} from '../utils/analytics';

const METRIC_UNIT_LABELS: Record<AnalyticsMetric, string> = {
  count: '件',
  amount: '元',
  perf_score: '分',
  per_100_headcount: '件/百人',
};

function shortDeptName(name: string): string {
  return name
    .replace('产品解决方案部', '产品方案')
    .replace('供应链与交付部', '供应链交付')
    .replace('企业客户销售部', '企业销售')
    .replace('质量与合规中心', '质量合规')
    .replace('人力资源部', '人力HR')
    .replace('研发中心', '研发中心');
}

/* ============================================================================
 * 1. Department Comparison Bar Chart (Grouped / Stacked + Dynamic Metrics)
 * ========================================================================== */
interface DeptComparisonBarChartProps {
  rows: DeptDimensionRow[];
  metric: AnalyticsMetric;
  selectedDeptId: string;
  onSelectDept: (deptId: string) => void;
  layoutMode?: 'grouped' | 'stacked';
  height?: number;
}

export const DeptComparisonBarChart: React.FC<DeptComparisonBarChartProps> = ({
  rows,
  metric,
  selectedDeptId,
  onSelectDept,
  layoutMode = 'grouped',
  height = 250,
}) => {
  const prefersReduced = useReducedMotion();
  const [hoveredDeptId, setHoveredDeptId] = useState<string | null>(null);

  const getPairValues = (row: DeptDimensionRow): { neg: number; pos: number; net: number } => {
    if (metric === 'count') {
      return {
        neg: row.accountabilityCount,
        pos: row.rewardCount,
        net: row.totalEvents,
      };
    }
    if (metric === 'amount') {
      return {
        neg: Math.abs(row.punishmentAmountYuan),
        pos: row.rewardAmountYuan,
        net: row.netAmountYuan,
      };
    }
    if (metric === 'perf_score') {
      return {
        neg: Math.abs(row.punishmentPerfScore),
        pos: row.rewardPerfScore,
        net: row.netPerfScore,
      };
    }
    return {
      neg: row.per100AccRate,
      pos: row.per100RewRate,
      net: Number((row.per100RewRate - row.per100AccRate).toFixed(2)),
    };
  };

  const maxVal = Math.max(
    1,
    ...rows.map((r) => {
      const { neg, pos } = getPairValues(r);
      return layoutMode === 'stacked' ? neg + pos : Math.max(neg, pos);
    })
  );

  // Nice ceiling for y-axis
  const niceMax =
    maxVal <= 5
      ? Math.max(4, Math.ceil(maxVal))
      : maxVal <= 20
      ? Math.ceil(maxVal / 5) * 5
      : maxVal <= 100
      ? Math.ceil(maxVal / 20) * 20
      : Math.ceil(maxVal / 1000) * 1000;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Number((niceMax * t).toFixed(metric === 'per_100_headcount' ? 1 : 0))
  );

  const svgWidth = 680;
  const svgHeight = height;
  const padLeft = metric === 'amount' ? 56 : 40;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 42;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;
  const groupW = plotW / Math.max(1, rows.length);

  const hoveredRow = rows.find((r) => r.deptId === hoveredDeptId) || null;
  const transition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto select-none overflow-visible"
        role="img"
        aria-label="各部门问责与正向奖励对比柱状图"
      >
        {/* Horizontal Gridlines & Y Ticks */}
        {yTicks.map((val, idx) => {
          const y = padTop + plotH - (val / niceMax) * plotH;
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                x2={svgWidth - padRight}
                y1={y}
                y2={y}
                stroke={idx === 0 ? '#CBD5E1' : '#F1F5F9'}
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono-tabular"
              >
                {metric === 'amount' && val >= 1000 ? `${val / 1000}k` : val}
              </text>
            </g>
          );
        })}

        {/* Bars per department */}
        {rows.map((row, idx) => {
          const { neg, pos } = getPairValues(row);
          const centerX = padLeft + groupW * idx + groupW / 2;
          const isSelected = selectedDeptId === row.deptId;
          const isDimmed = selectedDeptId !== 'all' && !isSelected;
          const isHovered = hoveredDeptId === row.deptId;

          const negH = (neg / niceMax) * plotH;
          const posH = (pos / niceMax) * plotH;

          const barW = layoutMode === 'stacked' ? Math.min(34, groupW * 0.48) : Math.min(20, groupW * 0.28);
          const gap = layoutMode === 'grouped' ? 5 : 0;

          return (
            <g
              key={row.deptId}
              className="cursor-pointer"
              style={{ opacity: isDimmed ? 0.38 : 1, transition: 'opacity 180ms ease' }}
              onMouseEnter={() => setHoveredDeptId(row.deptId)}
              onMouseLeave={() => setHoveredDeptId(null)}
              onClick={() =>
                onSelectDept(isSelected ? 'all' : row.deptId)
              }
            >
              {/* Subtle column hover backdrop */}
              <rect
                x={padLeft + groupW * idx + 4}
                y={padTop}
                width={Math.max(10, groupW - 8)}
                height={plotH}
                rx={4}
                fill={isSelected ? '#EFF6FF' : isHovered ? '#F8FAFC' : 'transparent'}
                stroke={isSelected ? '#BFDBFE' : 'none'}
                strokeWidth={1}
              />

              {layoutMode === 'grouped' ? (
                <>
                  {/* Accountability bar (Amber/Crimson slate-warm) */}
                  <motion.rect
                    x={centerX - barW - gap / 2}
                    initial={false}
                    animate={{
                      y: padTop + plotH - negH,
                      height: Math.max(neg > 0 ? 3 : 0, negH),
                    }}
                    transition={transition}
                    width={barW}
                    rx={3}
                    fill="#D97706"
                  />
                  {/* Reward bar (Emerald) */}
                  <motion.rect
                    x={centerX + gap / 2}
                    initial={false}
                    animate={{
                      y: padTop + plotH - posH,
                      height: Math.max(pos > 0 ? 3 : 0, posH),
                    }}
                    transition={transition}
                    width={barW}
                    rx={3}
                    fill="#059669"
                  />
                  {/* Value labels on top when nonzero */}
                  {neg > 0 && (
                    <text
                      x={centerX - barW / 2 - gap / 2}
                      y={Math.max(padTop + 10, padTop + plotH - negH - 4)}
                      textAnchor="middle"
                      className="fill-amber-800 text-[10px] font-mono-tabular font-semibold"
                    >
                      {metric === 'amount' && neg >= 1000 ? `${(neg / 1000).toFixed(1)}k` : neg}
                    </text>
                  )}
                  {pos > 0 && (
                    <text
                      x={centerX + barW / 2 + gap / 2}
                      y={Math.max(padTop + 10, padTop + plotH - posH - 4)}
                      textAnchor="middle"
                      className="fill-emerald-800 text-[10px] font-mono-tabular font-semibold"
                    >
                      {metric === 'amount' && pos >= 1000 ? `${(pos / 1000).toFixed(1)}k` : pos}
                    </text>
                  )}
                </>
              ) : (
                <>
                  {/* Stacked bottom: Accountability */}
                  <motion.rect
                    x={centerX - barW / 2}
                    initial={false}
                    animate={{
                      y: padTop + plotH - negH,
                      height: Math.max(neg > 0 ? 3 : 0, negH),
                    }}
                    transition={transition}
                    width={barW}
                    rx={pos > 0 ? 0 : 3}
                    fill="#D97706"
                  />
                  {/* Stacked top: Reward */}
                  <motion.rect
                    x={centerX - barW / 2}
                    initial={false}
                    animate={{
                      y: padTop + plotH - negH - posH,
                      height: Math.max(pos > 0 ? 3 : 0, posH),
                    }}
                    transition={transition}
                    width={barW}
                    rx={3}
                    fill="#059669"
                  />
                  {neg + pos > 0 && (
                    <text
                      x={centerX}
                      y={Math.max(padTop + 10, padTop + plotH - negH - posH - 4)}
                      textAnchor="middle"
                      className="fill-slate-700 text-[10px] font-mono-tabular font-semibold"
                    >
                      {metric === 'amount' && neg + pos >= 1000
                        ? `${((neg + pos) / 1000).toFixed(1)}k`
                        : Number((neg + pos).toFixed(1))}
                    </text>
                  )}
                </>
              )}

              {/* X Axis Department Label */}
              <text
                x={centerX}
                y={svgHeight - 18}
                textAnchor="middle"
                className={`text-[11px] font-medium ${
                  isSelected ? 'fill-blue-900 font-semibold' : 'fill-slate-600'
                }`}
              >
                {shortDeptName(row.deptName)}
              </text>
              <text
                x={centerX}
                y={svgHeight - 5}
                textAnchor="middle"
                className="fill-slate-400 text-[9px] font-mono-tabular"
              >
                {row.headcount}人
              </text>
            </g>
          );
        })}
      </svg>

      {/* Interactive Tooltip */}
      {hoveredRow && (
        <div className="mt-2 px-3.5 py-2.5 bg-slate-900 text-white rounded-lg text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="font-medium">
            {hoveredRow.deptName}
            <span className="text-slate-400 ml-2 font-normal">
              负责人 {hoveredRow.headName} · 编制 {hoveredRow.headcount} 人
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-mono-tabular text-[11px]">
            <span className="text-amber-300">
              涉事问责 {hoveredRow.accountabilityCount} 单 ({hoveredRow.per100AccRate}/百人)
            </span>
            <span className="text-emerald-300">
              正向奖励 {hoveredRow.rewardCount} 项 ({hoveredRow.per100RewRate}/百人)
            </span>
            <span className="text-slate-200">
              净金额 {hoveredRow.netAmountYuan >= 0 ? `+¥${hoveredRow.netAmountYuan}` : `-¥${Math.abs(hoveredRow.netAmountYuan)}`}
            </span>
            <span className="text-slate-200">
              净绩效 {hoveredRow.netPerfScore >= 0 ? `+${hoveredRow.netPerfScore}` : hoveredRow.netPerfScore} 分
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-600 inline-block" />
            <span>问责涉事（{METRIC_UNIT_LABELS[metric]}）</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 inline-block" />
            <span>正向奖励（{METRIC_UNIT_LABELS[metric]}）</span>
          </span>
        </div>
        <span>点击柱条可下钻筛选对应部门数据</span>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. Mode A Workflow Status Donut & Funnel Chart
 * ========================================================================== */
interface WorkflowStatusChartProps {
  segments: StatusSegment[];
  selectedStatus: AccountabilityStatus | 'all';
  onSelectStatus: (status: AccountabilityStatus | 'all') => void;
  mode?: 'donut' | 'funnel';
}

export const WorkflowStatusChart: React.FC<WorkflowStatusChartProps> = ({
  segments,
  selectedStatus,
  onSelectStatus,
  mode = 'donut',
}) => {
  const prefersReduced = useReducedMotion();
  const [hoveredStatus, setHoveredStatus] = useState<AccountabilityStatus | null>(null);

  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const activeSeg =
    segments.find((s) => s.status === hoveredStatus) ||
    segments.find((s) => s.status === selectedStatus) ||
    null;

  if (total === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
        当前筛选维度下暂无问责工单流程数据
      </div>
    );
  }

  if (mode === 'funnel') {
    const maxCount = Math.max(1, ...segments.map((s) => s.count));
    return (
      <div className="space-y-2.5">
        {segments.map((seg) => {
          const widthPct = Math.max(18, Math.round((seg.count / maxCount) * 100));
          const isSelected = selectedStatus === seg.status;
          const isDimmed = selectedStatus !== 'all' && !isSelected;
          return (
            <button
              key={seg.status}
              type="button"
              onClick={() => onSelectStatus(isSelected ? 'all' : seg.status)}
              onMouseEnter={() => setHoveredStatus(seg.status)}
              onMouseLeave={() => setHoveredStatus(null)}
              style={{ opacity: isDimmed ? 0.45 : 1 }}
              className={`w-full text-left p-2 rounded-md border transition-colors ${
                isSelected
                  ? 'border-blue-400 bg-blue-50/50'
                  : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-800 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span>{seg.label}</span>
                </span>
                <span className="font-mono-tabular text-slate-700 font-semibold">
                  {seg.count} 单 · {seg.pct}%
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${widthPct}%` }}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
                  }
                  className="h-full rounded"
                  style={{ backgroundColor: seg.color }}
                />
              </div>
            </button>
          );
        })}
        <div className="text-[11px] text-slate-400 pt-1">
          点击任意流程节点可按状态筛选下方清单
        </div>
      </div>
    );
  }

  // Donut mode
  const size = 190;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg) => {
            const frac = seg.count / total;
            const dashLen = Math.max(2, frac * circumference - (segments.length > 1 ? 2 : 0));
            const dashOffset = -cumulativeOffset;
            cumulativeOffset += frac * circumference;

            const isSelected = selectedStatus === seg.status;
            const isDimmed =
              (selectedStatus !== 'all' && !isSelected) ||
              (hoveredStatus !== null && hoveredStatus !== seg.status);

            return (
              <motion.circle
                key={seg.status}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isSelected || hoveredStatus === seg.status ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${dashLen} ${circumference}`}
                strokeDashoffset={dashOffset}
                className="cursor-pointer"
                style={{
                  opacity: isDimmed ? 0.35 : 1,
                  transition: 'opacity 160ms ease, stroke-width 160ms ease',
                }}
                onMouseEnter={() => setHoveredStatus(seg.status)}
                onMouseLeave={() => setHoveredStatus(null)}
                onClick={() => onSelectStatus(isSelected ? 'all' : seg.status)}
              />
            );
          })}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <div className="text-[11px] text-slate-500 truncate max-w-[110px]">
            {activeSeg ? activeSeg.label : '问责工单总计'}
          </div>
          <div className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-0.5">
            {activeSeg ? activeSeg.count : total}
          </div>
          <div className="text-[11px] text-slate-400 font-mono-tabular">
            {activeSeg ? `占比 ${activeSeg.pct}%` : '点击扇区下钻'}
          </div>
        </div>
      </div>

      {/* Interactive Legend List */}
      <div className="flex-1 w-full divide-y divide-slate-100 text-xs">
        {segments.map((seg) => {
          const isSelected = selectedStatus === seg.status;
          return (
            <button
              key={seg.status}
              type="button"
              onMouseEnter={() => setHoveredStatus(seg.status)}
              onMouseLeave={() => setHoveredStatus(null)}
              onClick={() => onSelectStatus(isSelected ? 'all' : seg.status)}
              className={`w-full py-2 px-2.5 flex items-center justify-between gap-2 transition-colors rounded ${
                isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate">{seg.label}</span>
              </span>
              <span className="font-mono-tabular shrink-0 text-slate-900">
                {seg.count} 单{' '}
                <span className="text-slate-400 font-normal">({seg.pct}%)</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. Cross-Department Collaboration & Accountability Heatmap Matrix
 * ========================================================================== */
interface CrossDeptMatrixChartProps {
  departments: Department[];
  cells: MatrixCell[];
  selectedDeptId: string;
  onSelectDept: (deptId: string) => void;
  matrixMode?: 'all' | 'tickets' | 'rewards';
}

export const CrossDeptMatrixChart: React.FC<CrossDeptMatrixChartProps> = ({
  departments,
  cells,
  selectedDeptId,
  onSelectDept,
  matrixMode = 'all',
}) => {
  const [hoveredCell, setHoveredCell] = useState<MatrixCell | null>(null);

  const getCellStyle = (cell: MatrixCell) => {
    const tCount = cell.ticketCount;
    const rCount = cell.rewardCount;

    if (matrixMode === 'tickets') {
      if (tCount === 0) return { bg: 'bg-slate-50 text-slate-300', label: '0' };
      if (tCount >= 2) return { bg: 'bg-amber-600 text-white font-semibold', label: `${tCount}责` };
      return { bg: 'bg-amber-100 text-amber-900 font-semibold', label: `${tCount}责` };
    }

    if (matrixMode === 'rewards') {
      if (rCount === 0) return { bg: 'bg-slate-50 text-slate-300', label: '0' };
      if (rCount >= 2) return { bg: 'bg-emerald-600 text-white font-semibold', label: `${rCount}奖` };
      return { bg: 'bg-emerald-100 text-emerald-900 font-semibold', label: `${rCount}奖` };
    }

    // Combined mode
    if (tCount === 0 && rCount === 0) {
      return {
        bg: cell.isInternal ? 'bg-slate-100/70 text-slate-300' : 'bg-slate-50 text-slate-300',
        label: cell.isInternal ? '内部' : '·',
      };
    }
    if (tCount > 0 && rCount > 0) {
      return {
        bg: 'bg-blue-100 text-blue-900 font-semibold',
        label: `+${rCount} / -${tCount}`,
      };
    }
    if (rCount > 0) {
      return {
        bg: rCount >= 2 ? 'bg-emerald-600 text-white font-semibold' : 'bg-emerald-100 text-emerald-900 font-semibold',
        label: `+${rCount}奖`,
      };
    }
    return {
      bg: tCount >= 2 ? 'bg-amber-600 text-white font-semibold' : 'bg-amber-100 text-amber-900 font-semibold',
      label: `-${tCount}责`,
    };
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="p-2 text-left text-slate-400 font-normal border-b border-slate-200 whitespace-nowrap">
                发起方 ╲ 责任/获奖方
              </th>
              {departments.map((toDept) => (
                <th
                  key={toDept.id}
                  className={`p-2 text-center font-medium border-b border-slate-200 whitespace-nowrap ${
                    selectedDeptId === toDept.id ? 'text-blue-900 bg-blue-50/70' : 'text-slate-600'
                  }`}
                >
                  {shortDeptName(toDept.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map((fromDept) => (
              <tr key={fromDept.id} className="border-b border-slate-100 last:border-b-0">
                <td
                  className={`p-2 font-medium whitespace-nowrap ${
                    selectedDeptId === fromDept.id ? 'text-blue-900 bg-blue-50/70' : 'text-slate-700'
                  }`}
                >
                  {shortDeptName(fromDept.name)}
                </td>
                {departments.map((toDept) => {
                  const cell = cells.find(
                    (c) => c.fromDeptId === fromDept.id && c.toDeptId === toDept.id
                  )!;
                  const style = getCellStyle(cell);
                  const isActiveTarget =
                    selectedDeptId === cell.toDeptId || selectedDeptId === cell.fromDeptId;
                  return (
                    <td key={toDept.id} className="p-1">
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() =>
                          onSelectDept(selectedDeptId === cell.toDeptId ? 'all' : cell.toDeptId)
                        }
                        className={`w-full py-2 px-1 rounded text-center font-mono-tabular transition-transform hover:scale-[1.03] ${
                          style.bg
                        } ${
                          cell.isInternal ? 'ring-1 ring-inset ring-slate-200' : ''
                        } ${isActiveTarget && selectedDeptId !== 'all' ? 'ring-1 ring-blue-500' : ''}`}
                      >
                        {style.label}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cell Inspection Strip */}
      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 min-h-[36px]">
        {hoveredCell ? (
          <>
            <span className="font-medium text-slate-900">
              {hoveredCell.fromDeptName} → {hoveredCell.toDeptName}
              {hoveredCell.isInternal ? '（部门内部）' : '（跨部门流向）'}
            </span>
            <span className="font-mono-tabular text-[11px]">
              {hoveredCell.ticketCount > 0 && `问责: ${hoveredCell.ticketNos.join('、')} `}
              {hoveredCell.rewardCount > 0 && `奖励: ${hoveredCell.rewardNos.join('、')}`}
              {hoveredCell.ticketCount === 0 && hoveredCell.rewardCount === 0 && '当前维度无流转记录'}
            </span>
          </>
        ) : (
          <>
            <span>矩阵说明：行表示发起/提报部门，列表示涉事/获奖部门；对角线为部门内部记录</span>
            <span className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-100 border border-amber-300 inline-block" />
                <span>问责流向</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-100 border border-emerald-300 inline-block" />
                <span>奖励流向</span>
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. Time-Series Dynamic Trend Chart (Weekly / Monthly)
 * ========================================================================== */
interface TrendAreaChartProps {
  series: TimeBucketPoint[];
  selectedTimeBucket: string;
  onSelectTimeBucket: (key: string) => void;
  height?: number;
}

export const TrendAreaChart: React.FC<TrendAreaChartProps> = ({
  series,
  selectedTimeBucket,
  onSelectTimeBucket,
  height = 220,
}) => {
  const prefersReduced = useReducedMotion();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (series.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
        当前筛选条件下暂无时间序列趋势数据
      </div>
    );
  }

  const svgWidth = 680;
  const svgHeight = height;
  const padLeft = 36;
  const padRight = 24;
  const padTop = 18;
  const padBottom = 34;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const maxY = Math.max(
    3,
    ...series.map((p) => Math.max(p.ticketCount, p.rewardCount, p.appealCount + p.sensitiveAuditCount))
  );

  const getX = (idx: number) =>
    series.length === 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (series.length - 1)) * plotW;

  const getY = (val: number) => padTop + plotH - (val / maxY) * plotH;

  const buildPolyline = (vals: number[]) =>
    vals.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');

  const buildAreaPath = (vals: number[]) => {
    if (vals.length === 0) return '';
    const coords = vals.map((v, i) => `${getX(i)},${getY(v)}`);
    const lastX = getX(vals.length - 1);
    const firstX = getX(0);
    const baseY = padTop + plotH;
    return `M ${firstX},${baseY} L ${coords.join(' L ')} L ${lastX},${baseY} Z`;
  };

  const ticketVals = series.map((s) => s.ticketCount);
  const rewardVals = series.map((s) => s.rewardCount);
  const auditVals = series.map((s) => s.appealCount + s.sensitiveAuditCount);

  const yGridTicks = Array.from({ length: maxY + 1 }, (_, i) => i).filter(
    (v) => maxY <= 5 || v % Math.ceil(maxY / 4) === 0 || v === maxY
  );

  const hoveredPoint = hoveredIdx !== null ? series[hoveredIdx] : null;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto select-none overflow-visible"
        role="img"
        aria-label="问责、奖励与强审计时间趋势折线图"
      >
        {/* Y Grid */}
        {yGridTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={svgWidth - padRight}
                y1={y}
                y2={y}
                stroke={tick === 0 ? '#CBD5E1' : '#F1F5F9'}
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono-tabular"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Area fills */}
        {series.length > 1 && (
          <>
            <path d={buildAreaPath(ticketVals)} fill="#D97706" fillOpacity={0.08} />
            <path d={buildAreaPath(rewardVals)} fill="#059669" fillOpacity={0.08} />
          </>
        )}

        {/* Lines */}
        {series.length > 1 && (
          <>
            <motion.polyline
              fill="none"
              stroke="#D97706"
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={buildPolyline(ticketVals)}
              initial={prefersReduced ? false : { pathLength: 0.2, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.45 }}
            />
            <motion.polyline
              fill="none"
              stroke="#059669"
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={buildPolyline(rewardVals)}
              initial={prefersReduced ? false : { pathLength: 0.2, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.45 }}
            />
            <motion.polyline
              fill="none"
              stroke="#1E3A8A"
              strokeWidth={1.8}
              strokeDasharray="4 3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={buildPolyline(auditVals)}
              initial={prefersReduced ? false : { pathLength: 0.2, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.45 }}
            />
          </>
        )}

        {/* Interactive vertical hover zones & points */}
        {series.map((pt, idx) => {
          const x = getX(idx);
          const isSelected = selectedTimeBucket === pt.key;
          const isHovered = hoveredIdx === idx;
          const hitW = series.length > 1 ? plotW / series.length : 80;

          return (
            <g
              key={pt.key}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelectTimeBucket(isSelected ? 'all' : pt.key)}
            >
              {(isHovered || isSelected) && (
                <line
                  x1={x}
                  x2={x}
                  y1={padTop}
                  y2={padTop + plotH}
                  stroke={isSelected ? '#1E3A8A' : '#CBD5E1'}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}

              {/* Data dots */}
              <circle
                cx={x}
                cy={getY(pt.ticketCount)}
                r={isHovered || isSelected ? 5 : 3.5}
                fill="#FFFFFF"
                stroke="#D97706"
                strokeWidth={2}
              />
              <circle
                cx={x}
                cy={getY(pt.rewardCount)}
                r={isHovered || isSelected ? 5 : 3.5}
                fill="#FFFFFF"
                stroke="#059669"
                strokeWidth={2}
              />
              <circle
                cx={x}
                cy={getY(pt.appealCount + pt.sensitiveAuditCount)}
                r={isHovered || isSelected ? 4.5 : 3}
                fill="#FFFFFF"
                stroke="#1E3A8A"
                strokeWidth={2}
              />

              {/* X label */}
              <text
                x={x}
                y={svgHeight - 10}
                textAnchor="middle"
                className={`text-[10px] font-mono-tabular ${
                  isSelected ? 'fill-blue-900 font-semibold' : 'fill-slate-500'
                }`}
              >
                {pt.label}
              </text>

              {/* Transparent hit target */}
              <rect
                x={x - hitW / 2}
                y={padTop}
                width={hitW}
                height={plotH + 24}
                fill="transparent"
              />
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip & Legend */}
      {hoveredPoint ? (
        <div className="mt-2 px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono-tabular font-semibold">周期：{hoveredPoint.label}</span>
          <div className="flex flex-wrap items-center gap-4 font-mono-tabular text-[11px]">
            <span className="text-amber-300">问责发起 {hoveredPoint.ticketCount} 单</span>
            <span className="text-emerald-300">奖励提报 {hoveredPoint.rewardCount} 项</span>
            <span className="text-blue-300">
              申诉/强审计 {hoveredPoint.appealCount + hoveredPoint.sensitiveAuditCount} 次
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-600 inline-block" />
              <span>问责发起</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
              <span>M8+ 奖励</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-900 inline-block" />
              <span>申诉与强审计</span>
            </span>
          </div>
          <span>点击时间节点可按周期过滤</span>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 5. Policy Grade Spectrum Chart (Punishment vs Reward Severity)
 * ========================================================================== */
interface GradeSpectrumChartProps {
  items: GradeSpectrumItem[];
  metric: AnalyticsMetric;
}

export const GradeSpectrumChart: React.FC<GradeSpectrumChartProps> = ({
  items,
  metric,
}) => {
  const prefersReduced = useReducedMotion();

  const getValue = (item: GradeSpectrumItem) => {
    if (metric === 'amount') return Math.abs(item.totalAmountYuan);
    if (metric === 'perf_score') return Math.abs(item.totalPerfScore);
    return item.count;
  };

  const maxVal = Math.max(1, ...items.map(getValue));

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const val = getValue(item);
        const pct = Math.round((val / maxVal) * 100);
        const isReward = item.category === 'reward';

        return (
          <div key={item.gradeId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-800">
                {item.gradeName}{' '}
                <span className="text-slate-400 font-normal">
                  · {isReward ? '正向激励' : '问责处分'}
                </span>
              </span>
              <span className="font-mono-tabular text-slate-700 font-medium">
                {item.count} 单 ·{' '}
                {item.totalAmountYuan >= 0
                  ? `+¥${item.totalAmountYuan}`
                  : `-¥${Math.abs(item.totalAmountYuan)}`}{' '}
                ·{' '}
                {item.totalPerfScore >= 0
                  ? `+${item.totalPerfScore}`
                  : item.totalPerfScore}
                分
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: `${val > 0 ? Math.max(8, pct) : 0}%` }}
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
                }
                className={`h-full rounded ${
                  isReward ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
