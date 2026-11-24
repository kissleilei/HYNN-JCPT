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
import { Phase2Section } from '../types/phase2';

interface SharePublishModalProps {
  open: boolean;
  onClose: () => void;
  activeSection: Phase2Section;
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
  tab: Phase2Section;
  recommended?: boolean;
}

const SHARE_PRESETS: SharePreset[] = [
  {
    id: 'publicity',
    title: '当月奖惩公示栏（全员推荐）',
    subtitle: '全体员工打开即浏览当月正向表彰光荣榜与惩处警示复盘',
    tab: 'publicity',
    recommended: true,
  },
  {
    id: 'policy',
    title: '制度宣导与全新积分规则',
    subtitle: '用于新员工培训、积分分级学习、105 项细则速查与随堂测验',
    tab: 'policy',
  },
  {
    id: 'oa',
    title: '员工奖惩提报与 OA 审批入口',
    subtitle: '直达奖惩提报单与钉钉审核/执行/抄送流程协同入口',
    tab: 'oa',
  },
  {
    id: 'admin',
    title: '管理后台与钉钉通讯录控制台',
    subtitle: '仅限综合管理部与奖惩委员会管理员登录审批与同步人员',
    tab: 'admin',
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
  monthRewardCount,
  monthPunishmentCount,
  onCopied,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('publicity');
  const [copiedKey, setCopiedKey] = useState<'url' | 'announcement' | 'current' | null>(null);

  const baseOrigin = useMemo(() => getPublicShareBaseUrl(), []);
  const selectedPreset =
    SHARE_PRESETS.find((p) => p.id === selectedPresetId) || SHARE_PRESETS[0];

  const shareUrl = `${baseOrigin}/?tab=${selectedPreset.tab}`;
  const currentViewUrl = `${baseOrigin}/?tab=${activeSection}`;

  const announcementText = useMemo(
    () =>
      `【广东恒翼能科技股份有限公司 · 奖惩公示与 OA 协同平台（二期）】\n` +
      `各位恒翼能同事好：当月（2026年11月）全员奖惩公示栏已更新发布（正向表彰 ${monthRewardCount} 项、警示复盘 ${monthPunishmentCount} 项）。\n` +
      `点击下方链接即可预览当月奖惩公示、学习二期全新积分规则并参与制度测验，或通过 OA 入口发起奖惩提报直连钉钉审批：\n` +
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2F6FE4] to-[#1E62D0] text-white flex items-center justify-center shadow-sm shadow-[#1E62D0]/20 shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="share-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                恒翼能二期平台 · 全员分享与公布中心
              </h2>
              <p className="text-xs text-slate-500">
                选择受众入口生成直达链接，一键发送至钉钉全员群
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭分享弹窗"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-[#1E62D0]" />
              <span>1. 选择落地模块</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SHARE_PRESETS.map((preset) => {
                const active = preset.id === selectedPreset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      active
                        ? 'border-[#1E62D0] bg-[#EEF5FF]/70'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {preset.title}
                      </span>
                      {preset.recommended && (
                        <span className="text-[11px] font-semibold text-emerald-700 shrink-0">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#1E62D0]" />
                <span>2. 公开分享链接（{selectedPreset.title}）</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy('current', currentViewUrl, '已复制当前所在页面链接')
                }
                className="text-[#1E62D0] hover:underline font-medium"
              >
                {copiedKey === 'current' ? '已复制当前页链接' : '复制当前浏览页链接'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono-tabular text-slate-800 truncate select-all">
                {shareUrl}
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy('url', shareUrl, '已复制公开分享链接到剪贴板')
                }
                className="btn-brand px-4 py-2 text-xs font-medium rounded-xl flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                {copiedKey === 'url' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
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

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5 text-emerald-700" />
                <span>3. 钉钉全员群公告模板</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'announcement',
                    announcementText,
                    '已复制钉钉公布文案及链接'
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

            <pre className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans select-all">
              {announcementText}
            </pre>
          </div>

          <div className="p-3.5 bg-amber-50/75 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <div className="font-semibold flex items-center gap-1.5">
                <span>对外公布提醒</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <p className="text-amber-900">
                向全员发送前，请先通过右上角 <strong>Share / Publish（分享/发布）</strong> 同步最新版本；全员访问链接时无需复杂权限即可直接预览当月奖惩公示栏与制度规则。
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl"
          >
            关闭
          </button>
          <button
            type="button"
            onClick={() =>
              handleCopy('url', shareUrl, '已复制公开分享链接到剪贴板')
            }
            className="btn-brand px-4 py-2 text-xs font-medium rounded-xl inline-flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>复制选中公布链接</span>
          </button>
        </div>
      </div>
    </div>
  );
};
