# Agent Note: 使 task-management 的 PostgreSQL 启动可靠

Status: implemented

[English](2026-08-25-task-management-postgresql-startup.md) | 中文

## Problem

添加 task-management Host 条目后，Web profile 仍无法激活该插件。生成的 Typert 模块导入了 `zod`，但包没有声明运行时依赖；schema 迁移通过 batch 操作提交多条 PostgreSQL 语句，而连接器按单个结果对象读取驱动返回值；此外 Remote BFF 没有挂载 task-management Remote 贡献。

## Decision

task-management 将 `zod` 声明为生产依赖。PostgreSQL provider 在读取 rows 前统一处理单语句和多语句查询结果，并在一次 batch 操作中汇总各语句的受影响行数。
API Remote 组装层导入并挂载生成的 task-management Remote 贡献，并在 peer 与开发依赖中声明该包。

## Alternatives considered

**将 task-management schema 拆成多个 batch 操作。** 不采用，因为事务执行由 provider 负责，其他调用方也可能合法提交多语句 SQL 操作。

**依赖顶层或提升后的 `zod` 安装。** 不采用，因为包的运行时导入必须由包自身声明依赖，才能支持隔离安装和构建后插件加载。

**让 task-management Client 调用未挂载的 Remote 命名空间。** 不采用，因为 Remote 命名空间由 API 组装层集中选择和挂载；Client 注入声明不能创建它所依赖的 Host 贡献。

## Consequences

生成的 task-management Typert 模块可以从包运行时加载，PostgreSQL schema 迁移也能正确处理驱动的多结果响应，不再因 `undefined.length` 失败。batch 调用方获得最后一条语句的 rows，以及所有语句合计的受影响行数。
API Remote 组装层挂载生成的贡献后，Web Client 可以解析 `remote.taskManagement`。

## Testing

task-management 与 PostgreSQL provider 的 TypeScript 构建通过，两个运行时 bundle 已重新生成；`pnpm dsh web --no-open` 已成功启动并输出 `http://127.0.0.1:3080`。
