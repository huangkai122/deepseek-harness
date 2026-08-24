# Agent Note: 将同级沙箱请求视为幂等操作

Status: implemented

[English](2026-08-24-same-mode-sandbox-request.md) | 中文

## 问题

面向模型的工具公开的是组合级别的 `sandbox_permissions` 枚举，而实际沙箱模式会根据会话在每次调用时解析。因此，`danger-full-access` 会话可能再次提交 `danger-full-access`，或者调用方提交当前模式但不提供 justification。共享升级路径将这种请求当作非严格升级，并在操作执行前拒绝了它。

## 决策

当请求模式等于当前生效模式，或当前生效模式为 `danger-full-access` 而请求为 `workspace-write` 时，共享升级解析器立即返回当前模式。Bash、PowerShell 和文件系统工具先解析当前策略，再校验升级参数，因此同级请求不需要审批或 justification。请求其他模式时仍执行参数配对校验以及严格扩权和审批流程；Full access 不会因为单次调用而降级。

## 备选方案

**从 Full access 工具 schema 中移除 `sandbox_permissions`。** 不采用，因为 schema 是注册表级别，而会话模式是逐调用的；移除字段会使之后切换到受限模式的会话失去升级入口。

**放行所有非扩权请求。** 不采用，因为任意降级请求必须 fail-closed；只有 Full access 下明确的 `workspace-write` 请求会被视为冗余，且不会改变操作策略。

**只在外层 UI 中规范化请求。** 不采用，因为直接工具调用和非浏览器传输也必须获得相同的安全行为。

## 影响

重复提交当前模式，以及 Full access 下冗余提交 `workspace-write`，不再触发审批，也不会因为缺少或为空的 justification 失败。真正的扩权仍要求非空 justification 和审批；任意降级及格式错误请求保留原有错误。Bash、pwsh 和 fs 修改工具共享此行为。

## 测试

共享升级、bash、pwsh 和 fs 工具测试合计 146 条断言全部通过。
