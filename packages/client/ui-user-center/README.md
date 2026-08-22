# @deepseek-ai/dsh-client-ui-user-center

左下角用户中心入口，支持单用户初始化、密码登录、退出登录和可扩展菜单入口。账户数据由 Host 侧用户中心服务持久化到 PostgreSQL。

## Known Limitations and Deferred Work

- 个人资料面板支持修改用户名、头像地址和账户密码；头像当前使用图片 URL，不提供本地文件上传。
- 浏览器主界面尚未在未登录状态下完全锁定；本包先提供账户状态和入口交互。
