import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Globe,
  Link2,
  Megaphone,
  MessageSquareText,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PlatformRole } from '../types/platform';
import { NavSection } from './Sidebar';

interface SharePublishModalProps {
  open: boolean;
  onClose: () => void;
  activeSection: NavSection;
  currentUserRole: PlatformRole;
  monthRewardCount: number;
  monthPunishmentCount: number;
  onCopied?: (message: string) => void;
}

const SHARED_APP_ORIGIN =
  'https://ais-pre-umolcdyzpbv5t4sa6bx4n5-408927388191.asia-northeast1.run.app';

function getPublicShareBaseUrl(): string {
  if (typeof window === 'undefined') return SHARED_APP_ORIGIN;
  const { origin, pathname } = window.location;
  if (origin.includes('ais-dev-')) return SHARED_APP_ORIGIN;
  const cleanPath = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return `${origin}${cleanPath}`;
}

interface SharePreset {
  id: string;
  title: string;
  subtitle: string;
  section: NavSection;
  role: PlatformRole;
  recommended?: boolean;
}

const SHARE_PRESETS: SharePreset[] = [
  {
    id: 'publicity',
    title: '全员当月奖惩公示栏（推荐群发）',
    subtitle: '打开即展示恒翼能当月「光荣榜 vs 警示台」看板（默认员工视角）',
    section: 'publicity',
    role: 'employee',
    recommended: true,
  },
  {
    id: 'employee_workbench',
    title: '一线员工个人工作台',
    subtitle: '员工登录后查看个人净积分、安全水位与发起实名保密反馈',
    section: 'workbench',
    role: 'employee',
  },
  {
    id: 'standards',
    title: '奖惩制度规范与 105 项积分标尺',
    subtitle: '适用于全员制度宣贯、新员工培训及积分标准查阅',
    section: 'standards',
    role: 'employee',
  },
  {
    id: 'hrd_demo',
    title: '管理协同全功能评审版（HRD 视角）',
    subtitle: '展示多维可视化看板、跨部门问责流转、算薪导出与审计日志',
    section: 'workbench',
    role: 'hrd',
  },
];

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const SharePublishModal: React.FC<SharePublishModalProps> = ({
  open,
  onClose,
  activeSection,
  currentUserRole,
  monthRewardCount,
  monthPunishmentCount,
  onCopied,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('publicity');
  const [copiedKey, setCopiedKey] = useState<'url' | 'announcement' | 'current' | null>(null);

  const baseOrigin = useMemo(() => getPublicShareBaseUrl(), []);
  const selectedPreset =
    SHARE_PRESETS.find((p) => p.id === selectedPresetId) || SHARE_PRESETS[0];

  const shareUrl = `${baseOrigin}/?section=${selectedPreset.section}&role=${selectedPreset.role}`;
  const currentViewUrl = `${baseOrigin}/?section=${activeSection}&role=${currentUserRole}`;

  const announcementText = useMemo(
    () =>
      `【广东恒翼能科技股份有限公司 · 奖惩公示与透明治理平台】\n` +
      `各位恒翼能同事好：本月（2026年11月）全员奖惩公示栏已更新发布（正向表彰 ${monthRewardCount} 人次、惩处警示 ${monthPunishmentCount} 人次，1 积分 = ¥100，处罚金 100% 汇入独立员工奖金池）。\n` +
      `点击下方公布链接即可直达看板，为优秀同事点赞致敬、查阅警示复盘及 105 项积分标尺：\n` +
      `${shareUrl}`,
    [monthRewardCount, monthPunishmentCount, shareUrl]
  );

  if (!open) return null;

  const handleCopy = async (
    key: 'url' | 'announcement' | 'current',
    value: string,
    toastText: string
  ) => {
    const ok = await copyTextToClipboard(value);
    if (ok) {
      setCopiedKey(key);
      onCopied?.(toastText);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="share-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                恒翼能奖惩平台 · 分享与公布链接中心
              </h2>
              <p className="text-xs text-slate-500">
                选择受众落地页生成专属公布链接，支持一键复制到钉钉/微信群发布
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭分享弹窗"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Preset Picker */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-blue-900" />
              <span>1. 选择分享落地视角与板块</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SHARE_PRESETS.map((preset) => {
                const active = preset.id === selectedPreset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      active
                        ? 'border-blue-800 bg-blue-50/50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {preset.title}
                      </span>
                      {preset.recommended && (
                        <span className="text-[10px] font-semibold text-emerald-700 shrink-0">
                          推荐
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {preset.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generated Share Link */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-900" />
                <span>2. 对外公布链接（{selectedPreset.title}）</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy('current', currentViewUrl, '已复制当前所在页面链接')
                }
                className="text-blue-800 hover:underline font-medium"
              >
                {copiedKey === 'current' ? '已复制当前页链接' : '改为复制我当前浏览页链接'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono-tabular text-slate-800 truncate select-all">
                {shareUrl}
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy('url', shareUrl, '已复制公开分享链接到剪贴板')
                }
                className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shrink-0"
              >
                {copiedKey === 'url' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>复制链接</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Ready-to-send DingTalk/WeCom Announcement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5 text-emerald-700" />
                <span>3. 钉钉 / 企业微信全员公告模板</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'announcement',
                    announcementText,
                    '已复制钉钉/微信公布文案及链接'
                  )
                }
                className="text-emerald-700 hover:underline font-medium inline-flex items-center gap-1"
              >
                {copiedKey === 'announcement' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>已复制公告文案</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>一键复制完整公告文案</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans select-all">
              {announcementText}
            </pre>
          </div>

          {/* Platform Publish Reminder */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <div className="font-semibold flex items-center gap-1.5">
                <span>对外公布前确认发布状态</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <p className="text-amber-900">
                外部同事访问公布链接（<span className="font-mono-tabular">ais-pre-...</span>
                ）前，请在平台右上角点击 <strong>Share / Publish（分享/发布）</strong> 同步最新构建版本并开启公开访问权限；本地预览地址（
                <span className="font-mono-tabular">ais-dev-...</span>）仅限开发者本人访问。
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg"
          >
            关闭
          </button>
          <button
            type="button"
            onClick={() =>
              handleCopy('url', shareUrl, '已复制公开分享链接到剪贴板')
            }
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>复制选中公布链接</span>
          </button>
        </div>
      </div>
    </div>
  );
};
