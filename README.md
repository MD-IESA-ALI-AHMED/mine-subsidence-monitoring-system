# Subsidence monitoring dashboard (PS 25)

Early-warning dashboard for ground sinking above an underground coal mine. Sensor units report
tilt, vibration, pressure, temperature and (some) rod sinking over ESP-NOW to solar relays that
form a Wi-Fi mesh. The backend works out sinking at every unit, checks whether several nearby
units are moving together, finds moving zones, asks a prediction model for forecasts and scores
each zone's danger. MERN stack, Three.js front end.

> **Build status.** Phases 1–6 are done: backend, dummy data, pipeline, mock model, simulator,
> the dashboard shell (login, top bar, zones, alerts, context panel) and the 3D scene. Still to
> come: charts and the time scrubber, the Alerts / Network / Settings pages (phase 7), the
> opening animation (phase 8) and the final polish and end-to-end tests (phase 9).

## Requirements

- Node 22 or newer (developed on Node 24), npm 10 or newer
- About 600 MB free disk the first time: `npm run dev` downloads a MongoDB 7 server binary
  (no Docker or MongoDB install needed). Docker (`docker compose up -d`) or MongoDB Atlas also
  work; just point `MONGO_URI` at it.

## Quick start

```bash
npm install
# npm 11 blocks install scripts by default; these three are needed:
npm approve-scripts bcrypt esbuild mongodb-memory-server   # already recorded in package.json
npm rebuild bcrypt esbuild

cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit server/.env: set DEMO_PASSWORD (10+ characters) and the two JWT secrets
# (node -e "console.log(require('crypto').randomBytes(48).toString('hex'))").

npm run dev
```

`npm run dev` starts four processes:

| Name   | What                                                      | Where                                  |
| ------ | --------------------------------------------------------- | -------------------------------------- |
| mongo  | Local MongoDB 7 (skipped if one is already reachable)     | 127.0.0.1:27017, data in `.data/mongo` |
| server | API + Socket.IO + pipeline + simulator                    | http://localhost:4000                  |
| model  | Mock prediction model, same HTTP contract as the real one | http://localhost:8001                  |
| client | Vite dev server (proxies `/api` and `/socket.io`)         | http://localhost:5173                  |

On the first start the server finds an empty database. It loads the dummy site (about 4 s),
replays the pipeline over the 7-day history (about 20 s), then starts the live simulator. Watch
for `Simulator running` in the log. After that, one real second is one simulated minute.

Sign in as `demo@site01.local` with your `DEMO_PASSWORD`.

## Trying the backend now

The API uses httpOnly cookies, so use a cookie jar:

```bash
curl -c jar -H "content-type: application/json" \
  -d '{"email":"demo@site01.local","password":"YOUR_DEMO_PASSWORD"}' \
  http://localhost:4000/api/auth/login

curl -b jar http://localhost:4000/api/system/status      # mesh, root, model, gate, site clock
curl -b jar "http://localhost:4000/api/zones?active=true" # moving zones with score, tier, time to limit
curl -b jar "http://localhost:4000/api/alerts?state=open"
curl -b jar http://localhost:4000/api/nodes/N-038         # one node, mesh path to root
curl -b jar "http://localhost:4000/api/nodes/N-037/readings?fields=sinking_mm,speed_mmPerDay"
curl -b jar "http://localhost:4000/api/sites/site-01/terrain?res=8"
curl -b jar -o n037.csv "http://localhost:4000/api/export/readings.csv?nodeIds=N-037&from=2026-09-27T00:00:00Z&to=2026-09-29T00:00:00Z"
curl http://localhost:4000/api/system/health             # no sign-in needed
```

What to expect: `Z-P1` at **watch** (the normal longwall trough), `Z-P1-SE` at **warning**
(sinking more than expected) and `Z-OW1` at **warning**. `Z-OW1` turns **critical** about 4
real minutes after the simulator starts, when its time to limit drops under 24 h.

## Scripts

```bash
npm run dev             # mongo + server + mock model + client
npm run mongo           # just the local MongoDB
npm run generate:data   # rewrite server/data/dummy/* from scenarios.json, with a PASS/FAIL check per scenario
npm run seed            # reset the DB and load the dummy site (history ends at the latest IST midnight)
npm run user:create -- --email a.kumar@example.com --name "A. Kumar"   # prompts for a password
npm test                # all unit and integration tests (in-memory MongoDB, no network)
npm run lint
```

