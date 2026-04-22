# AI QA Lifecycle

AI-powered QA lifecycle prototype that can run from:

- a **CLI pipeline** (Node.js + TypeScript), and
- a **frontend app** (React + Vite) backed by a lightweight local API bridge.

The system generates test cases from acceptance criteria, supports review, generates Playwright scripts, runs tests, and analyzes failures.

## Reviewer quick start (after clone)

1. Clone and install:

```bash
git clone <your-repo-url>
cd AI-QA-lifecycle
npm install
cd frontend && npm install && cd ..
cp .env.example .env
```

2. Configure `.env` (minimum):
   - pick one provider with credentials (`AI_PROVIDER=gemini|ollama|claude`)
   - set execution mode:
     - local: `PLAYWRIGHT_EXECUTION_MODE=local`
     - docker: `PLAYWRIGHT_EXECUTION_MODE=docker`

3. Start backend API:

```bash
npm run api
```

4. In a second terminal, start frontend:

```bash
cd frontend
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) and run:
   - Dashboard → Save Context
   - Test Cases → Generate
   - Review → Approve/Reject and set automatable/not-automatable
   - Scripts → Generate Scripts, then approve scripts
   - Execution → Run tests
   - Failures → Analyze failures

6. If anything looks stale:

```bash
npm run api:restart
```

## What is implemented

- Test case generation (UI + API scenarios) from acceptance criteria
- Human-in-the-loop review flow (approve/reject/edit status)
- Reviewer-controlled automation flag (`automatable` / `not_automatable`) per test case
- Playwright test script generation for approved test cases
- Playwright execution reporting
- AI-based failure categorization
- Frontend for end-to-end interactive flow
- Runtime provider switching (Gemini / Ollama / Claude) from frontend
- Optional Docker-based Playwright execution
- **Manual test case import** (JSON identical to `data/output/test-cases.json`) via API + Test Cases UI, plus a **plain-text form** on the same page that builds the same objects and imports via merge (no change to server validation)
- **Script approval gate**: after scripts are generated via the API, Playwright runs are blocked until every generated script is approved in the UI (see `data/output/scripts-manifest.json`). CLI-only runs are unchanged when no manifest exists.
- **Automation eligibility gate**: script generation includes only test cases where `source=generated`, `reviewStatus=approved`, and `automationStatus!=not_automatable`.
- **External execution report ingestion** (paste/upload JSON matching `data/output/execution-report.json`)
- UI quality-of-life updates: expandable test/script cards, toast notifications, and improved visual styling

## Tech stack

- Backend/CLI: Node.js, TypeScript, `zod`, `node-fetch`, `dotenv`
- Frontend: React, Vite, React Router
- Testing: Playwright
- API bridge: Express + CORS
- Optional isolation: Docker (Playwright container image)

## Project structure

- `src/` - backend modules and API server
  - `src/index.ts` - CLI orchestrator
  - `src/server.ts` - frontend API bridge
  - `src/modules/` - pipeline modules
- `frontend/` - React app
- `data/input/` - acceptance criteria and run inputs
- `data/output/` - generated artifacts and reports
- `tests/generated/` - AI-generated Playwright specs

## End-to-end flow

1. Save acceptance criteria and target URL
2. Generate test cases
3. Review/approve test cases and mark automatable / not automatable
4. Generate Playwright scripts (eligible generated+approved+automatable cases only)
5. **Approve each generated script** (Scripts page) when using the API-generated manifest
6. Run tests
7. Analyze failures (optionally after importing an external execution report)

## Prerequisites

- Node.js 18+
- npm
- For local Playwright mode: internet + browser install
- For Docker mode (recommended for stability): Docker Desktop running

## Setup

1. Install root dependencies:

```bash
npm install
```

2. Install frontend dependencies:

```bash
cd frontend && npm install
```

3. Create `.env` from example:

```bash
cp .env.example .env
```

4. Update `.env` values:

- `AI_PROVIDER` (`gemini` | `ollama` | `claude`)
- provider credentials/models
- Playwright execution mode:
  - `PLAYWRIGHT_EXECUTION_MODE=local` or `docker`
  - `DOCKER_PLAYWRIGHT_IMAGE` (if docker mode)

## Running the system

### Option A: Frontend (recommended)

From root:

```bash
npm run api
```

From `frontend/`:

```bash
npm run dev
```

Open `http://localhost:5173`.

