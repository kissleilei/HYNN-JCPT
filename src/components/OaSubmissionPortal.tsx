import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Lock,
  Plus,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { PHASE2_POINT_TIERS } from '../data/phase2SeedData';
import { POLICY_RUBRIC_ITEMS, PolicyRubricItem } from '../data/policyRubricData';
import { OaSubmitInput } from '../hooks/usePhase2Platform';
import {
  DingTalkMember,
  DingTalkStatus,
  OaSubmission,
  RecordCategory,
} from '../types/phase2';
import { CustomSelect } from './CustomSelect';
import { SectionHeader } from './SectionHeader';

interface OaSubmissionPortalProps {
  user: User | null;
  dingtalkMembers: DingTalkMember[];
  dingtalkStatus: DingTalkStatus;
  prefilledRubric: PolicyRubricItem | null;
  busyAction: string | null;
  onClearPrefill: () => void;
  onSignIn: () => Promise<boolean>;
  onSubmitMultiOa: (inputs: OaSubmitInput[]) => Promise<OaSubmission[]>;
  onNotify: (message: string) => void;
}

interface TargetDraftCard {
  key: string;
  targetDingtalkUserId: string;
  category: RecordCategory;
  gradeName: string;
  points: number;
  publicityMode: 'all_staff_public' | 'desensitized_warning' | 'dept_only';
}

