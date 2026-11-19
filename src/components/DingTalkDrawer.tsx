import React from 'react';
import { BellRing, CheckCheck, ExternalLink, Loader2, X } from 'lucide-react';
import { DingTalkNotification } from '../types/platform';

interface DingTalkDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: DingTalkNotification[];
  isMarkingRead?: boolean;
  onMarkAllRead: () => void | Promise<void>;
  onJumpToRelated: (relatedNo: string) => void;
}

const CARD_TYPE_LABELS: Record<DingTalkNotification['cardType'], string> = {
  todo: '钉钉工作通知 · 待办任务',
  urge: '钉钉人工催办卡片',
  escalation: '手动升级 / 重大事项提醒',
  reward_cheer: '钉钉群喜报推送',
  warning_notice: '定向处理结果通知',
};

export const DingTalkDrawer: React.FC<DingTalkDrawerProps> = ({
  open,
  onClose,
  notifications,
  isMarkingRead = false,
  onMarkAllRead,
  onJumpToRelated,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
      <div className="w-full max-w-md bg-white h-full border-l border-slate-200 flex flex-col">
        <div className="px-5 h-16 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              钉钉消息卡片与催办推送中心
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isMarkingRead}
              onClick={onMarkAllRead}
              className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isMarkingRead ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              <span>{isMarkingRead ? '处理中...' : '全部已读'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭钉钉消息抽屉"
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-sm text-slate-500">
              暂无钉钉推送记录
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-lg border bg-white ${
                  n.read ? 'border-slate-200' : 'border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                  <span className="font-medium text-blue-800">
                    {CARD_TYPE_LABELS[n.cardType]}
                  </span>
                  <span className="font-mono-tabular">{n.createdAt}</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 mb-1">
                  {n.title}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {n.summary}
                </p>
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">
                    接收方：{n.recipientRoleOrName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToRelated(n.relatedNo);
                      onClose();
                    }}
                    className="text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1"
                  >
                    <span className="font-mono-tabular">{n.relatedNo}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
