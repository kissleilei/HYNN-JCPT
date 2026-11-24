// Verification spec for the Dirty Dozen security payloads defined in security_spec.md.
// All payloads listed below are expected to return PERMISSION_DENIED under firestore.rules.

export interface DirtyPayloadCase {
  id: string;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list';
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyPayloadCase[] = [
  {
    id: 'dd-01',
    name: 'Identity spoofing on oa_submissions create',
    collection: 'oa_submissions',
    operation: 'create',
    payload: { authorUid: 'victim-uid', status: 'pending_approval' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-02',
    name: 'State shortcutting on oa_submissions create',
    collection: 'oa_submissions',
    operation: 'create',
    payload: { authorUid: 'attacker-uid', status: 'executed_published' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-03',
    name: 'Ghost field injection on publicity_records update',
    collection: 'publicity_records',
    operation: 'update',
    payload: { kudosCount: 2, isAdmin: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-04',
    name: 'Unverified email admin spoof',
    collection: 'policy_docs',
    operation: 'create',
    payload: { title: 'Spoofed Policy' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-05',
    name: 'Path poisoning with oversized document ID',
    collection: 'oa_submissions',
    operation: 'create',
    payload: { submissionNo: 'OA-999' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-06',
    name: 'Score inflation attack on publicity_records kudosCount',
    collection: 'publicity_records',
    operation: 'update',
    payload: { kudosCount: 9999 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-07',
    name: 'Terminal state tampering on executed_published submission',
    collection: 'oa_submissions',
    operation: 'update',
    payload: { status: 'pending_approval' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-08',
    name: 'Cross-user learning_records read/write',
    collection: 'learning_records',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-09',
    name: 'Blanket unscoped list query on oa_submissions',
    collection: 'oa_submissions',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-10',
    name: 'Client timestamp forgery on oa_submissions create',
    collection: 'oa_submissions',
    operation: 'create',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-11',
    name: 'Privilege escalation via admins collection write',
    collection: 'admins',
    operation: 'create',
    payload: { role: 'admin' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'dd-12',
    name: 'Non-admin directory poisoning on dingtalk_directory',
    collection: 'dingtalk_directory',
    operation: 'create',
    payload: { name: 'Fake Approver' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
