# London Commute

A small dashboard for checking London rail disruption before leaving home. It covers the Tube, DLR and Elizabeth line, with saved commute lines and a rolling seven-day view of observed service status.

**[Open London Commute](https://london-commute.vercel.app)**

Live status is deployed and working. History currently starts with a manually collected real snapshot. Automatic history collection is pending GitHub workflow authorization; prepared workflow definitions are in `automation/`. Vercel is deployed through its CLI; GitHub-triggered deployments are not connected yet.

## What it does

- Fetches current line-wide status from TfL through a cached server endpoint.
- Keeps commute preferences in the browser; no account or location tracking.
- Shows every notice attached to a line, including planned closures.
- Includes a collector and a prepared GitHub Actions schedule for snapshots roughly every 30 minutes.
- Shows good-service sample percentages, sample counts and collection freshness.
- Handles upstream outages without replacing real data with demo values.

## Run locally

Requires Node.js 24. There are no application dependencies.

```sh
npm run dev
# http://localhost:3000
npm test
npm run build
```

The local server uses the same API handlers as Vercel. A TfL app key is optional for this endpoint; set `TFL_APP_KEY` in the environment if using one. `.env.example` lists the supported settings. The local server does not automatically load `.env` files.

## Architecture

```text
Browser → /api/status → TfL Unified API
Browser → /api/history → GitHub observations branch
GitHub Actions → TfL → rolling history.json on observations branch
```

The frontend is HTML, CSS and browser-native JavaScript. Two Vercel Node.js functions isolate the upstream APIs and set shared-cache headers. The history collector stores only timestamps and line status categories. Its separate branch avoids mixing generated observations into application commits. Configure Vercel to deploy `main` only; observation updates do not need deployments.

The compact, dependency-free approach suits a single-screen dashboard: no build framework, database account or client bundle is required. It trades detailed train-level analytics for a small, inspectable pipeline.

## Deploy

Import the repository into Vercel with the **Other** framework preset. `vercel.json` supplies the build command and `dist` output directory. Set `HISTORY_REPOSITORY` to `owner/repository` if forking. Set the production branch to `main` and disable preview deployments for `observations`.

After workflow authorization is approved, move the YAML definitions from `automation/` into `.github/workflows/` and commit them. The **Record TfL observations** workflow then runs on the default branch. It needs repository contents write permission and creates the `observations` branch on its first run. It can also be triggered manually in Actions. Optional `TFL_APP_KEY` should be added as both a Vercel environment variable and GitHub Actions secret if needed. Never commit keys.

The data branch is a replaceable rolling dataset: the collector intentionally replaces that branch's single commit each run. Application history on `main` is never rewritten. GitHub schedules are best-effort, can be delayed, and can be disabled after inactivity in public repositories. The UI identifies delayed collection and never fills missing observations.

## Reading the history

“Good service” is the fraction of known-status snapshots where TfL reported only code 10. It is **not** a punctuality score or a percentage of operating time. Planned and overnight closures count as other status. Missing observations do not count either way, and unknown status is excluded. Today is partial; dates use Europe/London including daylight saving. Data starts at the first successful collection, without backfilling.

## Checks

`npm test` covers mixed notices, unfamiliar statuses, missing observations, the seven-day window, London date boundaries and filtering. Browser checks should also cover saved preferences, keyboard access, small screens and unavailable API responses.

## Data and attribution

Powered by [TfL Open Data](https://tfl.gov.uk/info-for/open-data-users/). Contains public sector information licensed under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/). Independent project, not affiliated with Transport for London. TfL branding and roundels are not used.
