# Skill: rbac-check

## Description
确保所有管理接口都进行角色权限校验。

## Roles
- admin: 全部权限
- manager: 仅限所属部门数据
- hr: 可编辑出席记录，不可改规则
- viewer: 只读

## Rules
- 所有非只读接口必须校验 JWT
- manager 访问数据时必须校验 department_id
- 禁止在前端做权限判断作为唯一防线

## When to Use
- 新增或修改 API
- 查询员工或出席数据
- 导出报表

## Constraints
- 不允许跳过权限检查