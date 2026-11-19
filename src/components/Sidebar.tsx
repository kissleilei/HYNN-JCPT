import React from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  FileCheck2,
  FolderArchive,
  LayoutDashboard,
  Megaphone,
  Scale,
  Settings2,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { ROLE_METAS } from '../data/seedData';
import { Employee, PlatformRole } from '../types/platform';
import { CustomSelect, SelectOption } from './CustomSelect';

export type NavSection =
  | 'workbench'
  | 'publicity'
  | 'analytics'
  | 'accountability'
  | 'rewards'
  | 'appeals'
  | 'archives'
  | 'standards'
  | 'admin';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  currentUser: Employee;
  employees: Employee[];
  onSwitchRole: (role: PlatformRole) => void;
  pendingCount: {
    accountability: number;
    rewards: number;
    appeals: number;
  };
}

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  employeeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: PlatformRole[];
}[] = [
  {
    id: 'workbench',
    label: '工作台与待办',
    employeeLabel: '我的工作台',
    icon: LayoutDashboard,
    allowedRoles: ['employee', 'm8_plus', 'dept_leader', 'hrbp', 'er_lead', 'hrd', 'executive'],
  },
  {
    id: 'publicity',
    label: '全员奖惩公示栏',
    employeeLabel: '当月奖惩公示栏',
    icon: Megaphone,
    allowedRoles: ['employee', 'm8_plus', 'dept_leader', 'hrbp', 'er_lead', 'hrd', 'executive'],
  },
  {
    id: 'analytics',
    label: '多维可视化看板',
    icon: BarChart3,
    allowedRoles: ['m8_plus', 'dept_leader', 'hrbp', 'er_lead', 'hrd', 'executive'],
  },
  {
    id: 'accountability',
    label: '跨部门问责',
    employeeLabel: '反馈与问责',
    icon: ShieldAlert,
    allowedRoles: ['employee', 'm8_plus', 'dept_leader', 'hrbp', 'er_lead', 'hrd', 'executive'],
  },
  {
    id: 'rewards',
    label: 'M8+ 奖励表彰',
    employeeLabel: '奖励表彰申报',
    icon: Award,
    allowedRoles: ['employee', 'm8_plus', 'dept_leader', 'hrbp', 'er_lead', 'hrd', 'executive'],
  },
  {
    id: 'appeals',
    label: '申诉复核中心',
    employeeLabel: '我的申诉',
    icon: Scale,
    allowedRoles: ['employee', 'm8_plus', 'dept_leader', 'hrbp', 'er_lead', 'hrd', 'executive'],
  },
  {
    id: 'archives',
    label: '员工档案与审计',
    employeeLabel: '我的奖惩档案',
    icon: FolderArchive,
    allowedRoles: ['employee', 'm8_plus', 'dept_leader', 'hrbp', 'er_lead', 'hrd', 'executive'],
  },
  {
    id: 'standards',
    label: '制度规范与标尺',
    employeeLabel: '制度与积分标尺',
    icon: BookOpen,
    allowedRoles: ['employee', 'm8_plus', 'dept_leader', 'hrbp', 'er_lead', 'hrd', 'executive'],
  },
  {
    id: 'admin',
    label: '制度配置与算薪',
    icon: Settings2,
    allowedRoles: ['dept_leader', 'hrbp', 'er_lead', 'hrd', 'executive'],
  },
];

export function isSectionAllowedForRole(section: NavSection, role: PlatformRole): boolean {
  const found = NAV_ITEMS.find((i) => i.id === section);
  return found ? found.allowedRoles.includes(role) : true;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  currentUser,
  employees,
  onSwitchRole,
  pendingCount,
}) => {
  const currentRoleMeta = ROLE_METAS.find((r) => r.id === currentUser.role);

  const roleOptions: SelectOption[] = ROLE_METAS.map((r) => {
    const rep = employees.find((e) => e.role === r.id);
    return {
      value: r.id,
      label: r.label,
      badgeText: rep ? `${rep.name} · ${rep.rank}` : undefined,
      description: rep ? `${rep.departmentName} · ${rep.title}` : r.permissionsSummary,
    };
  });

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between min-h-screen">
      <div>
        {/* Brand lockup */}
        <div className="px-5 h-16 flex items-center border-b border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-semibold text-sm shrink-0">
              恒
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate whitespace-nowrap">
                恒翼能奖惩治理平台
              </div>
              <div className="text-xs text-slate-500 truncate whitespace-nowrap">
                全员透明协同治理与激励端
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1" aria-label="主导航">
          {NAV_ITEMS.filter((item) => item.allowedRoles.includes(currentUser.role)).map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const displayLabel =
              currentUser.role === 'employee' && item.employeeLabel
                ? item.employeeLabel
                : item.label;
            const badgeCount =
              item.id === 'accountability'
                ? pendingCount.accountability
                : item.id === 'rewards'
                ? pendingCount.rewards
                : item.id === 'appeals'
                ? pendingCount.appeals
                : 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{displayLabel}</span>
                </span>
                {badgeCount > 0 && (
                  <span
                    className={`text-xs font-mono-tabular ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* DingTalk SSO & 7-Role Custom Switcher */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {currentUser.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {currentUser.name}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {currentUser.departmentName} · {currentUser.rank}
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="role-switcher"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5"
          >
            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>钉钉免登身份视角切换</span>
          </label>
          <CustomSelect
            id="role-switcher"
            value={currentUser.role}
            onChange={(val) => onSwitchRole(val as PlatformRole)}
            options={roleOptions}
            placement="top"
            size="sm"
          />
        </div>

        {currentRoleMeta && (
          <div className="text-[11px] leading-relaxed text-slate-600 bg-white border border-slate-200 rounded-md p-2.5">
            <div className="font-medium text-slate-800 mb-0.5 flex items-center gap-1">
              <FileCheck2 className="w-3 h-3 text-blue-700 shrink-0" />
              <span>当前角色权限边界</span>
            </div>
            <p>{currentRoleMeta.permissionsSummary}</p>
          </div>
        )}
      </div>
    </aside>
  );
};
