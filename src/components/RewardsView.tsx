import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  BellRing,
  BookOpen,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  Lock,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import { POLICY_RUBRIC_ITEMS, PolicyRubricItem } from '../data/policyRubricData';
import {
  Employee,
  ExecutionMode,
  PolicyGrade,
  RewardNomination,
  RewardStatus,
} from '../types/platform';
import {
  EXECUTION_MODE_LABELS,
  PUBLICITY_SCOPE_LABELS,
  REWARD_STATUS_META,
} from '../utils/labels';
import { CustomSelect, SelectOption } from './CustomSelect';

interface RewardsViewProps {
  currentUser: Employee;
  employees: Employee[];
  policyGrades: PolicyGrade[];
  rewards: RewardNomination[];
  initialRubric?: PolicyRubricItem | null;
  onClearInitialRubric?: () => void;
  isActionPending?: (key: string) => boolean;
  onSubmitReward: (payload: {
    title: string;
    deedDescription: string;
    winnerId: string;
    isInternalException: boolean;
    internalExceptionReason?: string;
    gradeId: string;
    executionMode: ExecutionMode;
    amountYuan: number;
    perfScore: number;
    perfRatioPercent: number;
    isAdjusted: boolean;
    adjustmentReason?: string;
    evidenceName: string;
    evidenceSummary: string;
  }) => void | Promise<void>;
  onAdvanceReward: (rewardId: string) => void | Promise<void>;
  onUrgeReward: (rewardId: string) => void | Promise<void>;
}

const REWARD_FILTERS: { id: 'all' | 'pending' | RewardStatus; label: string }[] = [
  { id: 'all', label: '全部表彰' },
  { id: 'pending', label: '审批进行中' },
  { id: 'pending_special_approval', label: '内部特批通道' },
  { id: 'approved_archived', label: '已批准公示' },
];

