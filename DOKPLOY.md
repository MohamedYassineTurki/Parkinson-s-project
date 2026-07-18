# Dokploy deployment

This repository is prepared for a Dokploy **Application** using the **Dockerfile** build type.

## Dokploy application settings

- Provider: GitHub
- Repository: `MohamedYassineTurki/Parkinson-s-project`
- Branch: `main`
- Build type: `Dockerfile`
- Dockerfile path: `Dockerfile`
- Docker context path: `.`
- Docker build stage: leave empty (the final `runner` stage is the default)
- Application port: `3000`
- Domain: configure it in Dokploy’s Domains tab and use HTTPS

## Required environment variables

Set these in Dokploy’s Environment tab. Do not commit production values.

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
BETTER_AUTH_SECRET=<at-least-32-random-characters>
BETTER_AUTH_URL=https://your-production-domain.example
RUN_DB_MIGRATIONS=true
```

`BETTER_AUTH_URL` must exactly match the HTTPS domain configured for the application. `RUN_DB_MIGRATIONS=true` runs the committed Drizzle migrations before the server starts. This is appropriate for the default single-replica deployment. For multiple replicas, run migrations as a one-off release task and set it to `false` on the web service.

## Deploy

1. Create or select a PostgreSQL database reachable from the Dokploy application network.
2. Create the Dokploy Application with the settings above.
3. Add the environment variables.
4. Deploy the `main` branch.
5. Configure the domain and wait for the HTTPS certificate.
6. Verify `https://your-production-domain.example/api/health` returns JSON with `status: "ok"`.
7. Create a doctor account, create the invite code, then create a patient account and complete the physical-phone accelerometer test.

The Docker image uses Next.js standalone output, runs as the non-root `node` user, exposes port `3000`, and includes a container health check against `/api/health`.
