# Agent Note: 约束 task answer 远程 JSON

Status: implemented

[English](2026-08-24-task-answer-json-boundary.md) | 中文

## 问题

task-management 的 `answerQuestion` 远程方法在请求和响应类型中公开了任意 `unknown` answer。Typert 会拒绝远程边界上的未约束 unknown，因为该值无法描述或校验为 wire JSON。

## 决策

task answer 使用共享的 `JsonValue` 类型。数据库读操作使用 `snapshotJsonValue` 校验并分离存储的 JSON，然后再返回远程结果；无效的持久化数据会明确失败。

## 备选方案

**在远程方法中直接将 unknown 转型。** 不采用，因为这会隐藏 Typert 无法表示的 wire 值，并把失败推迟到传输阶段。

**定义 task 专用的 answer 联合类型。** 不采用，因为 task question 模型允许任意 JSON answer，而共享 JSON 词汇已经表达了该边界。

## 影响

Typert 可以生成 host 远程契约，同时保留 answer 原有的 JSON 灵活性。格式错误的数据库值现在会产生明确的 task-management 错误，不会跨越远程边界。

## 测试

task-management 类型检查、bundle 和测试通过；host TypeScript 与 Typert 构建也通过。
