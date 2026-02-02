+---
+name: rbac-check
+description: 针对管理功能实现强制权限校验，确保数据访问符合角色定义。
+---

## Roles
- admin: 全部权限
- manager: 仅限所属部门数据
- hr: 可编辑出席记录，不可改规则
- viewer: 只读

## Rules
- 所有非只读接口必须校验 JWT
- manager 访问数据时必须在 Prisma 查询中强制注入 `department_id` 过滤条件
- 禁止仅依靠前端 UI 隐藏按钮作为权限控制，后端 API 必须作为最终防线
- 权限校验应作为路由中间件 (AuthMiddleware) 实现

## When to Use
- 新增或修改 API 端点
- 实现数据过滤导出报表时

## Constraints
- 不允许跳过权限检查