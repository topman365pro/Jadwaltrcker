# Dayline

An installable school schedule tracker built with React, TypeScript, Vite, Vercel Functions, and PostgreSQL.

- **Dashboard `/`:** current subject, teacher, timeslot, next lesson, weekday timetable, and class selector.
- **Data management `/data`:** spreadsheet imports, teacher/subject editing, and per-class timetable editing.
- **Postgres:** shared teachers and timetables. The supplied school files seed 68 teachers, 33 classes, and 1,584 timetable entries.
- **Browser:** class selection persists in local storage. An offline cache holds the last successfully fetched shared timetable; it is not the source of truth.

## Environment and Vercel

The private `.env` has been created locally with the supplied `DATABASE_URL` and a generated `ADMIN_TOKEN`. It is ignored by Git. `.env.example` documents the required variables without real credentials.

In **Vercel → Project Settings → Environment Variables**, import the `.env` values or add these server-only variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL connection string with TLS |
| `ADMIN_TOKEN` | Editing key used on the Data management page |

Set them for the environments you deploy to, then redeploy. These names must **not** start with `VITE_`. Vercel supplies server environment variables at runtime; it does not use the ignored local `.env` in a Git deployment. No database credential or editing key is embedded in the frontend.

Import this repository into Vercel using the **Vite** preset. `vercel.json` supplies the build/output settings, the `/data` page rewrite, and the `/api/school` Node function configuration. See [Vercel’s Vite guide](https://vercel.com/docs/frameworks/frontend/vite) and [environment variable guide](https://vercel.com/docs/environment-variables).

The provided database has already been migrated. To initialize another database or safely rerun the schema setup:

```sh
npm ci
npm run db:migrate
```

The migration runs in a transaction and only seeds when `dayline_meta` has no school record. Rerunning preserves existing shared data. Migration SQL is in `migrations/001_school.sql`. It creates namespaced tables `dayline_meta`, `dayline_teachers`, `dayline_classes`, and `dayline_timetable`.

## Run locally

```sh
npm ci
# Create .env from .env.example if this is a new checkout.
npm run db:migrate
npm run dev
```

Vite serves the app and the same server API locally, loading server settings from `.env`. The default URL is `http://localhost:5173`. The `/api/school` route uses the database; plain static hosting does not provide that route.

```sh
npm test
npm run build
npm run preview
```

## Editing shared data

Open **Manage data**, enter the `ADMIN_TOKEN` from your private `.env` into **Editing key**, and unlock editing. The key stays in session storage for the tab; **Lock editing** removes it. Viewing the dashboard does not require a key. The server authenticates every write, validates uploaded data, and rejects stale saves with a revision conflict. Data changes apply only after a successful database save. No edits are queued while offline.

- **Upload timetable:** `.xlsx`, `.xls`, or `.csv` in the supplied layout with `HARI`, `JAM KE`, and class headers such as `X.1`, `XI.1`, or `XII.1`. Indonesian and English weekdays work. Merged day cells and school-wide activities are expanded. Review the import before applying; it replaces class timetables and retains teacher mappings.
- **Upload teachers:** columns `Code`, `Teacher`, `Subject`, or `Kode`, `Nama Guru`, `Mata Pelajaran`, in any order. Matching codes are updated; new codes are added; other teachers remain. Codes are normalized to two digits. Duplicate codes and incomplete rows are rejected.
- **Teacher & subject list:** add, edit, or remove mappings. **Download spreadsheet** exports a compatible `.xlsx` file for further editing.
- **Edit schedule:** choose a class, then edit its weekday slots using teacher codes (e.g. `02` or `02, 06`) or plain activity text. Save or cancel before switching classes.

Spreadsheet files are parsed in the browser (10 MB limit); the resulting validated school data is sent to the authenticated API. Database writes are transactional and parameterized. Class selection is never written to Postgres or shared with other users.

The original workbook contains code `69`, which is missing from the supplied PDF teacher directory. It remains visible as an unmapped code until corrected manually. Assemblies and literacy periods retain their source text.

## Timeslots

| Slot | Time |
| --- | --- |
| 1 | 07:00–07:45 |
| 2 | 07:45–08:30 |
| 3 | 08:30–09:15 |
| Break 1 | 09:15–09:30 |
| 4 | 09:30–10:15 |
| 5 | 10:15–11:00 |
| 6 | 11:00–11:45 |
| Break 2 | 11:45–12:45 |
| 7 | 12:45–13:25 |
| 8 | 13:25–14:05 |
| 9 | 14:05–14:40 |
| 10 | 14:40–15:15 |

Monday–Thursday use all ten slots. Friday ends after slot 8 at 14:05. Slot 4 assumes the original `09:30–09:15` was a typo for `09:30–10:15`. The clock uses the device’s local timezone and updates every second. Breaks appear as current while active; the next card shows the next teaching timeslot, including the following school day after hours or on weekends.

## Install and use offline

Visit the deployed HTTPS URL and choose **Install app**, or use the browser’s installation menu. On iPhone/iPad use **Safari → Share → Add to Home Screen**.

The production service worker caches the app and spreadsheet module. After the first successful visit, cached shared data can be viewed offline, and the class preference remains available. Imports and edits require an online server/database connection. API requests are excluded from the service worker’s HTML fallback. Optional Google Fonts fall back to system fonts offline. Clearing browser site data removes the preference/cache, but does not remove the shared database.

`npm run build` also runs `npm run test:runtime`: it compiles the API using Node's module rules and imports it in plain Node, without Vite or tsx. This catches server startup failures that a development loader can hide. Server validation uses the standalone `src/teachers.ts` module so the function does not import browser modules or seed JSON. API loading validates responses before replacing the offline cache and shows readable errors for non-JSON function crashes or connection failures.
