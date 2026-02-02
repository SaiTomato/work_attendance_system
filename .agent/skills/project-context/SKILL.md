+---
+name: project-context
+description: 定义本项目的业务背景、技术栈、使用对象和总体原则。
+---

## Project Overview
- 系统类型：员工出席管理系统
- 技术栈：
  - Frontend: React (Vite/Next.js)
  - Backend: Node.js + TypeScript + Express
  - Database: PostgreSQL (via Prisma ORM)
  - 使用对象：管理层 / HR / 管理员 (不直接面向普通员工打卡工具，主要用于管理)
- 目的：
  - 查看员工出席情况
  - 发现异常
  - 支持人工调整并可追溯

## Core Principles
- 管理系统优先“可追溯性”而非自动化
- 所有关键修改必须记录审计日志
- 权限 > 便利性

## Terminology
- 出席（Attendance）：员工某一工作日的状态记录
- 异常（Exception）：迟到、缺勤、未打卡等
- 管理员（Admin）：可查看和修改所有数据
- 管理者（Manager）：仅可查看所属部门

## Key Directories
- `backend/src/services/`: 存放考勤状态计算等业务逻辑
- `backend/prisma/schema.prisma`: 核心数据库模型声明

## When to Use
- 项目相关问题
- 架构、模型、命名讨论
- 任何需要理解系统设计初衷的时刻