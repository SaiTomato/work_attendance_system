# Skill: project-context

## Description
定义本项目的业务背景、使用对象和总体原则。
该 Skill 用于帮助 Agent 理解“这是一个什么系统”。

## Project Overview
- 系统类型：员工出席管理系统
- 使用对象：管理层 / HR / 管理员
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

## When to Use
- 项目相关问题
- 架构、模型、命名讨论