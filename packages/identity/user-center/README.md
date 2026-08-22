# @deepseek-ai/dsh-user-center

单用户本地账户服务。首次使用时通过 PostgreSQL 创建唯一账户，密码使用 scrypt 派生值保存，会话只保存 token 的 SHA-256 摘要。

数据库连接读取 `db-connections` 设置命名空间，并复用 `ctx.db` 连接器和 credentials 解析能力。

## Known Limitations and Deferred Work

- 当前服务提供初始化、登录、状态和退出登录；密码恢复命令与资料编辑界面属于后续工作。
- 会话过期策略将在正式部署需要跨设备访问时补充。
