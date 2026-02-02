+---
+name: attendance-api-create
+description: 用于新增或修改出席相关 API，强制统一字段规范、校验规则和 standard 返回格式。
+---

## Required Fields
- employee_id
- date
- status
- reason (审计必填：说明修改原因)

## Validation
- 使用 express-validator
- 必须处理 validationResult
- 必须验证 status 是否在合法集合内

## API Rules
- 所有写操作必须：
  - 校验权限
  - 写入 `AuditLog` 记录
  - 在同一个数据库事务（Prisma $transaction）中完成
- 不允许直接暴露数据库错误

## Response Format
{
  success: boolean
  data?: any
  error?: string
  message?: string
}

## When to Use
- 创建 / 更新出席记录
- 批量导入出席数据