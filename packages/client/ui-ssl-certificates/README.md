# @deepseek-ai/dsh-client-ui-ssl-certificates

English | [中文](README.zh.md)

Manual SSL certificate expiry records with daily reminders through DingTalk, WeCom, or Feishu webhooks. The plugin stores only domain, expiry time, remark, webhook settings, and notification dates in the `ssl-certificates` user-settings namespace. It does not connect to domains or inspect certificate contents.

The browser entry adds **SSL 证书提醒** to the personal-center menu. The panel provides summary statistics, expiry-sorted pagination with ten rows per page, CRUD actions, XLS/XLSX import and export, and webhook settings. Duplicate domains imported from Excel replace the existing record.

The Host entry checks the configured records at 09:00 in `Asia/Shanghai`. Once a record reaches the configured threshold, it sends at most one reminder per domain per day.

## Model Experience

None. This plugin does not reach model requests or session context.

#### KV Cache effect

None. This plugin does not use model KV caches.

## Known Limitations and Deferred Work

- The plugin stores manually entered expiry times; it does not validate remote TLS endpoints or parse certificate files.