To start again from scratch: stop `npm run dev`, then run `npm run db:reset -w server` and start
it again (seed and backfill run automatically).

## Repository layout

```text
shared/   constants (tiers, node types, units, socket events) and zod schemas for the model contract
server/
  data/dummy/        scenarios.json (all scenario parameters) and the generated site, nodes, links,
                     meshHistory, readings.ndjson, events
  scripts/           generateDummyData, seed, resetDb, createUser
  src/modules/       routes -> controller -> service -> model, one folder per resource
  src/services/      field (Knothe + terrain grid), gate, zones (ST-DBSCAN), inverseVelocity,
                     severity, modelClient, pipeline, simulator, seed
  src/mockModel/     separate Express app implementing POST /predict
  src/realtime/      Socket.IO: cookie auth, per-site rooms, 4 messages/s throttle
client/   Vite + React (phase 1 shell so far)
```

## Data flow

1. Readings arrive from the simulator or `POST /api/ingest/frames`. Both go through the same
   `acceptReadings()`: store, update nodes, emit `readings:batch`.
2. At most every 10 minutes of site time the pipeline runs:
   1. Node status (offline after 3 missed reports; `silent_after_rise` if it went quiet while
      speeding up).
   2. The corroborated gate, with hysteresis.
   3. ST-DBSCAN moving zones, with keys kept stable across runs.
   4. Fast mode for nodes in or near a zone.
   5. The model call (zone nodes and their neighbours only).
   6. Inverse velocity, severity and tier.
   7. Alerts, system status and socket events.
3. With the simulator on, **site time** runs 60× faster than the wall clock.
   `systemStatus.siteClock` is the site's "now".

## Model contract

`POST {MODEL_URL}/predict`. Request and response are defined once in
`shared/src/schemas/modelRequest.js` and `modelResponse.js`, and used by the backend client, the
mock and the tests. To use the real model, set `MODEL_MODE=remote`, `MODEL_URL` and optionally
`MODEL_API_KEY`; no code changes. When the model fails, the backend keeps the last good forecast
(its time to limit counts down with age), marks the model unreachable, and never substitutes
mock output. The request also carries an optional `series.expected_mm` (the Knothe prediction
per slot) so a model can forecast only the unexplained part.

## Where this differs from the brief, and why

- **Scoring against the Knothe prediction.** Sinking, acceleration and deviation are scored on
  the part the Knothe model does not explain, and speed on the measured value. Otherwise the
  normal longwall trough (hundreds of mm) would always be critical.
- **Limits.** Tuned so scenarios A/B/C land on watch/warning/warning at the end of the history:
  `limitSinking_mm` 100 (unexplained sinking), `limitSpeed_mmPerDay` 70. All weights and limits
  live in `scenarios.json` → `site.thresholds`.
- **Time to limit.** Measured to the sinking limit. "Accelerating" also requires the speed to
  grow by half its own value per day, so steady fast sinking does not count.
- **Scenario B location.** Placed at the south-east corner of the mined-out part of P1. P1's
  own south-east corner is not mined within the 7 days.
- **Relay coverage.** 8 relays cannot put all 48 sensors within 60 m of two relays. The layout
  gives the primary relay ≤ 60 m and the backup ≤ 85 m.
- **Sensor spacing.** 48 sensors cannot cover the area at 20 m spacing. The base grid is about
  40 m, with 12 m clusters over OW1 and the P1 south-east corner.
- **Batteries.** Sensors run on battery only; relays charge from solar.
- **Acceleration window.** Acceleration comes from a 6-hour fit; a 6-reading window is too noisy.
- **New collection.** `meshHistory` stores the mesh layout over time for `GET /links?at=`.
- **Tests.** Vitest instead of Jest, because Jest's ES-module support is still experimental.
- **3D exaggeration.** Defaults to ×50, not ×300. At ×300 the ~0.7 m longwall trough becomes a
  220 m crater in a 320 m site. The slider still runs ×1–×1000 and the value is always on screen.
