# Trae Preflight

This folder is prepared for `wangxt-987-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18287
- API_PORT: 19287
- WEB_PORT: 20287
- DB_PORT: 21287
- REDIS_PORT: 22287

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
