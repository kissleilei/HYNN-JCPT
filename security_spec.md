# Security Specification & Payload-First TDD

## 1. Data Invariants
1. `publicity_records`: Public reads are allowed only when `resource.data.isPublished == true` (or for admins). Contains zero private PII (no personal emails, phone numbers, or addresses). Only admins can create/delete/edit content; verified users may only increment `kudosCount` or `ackCount` by exactly `1`.
2. `policy_docs`: Public reads are allowed only when `resource.data.isPublished == true` (or for admins). Only admins can create, update, or delete policy documents.
3. `learning_records`: Strictly owned by `userUid == request.auth.uid`. Verified users can only read and update their own learning record; admins can read all records for compliance auditing.
4. `oa_submissions`: Created only by verified users with `authorUid == request.auth.uid` and initial `status == 'pending_approval'`. Only admins can transition workflow `status` (`pending_approval` -> `pending_execution` -> `executed_published` | `rejected`). Terminal states (`executed_published`, `rejected`) cannot be altered by non-admins.
5. `dingtalk_directory`: Contains only corporate routing identifiers (`dingtalkUserId`, `empNo`, `name`, `deptName`, `title`, `oaRoleTag`, `isActive`). Verified users can read active members for OA routing; only admins can create, update, or delete directory members.
6. `admins`: Never listable; only readable by self or another admin; writable only by existing/bootstrapped admins (`1341646817@qq.com` with `email_verified == true`).

## 2. Dirty Dozen Attack Payloads (Must All Return PERMISSION_DENIED)
1. **Identity Spoofing on `oa_submissions` create**: `{ "authorUid": "victim-uid", "status": "pending_approval", ... }` submitted by attacker UID.
2. **State Shortcutting on `oa_submissions` create**: `{ "authorUid": "attacker-uid", "status": "executed_published", ... }`.
3. **Ghost Field Injection on `publicity_records` update**: `{ "kudosCount": 2, "isAdmin": true, "updatedAt": "<serverTime>" }`.
4. **Unverified Email Admin Spoof**: Token with `email: "1341646817@qq.com"` and `email_verified: false`.
5. **Path Poisoning on `oa_submissions/{submissionId}`**: Document ID containing invalid characters or `> 128` chars (`"bad/id$123..."`).
6. **Score Inflation Attack on `publicity_records` kudos**: `{ "kudosCount": 9999, "updatedAt": "<serverTime>" }` where `existing.kudosCount == 10`.
7. **Terminal State Tampering on `oa_submissions`**: Non-admin updating an `executed_published` submission back to `pending_approval`.
8. **Cross-User `learning_records` Read/Write**: Attacker attempting `get` or `update` on `/learning_records/victim-uid`.
9. **Blanket Unscoped List Query on `oa_submissions`**: Non-admin running `collection(db, 'oa_submissions')` without filtering by `authorUid == request.auth.uid`.
10. **Client Timestamp Forgery on `oa_submissions` create**: `{ "createdAt": "2020-01-01T00:00:00Z", ... }` instead of `request.time`.
11. **Privilege Escalation via `admins/{uid}`**: Non-admin attempting `setDoc(doc(db, 'admins', attackerUid), { role: 'admin', createdAt: serverTimestamp() })`.
12. **Directory Poisoning on `dingtalk_directory`**: Non-admin employee attempting to add or alter an approver record in `dingtalk_directory`.
