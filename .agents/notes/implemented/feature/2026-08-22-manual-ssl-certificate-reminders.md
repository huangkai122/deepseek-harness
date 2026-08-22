# Agent Note: Manual SSL certificate records use the existing settings provider

Status: implemented

English | [中文](2026-08-22-manual-ssl-certificate-reminders.zh.md)

## Problem

The web application needs expiry reminders for domain SSL certificates, but the first requirement intentionally excludes remote TLS inspection and certificate-file handling. The feature still needs durable records, a daily reminder, platform-specific webhook payloads, and a browser management surface.

## Decision

`@deepseek-ai/dsh-client-ui-ssl-certificates` owns the `ssl-certificates` settings namespace. The namespace stores domain, ISO expiry time, remark, notification threshold, webhook provider and URL, and per-domain notification dates. The existing Settings Provider persists the section, so a deployment configured with PostgreSQL uses the same configured PostgreSQL storage without a feature-specific database connection.

The Host half checks the namespace at 09:00 in `Asia/Shanghai`. A domain whose remaining days are at or below the configured threshold is included once per local date. The Host sends platform payloads for DingTalk, WeCom, and Feishu, then records the notification date only after a successful response.

The browser half registers `SSL 证书提醒` in the existing `user-center.menu.entry` slot. Its panel owns summary counts, ten-row pagination, expiry ordering, search, create/edit/delete, XLS/XLSX import and export, and webhook settings. Import merges by domain and replaces an existing record when the domain repeats. Status text accompanies semantic colors: more than three days is normal, two or three days is warning, and zero or fewer days is danger.

The browser bundle keeps the shared type and date-rule module free of Host Settings imports. Host schema code stays in the Node entry, preserving the client bundle purity rule.

## Alternatives considered

- **Inspect each domain through TLS.** Rejected because this feature is a manual data manager, not a remote certificate scanner; adding DNS, SNI, timeout, and chain validation would expand permissions and the data model without serving the requested workflow.
- **Create a feature-specific PostgreSQL table.** Rejected because the existing Settings Provider already owns user-editable configuration persistence and keeps the feature consistent with the rest of the Web GUI.
- **Run reminders only in the browser.** Rejected because a closed page would miss the daily 09:00 check; the Host timer owns notification execution.
- **Use a generic JSON webhook only.** Rejected because the requested first integrations are DingTalk, WeCom, and Feishu, which use different message envelopes.

## Consequences

The plugin does not know whether an entered date matches the remote certificate. Users must update records after renewal, but the feature remains small, avoids private-key or network access, and works with the deployment's configured settings storage. Excel processing increases the browser bundle because XLS/XLSX support is intentionally shipped with the plugin.
