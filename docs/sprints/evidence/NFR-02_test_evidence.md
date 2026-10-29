# NFR-02 Availability — Monitoring Evidence

**Requirement:** NFR-02 — staging availability of at least 99% during the evaluation window, monitored through `GET /api/v1/health` at five-minute intervals.

## Captured monitor state

- **Captured:** 29 October 2026 (Asia/Kolkata; screenshot captured at approximately 12:01)
- **Monitor:** UptimeRobot HTTP(S)
- **Endpoint:** `https://se-mini-project-s3v8.onrender.com/api/v1/health`
- **Current status:** Up
- **Uptime shown by monitor:** 2h 27m 13s at the time of capture
- **Polling interval:** Every 5 minutes
- **Last check shown:** 4m 40s ago at the time of capture
- **Dashboard availability shown:** 100% for the displayed last-24-hours panel
- **Incidents / downtime shown:** 0 incidents, 0m down
- **Evidence image:** `nfr-02-uptimerobot-2026-10-29.png`

## Deployment health check

Render's service configuration was verified to have `healthCheckPath` set to `/api/v1/health`.

## Test outcome and limitation

The screenshot confirms the monitor is active, reports the endpoint as **Up**, and is configured to check every five minutes. It records the dashboard values visible at capture time; it does **not**, by itself, establish 99% availability over the complete evaluation window. Continue monitoring and export the UptimeRobot report for the full evaluation window before marking the SLA verification as PASS.

**Provisional result:** Monitoring configured and currently healthy; full-window 99% availability verification is pending.
