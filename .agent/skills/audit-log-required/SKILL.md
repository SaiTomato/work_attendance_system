+---
+name: audit-log-required
+description: 确保所有具有破坏性或关键业务修改的操作都留下不可篡改的审计痕迹。
+---

## Must Log Actions
- 创建出席记录
- 修改出席状态
- 人工 override 自动计算结果
- 审批操作

## Log Fields (Ref: Prisma AuditLog)
- action
- before (修改前快照 - JSON)
- after (修改后快照 - JSON)
- operatedBy (操作人标识)
- reason (操作原因)
- operatedAt (操作时间)

## Rules
- 禁止无日志的数据修改
- 审计记录应当只增不减（Append-only）
- 即使关联的 `Attendance` 被逻辑删除，`AuditLog` 也应通过 `onDelete: SetNull` 保留（参考 schema 定义）

## When to Use
- 涉及数据变更的 Controller 或 Service 开发