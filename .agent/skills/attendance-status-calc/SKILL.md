# Skill: attendance-status-calc

## Description
统一出席状态的计算规则，避免逻辑分散。

## Status Values
- present
- late
- absent
- leave
- business_trip

## Rules
- 状态计算逻辑必须集中在 service 层
- route 中禁止出现具体判断逻辑
- 规则来源于 AttendanceRule 表

## When to Use
- 涉及出席状态判断
- 新增状态类型