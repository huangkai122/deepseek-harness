# Agent Note: 在调用数据库驱动前解析凭据引用

Status: implemented

[English](2026-08-21-database-credential-reference-resolution.md) | 中文

## 问题

数据库连接设置保存了 `passwordRef`，但数据库服务没有解析该引用，而是直接将它传给驱动。因此，即使设置界面已经成功保存密码，驱动创建客户端时仍没有密码。

## 决策

`DbConnectorService` 在每次数据库操作前解析 `passwordRef`，并只通过进程内的 provider 配置传递解析后的密码。面向 RPC 的 `DbConnectionConfig` 仍然只保存凭据引用。MySQL、PostgreSQL 和 Redis provider 使用解析后的密码，并在客户端缓存键中加入不包含密码本身的密码指纹，避免新密码被保存后继续复用使用旧凭据创建的客户端。

## Alternatives considered

- **从浏览器直接在数据库 RPC 中发送密码：** 不采用，因为设置界面已经使用凭据引用机制，数据库 RPC 不应携带密码值。
- **由每个 provider 分别解析引用：** 不采用，因为这会重复凭据所有权，并让后续新增 provider 继续存在同类遗漏风险。
- **保留现有缓存键：** 不采用，因为无密码测试创建的客户端可能在密码更新后继续存在。

## 后果

当配置含有 `passwordRef` 时，数据库操作现在要求凭据服务存在；引用未配置时会明确失败。解析后的密码只在 provider 客户端生命周期内保留，缓存键不包含密码本身。凭据变更会创建新的 provider 客户端；旧的空闲客户端仍按现有 provider 生命周期保留到进程结束。
