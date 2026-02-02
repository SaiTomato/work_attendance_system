+---
+name: attendance-status-calc
+description: 统一出席状态的计算规则，确保计算逻辑在 Service 层逻辑闭环，避免漏判。
+---

## Status Values (TypeScript Literal)
- present
- late
- absent
- leave
- business_trip

## Rules
- 状态计算逻辑必须集中在 `backend/src/services/` 层
- Route 层禁止出现 `if (time > 9:00)` 这种具体硬编码判断
- 规则来源于 AttendanceRule 表
- 如果考勤状态是由多个打卡时间计算得出，必须在代码中明确计算优先级（例如：请假 > 迟到）

## When to Use
- 涉及出席状态判断
- 新增状态类型或修改计算规则