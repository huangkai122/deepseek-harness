# DSH Server Monitor Collector

A dependency-light Linux Collector that reads `/proc`, `df`, and configured HTTP endpoints, then pushes a Bearer-authenticated JSON report to the DSH Host ingest route.

## Model Experience

Collector observations are consumed by the Host monitor service and exposed through the `server_monitor_status` Agent tool. The Collector does not expose arbitrary command execution.

## CentOS Installation

1. Install Node.js 22 or newer, create a dedicated `dsh-collector` user, and unpack this package at `/opt/dsh-server-monitor-collector`.
2. Copy `/opt/dsh-server-monitor-collector/config/server-monitor.example.yml` to `/etc/dsh/server-monitor.yml`, replace the server identity, ingest URL, and token, then run `chmod 600 /etc/dsh/server-monitor.yml`.
3. Copy `/opt/dsh-server-monitor-collector/systemd/dsh-server-monitor-collector.service` to `/etc/systemd/system/`.
4. Create the state directory and start the service:

```bash
sudo install -d /etc/dsh
sudo cp /opt/dsh-server-monitor-collector/config/server-monitor.example.yml \
  /etc/dsh/server-monitor.yml
sudo chmod 600 /etc/dsh/server-monitor.yml
sudo cp /opt/dsh-server-monitor-collector/systemd/dsh-server-monitor-collector.service \
  /etc/systemd/system/
sudo useradd --system --home-dir /var/lib/dsh-server-monitor-collector --shell /sbin/nologin dsh-collector
sudo install -d -o dsh-collector -g dsh-collector /var/lib/dsh-server-monitor-collector
sudo systemctl daemon-reload
sudo systemctl enable --now dsh-server-monitor-collector.service
sudo journalctl -u dsh-server-monitor-collector.service -f
```

Run one report manually with:

```bash
sudo -u dsh-collector /usr/bin/node /opt/dsh-server-monitor-collector/lib/cli.js --config /etc/dsh/server-monitor.yml --once
```

The default interval is 60 seconds. Set `intervalSeconds` to a value of at least 10 in the YAML file.

## Configuration

`serverId`, `collectorId`, and `ingestUrl` are required. `token` is the per-server Bearer token configured by the DSH Host. `httpChecks` is optional and checks endpoints from the monitored server's network namespace.

## Known Limitations and Deferred Work

Docker and systemd checks, systemd timer history, network byte-rate deltas, HMAC request signing, and package-managed upgrades are deferred from this first slice. The current implementation reports host metrics and HTTP endpoint checks.
