import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DINGTALK_OAPI_BASE = 'https://oapi.dingtalk.com';
const DINGTALK_NEW_API_BASE = 'https://api.dingtalk.com';

interface DingTalkDispatchBody {
  submissionNo: string;
  category: 'reward' | 'punishment';
  title: string;
  targetDingtalkUserId: string;
  targetName: string;
  targetDeptName: string;
  gradeName: string;
  points: number;
  factDescription: string;
  approverDingtalkUserId: string;
  approverName: string;
  executorDingtalkUserId: string;
  executorName: string;
  ccUserIds?: string[];
  ccNames?: string[];
  submitterName: string;
}

function isNonEmptyStr(val: unknown, maxLen: number): val is string {
  return typeof val === 'string' && val.trim().length > 0 && val.length <= maxLen;
}

function isAllowedDingTalkWebhook(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' && parsed.hostname === 'oapi.dingtalk.com';
  } catch {
    return false;
  }
}

async function fetchDingTalkAccessToken(): Promise<string | null> {
  const appKey = process.env.DINGTALK_APP_KEY?.trim();
  const appSecret = process.env.DINGTALK_APP_SECRET?.trim();
  if (!appKey || !appSecret) return null;

  const qs = new URLSearchParams({ appkey: appKey, appsecret: appSecret });
  const resp = await fetch(`${DINGTALK_OAPI_BASE}/gettoken?${qs.toString()}`);
  if (!resp.ok) {
    throw new Error(`DingTalk gettoken HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as { errcode?: number; errmsg?: string; access_token?: string };
  if (data.errcode !== 0 || !data.access_token) {
    throw new Error(`DingTalk token error: ${data.errmsg || 'unknown'}`);
  }
  return data.access_token;
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  // Safe DingTalk connection status check (never exposes secrets)
  app.get('/api/dingtalk/status', (_req, res) => {
    const hasAppKey = Boolean(process.env.DINGTALK_APP_KEY?.trim());
    const hasAppSecret = Boolean(process.env.DINGTALK_APP_SECRET?.trim());
    const hasProcessCode = Boolean(process.env.DINGTALK_PROCESS_CODE?.trim());
    const webhookUrl = process.env.DINGTALK_WEBHOOK_URL?.trim() || '';
    const hasWebhook = Boolean(webhookUrl && isAllowedDingTalkWebhook(webhookUrl));

    const configured = hasAppKey && hasAppSecret;
    res.json({
      configured,
      hasProcessCode,
      hasWebhook,
      mode: configured ? 'live' : 'sandbox',
      message: configured
        ? '企业钉钉 AppKey/AppSecret 已就绪，可直连通讯录与 OA 审批'
        : '尚未配置 DINGTALK_APP_KEY / DINGTALK_APP_SECRET，当前以结构化 OA 预览模式留痕',
    });
  });

  // Sync corporate directory from DingTalk OpenAPI when configured
  app.get('/api/dingtalk/contacts', async (_req, res) => {
    try {
      const token = await fetchDingTalkAccessToken();
      if (!token) {
        res.json({
          source: 'sandbox',
          configured: false,
          members: [],
        });
        return;
      }

      const deptResp = await fetch(
        `${DINGTALK_OAPI_BASE}/topapi/v2/department/listsub?access_token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dept_id: 1, language: 'zh_CN' }),
        }
      );
      const deptJson = (await deptResp.json()) as {
        errcode?: number;
        result?: { dept_id: number; name: string }[];
      };

      const depts = deptJson.result?.slice(0, 12) || [];
      const collected: {
        dingtalkUserId: string;
        empNo: string;
        name: string;
        deptName: string;
        title: string;
        oaRoleTag: 'staff' | 'approver' | 'executor' | 'cc_default';
      }[] = [];

      for (const dept of depts) {
        const userResp = await fetch(
          `${DINGTALK_OAPI_BASE}/topapi/v2/user/list?access_token=${encodeURIComponent(token)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dept_id: dept.dept_id, cursor: 0, size: 50 }),
          }
        );
        const userJson = (await userResp.json()) as {
          errcode?: number;
          result?: {
            list?: {
              userid: string;
              job_number?: string;
              name: string;
              title?: string;
              leader?: boolean;
            }[];
          };
        };

        for (const u of userJson.result?.list || []) {
          collected.push({
            dingtalkUserId: u.userid,
            empNo: u.job_number || u.userid.slice(0, 12),
            name: u.name,
            deptName: dept.name,
            title: u.title || '正式员工',
            oaRoleTag: u.leader ? 'approver' : 'staff',
          });
        }
      }

      res.json({
        source: 'dingtalk_live',
        configured: true,
        members: collected,
      });
    } catch (error) {
      res.status(502).json({
        source: 'error',
        configured: true,
        error: error instanceof Error ? error.message : 'DingTalk sync failed',
      });
    }
  });

  // Dispatch OA approval workflow + optional DingTalk group notification
  app.post('/api/dingtalk/oa-dispatch', async (req, res) => {
    const body = (req.body || {}) as Partial<DingTalkDispatchBody>;

    if (
      !isNonEmptyStr(body.submissionNo, 40) ||
      (body.category !== 'reward' && body.category !== 'punishment') ||
      !isNonEmptyStr(body.title, 160) ||
      !isNonEmptyStr(body.targetDingtalkUserId, 80) ||
      !isNonEmptyStr(body.targetName, 60) ||
      !isNonEmptyStr(body.targetDeptName, 80) ||
      !isNonEmptyStr(body.gradeName, 40) ||
      typeof body.points !== 'number' ||
      !Number.isFinite(body.points) ||
      !isNonEmptyStr(body.factDescription, 1500) ||
      !isNonEmptyStr(body.approverDingtalkUserId, 80) ||
      !isNonEmptyStr(body.approverName, 60) ||
      !isNonEmptyStr(body.executorDingtalkUserId, 80) ||
      !isNonEmptyStr(body.executorName, 60) ||
      !isNonEmptyStr(body.submitterName, 60)
    ) {
      res.status(400).json({ error: 'OA 提报单据参数不完整或超出长度限制' });
      return;
    }

    const ccUserIds = Array.isArray(body.ccUserIds)
      ? body.ccUserIds.filter((id): id is string => isNonEmptyStr(id, 80)).slice(0, 20)
      : [];
    const ccNames = Array.isArray(body.ccNames)
      ? body.ccNames.filter((n): n is string => isNonEmptyStr(n, 60)).slice(0, 20)
      : [];

    const oaPayload = {
      processCode: process.env.DINGTALK_PROCESS_CODE?.trim() || 'PROC-HYNN-JC-OA',
      originatorUserId: body.targetDingtalkUserId,
      approvers: [
        {
          actionType: 'AND',
          userIds: [body.approverDingtalkUserId],
        },
        {
          actionType: 'AND',
          userIds: [body.executorDingtalkUserId],
        },
      ],
      ccList: ccUserIds,
      ccPosition: 'START_FINISH',
      formComponentValues: [
        { name: '提报单号', value: body.submissionNo },
        { name: '奖惩类型', value: body.category === 'reward' ? '正向奖励表彰' : '违纪/失误惩处' },
        { name: '事项标题', value: body.title },
        { name: '当事人员', value: `${body.targetName} (${body.targetDeptName})` },
        { name: '定级与积分', value: `${body.gradeName} (${body.points >= 0 ? `+${body.points}` : body.points} 分)` },
        { name: '审核人', value: body.approverName },
        { name: '执行人', value: body.executorName },
        { name: '抄送人', value: ccNames.join('、') || '无' },
        { name: '提报人', value: body.submitterName },
      ],
    };

    try {
      const token = await fetchDingTalkAccessToken();
      const processCode = process.env.DINGTALK_PROCESS_CODE?.trim();

      if (token && processCode) {
        const oaResp = await fetch(`${DINGTALK_NEW_API_BASE}/v1.0/workflow/processInstances`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-acs-dingtalk-access-token': token,
          },
          body: JSON.stringify(oaPayload),
        });
        const oaJson = (await oaResp.json()) as { instanceId?: string; message?: string };
        if (!oaResp.ok || !oaJson.instanceId) {
          throw new Error(oaJson.message || `DingTalk OA HTTP ${oaResp.status}`);
        }

        const webhookUrl = process.env.DINGTALK_WEBHOOK_URL?.trim();
        if (webhookUrl && isAllowedDingTalkWebhook(webhookUrl)) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              msgtype: 'markdown',
              markdown: {
                title: `恒翼能奖惩 OA 审批通知 · ${body.submissionNo}`,
                text: `### 恒翼能奖惩 OA 审批通知\n- 单号：${body.submissionNo}\n- 对象：${body.targetName}（${body.targetDeptName}）\n- 等级分值：${body.gradeName}（${body.points >= 0 ? `+${body.points}` : body.points} 分）\n- 审核人：${body.approverName}\n- 执行人：${body.executorName}\n- 抄送：${ccNames.join('、') || '无'}`,
              },
            }),
          }).catch(() => undefined);
        }

        res.json({
          synced: true,
          dingtalkSyncStatus: 'synced_live',
          dingtalkProcessInstanceId: oaJson.instanceId,
          oaPayload,
        });
        return;
      }

      const sandboxInstanceId = `DT-OA-${Date.now().toString(36).toUpperCase()}`;
      res.json({
        synced: false,
        dingtalkSyncStatus: 'queued_sandbox',
        dingtalkProcessInstanceId: sandboxInstanceId,
        oaPayload,
      });
    } catch (error) {
      res.status(502).json({
        synced: false,
        dingtalkSyncStatus: 'pending',
        error: error instanceof Error ? error.message : 'DingTalk OA dispatch failed',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer();