export const RewardsView: React.FC<RewardsViewProps> = ({
  currentUser,
  employees,
  policyGrades,
  rewards,
  initialRubric = null,
  onClearInitialRubric,
  isActionPending = () => false,
  onSubmitReward,
  onAdvanceReward,
  onUrgeReward,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | RewardStatus>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(rewards[0]?.id || '');

  const rewardGrades = policyGrades.filter((g) => g.category === 'reward');
  const canInitiateReward =
    currentUser.isM8Plus ||
    currentUser.role === 'm8_plus' ||
    currentUser.role === 'hrd' ||
    currentUser.role === 'executive';

  // Modal form state
  const [selectedRubricId, setSelectedRubricId] = useState('');
  const [title, setTitle] = useState('');
  const [deedDescription, setDeedDescription] = useState('');
  const eligibleWinners = employees.filter((e) => e.id !== currentUser.id);
  const [winnerId, setWinnerId] = useState(eligibleWinners[0]?.id || '');
  const [gradeId, setGradeId] = useState(rewardGrades[1]?.id || rewardGrades[0]?.id || '');
  const [execMode, setExecMode] = useState<ExecutionMode>('fixed_amount');
  const [amountYuan, setAmountYuan] = useState<number>(3000);
  const [perfScore, setPerfScore] = useState<number>(10);
  const [perfRatio, setPerfRatio] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState('');
  const [isInternalException, setIsInternalException] = useState(false);
  const [internalExceptionReason, setInternalExceptionReason] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [formError, setFormError] = useState('');

  const applyRubricDefaults = (rubric: PolicyRubricItem) => {
    setSelectedRubricId(rubric.id);
    setTitle(`【${rubric.itemNo}】${rubric.title.slice(0, 38)}`);
    setDeedDescription(
      `依据《附件一：奖惩标尺》【${rubric.itemNo} · ${rubric.categoryName}】：${rubric.title}。\n具体突出事迹与量化成果：`
    );
    const targetGradeName =
      rubric.tier3Label !== '—'
        ? '记功'
        : rubric.tier2Label !== '—'
        ? '嘉奖'
        : '表扬';
    const matchedGrade =
      rewardGrades.find((g) => g.name === targetGradeName) ||
      rewardGrades[1] ||
      rewardGrades[0];
    if (matchedGrade) {
      setGradeId(matchedGrade.id);
      setExecMode(matchedGrade.defaultExecutionMode);
      setAmountYuan(matchedGrade.defaultAmountYuan);
      setPerfScore(matchedGrade.defaultPerfScore);
      setPerfRatio(matchedGrade.defaultPerfRatioPercent);
    }
  };

  useEffect(() => {
    if (!initialRubric) return;
    applyRubricDefaults(initialRubric);
    if (canInitiateReward) {
      setShowModal(true);
    }
  }, [initialRubric, canInitiateReward]);

  useEffect(() => {
    if (!showModal) return;
    const candidates = employees.filter((e) => e.id !== currentUser.id);
    setWinnerId((prev) =>
      prev && candidates.some((c) => c.id === prev) ? prev : candidates[0]?.id || ''
    );
    setFormError('');
  }, [showModal, currentUser.id, employees]);

  const filteredRewards = rewards.filter((r) => {
    const matchFilter =
      filter === 'all'
        ? true
        : filter === 'pending'
        ? r.status !== 'approved_archived'
        : r.status === filter;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      r.rewardNo.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.winnerName.toLowerCase().includes(q) ||
      r.winnerDeptName.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const selectedWinner = employees.find((e) => e.id === winnerId);
  const isSameDepartment = selectedWinner?.departmentId === currentUser.departmentId;
  const activeGrade = rewardGrades.find((g) => g.id === gradeId) || rewardGrades[0];
  const isAdjusted =
    activeGrade &&
    (amountYuan !== activeGrade.defaultAmountYuan ||
      perfScore !== activeGrade.defaultPerfScore ||
      perfRatio !== activeGrade.defaultPerfRatioPercent);

  const selectedReward =
    rewards.find((r) => r.id === selectedId) || filteredRewards[0] || null;

  const winnerOptions: SelectOption[] = eligibleWinners.map((emp) => ({
    value: emp.id,
    label: emp.name,
    badgeText: `${emp.empNo} · ${emp.rank}`,
    description: `${emp.departmentName} · ${emp.title}${
      emp.departmentId === currentUser.departmentId ? '（本部门 · 需走内部特批）' : '（跨部门协作优先）'
    }`,
  }));

  const gradeOptions: SelectOption[] = rewardGrades.map((g) => ({
    value: g.id,
    label: g.name,
    badgeText: `+¥${g.defaultAmountYuan} / +${g.defaultPerfScore}分`,
    description: PUBLICITY_SCOPE_LABELS[g.defaultPublicity],
  }));

  const execModeOptions: SelectOption[] = Object.entries(EXECUTION_MODE_LABELS).map(
    ([k, label]) => ({
      value: k,
      label,
    })
  );

  const rewardRubricCandidates = POLICY_RUBRIC_ITEMS.filter(
    (r) => r.direction === 'reward' || r.direction === 'both'
  );
  const rubricOptions: SelectOption[] = [
    { value: '', label: '不指定标尺（自定义表彰事迹申报）' },
    ...rewardRubricCandidates.map((r) => ({
      value: r.id,
      label: `[${r.itemNo}] ${r.title}`,
      badgeText: r.categoryName,
      description: `参考分值 · 表扬:${r.tier1Label} / 嘉奖:${r.tier2Label} / 记功:${r.tier3Label}（1分=¥100）`,
    })),
  ];
  const activeRubric =
    rewardRubricCandidates.find((r) => r.id === selectedRubricId) || null;

  const handleSelectRubric = (id: string) => {
    setSelectedRubricId(id);
    const item = rewardRubricCandidates.find((r) => r.id === id);
    if (!item) return;
    if (!title.trim()) {
      setTitle(`【${item.itemNo}】${item.title.slice(0, 38)}`);
    }
    if (!deedDescription.includes(item.itemNo)) {
      setDeedDescription((prev) =>
        `依据《附件一：奖惩标尺》【${item.itemNo} · ${item.categoryName}】：${item.title}。\n${prev}`
      );
    }
  };

  const handleSelectGrade = (id: string) => {
    setGradeId(id);
    const g = rewardGrades.find((item) => item.id === id);
    if (g) {
      setExecMode(g.defaultExecutionMode);
      setAmountYuan(g.defaultAmountYuan);
      setPerfScore(g.defaultPerfScore);
      setPerfRatio(g.defaultPerfRatioPercent);
    }
  };

  const isSubmittingReward = isActionPending('reward:create');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReward) return;
    if (!title.trim() || !deedDescription.trim()) {
      setFormError('请填写表彰标题及详实事迹说明。');
      return;
    }
    if (!evidenceName.trim()) {
      setFormError('奖励表彰必须附带佐证材料（如里程碑记录、客户感谢信、交付数据等）。');
      return;
    }
    if (isSameDepartment && (!isInternalException || !internalExceptionReason.trim())) {
      setFormError('原则上限制部门内部提报；若属重大创新或突出贡献，请勾选并填写内部例外特批理由。');
      return;
    }
    if (isAdjusted && !adjustReason.trim()) {
      setFormError('微调奖励额度/分值时请填写调整理由。');
      return;
    }

    await onSubmitReward({
      title: title.trim(),
      deedDescription: deedDescription.trim(),
      winnerId,
      isInternalException: isSameDepartment ? isInternalException : false,
      internalExceptionReason: isSameDepartment
        ? internalExceptionReason.trim()
        : undefined,
      gradeId,
      executionMode: execMode,
      amountYuan,
      perfScore,
      perfRatioPercent: perfRatio,
      isAdjusted: Boolean(isAdjusted),
      adjustmentReason: adjustReason.trim() || undefined,
      evidenceName: evidenceName.trim(),
      evidenceSummary: evidenceSummary.trim(),
    });

    setSelectedRubricId('');
    setTitle('');
    setDeedDescription('');
    setEvidenceName('');
    setEvidenceSummary('');
    setInternalExceptionReason('');
    setIsInternalException(false);
    setFormError('');
    setShowModal(false);
    onClearInitialRubric?.();
  };

  const canAdvanceSelected = (r: RewardNomination) => {
    if (r.status === 'approved_archived') return false;
    if (r.status === 'pending_dept_confirm') {
      return (
        (currentUser.isDeptLeader && currentUser.departmentId === r.winnerDeptId) ||
        currentUser.role === 'hrd'
      );
    }
    if (r.status === 'pending_special_approval') {
      return currentUser.role === 'hrd' || currentUser.role === 'executive';
    }
    if (r.status === 'pending_hr_review') {
      return currentUser.role === 'hrd' || currentUser.role === 'er_lead';
    }
    if (r.status === 'pending_exec_approval') {
      return currentUser.role === 'executive' || currentUser.role === 'hrd';
    }
    return false;
  };

  const getRewardStepIndex = (r: RewardNomination) => {
    if (r.status === 'pending_dept_confirm' || r.status === 'pending_special_approval') return 1;
    if (r.status === 'pending_hr_review') return 2;
    if (r.status === 'pending_exec_approval') return 3;
    return 4;
  };

  const REWARD_STEPS = ['M8+ 提报', '部门确认/特批', 'HR 审核', '高层审批', '生效公示'];

  return (
    <div className="space-y-5">
      {/* Header Control Bar + Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-slate-900">
              正向激励与跨部门奖励表彰流程
            </h2>
            <p className="text-xs text-slate-500">
              仅限【M8及以上职级】员工发起提报，获奖人不限职级；优先鼓励跨部门协作贡献，部门内部提报须走【内部例外特批通道】。
            </p>
          </div>

          {canInitiateReward ? (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>发起奖励表彰申报（M8+）</span>
            </button>
          ) : (
            <div className="px-3 py-2 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>当前职级（{currentUser.rank}）仅可浏览，需在左下角切换 M8+ 发起申报</span>
            </div>
          )}
        </div>

        {!canInitiateReward && initialRubric && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
            <div>
              已锁定待引用表彰标尺{' '}
              <span className="font-mono-tabular font-semibold">
                [{initialRubric.itemNo}]
              </span>{' '}
              {initialRubric.title}；请在左下角「钉钉免登身份视角切换」中切换为 M8+、HRD 或高管视角，即可自动带入并打开表彰申报单。
            </div>
            {onClearInitialRubric && (
              <button
                type="button"
                onClick={onClearInitialRubric}
                className="text-emerald-800 hover:underline font-medium shrink-0"
              >
                清除引用
              </button>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {REWARD_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === f.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索单号、获奖人或事迹标题..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Master-Detail Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>奖励表彰申报单列表</span>
            <span className="font-mono-tabular">{filteredRewards.length} 项记录</span>
          </div>
          {filteredRewards.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              当前筛选条件下暂无奖励记录
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRewards.map((r) => {
                const statusMeta = REWARD_STATUS_META[r.status];
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left p-4 transition-colors block ${
                      selectedReward?.id === r.id ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono-tabular font-semibold text-slate-700">
                        {r.rewardNo} · {r.gradeName}
                        {r.isInternalException ? ' · 内部特批' : ' · 跨部门'}
                      </span>
                      <span className={`font-medium ${statusMeta.textClass}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 mb-1">
                      {r.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      获奖人：{r.winnerName}（{r.winnerDeptName} · {r.winnerRank}） · 提报人：{r.nominatorName}（{r.nominatorRank}）
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          {!selectedReward ? (
            <div className="py-12 text-center text-sm text-slate-500">
              暂无奖励表彰记录
            </div>
          ) : (
            <>
              <div className="pb-4 border-b border-slate-200 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono-tabular font-semibold text-slate-800">
                        {selectedReward.rewardNo}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {selectedReward.isCrossDepartment
                          ? '跨部门协作提报'
                          : '部门内部例外特批'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${
                          REWARD_STATUS_META[selectedReward.status].textClass
                        }`}
                      >
                        {REWARD_STATUS_META[selectedReward.status].label}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {selectedReward.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedReward.status !== 'approved_archived' && (() => {
                      const stageUrged = (selectedReward.urgedStages || []).includes(
                        selectedReward.status
                      );
                      const isUrging = isActionPending(`reward:urge:${selectedReward.id}`);
                      return (
                        <button
                          type="button"
                          disabled={stageUrged || isUrging}
                          onClick={() => onUrgeReward(selectedReward.id)}
                          title={
                            stageUrged
                              ? '当前审批节点已催办过，请等待流转后再催办'
                              : '发送奖励审批钉钉催办'
                          }
                          className={`px-3 py-2 text-xs font-medium border rounded-lg flex items-center gap-1 whitespace-nowrap ${
                            stageUrged || isUrging
                              ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                              : 'text-slate-700 bg-white border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {isUrging ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          ) : (
                            <BellRing
                              className={`w-3.5 h-3.5 ${
                                stageUrged ? 'text-slate-400' : 'text-amber-600'
                              }`}
                            />
                          )}
                          <span>
                            {isUrging
                              ? '催办中...'
                              : stageUrged
                              ? `本节点已催办（${selectedReward.urgeCount}）`
                              : `催办（${selectedReward.urgeCount}）`}
                          </span>
                        </button>
                      );
                    })()}

                    {canAdvanceSelected(selectedReward) && (() => {
                      const isAdvancing = isActionPending(
                        `reward:advance:${selectedReward.id}`
                      );
                      return (
                        <button
                          type="button"
                          disabled={isAdvancing}
                          onClick={() => onAdvanceReward(selectedReward.id)}
                          className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isAdvancing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isAdvancing
                              ? '审批推进中...'
                              : selectedReward.status === 'pending_special_approval'
                              ? '特批审核通过并转 HR 复核'
                              : selectedReward.status === 'pending_dept_confirm'
                              ? '获奖人部门确认通过'
                              : selectedReward.status === 'pending_hr_review'
                              ? 'HR 审核通过'
                              : '高层终审批准并公示'}
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* 5-Stage Approval Progress Bar */}
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {REWARD_STEPS.map((label, idx) => {
                    const currentIdx = getRewardStepIndex(selectedReward);
                    const done = idx < currentIdx;
                    const current = idx === currentIdx;
                    return (
                      <div key={label} className="space-y-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            done
                              ? 'bg-emerald-600'
                              : current
                              ? 'bg-blue-800'
                              : 'bg-slate-200'
                          }`}
                        />
                        <div
                          className={`text-[11px] truncate ${
                            current
                              ? 'font-semibold text-blue-900'
                              : done
                              ? 'text-emerald-700 font-medium'
                              : 'text-slate-400'
                          }`}
                        >
                          {idx + 1}. {label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
                <div>
                  <div className="text-slate-500">获奖员工</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedReward.winnerName}（{selectedReward.winnerRank}）
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {selectedReward.winnerDeptName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">M8+ 提报人</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedReward.nominatorName}（{selectedReward.nominatorRank}）
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {selectedReward.nominatorDeptName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">奖励等级与额度</div>
                  <div className="font-semibold text-emerald-700 mt-0.5">
                    {selectedReward.gradeName}
                  </div>
                  <div className="font-mono-tabular text-slate-700 mt-0.5">
                    +¥{selectedReward.amountYuan} / +{selectedReward.perfScore}分
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">公示范围规则</div>
                  <div className="font-medium text-slate-900 mt-0.5">
                    {PUBLICITY_SCOPE_LABELS[selectedReward.publicityScope]}
                  </div>
                </div>
              </div>

              {selectedReward.isInternalException && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  <div className="font-semibold">
                    已触发【内部例外特批通道】校验
                  </div>
                  <p>{selectedReward.internalExceptionReason}</p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-1.5">
                  详实事迹说明
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedReward.deedDescription}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-700">
                  事迹佐证材料
                </h4>
                {selectedReward.evidences.map((ev) => (
                  <div
                    key={ev.id}
                    className="px-3 py-2 border border-slate-200 rounded-md text-xs flex items-center justify-between gap-2 bg-slate-50/50"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium text-slate-800">{ev.name}</span>
                      <span className="text-slate-500">— {ev.summary}</span>
                    </div>
                    <span className="font-mono-tabular text-slate-400">
                      {ev.uploadedAt}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal: Submit New Reward */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                <h2 className="text-base font-semibold text-slate-900">
                  发起 M8+ 奖励表彰申报单
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  onClearInitialRubric?.();
                }}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>关联《附件一：奖惩标尺》正向激励条款（可选，支持关键词检索）</span>
                </label>
                <CustomSelect
                  value={selectedRubricId}
                  onChange={handleSelectRubric}
                  options={rubricOptions}
                  searchable
                  searchPlaceholder="搜索条款编号、关键词（如：降本、模块化、DFMEA、ECN）..."
                  size="sm"
                />
                {activeRubric && (
                  <div className="mt-1.5 px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-md text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      标尺参考分值（1分=¥100）：表扬 {activeRubric.tier1Label} · 嘉奖{' '}
                      {activeRubric.tier2Label} · 记功 {activeRubric.tier3Label}
                    </span>
                    <span className="font-mono-tabular text-emerald-700 font-medium">
                      {activeRubric.categoryName}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  表彰项目与事迹标题 *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：跨部门紧急协同保障华南政务项目零故障上线"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    获奖员工（支持按姓名/部门检索，跨部门优先）*
                  </label>
                  <CustomSelect
                    value={winnerId}
                    onChange={setWinnerId}
                    options={winnerOptions}
                    searchable
                    searchPlaceholder="搜索获奖员工姓名、工号或部门..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    奖励等级 *
                  </label>
                  <CustomSelect
                    value={gradeId}
                    onChange={handleSelectGrade}
                    options={gradeOptions}
                  />
                </div>
              </div>

              {/* Same-department special exception gate */}
              {isSameDepartment && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2.5">
                  <div className="flex items-start gap-2 text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">
                        检测到同部门内部提报（{selectedWinner?.departmentName}）
                      </div>
                      <p className="mt-0.5 text-amber-800">
                        制度原则上优先鼓励跨部门协作，限制部门内部常规提报。若确属重大创新或突出贡献，须走【内部例外特批通道】。
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalException}
                      onChange={(e) => setIsInternalException(e.target.checked)}
                      className="rounded border-amber-400"
                    />
                    <span>申请走【内部例外特批通道】并提交高层复核</span>
                  </label>
                  {isInternalException && (
                    <input
                      type="text"
                      value={internalExceptionReason}
                      onChange={(e) => setInternalExceptionReason(e.target.value)}
                      placeholder="请说明重大创新或突出量化贡献依据..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-md"
                    />
                  )}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      执行方式
                    </label>
                    <CustomSelect
                      value={execMode}
                      onChange={(v) => setExecMode(v as ExecutionMode)}
                      options={execModeOptions}
                      size="sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      奖励金额（元）
                    </label>
                    <input
                      type="number"
                      value={amountYuan}
                      onChange={(e) => setAmountYuan(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      绩效加分
                    </label>
                    <input
                      type="number"
                      value={perfScore}
                      onChange={(e) => setPerfScore(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
                  <span>
                    制度积分换算（1 分 = ¥100）：当前奖励折合{' '}
                    <span className="font-mono-tabular font-semibold text-emerald-700">
                      +{(amountYuan / 100).toFixed(1)} 分
                    </span>
                    （表扬 1-3分 / 嘉奖 4-5分 / 记功 6-20分）
                  </span>
                  {perfScore > 20 && (
                    <span className="text-amber-700 font-medium">
                      超 20 分上限须经总经理/董事长特批
                    </span>
                  )}
                </div>
              </div>

              {isAdjusted && (
                <div>
                  <label className="block text-xs font-medium text-amber-800 mb-1">
                    微调奖励额度需填写理由 *
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="填写额度微调理由"
                    className="w-full px-3 py-1.5 text-xs border border-amber-300 rounded-md"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  详实事迹说明 *
                </label>
                <textarea
                  rows={3}
                  value={deedDescription}
                  onChange={(e) => setDeedDescription(e.target.value)}
                  placeholder="详细描述跨部门协助场景、解决难点及可量化的业务结果..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700">
                      佐证材料名称（必传）*
                    </label>
                    <label className="text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer inline-flex items-center gap-1">
                      <FileUp className="w-3 h-3" />
                      <span>选文件</span>
                      <input
                        type="file"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setEvidenceName(f.name);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={evidenceName}
                    onChange={(e) => setEvidenceName(e.target.value)}
                    placeholder="例如：客户感谢信_1118.pdf"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    佐证核心内容
                  </label>
                  <input
                    type="text"
                    value={evidenceSummary}
                    onChange={(e) => setEvidenceSummary(e.target.value)}
                    placeholder="例如：项目里程碑提前3天交付"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmittingReward}
                  onClick={() => {
                    setShowModal(false);
                    onClearInitialRubric?.();
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReward}
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingReward ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmittingReward ? '提交中...' : '提交奖励表彰申报单'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
