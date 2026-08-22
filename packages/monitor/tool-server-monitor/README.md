# DSH Server Monitor Tool

Registers the `server_monitor_status` model-facing tool for reading current monitored-server status and active alerts.

## Model Experience

The tool accepts an optional server ID and returns bounded current observations and alert states. It is read-only and does not execute remote commands.

## Known Limitations and Deferred Work

Historical metrics, alert-event queries, manual checks, and remediation commands are deferred.
