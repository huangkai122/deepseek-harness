# Agent Note: 手工 SSL 证书记录使用现有 settings 提供方

Status: implemented

[English](2026-08-22-manual-ssl-certificate-reminders.md) | 中文

## 问题

Web 应用需要域名 SSL 证书到期提醒，但需求明确排除远程 TLS 检测和证书文件处理。功能仍需要持久化记录、每日提醒、按平台生成 Webhook 消息，以及浏览器管理界面。

## 决策

`@deepseek-ai/dsh-client-ui-ssl-certificates` 拥有 `ssl-certificates` settings 命名空间。命名空间保存域名、ISO 到期时间、备注、提醒阈值、Webhook 平台与地址，以及按域名记录的通知日期。现有 Settings Provider 负责持久化，因此使用 PostgreSQL 配置的部署会复用同一个 PostgreSQL 存储，不建立功能专用数据库连接。

Host 半侧每天按 `Asia/Shanghai` 的 09:00 检查命名空间。剩余天数小于等于配置阈值的域名，在每个本地日期最多加入一次提醒。Host 为钉钉、企业微信和飞书生成各自的消息体，只有收到成功响应后才记录通知日期。

浏览器半侧把 `SSL 证书提醒` 注册到现有的 `user-center.menu.entry` 槽位。面板负责统计、每页十条的分页、按到期时间排序、搜索、新增/编辑/删除、XLS/XLSX 导入导出和 Webhook 设置。导入以域名合并，重复域名会更新已有记录。状态文本与语义颜色同时呈现：超过三天为正常，剩余两至三天为警告，剩余零天或更少为紧急。

浏览器 bundle 使用的共享类型与日期规则模块不导入 Host Settings。Host schema 保留在 Node 入口中，满足客户端 bundle 纯度规则。

## 备选方案

- **通过 TLS 检测每个域名。** 否决，因为本功能是手工数据管理器，不是远程证书扫描器；增加 DNS、SNI、超时和证书链校验会扩大权限与数据模型，但不服务于已确认的工作流。
- **创建功能专用 PostgreSQL 表。** 否决，因为现有 Settings Provider 已拥有用户可编辑配置的持久化能力，并能让功能与 Web GUI 其他配置保持一致。
- **只在浏览器中运行提醒。** 否决，因为页面关闭时会错过每日 09:00 检查；提醒执行归 Host 定时器所有。
- **只使用通用 JSON Webhook。** 否决，因为首批适配对象是钉钉、企业微信和飞书，它们的消息信封不同。

## 影响

插件不会知道用户填写的日期是否匹配远端证书。证书续期后仍需用户更新记录，但功能保持小型，不需要私钥或网络检测权限，并复用部署已有的设置存储。Excel 处理会增加浏览器 bundle 大小，因为 XLS/XLSX 支持由插件直接提供。
