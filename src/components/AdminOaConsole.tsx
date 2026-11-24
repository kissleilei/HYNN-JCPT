import React, { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { PHASE2_DEPARTMENTS } from '../data/phase2SeedData';
import { NewDingTalkMemberInput } from '../hooks/usePhase2Platform';
import {
  DingTalkMember,
  DingTalkStatus,
  OaSubmission,
  OaSubmissionStatus,
} from '../types/phase2';
import { CustomSelect } from './CustomSelect';
import { SectionHeader } from './SectionHeader';

interface AdminOaConsoleProps {
  user: User | null;
  isAdmin: boolean;
  publicityFromDb: boolean;
  directoryFromDb: boolean;
  dingtalkStatus: DingTalkStatus;
  dingtalkMembers: DingTalkMember[];
  oaSubmissions: OaSubmission[];
  busyAction: string | null;
  onSignIn: () => Promise<boolean>;
  onSeedDefaults: () => Promise<void>;
  onSyncDingTalk: () => Promise<{ syncedCount: number; source: string }>;
  onAddMember: (member: NewDingTalkMemberInput) => Promise<void>;
  onAdvanceOa: (
    submission: OaSubmission,
    nextStatus: OaSubmissionStatus,
    reviewNote: string,
    publishToBoard: boolean
  ) => Promise<void>;
  onNotify: (message: string) => void;
}

export const AdminOaConsole: React.FC<AdminOaConsoleProps> = ({
  user,
  isAdmin,
  publicityFromDb,
  directoryFromDb,
  dingtalkStatus,
  dingtalkMembers,
  oaSubmissions,
  busyAction,
  onSignIn,
  onSeedDefaults,
  onSyncDingTalk,
  onAddMember,
  onAdvanceOa,
  onNotify,
}) => {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [publishFlags, setPublishFlags] = useState<Record<string, boolean>>({});

  // New DingTalk member form
  const [newDtId, setNewDtId] = useState('');
  const [newEmpNo, setNewEmpNo] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState<string>(PHASE2_DEPARTMENTS[0]);
  const [newTitle, setNewTitle] = useState('');
  const [newRoleTag, setNewRoleTag] = useState<NewDingTalkMemberInput['oaRoleTag']>('staff');

  const handleSeed = async () => {
    try {
      await onSeedDefaults();
      onNotify('已将当月公示栏、制度文档与钉钉人员台账同步初始化至云端数据库');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : '初始化云端数据失败');
    }
  };

  const handleSyncContacts = async () => {
    try {
      const res = await onSyncDingTalk();
      onNotify(
        res.source === 'dingtalk_live'
          ? `已从企业钉钉 OpenAPI 拉取并同步 ${res.syncedCount} 名人员到云端通讯录`
          : `已同步 ${res.syncedCount} 名标准组织架构人员至云端通讯录（当前钉钉为预览模式）`
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : '同步钉钉通讯录失败');
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDtId.trim() || !newEmpNo.trim() || !newName.trim() || !newTitle.trim()) {
      onNotify('请完整填写钉钉 UserId、工号、姓名与职务');
      return;
    }
    try {
      await onAddMember({
        dingtalkUserId: newDtId,
        empNo: newEmpNo,
        name: newName,
        deptName: newDept,
        title: newTitle,
        oaRoleTag: newRoleTag,
      });
      onNotify(`已新增钉钉人员映射：${newName}（${newDept}）`);
      setNewDtId('');
      setNewEmpNo('');
      setNewName('');
      setNewTitle('');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : '新增人员失败');
    }
  };

  const handleTransition = async (
    sub: OaSubmission,
    nextStatus: OaSubmissionStatus
  ) => {
    const note = (reviewNotes[sub.id] || '').trim();
    if (nextStatus === 'rejected' && !note) {
      onNotify('驳回退回提报人时必须填写书面驳回意见（便于提报人修改重提与合规留痕）');
      return;
    }

    const publish = publishFlags[sub.id] ?? true;
    try {
      await onAdvanceOa(sub, nextStatus, note, publish);
      if (nextStatus === 'pending_execution') {
        onNotify(`② 二级审批已同意并 ③ 抄送一级负责人，流转至 ④ 综合管理部归档`);
      } else if (nextStatus === 'executed_published') {
        onNotify(
          publish
            ? `④ 综合管理部已归档（留存至离职后 2 年）并同步上墙至当月奖惩公示栏`
            : `④ 综合管理部已确认归档（留存员工档案至离职后 2 年）`
        );
      } else {
        onNotify(`已签署驳回意见并退回第 ① 步，等待提报人修改后重新提交`);
      }
    } catch (err) {
      onNotify(err instanceof Error ? err.message : '审批操作失败');
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-8 max-w-2xl mx-auto text-center space-y-4 shadow-xs">
        <span className="w-12 h-12 rounded-2xl bg-[#EEF5FF] text-[#1E62D0] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-slate-900">
            后台审批与钉钉通讯录控制台（管理员权限）
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            普通员工可免登录浏览「当月奖惩公示栏」「制度与积分规则」，登录后可发起「奖惩提报 OA」。本控制台仅限综合管理部 / 奖惩委员会授权管理员账号（
            <span className="font-mono-tabular">1341646817@qq.com</span>）登录操作。
          </p>
        </div>
        {!user ? (
          <button
            type="button"
            onClick={() => onSignIn()}
            className="btn-brand px-5 py-2.5 text-xs font-medium rounded-xl"
          >
            使用管理员 Google 账号登录
          </button>
        ) : (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            当前账号（{user.email}）为普通员工权限，无法操作后台审批台与钉钉同步配置。
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Status Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <SectionHeader icon={Database} title="企业云端数据库台账状态" />
              <span
                className={`text-xs font-semibold shrink-0 ${
                  publicityFromDb ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {publicityFromDb ? '云端实时数据已激活' : '尚未初始化演示台账'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              一键将二期初始公示记录、制度宣导章节及标准钉钉组织人员写入云端数据库，供全员实时查阅与点赞交互。
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              通讯录来源：{directoryFromDb ? '云端数据库' : '本地预设'}
            </span>
            <button
              type="button"
              onClick={handleSeed}
              disabled={busyAction === 'seed_db'}
              className="btn-brand px-3.5 py-2 text-xs font-medium disabled:opacity-60 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                {busyAction === 'seed_db' ? '正在写入...' : '初始化 / 重置云端基础台账'}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <SectionHeader icon={Server} title="钉钉企业 OpenAPI 网关状态" />
              <span
                className={`text-xs font-semibold shrink-0 ${
                  dingtalkStatus.mode === 'live' ? 'text-emerald-700' : 'text-slate-600'
                }`}
              >
                {dingtalkStatus.mode === 'live' ? '生产直连模式' : '结构化预览模式'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {dingtalkStatus.message}。如需启用企业真实钉钉通讯录同步与 OA 审批单自动触发，请在部署环境变量（Secrets）中配置{' '}
              <span className="font-mono-tabular text-slate-800">
                DINGTALK_APP_KEY / DINGTALK_APP_SECRET / DINGTALK_PROCESS_CODE
              </span>
              。
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-mono-tabular">
              审批模板：{dingtalkStatus.hasProcessCode ? '已配置' : '默认模板'} · 群通知：
              {dingtalkStatus.hasWebhook ? '已开启' : '未配置'}
            </span>
            <button
              type="button"
              onClick={handleSyncContacts}
              disabled={busyAction === 'sync_dingtalk'}
              className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:border-[#2F6FE4]/40 hover:text-[#1E62D0] hover:bg-[#EEF5FF]/60 disabled:opacity-60 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${busyAction === 'sync_dingtalk' ? 'animate-spin' : ''}`}
              />
              <span>同步钉钉组织人员</span>
            </button>
          </div>
        </div>
      </section>

      {/* OA 4-Step Approval & Archiving Queue */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
        <SectionHeader
          icon={ShieldCheck}
          title="② 二级审批 · ③ 抄送一级 · ④ 综合管理部归档工作台"
          subtitle="审核环节驳回须填写书面意见（退回提报人修改重提）；同意后知会一级负责人并由综合管理部归档留存至离职后 2 年"
          extra={
            <span className="text-xs font-mono-tabular text-slate-500">
              全部提报：{oaSubmissions.length} 笔
            </span>
          }
        />

        {oaSubmissions.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
            当前云端数据库暂无员工提报的 OA 审批单据
          </div>
        ) : (
          <div className="space-y-3">
            {oaSubmissions.map((sub) => {
              const publishChecked = publishFlags[sub.id] ?? true;
              const busy = busyAction === `oa_${sub.id}`;
              return (
                <div
                  key={sub.id}
                  className="rounded-xl p-4 space-y-3 bg-slate-50/80"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono-tabular font-semibold text-slate-900">
                          {sub.submissionNo}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          对象：{sub.targetName}（{sub.targetDeptName}）
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold font-mono-tabular ${
                            sub.category === 'reward' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {sub.gradeName} {sub.points >= 0 ? `+${sub.points}` : sub.points} 分
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{sub.title}</div>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {sub.factDescription}
                      </p>
                      <div className="text-[11px] text-slate-500">
                        ② 二级审：{sub.approverName} → ③ 抄送一级：{sub.ccNames.join('、') || '无'} → ④ 归档：{sub.executorName} · 实例号：
                        <span className="font-mono-tabular">
                          {sub.dingtalkProcessInstanceId || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-medium shrink-0">
                      {sub.status === 'pending_approval' && (
                        <span className="text-amber-800">② 待二级部门负责人审批</span>
                      )}
                      {sub.status === 'pending_execution' && (
                        <span className="text-[#1E62D0]">③ 已抄送 · 待 ④ 综合部归档</span>
                      )}
                      {sub.status === 'executed_published' && (
                        <span className="text-emerald-700 inline-flex items-center gap-1">
                          <Archive className="w-3.5 h-3.5" />
                          <span>④ 已归档（离职后 2 年）</span>
                        </span>
                      )}
                      {sub.status === 'rejected' && (
                        <span className="text-rose-700">↩ 已驳回 · 等待提报人修改重提</span>
                      )}
                    </div>
                  </div>

                  {(sub.status === 'pending_approval' || sub.status === 'pending_execution') && (
                    <div className="pt-3 border-t border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2.5">
                        <input
                          type="text"
                          value={reviewNotes[sub.id] || ''}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value,
                            }))
                          }
                          placeholder="审批意见 / 归档结语（若选择驳回退回，此项必填）..."
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6FE4]"
                        />
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={publishChecked}
                            onChange={(e) =>
                              setPublishFlags((prev) => ({
                                ...prev,
                                [sub.id]: e.target.checked,
                              }))
                            }
                            className="rounded border-slate-300 text-[#1E62D0]"
                          />
                          <span>归档时同步上墙至当月公示栏</span>
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {sub.status === 'pending_approval' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleTransition(sub, 'pending_execution')}
                            className="px-3 py-1.5 text-xs font-medium text-[#1E62D0] bg-[#EEF5FF] border border-[#BFD8FD] hover:bg-[#DBE9FE] rounded-xl"
                          >
                            ② 同意并 ③ 抄送一级
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleTransition(sub, 'executed_published')}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>④ 综合部确认归档</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleTransition(sub, 'rejected')}
                          className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>驳回退回第 1 步</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* DingTalk Corporate Directory Management */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
        <SectionHeader
          icon={Users}
          title="钉钉通讯录与 OA 节点人员映射表"
          subtitle="维护可用于 OA 提报选择的当事人员、二级部门审核人、综合管理部归档人及一级抄送人"
          extra={
            <span className="text-xs font-mono-tabular text-slate-500">
              在册 {dingtalkMembers.length} 人
            </span>
          }
        />

        <form
          onSubmit={handleAddMemberSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 bg-slate-50/90 rounded-xl p-3.5"
        >
          <input
            type="text"
            value={newDtId}
            onChange={(e) => setNewDtId(e.target.value)}
            placeholder="钉钉 UserId（英文/数字）"
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FE4]"
          />
          <input
            type="text"
            value={newEmpNo}
            onChange={(e) => setNewEmpNo(e.target.value)}
            placeholder="工号（如 E12001）"
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FE4]"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="姓名"
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FE4]"
          />
          <CustomSelect
            size="sm"
            value={newDept}
            onChange={setNewDept}
            options={PHASE2_DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="职务名称"
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FE4]"
          />
          <CustomSelect
            size="sm"
            value={newRoleTag}
            onChange={(val) =>
              setNewRoleTag(val as NewDingTalkMemberInput['oaRoleTag'])
            }
            options={[
              { value: 'staff', label: '普通员工' },
              { value: 'approver', label: '② 二级审核人' },
              { value: 'executor', label: '④ 综合部归档' },
              { value: 'cc_default', label: '③ 一级抄送人' },
            ]}
          />
          <button
            type="submit"
            disabled={busyAction === 'add_member'}
            className="btn-brand px-3 py-1.5 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>新增映射</span>
          </button>
        </form>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2 px-3 font-semibold">工号 / 钉钉 ID</th>
                <th className="py-2 px-3 font-semibold">姓名</th>
                <th className="py-2 px-3 font-semibold">所属部门</th>
                <th className="py-2 px-3 font-semibold">岗位职务</th>
                <th className="py-2 px-3 font-semibold">默认 OA 角色</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dingtalkMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-mono-tabular text-slate-600">
                    {m.empNo} · {m.dingtalkUserId}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900">{m.name}</td>
                  <td className="py-2 px-3 text-slate-700">{m.deptName}</td>
                  <td className="py-2 px-3 text-slate-600">{m.title}</td>
                  <td className="py-2 px-3 text-slate-700">
                    {m.oaRoleTag === 'approver'
                      ? '② 二级部门审核人'
                      : m.oaRoleTag === 'executor'
                      ? '④ 综合管理部归档'
                      : m.oaRoleTag === 'cc_default'
                      ? '③ 一级部门抄送人'
                      : '普通员工'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
