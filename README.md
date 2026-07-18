# Parkinson-s-project

Healthcare hackathon project for monitoring Parkinsonian tremor response to medication using standardized smartphone accelerometer tests.

## Scope

This app is planned as a patient and doctor web platform. Patients record short before/after medication tests using phone motion sensors. The app calculates tremor metrics, compares medication response over time, and shares results with authorized doctors.

The app should not claim to diagnose Parkinson disease or recommend medication changes.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Better Auth
- Drizzle ORM
- PostgreSQL
- Zod
- Recharts

## Local Setup

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` starts the local app.
- `npm run build` builds for production.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript checks.
- `npm test` runs unit tests.
- `npm run test:e2e` runs the full browser and PostgreSQL flow.
- `npm run db:generate` generates Drizzle migrations.
- `npm run db:migrate` applies Drizzle migrations.
- `npm run db:studio` opens Drizzle Studio.

## Implemented Features

- Better Auth email/password signup, signin, signout, session validation, and patient/doctor role enforcement.
- PostgreSQL schema and Drizzle migrations for users, profiles, care relationships, medication records, test sessions, results, pairs, alerts, and audit logs.
- Patient and doctor onboarding with server-side Zod validation.
- Stable doctor invite codes, patient consent, pending requests, doctor acceptance/decline, and patient revocation.
- Medication create, read, update, archive, and restore controls with daily schedules.
- Standardized smartphone DeviceMotion permission flow and 10-second x/y/z recorder.
- Per-axis detrending and spectral analysis that preserves tremor frequency and physical amplitude.
- Recording quality checks, severity output, saved result page, and raw/computed result persistence.
- Persisted before/after medication pairing and improvement calculation.
- Database-backed patient history, charts, repeated-worsening alert rule, doctor dashboard, and patient detail view.
- Safety language that avoids diagnosis and medication-change recommendations.

## Verification

- Unit tests cover recording quality, 5 Hz signal detection, before/after comparison, and repeated-trend alert behavior.
- Playwright covers doctor and patient signup, both onboarding flows, invite acceptance, medication edit/archive/restore, two simulated 10-second motion recordings, persisted comparison/results, doctor visibility, and role isolation.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run db:migrate` validate the production application and database schema.

## Dokploy Deployment

The repository includes a production Dockerfile, health endpoint, migration entrypoint, and [Dokploy deployment guide](DOKPLOY.md). Configure Dokploy’s Dockerfile build type with Dockerfile path `Dockerfile`, context `.`, and application port `3000`.