### Option B: CLI pipeline

```bash
npm run dev
```

## Useful scripts

### Root

- `npm run api` - start backend API bridge
- `npm run api:stop` - stop process listening on port `8787`
- `npm run api:restart` - stop then start API
- `npm run dev` - run CLI flow
- `npm run build` - compile backend
- `npm run pw:install` - install Playwright Chromium locally
- `npm run test:playwright` - run generated Playwright tests (local mode)
- `npm run pw:docker:build` - build local Playwright image
- `npm run pw:docker:test` - run Playwright tests in Docker

### Frontend

- `npm run dev` - start UI (port `5173`)
- `npm run build` - build UI
- `npm run preview` - preview UI build

## Frontend modules

- `Dashboard` - acceptance criteria, target URL, provider settings, pipeline trigger
- `Test Cases` - generate list; **manual import** (JSON array or merge/replace template); **plain-text “Add from text”** for non-JSON users (same payload shape as generated JSON)
- `Review` - approve/reject/edit test cases and mark `automatable` / `not_automatable`
- `Scripts` - generated script list, generation, **eligibility summary** (eligible/skipped), and **per-script approval** (required when a scripts manifest exists)
- `Execution` - run Playwright tests, view report, **import external execution report** (paste or file)
- `Failures` - failure categorization and insights

## API endpoints (local)

- `GET /api/health`
- `GET /api/snapshot`
- `POST /api/context`
- `POST /api/generate-test-cases`
- `POST /api/review/apply`
- `POST /api/generate-scripts`
- `POST /api/run-tests`
- `POST /api/analyze-failures`
- `POST /api/run-full-pipeline`
- `GET /api/provider-config`
- `POST /api/provider-config`
- `POST /api/test-cases/import` — body: raw JSON **array** of test cases, or `{ "mode": "merge" | "replace", "testCases": [...] }`
- `POST /api/execution-report/import` — body: full `ExecutionReport` object, or `{ "executionReport": { ... } }`
- `POST /api/scripts/approval` — body: `{ "testId": "TC-001", "approved": true }`

## Artifacts

- `data/output/test-cases.json`
- `data/output/reviewed-test-cases.json`
- `data/output/scripts-manifest.json` (script approval state; created when using **Generate Scripts** from the API)
- `tests/generated/*.spec.ts`
- `data/output/playwright-report.json`
- `data/output/execution-report.json`
- `data/output/failure-analysis.json`

## Docker Playwright mode

If local browser execution is unstable, set:

```env
PLAYWRIGHT_EXECUTION_MODE=docker
DOCKER_PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.59.1-noble
```

Then run tests from frontend or API; backend will execute Playwright inside container.

## Troubleshooting

- **Provider settings save returns 404**
  - You are likely hitting an old API process.
  - Run `npm run api:restart`.

- **Gemini DNS/host errors (`ENOTFOUND`, `getaddrinfo`)**
  - Check network/VPN/proxy.
  - Switch provider to `ollama` or use dockerized test execution for stability.

- **Playwright says browser executable missing**
  - Run `npm run pw:install` (local mode).

- **Playwright crashes locally**
  - Use Docker mode (`PLAYWRIGHT_EXECUTION_MODE=docker`).

- **Docker run fails but logs only show npm notices**
  - `npm notice` is usually not the root cause.
  - Run the docker command directly to see the real Playwright/parser error:
    - `docker run --rm --ipc=host -v "$PWD:/work" -w /work mcr.microsoft.com/playwright:v1.59.1-noble /bin/bash -lc "npm ci --include=dev && npx playwright test tests/generated --reporter=list"`

- **Claude rate-limit errors (output tokens/minute)**
  - Lower per-request output budget in `.env`:
    - `CLAUDE_MAX_OUTPUT_TOKENS=500` (or lower for very small plans)
  - Retry after ~1 minute if org TPM is exhausted.

- **Docker Desktop / Spotlight opens Docker but no window**
  - Engine may still be running; use the menu bar whale → Dashboard, or `open -a Docker` from Terminal. If the window is off-screen, check other Spaces or restart Docker Desktop.

- **Frontend and backend out of sync**
  - Restart API with `npm run api:restart`.

## Notes

- This is a prototype focused on QA lifecycle workflow and robustness.
- Local storage is used in frontend where appropriate; backend artifacts remain file-based.
- Keep secrets only in `.env` (never commit real keys).
