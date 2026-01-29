# Skill: audit-log-required

## Description
确保所有关键操作都有审计记录。

## Must Log Actions
- 创建出席记录
- 修改出席状态
- 人工 override
- 审批操作

## Log Fields
- action
- before
- after
- operated_by
- operated_at

## Rules
- 禁止无日志的数据修改
- 审计表不可被普通接口修改

## When to Use
- 涉及数据变更