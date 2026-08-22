# DSH Server Monitor

Host-side server monitoring for Collector reports, current status, and debounced health alerts.

## Model Experience

The package exposes current monitored-server status to the `server_monitor_status` Agent tool through the companion tool package. It does not grant arbitrary SSH or shell execution.

## Configuration

Set the Web plugin config to select a named PostgreSQL entry from `db-connections`:

```yaml
- id: server-monitor
  name: '@deepseek-ai/dsh-server-monitor'
  config:
    storageConnection: monitor-postgres
```

The selected connection is resolved through `ctx.db`; credentials and SSL remain owned by the database connector. If `storageConnection` is omitted, the service uses an in-memory store for local development. A configured name must exist and must have type `postgresql`.

Set `DSH_MONITOR_INGEST_TOKEN` to require a Bearer token on Collector reports. Set `DSH_MONITOR_WEBHOOK_URL` to receive firing and recovery events; `DSH_MONITOR_WEBHOOK_SECRET` adds an `x-dsh-signature: sha256=...` HMAC header.

The ingest endpoint is `POST /api/server-monitor/ingest`. The dashboard endpoint is `GET /api/server-monitor/status`.

## Known Limitations and Deferred Work

The first slice persists current status only. Metric retention, five-minute aggregates, webhook delivery, server configuration UI, and SSH diagnostics are deferred. Alert transitions are held in the current status record and use three consecutive failures to fire and three consecutive successful observations to resolve.
