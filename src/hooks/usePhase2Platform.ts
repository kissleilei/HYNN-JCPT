import { useCallback, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  testConnection,
} from '../firebase';
import {
  SEED_DINGTALK_DIRECTORY,
  SEED_POLICY_DOCS,
  SEED_PUBLICITY_RECORDS,
} from '../data/phase2SeedData';
import {
  DingTalkMember,
  DingTalkStatus,
  LearningRecord,
  OaSubmission,
  OaSubmissionStatus,
  PolicyDoc,
  PublicityRecord,
  RecordCategory,
} from '../types/phase2';

export interface OaSubmitInput {
  category: RecordCategory;
  title: string;
  targetDingtalkUserId: string;
  rubricCode?: string;
  gradeName: string;
  points: number;
  factDescription: string;
  evidenceName?: string;
  publicityMode: 'all_staff_public' | 'desensitized_warning' | 'dept_only';
  isConfidential: boolean;
  approverDingtalkUserId: string;
  executorDingtalkUserId: string;
  ccDingtalkUserIds: string[];
}

export interface NewDingTalkMemberInput {
  dingtalkUserId: string;
  empNo: string;
  name: string;
  deptName: string;
  title: string;
  oaRoleTag: 'staff' | 'approver' | 'executor' | 'cc_default';
}

function getSafeDisplayName(user: User | null): string {
  if (!user) return '访客员工';
  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim().slice(0, 60);
  }
  if (user.email) {
    return user.email.split('@')[0].slice(0, 60);
  }
  return '恒翼能员工';
}

function sanitizeId(raw: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned.slice(0, 80) || `id_${Date.now()}`;
}

