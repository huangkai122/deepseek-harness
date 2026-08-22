# @deepseek-ai/dsh-client-ui-ssl-certificates

手工维护域名 SSL 证书到期时间，并通过钉钉、企业微信或飞书 Webhook 每日提醒。插件只保存域名、到期时间、备注、Webhook 设置和通知日期，不连接域名，也不读取证书内容。

浏览器入口 **SSL 证书提醒** 注册在个人中心菜单中，提供统计、按到期时间排序的分页列表、增删改、XLS/XLSX 导入导出和提醒设置。Excel 导入遇到重复域名时更新已有记录。

主机入口每天按 `Asia/Shanghai` 的 09:00 检查记录。证书达到配置的提醒阈值后，每个域名每天最多提醒一次。

## Model Experience

无。插件不会进入模型请求或会话上下文。

#### KV Cache effect

无。插件不使用模型 KV 缓存。

## Known Limitations and Deferred Work

- 插件使用手工录入的到期时间，不验证远程 TLS 服务，也不解析证书文件。