export const OaSubmissionPortal: React.FC<OaSubmissionPortalProps> = ({
  user,
  dingtalkMembers,
  dingtalkStatus,
  prefilledRubric,
  busyAction,
  onClearPrefill,
  onSignIn,
  onSubmitMultiOa,
  onNotify,
}) => {
  const defaultTarget = useMemo(
    () =>
      dingtalkMembers.find((m) => m.oaRoleTag === 'staff')?.dingtalkUserId ||
      dingtalkMembers[0]?.dingtalkUserId ||
      '',
    [dingtalkMembers]
  );
  const defaultApprover = useMemo(
    () =>
      dingtalkMembers.find((m) => m.oaRoleTag === 'approver')?.dingtalkUserId ||
      dingtalkMembers[0]?.dingtalkUserId ||
      '',
    [dingtalkMembers]
  );
  const defaultExecutor = useMemo(
    () =>
      dingtalkMembers.find((m) => m.oaRoleTag === 'executor')?.dingtalkUserId ||
      dingtalkMembers[0]?.dingtalkUserId ||
      '',
    [dingtalkMembers]
  );
  const defaultCc = useMemo(
    () =>
      dingtalkMembers
        .filter((m) => m.oaRoleTag === 'cc_default')
        .map((m) => m.dingtalkUserId),
    [dingtalkMembers]
  );

  // Global event fields (1 per event)
  const [selectedRubricId, setSelectedRubricId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [factDescription, setFactDescription] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);

  // Multi-target cards ("每位对象一张卡，同一事件可多位")
  const [targetCards, setTargetCards] = useState<TargetDraftCard[]>([
    {
      key: 'target-1',
      targetDingtalkUserId: defaultTarget,
      category: 'reward',
      gradeName: '嘉奖',
      points: 5,
      publicityMode: 'all_staff_public',
    },
  ]);

  useEffect(() => {
    setTargetCards((prev) =>
      prev.map((c) =>
        c.targetDingtalkUserId ? c : { ...c, targetDingtalkUserId: defaultTarget }
      )
    );
  }, [defaultTarget]);

  useEffect(() => {
    if (!prefilledRubric) return;
    const nextCat: RecordCategory =
      prefilledRubric.direction === 'punishment' ? 'punishment' : 'reward';
    setSelectedRubricId(prefilledRubric.id);
    setTitle(prefilledRubric.title.slice(0, 120));
    setFactDescription(
      `依据《附件一》条款【${prefilledRubric.itemNo} ${prefilledRubric.categoryName}】提报：\n事发时间/地点：\n事件经过与影响：`
    );
    setTargetCards((prev) =>
      prev.map((card, i) =>
        i === 0
          ? {
              ...card,
              category: nextCat,
              gradeName: nextCat === 'reward' ? '嘉奖' : '警告',
              points: nextCat === 'reward' ? 5 : -5,
              publicityMode:
                nextCat === 'reward' ? 'all_staff_public' : 'desensitized_warning',
            }
          : card
      )
    );
    onClearPrefill();
  }, [prefilledRubric, onClearPrefill]);

  const updateTargetCard = (
    key: string,
    patch: Partial<TargetDraftCard>
  ) => {
    setTargetCards((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } : c))
    );
  };

  const handleCardCategorySwitch = (key: string, nextCat: RecordCategory) => {
    const firstTier = PHASE2_POINT_TIERS.find((t) => t.category === nextCat);
    updateTargetCard(key, {
      category: nextCat,
      gradeName: firstTier?.gradeName || (nextCat === 'reward' ? '表扬' : '批评'),
      points: firstTier?.defaultPoints ?? (nextCat === 'reward' ? 2 : -2),
      publicityMode: nextCat === 'reward' ? 'all_staff_public' : 'desensitized_warning',
    });
  };

  const handleAddTargetCard = () => {
    const nextIdx = targetCards.length + 1;
    const fallbackStaff =
      dingtalkMembers[nextIdx % Math.max(1, dingtalkMembers.length)]?.dingtalkUserId ||
      defaultTarget;
    setTargetCards((prev) => [
      ...prev,
      {
        key: `target-${Date.now()}-${nextIdx}`,
        targetDingtalkUserId: fallbackStaff,
        category: prev[0]?.category || 'reward',
        gradeName: prev[0]?.gradeName || '嘉奖',
        points: prev[0]?.points ?? 5,
        publicityMode: prev[0]?.publicityMode || 'all_staff_public',
      },
    ]);
  };

  const handleRemoveTargetCard = (key: string) => {
    if (targetCards.length <= 1) return;
    setTargetCards((prev) => prev.filter((c) => c.key !== key));
  };

  const handleSelectRubric = (rubricId: string) => {
    setSelectedRubricId(rubricId);
    const found = POLICY_RUBRIC_ITEMS.find((r) => r.id === rubricId);
    if (!found) return;
    if (found.direction === 'punishment') {
      handleCardCategorySwitch(targetCards[0].key, 'punishment');
    } else if (found.direction === 'reward') {
      handleCardCategorySwitch(targetCards[0].key, 'reward');
    }
    if (!title.trim()) {
      setTitle(found.title.slice(0, 120));
    }
  };

  const memberOptions = useMemo(
    () =>
      dingtalkMembers.map((m) => ({
        value: m.dingtalkUserId,
        label: `${m.name}（${m.deptName}）`,
        description: `${m.title} · 工号 ${m.empNo}`,
        badgeText: m.dingtalkUserId,
      })),
    [dingtalkMembers]
  );

  const rubricOptions = useMemo(
    () => [
      { value: '', label: '不关联特定条款（自定义事项）' },
      ...POLICY_RUBRIC_ITEMS.map((item) => ({
        value: item.id,
        label: `${item.itemNo} · ${item.title.slice(0, 42)}`,
        description: `${item.categoryName} | 标尺：${item.tier1Label} / ${item.tier2Label} / ${item.tier3Label}`,
      })),
    ],
    []
  );

  const selectedRubric = POLICY_RUBRIC_ITEMS.find((r) => r.id === selectedRubricId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      const ok = await onSignIn();
      if (!ok) return;
    }

    if (!title.trim() || !factDescription.trim()) {
      onNotify('请填写完整的全局事件标题与事件经过/影响描述');
      return;
    }

    try {
      const payloads: OaSubmitInput[] = targetCards.map((card) => ({
        category: card.category,
        title: title.trim(),
        targetDingtalkUserId: card.targetDingtalkUserId,
        rubricCode: selectedRubric?.itemNo,
        gradeName: card.gradeName,
        points:
          card.category === 'reward'
            ? Math.abs(Number(card.points) || 1)
            : -Math.abs(Number(card.points) || 1),
        factDescription: factDescription.trim(),
        evidenceName: evidenceName.trim() || undefined,
        publicityMode: card.publicityMode,
        isConfidential,
        approverDingtalkUserId: defaultApprover,
        executorDingtalkUserId: defaultExecutor,
        ccDingtalkUserIds: defaultCc,
      }));

      const created = await onSubmitMultiOa(payloads);
      onNotify(
        `已成功提交 ${created.length} 张奖惩建议卡，已自动发起钉钉 OA 独立审批流`
      );
      setTitle('');
      setFactDescription('');
      setEvidenceName('');
      setSelectedRubricId('');
      setTargetCards([
        {
          key: 'target-1',
          targetDingtalkUserId: defaultTarget,
          category: 'reward',
          gradeName: '嘉奖',
          points: 5,
          publicityMode: 'all_staff_public',
        },
      ]);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'OA 提报失败，请检查表单或登录状态');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner + 4-Step Corporate Workflow Strip */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              员工奖惩提报审批入口
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              遵循公司标准 4 步审批闭环：同一事件填报 1 条全局描述，可添加多位对象建议卡，提交后锁定进入二级部门负责人审批、抄送一级负责人并由综合管理部归档至离职后 2 年。
            </p>
          </div>

          {user && (
            <div className="bg-[#EEF5FF]/70 rounded-xl px-4 py-2.5 text-xs shrink-0">
              <div className="text-slate-500">当前实名提报人</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {user.displayName || user.email}
              </div>
            </div>
          )}
        </div>

        {/* 4-Stage Visual Flow Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          {[
            {
              step: '① 提报人填单提交',
              desc: '全局事件描述 + 每位对象一卡，提交后锁定进入审批',
              tone: 'bg-[#EEF5FF]/75 text-[#14306B]',
            },
            {
              step: '② 二级部门负责人审批',
              desc: '核实事实 · 听取申辩 · 同意继续或驳回退回第 1 步',
              tone: 'bg-amber-50/80 text-amber-950',
            },
            {
              step: '③ 抄送一级部门负责人',
              desc: '如有则知会，仅知会不阻塞流程流转',
              tone: 'bg-cyan-50/80 text-cyan-950',
            },
            {
              step: '④ 综合管理部归档',
              desc: '确认归档 · 留存员工档案至离职后 2 年（可选公示）',
              tone: 'bg-emerald-50/80 text-emerald-950',
            },
          ].map((stage) => (
            <div
              key={stage.step}
              className={`rounded-xl px-3.5 py-3 space-y-0.5 ${stage.tone}`}
            >
              <div className="text-xs font-semibold">{stage.step}</div>
              <div className="text-[11px] opacity-85 leading-snug">{stage.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-5">
          {/* Global Event Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <SectionHeader
                icon={ClipboardList}
                title="①-A 事件描述（全局一条）"
                subtitle="填写事发时间、地点、经过与影响；生效日期已取消，审批归档后自动计入台账"
                extra={<span className="text-xs text-slate-500">提交后表单锁定</span>}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  事项简明标题 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：储能主控柜 BOM 降本验证落地 / ECN 变更未同步"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FE4]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  对照《附件一》积分条款（可选）
                </label>
                <CustomSelect
                  searchable
                  value={selectedRubricId}
                  onChange={handleSelectRubric}
                  options={rubricOptions}
                  searchPlaceholder="检索条款编号或关键字..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                事发时间 / 地点 / 经过 / 量化影响 *
              </label>
              <textarea
                required
                rows={4}
                maxLength={1500}
                value={factDescription}
                onChange={(e) => setFactDescription(e.target.value)}
                placeholder="请说明：事发时间与地点、客观事实经过、产生的积极成果或不良影响，以及相关证据依据..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FE4]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  佐证材料说明 / 钉钉文件编号（可选）
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={evidenceName}
                  onChange={(e) => setEvidenceName(e.target.value)}
                  placeholder="例如：ECN-2026-114 核查截图.pdf"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FE4]"
                />
              </div>

              <label className="flex items-start gap-2.5 bg-slate-50/90 rounded-xl p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#1E62D0] focus:ring-[#2F6FE4]"
                />
                <div className="text-xs">
                  <div className="font-medium text-slate-800 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#1E62D0]" />
                    <span>开启实名保密提报</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    仅归档台账留痕，公示视图隐藏提报人
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Multi-Target Recommendation Cards */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <SectionHeader
                icon={Users}
                title="①-B 奖惩对象及建议（每人一卡）"
                subtitle="多人涉及同一事件可添加多位对象，每位对象独立选择大类别、档级三选一与绩效分"
                extra={
                  <button
                    type="button"
                    onClick={handleAddTargetCard}
                    className="px-3 py-1.5 text-xs font-medium text-[#1E62D0] bg-[#EEF5FF] border border-[#BFD8FD] hover:bg-[#DBE9FE] rounded-xl inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加同一事件对象</span>
                  </button>
                }
              />
            </div>

            <div className="space-y-4">
              {targetCards.map((card, idx) => {
                const tiers = PHASE2_POINT_TIERS.filter(
                  (t) => t.category === card.category
                );
                return (
                  <div
                    key={card.key}
                    className="rounded-xl p-4 space-y-3.5 bg-slate-50/80"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        奖惩对象建议卡 #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex border border-slate-200 rounded-lg p-0.5 bg-white">
                          <button
                            type="button"
                            onClick={() => handleCardCategorySwitch(card.key, 'reward')}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                              card.category === 'reward'
                                ? 'bg-emerald-700 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            正向奖励
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleCardCategorySwitch(card.key, 'punishment')
                            }
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                              card.category === 'punishment'
                                ? 'bg-rose-700 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            违纪惩处
                          </button>
                        </div>

                        {targetCards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTargetCard(card.key)}
                            title="移除此对象卡片"
                            className="p-1.5 text-slate-400 hover:text-rose-700 rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">
                          对象人员（钉钉通讯录）*
                        </label>
                        <CustomSelect
                          searchable
                          size="sm"
                          value={card.targetDingtalkUserId}
                          onChange={(val) =>
                            updateTargetCard(card.key, { targetDingtalkUserId: val })
                          }
                          options={memberOptions}
                          searchPlaceholder="搜索姓名、部门或工号..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">
                          归档后公示范围
                        </label>
                        <CustomSelect
                          size="sm"
                          value={card.publicityMode}
                          onChange={(val) =>
                            updateTargetCard(card.key, {
                              publicityMode: val as TargetDraftCard['publicityMode'],
                            })
                          }
                          options={[
                            { value: 'all_staff_public', label: '全员公示栏实名公开' },
                            {
                              value: 'desensitized_warning',
                              label: '警示台姓名脱敏公开',
                            },
                            { value: 'dept_only', label: '仅综合管理部归档留存' },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">
                          档级三选一 *
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {tiers.map((tier) => {
                            const active = card.gradeName === tier.gradeName;
                            return (
                              <button
                                key={tier.id}
                                type="button"
                                onClick={() =>
                                  updateTargetCard(card.key, {
                                    gradeName: tier.gradeName,
                                    points: tier.defaultPoints,
                                  })
                                }
                                className={`px-2 py-1.5 rounded-lg border text-xs font-medium text-center transition-colors ${
                                  active
                                    ? card.category === 'reward'
                                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                                      : 'bg-rose-50 border-rose-600 text-rose-900'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div>{tier.gradeName}</div>
                                <div className="text-[10px] font-mono-tabular opacity-80">
                                  {tier.pointRange}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">
                          建议绩效分值（分）*
                        </label>
                        <input
                          type="number"
                          min={card.category === 'reward' ? 1 : -50}
                          max={card.category === 'reward' ? 50 : -1}
                          value={card.points}
                          onChange={(e) =>
                            updateTargetCard(card.key, {
                              points: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-1.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FE4]"
                        />
                        <div className="text-[11px] text-slate-500">
                          分值将同步计入个人积分台账（参考折算：1 分 = 100 元绩效基数）
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Form Submit Footer */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                提交后将自动进入钉钉 OA 独立审批路径流转与归档
              </div>
              <button
                type="submit"
                disabled={busyAction === 'submit_oa'}
                className="btn-brand sm:w-auto w-full py-2.5 px-6 text-xs sm:text-sm font-medium disabled:opacity-60 rounded-xl inline-flex items-center justify-center gap-2 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>
                  {busyAction === 'submit_oa'
                    ? '正在锁定单据并推送钉钉审批...'
                    : `提交审批（${targetCards.length} 位对象）并锁定表单`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
