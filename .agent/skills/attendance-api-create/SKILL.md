# Skill: attendance-api-create

## Description
用于新增或修改出席相关 API。
强制统一字段、校验和返回格式。

## Required Fields
- employee_id
- date
- status
- source

## Validation
- 使用 express-validator
- 必须处理 validationResult

## API Rules
- 所有写操作必须：
  - 校验权限
  - 写入审计日志
- 不允许直接暴露数据库错误

## Response Format
{
  success: boolean
  data?: any
  error?: any
}

## When to Use
- 创建 / 更新出席记录
- 批量导入