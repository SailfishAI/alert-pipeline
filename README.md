# Alert Pipeline

Real-time alert pipeline for monitoring infrastructure. Ingests metrics from multiple sources via webhooks, evaluates alert rules, and dispatches notifications through configurable channels.

## Features

- **Real-time alerting** — Sub-second alert evaluation against streaming metrics
- **Webhook integrations** — Ingest data from Prometheus, Datadog, CloudWatch, and custom sources
- **Notification channels** — Email, Slack, PagerDuty, and custom webhook destinations
- **Dashboard** — Live overview of alert states, incident timelines, and system health
- **Incident management** — Automatic incident creation, grouping, and lifecycle tracking

## Quick Start

```bash
docker-compose up -d
npm install
npm run dev
```

Backend runs on `http://localhost:4000`, frontend on `http://localhost:3000`.

## Architecture

Monorepo with two workspaces:

- `backend/` — Express + TypeScript API server with PostgreSQL and Redis
- `frontend/` — React + TypeScript SPA with Apollo Client

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://localhost:5432/alertpipeline` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for JWT token signing | — |
| `ENCRYPTION_KEY` | 32-byte hex key for webhook secret encryption | — |

## License

MIT

## License
MIT
