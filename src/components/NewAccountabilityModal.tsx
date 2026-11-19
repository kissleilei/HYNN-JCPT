import React, { useEffect, useState } from 'react';
import { BookOpen, FileUp, Loader2, Lock, Paperclip, ShieldAlert, Trash2, X } from 'lucide-react';
import { POLICY_RUBRIC_ITEMS, PolicyRubricItem } from '../data/policyRubricData';
import { Department, Employee } from '../types/platform';
import { CustomSelect, SelectOption } from './CustomSelect';

interface NewAccountabilityModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: Employee;
  employees: Employee[];
  departments: Department[];
  initialRubric?: PolicyRubricItem | null;
  isSubmitting?: boolean;
  onSubmit: (payload: {
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
  }) => void | Promise<void>;
}

export const NewAccountabilityModal: React.FC<NewAccountabilityModalProps> = ({
  open,
  onClose,
  currentUser,
  employees,
  departments,
  initialRubric = null,
  isSubmitting = false,
  onSubmit,
}) => {
  const otherEmployees = employees.filter((e) => e.id !== currentUser.id);
  const [title, setTitle] = useState('');
  const [selectedRubricId, setSelectedRubricId] = useState('');
  const [factDescription, setFactDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState('2026-11-18');
  const [isConfidential, setIsConfidential] = useState(false);
  const [accusedEmpId, setAccusedEmpId] = useState(otherEmployees[0]?.id || '');
  const [accusedDeptIds, setAccusedDeptIds] = useState<string[]>(
    otherEmployees[0]?.departmentId ? [otherEmployees[0].departmentId] : ['dept-supply']
  );
  const [isMajorAccident, setIsMajorAccident] = useState(false);
  const [evidences, setEvidences] = useState<{ name: string; summary: string }[]>([]);
  const [draftEvName, setDraftEvName] = useState('');
  const [draftEvSummary, setDraftEvSummary] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const candidates = employees.filter((e) => e.id !== currentUser.id);
    const first = candidates[0];
    const hasValidAccused = candidates.some((c) => c.id === accusedEmpId);
    if (!hasValidAccused) {
      setAccusedEmpId(first?.id || '');
      setAccusedDeptIds(first?.departmentId ? [first.departmentId] : []);
    }
    if (initialRubric) {
      setSelectedRubricId(initialRubric.id);
      setTitle(`【${initialRubric.itemNo}】${initialRubric.title.slice(0, 38)}`);
      setFactDescription(
        `依据制度标尺【${initialRubric.itemNo} · ${initialRubric.categoryName}】：${initialRubric.title}。\n具体事件经过：`
      );
      if (initialRubric.hasTerminationRisk) {
        setIsMajorAccident(true);
      }
    }
    setError('');
  }, [open, currentUser.id, employees, initialRubric]);

  if (!open) return null;

  const rubricCandidates = POLICY_RUBRIC_ITEMS.filter(
    (r) => r.direction === 'punishment' || r.direction === 'both'
  );
  const rubricOptions: SelectOption[] = [
    { value: '', label: '不指定标尺（自定义事件提报）' },
    ...rubricCandidates.map((r) => ({
      value: r.id,
      label: `[${r.itemNo}] ${r.title}`,
      badgeText: r.categoryName,
      description: `参考分值 · 批评:${r.tier1Label} / 警告:${r.tier2Label} / 记过:${r.tier3Label}（1分=¥100）`,
    })),
  ];

  const activeRubric = rubricCandidates.find((r) => r.id === selectedRubricId) || null;

  const handleSelectRubric = (id: string) => {
    setSelectedRubricId(id);
    const item = rubricCandidates.find((r) => r.id === id);
    if (!item) return;
    if (!title.trim()) {
      setTitle(`【${item.itemNo}】${item.title.slice(0, 38)}`);
    }
    if (!factDescription.includes(item.itemNo)) {
      setFactDescription((prev) =>
        `依据《奖惩标尺》【${item.itemNo} · ${item.categoryName}】：${item.title}。\n${prev}`
      );
    }
  };

  const employeeOptions: SelectOption[] = otherEmployees.map((emp) => ({
    value: emp.id,
    label: emp.name,
    badgeText: `${emp.empNo} · ${emp.rank}`,
    description: `${emp.departmentName} · ${emp.title}${emp.isDeptLeader ? ' · 部门领导' : ''}`,
  }));

  const toggleDept = (deptId: string) => {
    setAccusedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleEmpChange = (empId: string) => {
    setAccusedEmpId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp && !accusedDeptIds.includes(emp.departmentId)) {
      setAccusedDeptIds([emp.departmentId]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setEvidences((prev) => [
      ...prev,
      ...files.map((f) => ({
        name: f.name,
        summary: `本地附件 (${Math.max(1, Math.round(f.size / 1024))} KB)`,
      })),
    ]);
    e.target.value = '';
  };

  const handleAddDraftEvidence = () => {
    if (!draftEvName.trim()) return;
    setEvidences((prev) => [
      ...prev,
      {
        name: draftEvName.trim(),
        summary: draftEvSummary.trim() || '协同记录与事实截图凭证',
      },
    ]);
    setDraftEvName('');
    setDraftEvSummary('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim() || !factDescription.trim()) {
      setError('请完整填写事件标题与事实经过描述。');
      return;
    }
    if (!accusedEmpId || accusedEmpId === currentUser.id) {
      setError('请选择有效的被问责责任人。');
      return;
    }
    if (accusedDeptIds.length === 0) {
      setError('请至少选择一个涉及责任的部门。');
      return;
    }

    const allEvs = [...evidences];
    if (draftEvName.trim()) {
      allEvs.push({
        name: draftEvName.trim(),
        summary: draftEvSummary.trim() || '协同记录与事实截图凭证',
      });
    }

    const primaryEv = allEvs[0] || {
      name: '协同记录与事实截图凭证.pdf',
      summary: '提报阶段上传事实佐证材料',
    };

    await onSubmit({
      title: title.trim(),
      factDescription: factDescription.trim(),
      incidentDate,
      isConfidential,
      accusedEmpId,
      accusedDeptIds,
      isMajorAccident,
      evidenceName: primaryEv.name,
      evidenceSummary: primaryEv.summary,
      extraEvidences: allEvs.slice(1),
    });

    setTitle('');
    setSelectedRubricId('');
    setFactDescription('');
    setEvidences([]);
    setDraftEvName('');
    setDraftEvSummary('');
    setIsConfidential(false);
    setIsMajorAccident(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-900" />
            <h2 className="text-base font-semibold text-slate-900">
              发起跨部门问责提报
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭提报窗口"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-800" />
              <span>关联《附件一：奖惩标尺》制度依据条款（可选，支持关键词检索）</span>
            </label>
            <CustomSelect
              value={selectedRubricId}
              onChange={handleSelectRubric}
              options={rubricOptions}
              searchable
              searchPlaceholder="搜索条款编号、关键词（如：ECN、泄密、造假、安全）..."
              size="sm"
            />
            {activeRubric && (
              <div className="mt-1.5 px-3 py-2 bg-blue-50/70 border border-blue-200 rounded-md text-[11px] text-blue-900 flex flex-wrap items-center justify-between gap-2">
                <span>
                  标尺参考分值（1分=¥100）：批评 {activeRubric.tier1Label} · 警告{' '}
                  {activeRubric.tier2Label} · 记过 {activeRubric.tier3Label}
                </span>
                {activeRubric.hasTerminationRisk && (
                  <span className="font-semibold text-red-700">
                    含解除劳动合同红线风险
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              问责事件标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：交付清单遗漏安全补丁导致政企客户验收退回"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                被问责主要责任人（支持按姓名/工号/部门检索）*
              </label>
              <CustomSelect
                value={accusedEmpId}
                onChange={handleEmpChange}
                options={employeeOptions}
                searchable
                searchPlaceholder="输入姓名、工号或部门..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                事发日期 *
              </label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              涉及责任部门（多选将自动判定为多部门协作事件并触发 ER 协调）*
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {departments.map((dept) => {
                const checked = accusedDeptIds.includes(dept.id);
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDept(dept.id)}
                    className={`px-3 py-2 text-xs rounded-lg border text-left transition-colors ${
                      checked
                        ? 'bg-blue-50 border-blue-600 text-blue-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {dept.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              客观事实与影响描述 *
            </label>
            <textarea
              rows={3}
              value={factDescription}
              onChange={(e) => setFactDescription(e.target.value)}
              placeholder="请按时间线陈述跨部门协同失误事实、对应制度或协议要求及产生的实际业务影响..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Evidence Multi-Uploader */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                事实证据与附件清单
              </label>
              <label className="px-2.5 py-1 text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer inline-flex items-center gap-1">
                <FileUp className="w-3.5 h-3.5" />
                <span>选择本地文件</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={draftEvName}
                onChange={(e) => setDraftEvName(e.target.value)}
                placeholder="或手动录入凭证文件名（如：钉钉群沟通截图.png）"
                className="sm:col-span-5 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={draftEvSummary}
                onChange={(e) => setDraftEvSummary(e.target.value)}
                placeholder="证据核心要点说明"
                className="sm:col-span-5 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddDraftEvidence}
                className="sm:col-span-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                添加附件
              </button>
            </div>

            {evidences.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {evidences.map((ev, idx) => (
                  <div
                    key={`${ev.name}-${idx}`}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800">{ev.name}</span>
                      <span className="text-slate-500 truncate">— {ev.summary}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEvidences((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-slate-400 hover:text-red-600 p-1"
                      aria-label="移除附件"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Protection & Major Accident Options */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-blue-900 focus:ring-blue-600"
              />
              <div>
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-800" />
                  <span>启用【实名保密提报】保护机制</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  勾选后，双方部门领导、普通 HRBP 及被问责人均仅见脱敏匿名标识；仅 ER 负责人与 HRD 可在写入强审计日志后解密查验。
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isMajorAccident}
                onChange={(e) => setIsMajorAccident(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-red-700 focus:ring-red-600"
              />
              <div>
                <div className="text-xs font-semibold text-red-800">
                  标记为【重大事故】（直接启动 ER 调查并上报总经理/董事长终审）
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  适用于严重生产故障、重大违约赔偿或触及公司红线事件。
                </p>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? '提交处理中...' : '提交问责工单并推送钉钉待办'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