export function usePhase2Platform() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [publicityRecords, setPublicityRecords] = useState<PublicityRecord[]>(
    SEED_PUBLICITY_RECORDS
  );
  const [publicityFromDb, setPublicityFromDb] = useState(false);
  const [dbPublicityIds, setDbPublicityIds] = useState<Record<string, boolean>>({});

  const [policyDocs, setPolicyDocs] = useState<PolicyDoc[]>(SEED_POLICY_DOCS);
  const [policyFromDb, setPolicyFromDb] = useState(false);

  const [dingtalkMembers, setDingtalkMembers] = useState<DingTalkMember[]>(
    SEED_DINGTALK_DIRECTORY
  );
  const [directoryFromDb, setDirectoryFromDb] = useState(false);

  const [oaSubmissions, setOaSubmissions] = useState<OaSubmission[]>([]);
  const [learningRecord, setLearningRecord] = useState<LearningRecord | null>(null);

  const [dingtalkStatus, setDingtalkStatus] = useState<DingTalkStatus>({
    configured: false,
    hasProcessCode: false,
    hasWebhook: false,
    mode: 'sandbox',
    message: '正在检测钉钉开放平台网关状态...',
  });

  const [localKudosVotedIds, setLocalKudosVotedIds] = useState<Record<string, boolean>>({});
  const [localAckVotedIds, setLocalAckVotedIds] = useState<Record<string, boolean>>({});
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(true);

  // Startup connection check & DingTalk gateway status check
  useEffect(() => {
    let active = true;
    testConnection().then((ok) => {
      if (active) setDbConnected(ok);
    });

    fetch('/api/dingtalk/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DingTalkStatus | null) => {
        if (active && data) {
          setDingtalkStatus(data);
        }
      })
      .catch(() => {
        if (active) {
          setDingtalkStatus({
            configured: false,
            hasProcessCode: false,
            hasWebhook: false,
            mode: 'sandbox',
            message: '当前为纯前端预览或未启动 Node 服务端，OA 提报将以结构化留痕模式运行',
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Auth listener + admin role verification
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      const emailMatch =
        Boolean(nextUser.emailVerified) && nextUser.email === BOOTSTRAP_ADMIN_EMAIL;
      if (emailMatch) {
        setIsAdmin(true);
        setAuthReady(true);
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
        setIsAdmin(adminSnap.exists());
      } catch {
        setIsAdmin(false);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Publicly accessible listeners: published publicity board + published policy docs
  useEffect(() => {
    const pubQuery = query(
      collection(db, 'publicity_records'),
      where('isPublished', '==', true)
    );
    const unsubPub = onSnapshot(
      pubQuery,
      (snap) => {
        if (!snap.empty) {
          const rows = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              recordNo: String(data.recordNo || ''),
              month: String(data.month || '2026-11'),
              category: (data.category === 'punishment' ? 'punishment' : 'reward') as RecordCategory,
              title: String(data.title || ''),
              employeeName: String(data.employeeName || ''),
              departmentName: String(data.departmentName || ''),
              gradeName: String(data.gradeName || ''),
              points: Number(data.points || 0),
              summary: String(data.summary || ''),
              lessonOrHighlight:
                typeof data.lessonOrHighlight === 'string' ? data.lessonOrHighlight : undefined,
              dingtalkApproverName:
                typeof data.dingtalkApproverName === 'string'
                  ? data.dingtalkApproverName
                  : undefined,
              dingtalkExecutorName:
                typeof data.dingtalkExecutorName === 'string'
                  ? data.dingtalkExecutorName
                  : undefined,
              isPublished: Boolean(data.isPublished),
              kudosCount: Number(data.kudosCount || 0),
              ackCount: Number(data.ackCount || 0),
              authorUid: String(data.authorUid || ''),
            } satisfies PublicityRecord;
          });
          const existingIds: Record<string, boolean> = {};
          rows.forEach((r) => {
            existingIds[r.id] = true;
          });
          setDbPublicityIds(existingIds);
          const missingSeeds = SEED_PUBLICITY_RECORDS.filter((s) => !existingIds[s.id]);
          const combined = [...rows, ...missingSeeds];
          combined.sort((a, b) => b.recordNo.localeCompare(a.recordNo));
          setPublicityRecords(combined);
          setPublicityFromDb(true);
        } else {
          setDbPublicityIds({});
          setPublicityRecords(SEED_PUBLICITY_RECORDS);
          setPublicityFromDb(false);
        }
      },
      (err) => {
        console.warn('Publicity listener fallback to seed data:', err);
      }
    );

    const polQuery = query(
      collection(db, 'policy_docs'),
      where('isPublished', '==', true)
    );
    const unsubPol = onSnapshot(
      polQuery,
      (snap) => {
        if (!snap.empty) {
          const rows = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              code: String(data.code || ''),
              title: String(data.title || ''),
              category: String(data.category || ''),
              summary: String(data.summary || ''),
              content: String(data.content || ''),
              orderIndex: Number(data.orderIndex || 0),
              isPublished: Boolean(data.isPublished),
              updatedByUid: String(data.updatedByUid || ''),
            } satisfies PolicyDoc;
          });
          rows.sort((a, b) => a.orderIndex - b.orderIndex);
          setPolicyDocs(rows);
          setPolicyFromDb(true);
        } else {
          setPolicyDocs(SEED_POLICY_DOCS);
          setPolicyFromDb(false);
        }
      },
      (err) => {
        console.warn('Policy docs listener fallback to seed data:', err);
      }
    );

    return () => {
      unsubPub();
      unsubPol();
    };
  }, []);

  // Authenticated-only listeners: directory, personal learning record, and OA submissions
  useEffect(() => {
    if (!authReady || !user) {
      setOaSubmissions([]);
      setLearningRecord(null);
      setDingtalkMembers(SEED_DINGTALK_DIRECTORY);
      setDirectoryFromDb(false);
      return;
    }

    const dirQuery = query(
      collection(db, 'dingtalk_directory'),
      where('isActive', '==', true)
    );
    const unsubDir = onSnapshot(
      dirQuery,
      (snap) => {
        if (!snap.empty) {
          const rows = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              dingtalkUserId: String(data.dingtalkUserId || ''),
              empNo: String(data.empNo || ''),
              name: String(data.name || ''),
              deptName: String(data.deptName || ''),
              title: String(data.title || ''),
              oaRoleTag: (data.oaRoleTag || 'staff') as DingTalkMember['oaRoleTag'],
              isActive: Boolean(data.isActive),
              updatedByUid: String(data.updatedByUid || ''),
            } satisfies DingTalkMember;
          });
          rows.sort((a, b) => a.empNo.localeCompare(b.empNo));
          setDingtalkMembers(rows);
          setDirectoryFromDb(true);
        } else {
          setDingtalkMembers(SEED_DINGTALK_DIRECTORY);
          setDirectoryFromDb(false);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'dingtalk_directory');
      }
    );

    const learnDocRef = doc(db, 'learning_records', user.uid);
    const unsubLearn = onSnapshot(
      learnDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setLearningRecord({
            id: snap.id,
            userUid: String(data.userUid || user.uid),
            learnerName: String(data.learnerName || getSafeDisplayName(user)),
            completedModuleIds: Array.isArray(data.completedModuleIds)
              ? data.completedModuleIds.map(String)
              : [],
            quizScore: Number(data.quizScore || 0),
            quizPassed: Boolean(data.quizPassed),
          });
        } else {
          setLearningRecord(null);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `learning_records/${user.uid}`);
      }
    );

    const isBootstrapEmailAdmin =
      Boolean(user.emailVerified) && user.email === BOOTSTRAP_ADMIN_EMAIL;
    const oaQuery = isBootstrapEmailAdmin
      ? collection(db, 'oa_submissions')
      : query(collection(db, 'oa_submissions'), where('authorUid', '==', user.uid));

    const unsubOa = onSnapshot(
      oaQuery,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            submissionNo: String(data.submissionNo || ''),
            category: (data.category === 'punishment' ? 'punishment' : 'reward') as RecordCategory,
            title: String(data.title || ''),
            targetDingtalkUserId: String(data.targetDingtalkUserId || ''),
            targetName: String(data.targetName || ''),
            targetDeptName: String(data.targetDeptName || ''),
            rubricCode: typeof data.rubricCode === 'string' ? data.rubricCode : undefined,
            gradeName: String(data.gradeName || ''),
            points: Number(data.points || 0),
            factDescription: String(data.factDescription || ''),
            evidenceName: typeof data.evidenceName === 'string' ? data.evidenceName : undefined,
            publicityMode: (data.publicityMode || 'all_staff_public') as OaSubmission['publicityMode'],
            isConfidential: Boolean(data.isConfidential),
            approverDingtalkUserId: String(data.approverDingtalkUserId || ''),
            approverName: String(data.approverName || ''),
            executorDingtalkUserId: String(data.executorDingtalkUserId || ''),
            executorName: String(data.executorName || ''),
            ccNames: Array.isArray(data.ccNames) ? data.ccNames.map(String) : [],
            status: (data.status || 'pending_approval') as OaSubmissionStatus,
            dingtalkSyncStatus: (data.dingtalkSyncStatus || 'pending') as OaSubmission['dingtalkSyncStatus'],
            dingtalkProcessInstanceId:
              typeof data.dingtalkProcessInstanceId === 'string'
                ? data.dingtalkProcessInstanceId
                : undefined,
            reviewNote: typeof data.reviewNote === 'string' ? data.reviewNote : undefined,
            submitterName: String(data.submitterName || ''),
            authorUid: String(data.authorUid || ''),
          } satisfies OaSubmission;
        });
        rows.sort((a, b) => b.submissionNo.localeCompare(a.submissionNo));
        setOaSubmissions(rows);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'oa_submissions');
      }
    );

    return () => {
      unsubDir();
      unsubLearn();
      unsubOa();
    };
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async () => {
    setBusyAction('auth');
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      return false;
    } finally {
      setBusyAction(null);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const toggleKudos = useCallback(
    async (recordId: string): Promise<{ ok: boolean; persisted: boolean }> => {
      if (localKudosVotedIds[recordId]) {
        return { ok: false, persisted: false };
      }
      setLocalKudosVotedIds((prev) => ({ ...prev, [recordId]: true }));

      if (publicityFromDb && dbPublicityIds[recordId] && user && user.emailVerified) {
        try {
          await updateDoc(doc(db, 'publicity_records', recordId), {
            kudosCount: increment(1),
            updatedAt: serverTimestamp(),
          });
          return { ok: true, persisted: true };
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `publicity_records/${recordId}`);
        }
      }

      setPublicityRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, kudosCount: r.kudosCount + 1 } : r))
      );
      return { ok: true, persisted: false };
    },
    [dbPublicityIds, localKudosVotedIds, publicityFromDb, user]
  );

  const toggleAck = useCallback(
    async (recordId: string): Promise<{ ok: boolean; persisted: boolean }> => {
      if (localAckVotedIds[recordId]) {
        return { ok: false, persisted: false };
      }
      setLocalAckVotedIds((prev) => ({ ...prev, [recordId]: true }));

      if (publicityFromDb && dbPublicityIds[recordId] && user && user.emailVerified) {
        try {
          await updateDoc(doc(db, 'publicity_records', recordId), {
            ackCount: increment(1),
            updatedAt: serverTimestamp(),
          });
          return { ok: true, persisted: true };
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `publicity_records/${recordId}`);
        }
      }

      setPublicityRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, ackCount: r.ackCount + 1 } : r))
      );
      return { ok: true, persisted: false };
    },
    [dbPublicityIds, localAckVotedIds, publicityFromDb, user]
  );

  const saveLearningProgress = useCallback(
    async (completedModuleIds: string[], quizScore: number, quizPassed: boolean) => {
      if (!user || !user.emailVerified) {
        throw new Error('请先登录企业授权的 Google 账号后再保存学习档案');
      }

      const cleanModules = Array.from(new Set(completedModuleIds)).slice(0, 30);
      const boundedScore = Math.max(0, Math.min(100, Math.round(quizScore)));
      const learnerName = getSafeDisplayName(user);
      const docRef = doc(db, 'learning_records', user.uid);

      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          await updateDoc(docRef, {
            learnerName,
            completedModuleIds: cleanModules,
            quizScore: boundedScore,
            quizPassed,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(docRef, {
            userUid: user.uid,
            learnerName,
            completedModuleIds: cleanModules,
            quizScore: boundedScore,
            quizPassed,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `learning_records/${user.uid}`);
      }
    },
    [user]
  );

  const submitOaApplication = useCallback(
    async (input: OaSubmitInput): Promise<OaSubmission> => {
      if (!user || !user.emailVerified) {
        throw new Error('请先使用 Google 账号登录后再提报 OA 审批单');
      }

      const targetMember = dingtalkMembers.find(
        (m) => m.dingtalkUserId === input.targetDingtalkUserId
      );
      const approverMember = dingtalkMembers.find(
        (m) => m.dingtalkUserId === input.approverDingtalkUserId
      );
      const executorMember = dingtalkMembers.find(
        (m) => m.dingtalkUserId === input.executorDingtalkUserId
      );

      if (!targetMember || !approverMember || !executorMember) {
        throw new Error('请选择有效的当事员工、钉钉审核人与执行人');
      }

      const ccMembers = dingtalkMembers.filter((m) =>
        input.ccDingtalkUserIds.includes(m.dingtalkUserId)
      );
      const ccNames = ccMembers.map((m) => `${m.name}（${m.deptName}）`).slice(0, 20);
      const ccUserIds = ccMembers.map((m) => m.dingtalkUserId).slice(0, 20);

      const now = new Date();
      const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const randomTail = Math.random().toString(36).slice(2, 6).toUpperCase();
      const submissionNo = `OA-${monthStr}-${randomTail}`;
      const submissionId = `oa_${Date.now()}_${randomTail.toLowerCase()}`;
      const submitterName = getSafeDisplayName(user);

      setBusyAction('submit_oa');
      try {
        const docPayload: Record<string, unknown> = {
          submissionNo,
          category: input.category,
          title: input.title.trim().slice(0, 160),
          targetDingtalkUserId: sanitizeId(targetMember.dingtalkUserId),
          targetName: targetMember.name.slice(0, 60),
          targetDeptName: targetMember.deptName.slice(0, 80),
          gradeName: input.gradeName.trim().slice(0, 40),
          points: Number(input.points),
          factDescription: input.factDescription.trim().slice(0, 1500),
          publicityMode: input.publicityMode,
          isConfidential: Boolean(input.isConfidential),
          approverDingtalkUserId: sanitizeId(approverMember.dingtalkUserId),
          approverName: `${approverMember.name}（${approverMember.title}）`.slice(0, 60),
          executorDingtalkUserId: sanitizeId(executorMember.dingtalkUserId),
          executorName: `${executorMember.name}（${executorMember.title}）`.slice(0, 60),
          ccNames,
          status: 'pending_approval',
          dingtalkSyncStatus: 'pending',
          submitterName,
          authorUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (input.rubricCode && input.rubricCode.trim()) {
          docPayload.rubricCode = input.rubricCode.trim().slice(0, 40);
        }
        if (input.evidenceName && input.evidenceName.trim()) {
          docPayload.evidenceName = input.evidenceName.trim().slice(0, 200);
        }

        await setDoc(doc(db, 'oa_submissions', submissionId), docPayload);

        let nextSyncStatus: OaSubmission['dingtalkSyncStatus'] = 'queued_sandbox';
        let processInstanceId = `DT-OA-${Date.now().toString(36).toUpperCase()}`;

        try {
          const resp = await fetch('/api/dingtalk/oa-dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submissionNo,
              category: input.category,
              title: input.title.trim().slice(0, 160),
              targetDingtalkUserId: targetMember.dingtalkUserId,
              targetName: targetMember.name,
              targetDeptName: targetMember.deptName,
              gradeName: input.gradeName,
              points: Number(input.points),
              factDescription: input.factDescription.trim().slice(0, 1500),
              approverDingtalkUserId: approverMember.dingtalkUserId,
              approverName: approverMember.name,
              executorDingtalkUserId: executorMember.dingtalkUserId,
              executorName: executorMember.name,
              ccUserIds,
              ccNames,
              submitterName,
            }),
          });
          if (resp.ok) {
            const result = (await resp.json()) as {
              dingtalkSyncStatus?: OaSubmission['dingtalkSyncStatus'];
              dingtalkProcessInstanceId?: string;
            };
            if (result.dingtalkSyncStatus) nextSyncStatus = result.dingtalkSyncStatus;
            if (result.dingtalkProcessInstanceId) {
              processInstanceId = result.dingtalkProcessInstanceId.slice(0, 120);
            }
          }
        } catch {
          // Keep queued_sandbox fallback ID if offline/static mode
        }

        await updateDoc(doc(db, 'oa_submissions', submissionId), {
          dingtalkSyncStatus: nextSyncStatus,
          dingtalkProcessInstanceId: processInstanceId,
          updatedAt: serverTimestamp(),
        });

        return {
          id: submissionId,
          submissionNo,
          category: input.category,
          title: input.title.trim(),
          targetDingtalkUserId: targetMember.dingtalkUserId,
          targetName: targetMember.name,
          targetDeptName: targetMember.deptName,
          rubricCode: input.rubricCode,
          gradeName: input.gradeName,
          points: Number(input.points),
          factDescription: input.factDescription.trim(),
          evidenceName: input.evidenceName,
          publicityMode: input.publicityMode,
          isConfidential: input.isConfidential,
          approverDingtalkUserId: approverMember.dingtalkUserId,
          approverName: `${approverMember.name}（${approverMember.title}）`,
          executorDingtalkUserId: executorMember.dingtalkUserId,
          executorName: `${executorMember.name}（${executorMember.title}）`,
          ccNames,
          status: 'pending_approval',
          dingtalkSyncStatus: nextSyncStatus,
          dingtalkProcessInstanceId: processInstanceId,
          submitterName,
          authorUid: user.uid,
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `oa_submissions/${submissionId}`);
      } finally {
        setBusyAction(null);
      }
    },
    [dingtalkMembers, user]
  );

  const submitMultiOaApplications = useCallback(
    async (inputs: OaSubmitInput[]): Promise<OaSubmission[]> => {
      if (!user || !user.emailVerified) {
        throw new Error('请先使用 Google 账号登录后再提报 OA 审批单');
      }
      if (inputs.length === 0) {
        throw new Error('请至少添加一位奖惩对象');
      }

      const now = new Date();
      const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const batchCode = Math.random().toString(36).slice(2, 6).toUpperCase();
      const submitterName = getSafeDisplayName(user);
      const createdList: OaSubmission[] = [];

      setBusyAction('submit_oa');
      try {
        for (let idx = 0; idx < inputs.length; idx += 1) {
          const input = inputs[idx];
          const targetMember = dingtalkMembers.find(
            (m) => m.dingtalkUserId === input.targetDingtalkUserId
          );
          const approverMember = dingtalkMembers.find(
            (m) => m.dingtalkUserId === input.approverDingtalkUserId
          );
          const executorMember = dingtalkMembers.find(
            (m) => m.dingtalkUserId === input.executorDingtalkUserId
          );

          if (!targetMember || !approverMember || !executorMember) {
            throw new Error(`第 ${idx + 1} 位对象或审批/归档人员信息无效`);
          }

          const ccMembers = dingtalkMembers.filter((m) =>
            input.ccDingtalkUserIds.includes(m.dingtalkUserId)
          );
          const ccNames = ccMembers.map((m) => `${m.name}（${m.deptName}）`).slice(0, 20);
          const ccUserIds = ccMembers.map((m) => m.dingtalkUserId).slice(0, 20);

          const suffix = inputs.length > 1 ? `-${String(idx + 1).padStart(2, '0')}` : '';
          const submissionNo = `OA-${monthStr}-${batchCode}${suffix}`;
          const submissionId = `oa_${Date.now()}_${batchCode.toLowerCase()}_${idx + 1}`;

          const docPayload: Record<string, unknown> = {
            submissionNo,
            category: input.category,
            title: input.title.trim().slice(0, 160),
            targetDingtalkUserId: sanitizeId(targetMember.dingtalkUserId),
            targetName: targetMember.name.slice(0, 60),
            targetDeptName: targetMember.deptName.slice(0, 80),
            gradeName: input.gradeName.trim().slice(0, 40),
            points: Number(input.points),
            factDescription: input.factDescription.trim().slice(0, 1500),
            publicityMode: input.publicityMode,
            isConfidential: Boolean(input.isConfidential),
            approverDingtalkUserId: sanitizeId(approverMember.dingtalkUserId),
            approverName: `${approverMember.name}（${approverMember.title}）`.slice(0, 60),
            executorDingtalkUserId: sanitizeId(executorMember.dingtalkUserId),
            executorName: `${executorMember.name}（${executorMember.title}）`.slice(0, 60),
            ccNames,
            status: 'pending_approval',
            dingtalkSyncStatus: 'pending',
            submitterName,
            authorUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          if (input.rubricCode && input.rubricCode.trim()) {
            docPayload.rubricCode = input.rubricCode.trim().slice(0, 40);
          }
          if (input.evidenceName && input.evidenceName.trim()) {
            docPayload.evidenceName = input.evidenceName.trim().slice(0, 200);
          }

          try {
            await setDoc(doc(db, 'oa_submissions', submissionId), docPayload);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `oa_submissions/${submissionId}`);
          }

          let nextSyncStatus: OaSubmission['dingtalkSyncStatus'] = 'queued_sandbox';
          let processInstanceId = `DT-OA-${Date.now().toString(36).toUpperCase()}${idx + 1}`;

          try {
            const resp = await fetch('/api/dingtalk/oa-dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                submissionNo,
                category: input.category,
                title: input.title.trim().slice(0, 160),
                targetDingtalkUserId: targetMember.dingtalkUserId,
                targetName: targetMember.name,
                targetDeptName: targetMember.deptName,
                gradeName: input.gradeName,
                points: Number(input.points),
                factDescription: input.factDescription.trim().slice(0, 1500),
                approverDingtalkUserId: approverMember.dingtalkUserId,
                approverName: approverMember.name,
                executorDingtalkUserId: executorMember.dingtalkUserId,
                executorName: executorMember.name,
                ccUserIds,
                ccNames,
                submitterName,
              }),
            });
            if (resp.ok) {
              const result = (await resp.json()) as {
                dingtalkSyncStatus?: OaSubmission['dingtalkSyncStatus'];
                dingtalkProcessInstanceId?: string;
              };
              if (result.dingtalkSyncStatus) nextSyncStatus = result.dingtalkSyncStatus;
              if (result.dingtalkProcessInstanceId) {
                processInstanceId = result.dingtalkProcessInstanceId.slice(0, 120);
              }
            }
          } catch {
            // Keep queued_sandbox fallback ID
          }

          try {
            await updateDoc(doc(db, 'oa_submissions', submissionId), {
              dingtalkSyncStatus: nextSyncStatus,
              dingtalkProcessInstanceId: processInstanceId,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `oa_submissions/${submissionId}`);
          }

          createdList.push({
            id: submissionId,
            submissionNo,
            category: input.category,
            title: input.title.trim(),
            targetDingtalkUserId: targetMember.dingtalkUserId,
            targetName: targetMember.name,
            targetDeptName: targetMember.deptName,
            rubricCode: input.rubricCode,
            gradeName: input.gradeName,
            points: Number(input.points),
            factDescription: input.factDescription.trim(),
            evidenceName: input.evidenceName,
            publicityMode: input.publicityMode,
            isConfidential: input.isConfidential,
            approverDingtalkUserId: approverMember.dingtalkUserId,
            approverName: `${approverMember.name}（${approverMember.title}）`,
            executorDingtalkUserId: executorMember.dingtalkUserId,
            executorName: `${executorMember.name}（${executorMember.title}）`,
            ccNames,
            status: 'pending_approval',
            dingtalkSyncStatus: nextSyncStatus,
            dingtalkProcessInstanceId: processInstanceId,
            submitterName,
            authorUid: user.uid,
          });
        }
        return createdList;
      } finally {
        setBusyAction(null);
      }
    },
    [dingtalkMembers, user]
  );

  const resubmitRejectedOa = useCallback(
    async (submission: OaSubmission, input: OaSubmitInput): Promise<OaSubmission> => {
      if (!user || !user.emailVerified) {
        throw new Error('请先使用 Google 账号登录后再重新提交');
      }
      if (submission.status !== 'rejected') {
        throw new Error('仅被驳回状态的审批单可修改重提');
      }

      const targetMember = dingtalkMembers.find(
        (m) => m.dingtalkUserId === input.targetDingtalkUserId
      );
      const approverMember = dingtalkMembers.find(
        (m) => m.dingtalkUserId === input.approverDingtalkUserId
      );
      const executorMember = dingtalkMembers.find(
        (m) => m.dingtalkUserId === input.executorDingtalkUserId
      );

      if (!targetMember || !approverMember || !executorMember) {
        throw new Error('请选择有效的当事员工、二级部门审核人与综合管理部归档人');
      }

      const ccMembers = dingtalkMembers.filter((m) =>
        input.ccDingtalkUserIds.includes(m.dingtalkUserId)
      );
      const ccNames = ccMembers.map((m) => `${m.name}（${m.deptName}）`).slice(0, 20);
      const ccUserIds = ccMembers.map((m) => m.dingtalkUserId).slice(0, 20);

      setBusyAction('submit_oa');
      try {
        let nextSyncStatus: OaSubmission['dingtalkSyncStatus'] = 'queued_sandbox';
        let processInstanceId = `DT-OA-${Date.now().toString(36).toUpperCase()}`;

        try {
          const resp = await fetch('/api/dingtalk/oa-dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submissionNo: submission.submissionNo,
              category: input.category,
              title: input.title.trim().slice(0, 160),
              targetDingtalkUserId: targetMember.dingtalkUserId,
              targetName: targetMember.name,
              targetDeptName: targetMember.deptName,
              gradeName: input.gradeName,
              points: Number(input.points),
              factDescription: input.factDescription.trim().slice(0, 1500),
              approverDingtalkUserId: approverMember.dingtalkUserId,
              approverName: approverMember.name,
              executorDingtalkUserId: executorMember.dingtalkUserId,
              executorName: executorMember.name,
              ccUserIds,
              ccNames,
              submitterName: submission.submitterName,
            }),
          });
          if (resp.ok) {
            const result = (await resp.json()) as {
              dingtalkSyncStatus?: OaSubmission['dingtalkSyncStatus'];
              dingtalkProcessInstanceId?: string;
            };
            if (result.dingtalkSyncStatus) nextSyncStatus = result.dingtalkSyncStatus;
            if (result.dingtalkProcessInstanceId) {
              processInstanceId = result.dingtalkProcessInstanceId.slice(0, 120);
            }
          }
        } catch {
          // fallback
        }

        const updatePayload: Record<string, unknown> = {
          category: input.category,
          title: input.title.trim().slice(0, 160),
          targetDingtalkUserId: sanitizeId(targetMember.dingtalkUserId),
          targetName: targetMember.name.slice(0, 60),
          targetDeptName: targetMember.deptName.slice(0, 80),
          rubricCode: (input.rubricCode || '').trim().slice(0, 40),
          gradeName: input.gradeName.trim().slice(0, 40),
          points: Number(input.points),
          factDescription: input.factDescription.trim().slice(0, 1500),
          evidenceName: (input.evidenceName || '').trim().slice(0, 200),
          publicityMode: input.publicityMode,
          isConfidential: Boolean(input.isConfidential),
          approverDingtalkUserId: sanitizeId(approverMember.dingtalkUserId),
          approverName: `${approverMember.name}（${approverMember.title}）`.slice(0, 60),
          executorDingtalkUserId: sanitizeId(executorMember.dingtalkUserId),
          executorName: `${executorMember.name}（${executorMember.title}）`.slice(0, 60),
          ccNames,
          status: 'pending_approval',
          dingtalkSyncStatus: nextSyncStatus,
          dingtalkProcessInstanceId: processInstanceId,
          updatedAt: serverTimestamp(),
        };

        await updateDoc(doc(db, 'oa_submissions', submission.id), updatePayload);

        return {
          ...submission,
          category: input.category,
          title: input.title.trim(),
          targetDingtalkUserId: targetMember.dingtalkUserId,
          targetName: targetMember.name,
          targetDeptName: targetMember.deptName,
          rubricCode: input.rubricCode,
          gradeName: input.gradeName,
          points: Number(input.points),
          factDescription: input.factDescription.trim(),
          evidenceName: input.evidenceName,
          publicityMode: input.publicityMode,
          isConfidential: input.isConfidential,
          approverDingtalkUserId: approverMember.dingtalkUserId,
          approverName: `${approverMember.name}（${approverMember.title}）`,
          executorDingtalkUserId: executorMember.dingtalkUserId,
          executorName: `${executorMember.name}（${executorMember.title}）`,
          ccNames,
          status: 'pending_approval',
          dingtalkSyncStatus: nextSyncStatus,
          dingtalkProcessInstanceId: processInstanceId,
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `oa_submissions/${submission.id}`);
      } finally {
        setBusyAction(null);
      }
    },
    [dingtalkMembers, user]
  );

  const advanceOaSubmission = useCallback(
    async (
      submission: OaSubmission,
      nextStatus: OaSubmissionStatus,
      reviewNote: string,
      publishToBoard: boolean
    ) => {
      if (!user || !isAdmin) {
        throw new Error('仅管理员可执行审批流转与上墙发布');
      }

      setBusyAction(`oa_${submission.id}`);
      try {
        const updatePayload: Record<string, unknown> = {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        };
        if (reviewNote.trim()) {
          updatePayload.reviewNote = reviewNote.trim().slice(0, 600);
        }
        await updateDoc(doc(db, 'oa_submissions', submission.id), updatePayload);

        if (nextStatus === 'executed_published' && publishToBoard) {
          const now = new Date();
          const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const ymCompact = month.replace('-', '');
          const pubId = `pub_${submission.id}`;
          const cleanNo = `HYN-${ymCompact}-${submission.submissionNo.slice(-4)}`.replace(
            /[^A-Z0-9-]/g,
            '0'
          );

          const displayEmployee =
            submission.publicityMode === 'desensitized_warning' &&
            submission.category === 'punishment'
              ? `${submission.targetName.slice(0, 1)}**（已脱敏）`
              : submission.targetName;

          const pubPayload: Record<string, unknown> = {
            recordNo: cleanNo,
            month,
            category: submission.category,
            title: submission.title.slice(0, 160),
            employeeName: displayEmployee.slice(0, 60),
            departmentName: submission.targetDeptName.slice(0, 80),
            gradeName: submission.gradeName.slice(0, 40),
            points: submission.points,
            summary: submission.factDescription.slice(0, 800),
            lessonOrHighlight: (
              reviewNote.trim() ||
              (submission.category === 'reward'
                ? '经 OA 审批执行并纳入月度正向表彰榜'
                : '经 OA 审批执行并纳入月度警示复盘台')
            ).slice(0, 500),
            dingtalkApproverName: submission.approverName.slice(0, 60),
            dingtalkExecutorName: submission.executorName.slice(0, 60),
            isPublished: true,
            kudosCount: 0,
            ackCount: 0,
            authorUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await setDoc(doc(db, 'publicity_records', pubId), pubPayload);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `oa_submissions/${submission.id}`);
      } finally {
        setBusyAction(null);
      }
    },
    [isAdmin, user]
  );

  const seedDatabaseDefaults = useCallback(async () => {
    if (!user || !isAdmin) {
      throw new Error('仅管理员可初始化云端数据台账');
    }

    setBusyAction('seed_db');
    try {
      const batch = writeBatch(db);

      for (const rec of SEED_PUBLICITY_RECORDS) {
        const ref = doc(db, 'publicity_records', rec.id);
        const payload: Record<string, unknown> = {
          recordNo: rec.recordNo,
          month: rec.month,
          category: rec.category,
          title: rec.title,
          employeeName: rec.employeeName,
          departmentName: rec.departmentName,
          gradeName: rec.gradeName,
          points: rec.points,
          summary: rec.summary,
          isPublished: true,
          kudosCount: rec.kudosCount,
          ackCount: rec.ackCount,
          authorUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (rec.lessonOrHighlight) payload.lessonOrHighlight = rec.lessonOrHighlight;
        if (rec.dingtalkApproverName) payload.dingtalkApproverName = rec.dingtalkApproverName;
        if (rec.dingtalkExecutorName) payload.dingtalkExecutorName = rec.dingtalkExecutorName;
        batch.set(ref, payload);
      }

      for (const pol of SEED_POLICY_DOCS) {
        batch.set(doc(db, 'policy_docs', pol.id), {
          code: pol.code,
          title: pol.title,
          category: pol.category,
          summary: pol.summary,
          content: pol.content,
          orderIndex: pol.orderIndex,
          isPublished: true,
          updatedByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const member of SEED_DINGTALK_DIRECTORY) {
        batch.set(doc(db, 'dingtalk_directory', member.id), {
          dingtalkUserId: member.dingtalkUserId,
          empNo: member.empNo,
          name: member.name,
          deptName: member.deptName,
          title: member.title,
          oaRoleTag: member.oaRoleTag,
          isActive: true,
          updatedByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'seed_batch');
    } finally {
      setBusyAction(null);
    }
  }, [isAdmin, user]);

  const syncDingTalkDirectory = useCallback(async (): Promise<{
    syncedCount: number;
    source: string;
  }> => {
    if (!user || !isAdmin) {
      throw new Error('仅管理员可执行钉钉组织通讯录同步');
    }

    setBusyAction('sync_dingtalk');
    try {
      const resp = await fetch('/api/dingtalk/contacts');
      if (!resp.ok) {
        throw new Error('钉钉接口请求失败');
      }
      const data = (await resp.json()) as {
        source: string;
        configured: boolean;
        members: {
          dingtalkUserId: string;
          empNo: string;
          name: string;
          deptName: string;
          title: string;
          oaRoleTag: 'staff' | 'approver' | 'executor' | 'cc_default';
        }[];
      };

      const targetMembers =
        data.configured && data.members.length > 0 ? data.members : SEED_DINGTALK_DIRECTORY;

      const batch = writeBatch(db);
      targetMembers.slice(0, 40).forEach((m, idx) => {
        const docId = sanitizeId(m.dingtalkUserId || `dt_${idx}`);
        batch.set(doc(db, 'dingtalk_directory', docId), {
          dingtalkUserId: sanitizeId(m.dingtalkUserId),
          empNo: m.empNo.slice(0, 32),
          name: m.name.slice(0, 60),
          deptName: m.deptName.slice(0, 80),
          title: m.title.slice(0, 80),
          oaRoleTag: m.oaRoleTag,
          isActive: true,
          updatedByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();

      return { syncedCount: targetMembers.length, source: data.source };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'dingtalk_directory_sync');
    } finally {
      setBusyAction(null);
    }
  }, [isAdmin, user]);

  const addDingTalkMember = useCallback(
    async (member: NewDingTalkMemberInput) => {
      if (!user || !isAdmin) {
        throw new Error('仅管理员可新增钉钉人员映射');
      }
      const cleanDtId = sanitizeId(member.dingtalkUserId);
      setBusyAction('add_member');
      try {
        await setDoc(doc(db, 'dingtalk_directory', cleanDtId), {
          dingtalkUserId: cleanDtId,
          empNo: member.empNo.trim().slice(0, 32),
          name: member.name.trim().slice(0, 60),
          deptName: member.deptName.trim().slice(0, 80),
          title: member.title.trim().slice(0, 80),
          oaRoleTag: member.oaRoleTag,
          isActive: true,
          updatedByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `dingtalk_directory/${cleanDtId}`);
      } finally {
        setBusyAction(null);
      }
    },
    [isAdmin, user]
  );

  return {
    user,
    authReady,
    isAdmin,
    dbConnected,
    publicityRecords,
    publicityFromDb,
    policyDocs,
    policyFromDb,
    dingtalkMembers,
    directoryFromDb,
    oaSubmissions,
    learningRecord,
    dingtalkStatus,
    localKudosVotedIds,
    localAckVotedIds,
    busyAction,
    signInWithGoogle,
    signOutUser,
    toggleKudos,
    toggleAck,
    saveLearningProgress,
    submitOaApplication,
    submitMultiOaApplications,
    resubmitRejectedOa,
    advanceOaSubmission,
    seedDatabaseDefaults,
    syncDingTalkDirectory,
    addDingTalkMember,
  };
}
