---
name: ec2-ops
description: Connect to the Bivium production EC2, inspect deployed services, query public endpoints, read container logs, hot-patch issues, and ship fixes. Use whenever the user asks to check, debug, restart, query, or deploy something in production / EC2 / "el servidor" / "producción" / nip.io. Also use when verifying whether the latest commit is actually deployed.
---

# Bivium EC2 Operations

This skill captures everything needed to operate the production EC2 the way the user expects: SSH in, inspect, verify, hot-patch on the box first, then commit from a worktree (never the user's primary working tree).

## 1. Connection facts

| Field | Value |
|---|---|
| Host (Elastic IP) | `100.51.51.210` |
| SSH user | `ec2-user` |
| SSH key | `~/.ssh/bivium-key.pem` |
| Project path on EC2 | `/home/ec2-user/bivium` (not yet checked out — clone happens on first deploy) |
| Compose file | `docker/docker-compose.prod.yml` (not yet written — TBD once deploy stack lands) |
| Public host (TLS via Caddy + nip.io) | `100-51-51-210.nip.io` |
| API base | `https://100-51-51-210.nip.io/api/v1/` |
| Watcher base | `https://100-51-51-210.nip.io/webhooks/` |
| Indexer base | `https://100-51-51-210.nip.io/indexer/` (Ponder GraphQL — confirm exposure decision before deploying) |
| AWS instance ID | `i-0822f1cabf3693dfe` |
| AWS security group | `sg-01c7536c97cb49ac0` (`bivium-sg`) |
| AWS EIP allocation | `eipalloc-004cbba7244057383` |
| AWS region / AZ | `us-east-1` / `us-east-1a` |
| Instance type / disk | `t3.medium` (2 vCPU / 3.8 GB RAM usable) / 30 GB gp3 |
| OS / Docker | Amazon Linux 2 / Docker 25.x + Compose v2 plugin |

Always use the nip.io hostname for HTTPS — the Caddy cert is issued for that exact host, not the raw IP. Use `curl -sk` if you want to skip strict cert validation when probing.

**Canonical SSH invocation** (use these exact flags so prompts don't block):

```bash
ssh -i ~/.ssh/bivium-key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ec2-user@100.51.51.210 '<remote command>'
```

Wrap the remote command in single quotes, escape internal quotes with `\"`. For multi-step inspections, chain with `&&` and add `echo "===MARKER==="` separators so the output stays readable.

## 2. Container inventory

All services run via Docker Compose using `docker/docker-compose.prod.yml`. Expected container names (stable, prefixed with `bivium-`):

| Container | Service | Notes |
|---|---|---|
| `bivium-api` | Express REST API | Port 3000 internally, behind Caddy |
| `bivium-watcher` | Alchemy webhook receiver | Behind Caddy at `/webhooks` |
| `bivium-reactor` | RabbitMQ event consumer | No public port |
| `bivium-indexer` | Ponder contract indexer | Internal — writes to `indexer` Postgres schema |
| `bivium-web` | Next.js frontend | Deployed to Vercel, NOT to EC2 (see §6) — keep this row only if web ends up bundled too |
| `bivium-postgres` | Postgres 17 | Internal only |
| `bivium-redis` | Redis 7 | Internal only |
| `bivium-rabbitmq` | RabbitMQ 3.13 | Internal only |
| `bivium-caddy` | Reverse proxy + TLS | Ports 80, 443 |

Compose service names (the ones used by `docker compose` commands) typically drop the `bivium-` prefix: `api`, `watcher`, `reactor`, `indexer`, `postgres`, `redis`, `rabbitmq`, `caddy`. Confirm once the compose file is written.

## 3. Recipe library (copy-paste these)

### Check what's actually deployed
```bash
ssh -i ~/.ssh/bivium-key.pem -o StrictHostKeyChecking=no ec2-user@100.51.51.210 \
  'cd /home/ec2-user/bivium && git log -1 --oneline && git status -s && git rev-parse HEAD'
```
Compare against `git rev-parse origin/main` locally (after `git fetch origin main`).

### Snapshot of all services
```bash
ssh -i ~/.ssh/bivium-key.pem -o StrictHostKeyChecking=no ec2-user@100.51.51.210 \
  'cd /home/ec2-user/bivium && docker compose -f docker/docker-compose.prod.yml ps --format "{{.Name}}: {{.Status}}"'
```

### Tail logs of one service
```bash
ssh -i ~/.ssh/bivium-key.pem -o StrictHostKeyChecking=no ec2-user@100.51.51.210 \
  'cd /home/ec2-user/bivium && docker compose -f docker/docker-compose.prod.yml logs --tail=40 <service>'
```
Replace `<service>` with `api`, `watcher`, `reactor`, or `indexer` (compose service name, not container name).

### Restart a service
```bash
ssh -i ~/.ssh/bivium-key.pem -o StrictHostKeyChecking=no ec2-user@100.51.51.210 \
  'cd /home/ec2-user/bivium && docker compose -f docker/docker-compose.prod.yml restart <service>'
```
Use `up -d <service>` instead if you changed compose env vars and need recreation.

### Run Prisma migrations (must be from `/app/packages/infrastructure`)
```bash
ssh -i ~/.ssh/bivium-key.pem -o StrictHostKeyChecking=no ec2-user@100.51.51.210 \
  'cd /home/ec2-user/bivium && docker compose -f docker/docker-compose.prod.yml exec -T -w /app/packages/infrastructure api sh -c "./node_modules/.bin/prisma migrate deploy"'
```

### Ponder indexer migrations
The indexer is a separate bounded context with its own schema (`apps/indexer/ponder.schema.ts`). Ponder typically auto-migrates on boot — if a schema change requires a reset, confirm with the user before running `ponder reset` or dropping the `indexer` schema in Postgres (it will re-index from the start block, which can take a while on Arbitrum).

### Probe public endpoints (no SSH needed)
```bash
curl -sk "https://100-51-51-210.nip.io/api/v1/markets?page=1&pageSize=10" -w "\nHTTP %{http_code}\n"
# Add more endpoints here as they are exposed.
```

## 4. Hot-patch workflow ("test on EC2 first")

The user explicitly prefers: do not commit-push-test in loops; **prove the fix works on the box, then commit once**.

For **compose / env changes** (e.g. add `REDIS_HOST=redis` to a service):
1. Edit the file in a worktree (not the primary workspace — see §5).
2. `scp` the new compose file to EC2 as `.testing` next to the real one.
3. Back up the original (`cp X X.before-fix.bak`).
4. Move `.testing` over the real file.
5. `docker compose -f docker/docker-compose.prod.yml up -d <service>` to recreate it.
6. Tail logs to confirm clean startup.
7. Only after green, commit from the worktree and push.

For **TypeScript code fixes** (e.g. a Prisma query bug):
1. Containers run from `/app/packages/<pkg>/dist/**` — patched JS, not TS.
2. Use `docker exec bivium-<service> sed -i.bak 's|...|...|' /app/packages/...js` to patch the compiled file.
3. `docker restart bivium-<service>` and probe the affected endpoint.
4. Once green on EC2, write the equivalent TS fix in the worktree, commit, push.
5. The deploy workflow will rebuild the image and overwrite the hot-patch.

This trades a tiny bit of drift (hot-patched container vs source) for *fast confidence* before pushing.

For **Caddyfile changes** (volume-mounted, no image rebuild):
1. `docker compose up -d caddy` does NOT recreate the container when only the mounted file changed — the running Caddy keeps its old in-memory config.
2. `docker exec bivium-caddy caddy reload --config /etc/caddy/Caddyfile` is unreliable in some images — observed cases where it logs "adapted config to JSON" but never applies.
3. **Use `docker restart bivium-caddy`** — that's the reliable way to pick up Caddyfile edits. ~3s downtime.
4. Verify the routing actually changed by `curl -sk -i https://100-51-51-210.nip.io/<new-path>` and looking at headers.
5. Caddyfile gotcha: `handle /foo` matches ONLY the exact path. For prefix matching use `handle /foo*` (no slash) or `handle /foo/*` (forces trailing slash).

## 5. Commits & deploys

The user's primary workspace at `/Users/jesusangel/workspace/bivium` always has in-progress work. **Never edit, stash, checkout, or commit there.** For any production fix:

```bash
cd /Users/jesusangel/workspace/bivium
git fetch origin main
git worktree add ../bivium-fix-<topic> -B fix/<topic> origin/main
# edit, build, test in the worktree
cd ../bivium-fix-<topic>
git add <files> && git commit -m "fix(...): ..."
git push origin HEAD:main         # only if user OK'd direct-to-main
# OR
gh pr create                      # safer default — let user decide
```

Push to `main` is expected to trigger `.github/workflows/deploy.yml` (TBD — create when EC2 is provisioned):
- SSH to EC2 → `git pull` → `docker compose build` → `up -d` → `prisma migrate deploy`.
- Watch with `gh run watch <run-id> --exit-status`.
- Verify post-deploy via §3 recipes.

After the user confirms, clean up: `git worktree remove ../bivium-fix-<topic>` and optionally `git branch -D fix/<topic>`. **Ask first** — the user may want to inspect.

## 6. Known production gotchas

To be filled in as we hit them. Likely candidates based on Bivium architecture:

- **REDIS_HOST per service.** Every service that touches Redis needs `REDIS_HOST: redis` in its compose `environment:` block. If missing, the service crashloops on `127.0.0.1:6379 ECONNREFUSED`.
- **Migrations CWD.** Prisma migrate must run with `-w /app/packages/infrastructure`; otherwise schema files are not found.
- **Outbox poller.** Bivium uses the outbox pattern (see project memory): events are written to `OutboxEvent` rows in the same transaction and then published by `OutboxPollerService`. If events are not flowing, check the poller is running (logs in the service that owns it — confirm which one, likely `api` or a dedicated worker) and that DB writes are landing.
- **Indexer is NOT hexagonal.** `apps/indexer/` is an isolated bounded context using Ponder. The Inversify / BaseUseCase / outbox rules in the root `CLAUDE.md` do not apply there. Debug it as a Ponder app, not a Bivium hex app.
- **Vercel separate from EC2.** The Next.js web app (`apps/web`) is expected to deploy to Vercel via push-to-main, not to EC2. Build failures on Vercel are a separate channel — check both when troubleshooting a release.
- **Contracts deploys are out-of-band.** `apps/contracts/` (Foundry) deploys to Arbitrum directly, not via the EC2 pipeline. EC2 services consume already-deployed contract addresses from env / config.

## 7. Defaults when the user is vague

- "Check the EC2" / "is it deployed?" → §3 _Check what's actually deployed_ + container snapshot + a tail of `api` logs.
- "Are there X in prod?" → hit the relevant `https://100-51-51-210.nip.io/api/v1/<resource>` endpoint with `curl -sk`.
- "Logs are weird" → tail all app services (`api`, `watcher`, `reactor`, `indexer`) with `--tail=20` each, separated by `===<service>===` markers.
- "Fix X in prod" → hot-patch on EC2 first (§4), then worktree commit (§5).
- Always report findings concisely: what's deployed (sha), what's running, what's broken, what to do next.
