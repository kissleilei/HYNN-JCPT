import React from 'react';
import { Bell, Plus, RotateCcw, Share2 } from 'lucide-react';
import { PlatformRole } from '../types/platform';
import { NavSection } from './Sidebar';

interface TopBarProps {
  activeSection: NavSection;
  currentUserRole: PlatformRole;
  unreadDingTalkCount: number;
  isResetting?: boolean;
  onOpenDingTalk: () => void;
  onOpenShare: () => void;
  onOpenNewAccountability: () => void;
  onResetDemo: () => void | Promise<void>;
}

const SECTION_BREADCRUMBS: Record<NavSection, { parent: string; current: string }> = {
  workbench: { parent: '钉钉工作台入口', current: '工作台与待办中心' },
  publicity: { parent: '当月公开透明机制', current: '恒翼能全员奖惩公示栏（当月看板）' },
  analytics: { parent: '跨部门治理数据洞察', current: '多维动态可视化分析看板' },
  accountability: { parent: 'Mode A 闭环流程', current: '跨部门问责管理' },
  rewards: { parent: '正向激励体系', current: 'M8+ 奖励表彰管理' },
  appeals: { parent: '复核与裁决机制', current: '申诉复核与回避裁决中心' },
  archives: { parent: '全生命周期留痕', current: '员工长期奖惩档案与合规审计' },
  standards: { parent: '恒翼能奖惩管理制度', current: '制度规范、标尺库与奖金池公示' },
  admin: { parent: '制度参数与算薪', current: '制度配置、组织导入与算薪导出' },
};

const EMPLOYEE_BREADCRUMBS: Partial<Record<NavSection, { parent: string; current: string }>> = {
  workbench: { parent: '钉钉工作台入口', current: '一线员工个人工作台' },
  publicity: { parent: '全员荣誉与警示', current: '恒翼能全员奖惩公示栏（当月看板）' },
  accountability: { parent: '跨部门协作反馈', current: '我的反馈与问责单据' },
  rewards: { parent: '正向激励体系', current: '全员奖励表彰与喜报中心' },
  appeals: { parent: '权益与复核保障', current: '我的申诉记录' },
  archives: { parent: '个人成长台账', current: '我的长期奖惩档案' },
  standards: { parent: '恒翼能奖惩管理制度', current: '制度规范、积分标尺与奖金池公示' },
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  currentUserRole,
  unreadDingTalkCount,
  isResetting = false,
  onOpenDingTalk,
  onOpenShare,
  onOpenNewAccountability,
  onResetDemo,
}) => {
  const isEmployee = currentUserRole === 'employee';
  const crumb =
    (isEmployee && EMPLOYEE_BREADCRUMBS[activeSection]) ||
    SECTION_BREADCRUMBS[activeSection];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 sticky top-0 z-20">
      {/* Zone 1: Contextual breadcrumb */}
      <div className="flex items-center gap-2 text-sm min-w-0">
        <span className="text-slate-400 whitespace-nowrap shrink-0">{crumb.parent}</span>
        <span className="text-slate-300" aria-hidden="true">
          /
        </span>
        <h1 className="font-semibold text-slate-900 truncate whitespace-nowrap">
          {crumb.current}
        </h1>
      </div>

      {/* Zone 2 & 3: Action controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenShare}
          className="px-3 py-2 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>分享公布链接</span>
        </button>

        <button
          type="button"
          disabled={isResetting}
          onClick={onResetDemo}
          title="恢复初始演示数据"
          className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? '重置中...' : '重置数据'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenDingTalk}
          className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Bell className="w-3.5 h-3.5 text-blue-700" />
          <span>钉钉待办消息</span>
          {unreadDingTalkCount > 0 && (
            <span className="font-mono-tabular text-blue-700 font-semibold">
              ({unreadDingTalkCount})
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenNewAccountability}
          className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isEmployee ? '发起反馈 / 问责' : '发起问责提报'}</span>
        </button>
      </div>
    </header>
  );
};
