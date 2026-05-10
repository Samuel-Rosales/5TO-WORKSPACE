High-signal instructions for automated agents working on this repo.

Keep this file short. Only include facts an agent would likely miss.

Repo layout (important)
- Monorepo with two workspaces at the repository root:
  - BACKEND-5TO (TypeScript backend using Prisma + Node)
  - FRONTEND-5TO (Astro + React frontend; docs served with Starlight)

Quick setup
- Install dependencies (preferred):
  - npm install (run at repo root — package.json uses workspaces and will install both packages)
  - Alternatively, you can run npm install inside each workspace folder.

Run (development)
- Run both services concurrently from repo root:
  - npm run dev
    - This uses concurrently to start BACKEND-5TO and FRONTEND-5TO.
- Run a single package manually:
  - Backend dev: cd BACKEND-5TO && npm run dev
    - Uses nodemon + ts-node. Good for rapid backend iteration.
  - Frontend dev: cd FRONTEND-5TO && npm run dev
    - Astro dev server (default port 4321).

Ports and env (critical)
- Backend: BACKEND-5TO/.env contains API_PORT=3800 (the backend listens on port 3800 in this repo).
- Frontend: FRONTEND-5TO/.env sets PUBLIC_BACKEND_URL and points at the backend (default in repo: http://localhost:3800/api/v1).
- Always check and/or update FRONTEND-5TO/.env if you run the backend on a different port or host.
- The backend requires DATABASE_URL in BACKEND-5TO/.env (Postgres). Many Prisma commands and seeding will fail if DATABASE_URL is not set or the database is not reachable.

Prisma / DB workflow (backend-specific, high-risk)
- Root npm scripts forward to the backend workspace for Prisma tasks. Examples (run from repo root):
  - npm run prisma:generate
  - npm run prisma:migrate        (runs npx prisma migrate dev in backend workspace)
  - npm run prisma:push
  - npm run prisma:studio
  - npm run prisma:seed
  - npm run db:reset
- Production start for backend (in BACKEND-5TO package.json):
  - npm run build (runs prisma generate && tsc && tsc-alias)
  - npm run start (runs npx prisma migrate deploy && node dist/app.js)
  - Important: start runs prisma migrate deploy. Ensure DATABASE_URL points to the correct production DB and you want migrations applied.
- Seeding: prisma:seed uses ts-node and the TypeScript seed scripts (require DATABASE_URL). Do not run seed against a production DB unless intended.

Build / Preview (frontend)
- Build and preview frontend (from FRONTEND-5TO):
  - npm run build
  - npm run preview
  - docs preview (build docs and preview on ephemeral port): npm run docs:preview

Frontend preferences
- Prefer dynamic islands with React for interactive UI: use Astro + React islands (client islands) for sections that need hydration instead of hydrating entire pages.
- Prefer "primary" design-system components for critical actions and visible UI (CTAs, main forms). When in doubt, choose the primary variant for new interactive controls.

Where docs and API specs live
- Frontend docs: FRONTEND-5TO/src/content/docs/docs/ (served by the Astro dev server)
- Backend testing and API checklists: BACKEND-5TO/docs/testing/ (operational playbooks and seed/checklist docs)

Safety and hygiene
- .env files in this repo may contain real credentials (DATABASE_URL in BACKEND-5TO/.env). Do not commit secrets. If you modify .env files while working, be careful not to leak values to commits.
- There are no automated tests configured at the root (root package.json test is placeholder). Check individual packages for tests before assuming a test runner exists.

Where to look next (fast wins)
- FRONTEND-5TO/README.md — how to run the frontend and where docs live.
- BACKEND-5TO/package.json — exact backend scripts (dev, build, start, prisma scripts, seed).
- BACKEND-5TO/.env and FRONTEND-5TO/.env — canonical local dev env used by the project.
- BACKEND-5TO/docs/testing/ — instructions for exercising backend flows and seeding data.

If something is unclear
- Prefer executable sources (package.json scripts, .env, prisma files) over prose. If docs conflict with scripts, follow the scripts and update docs.
