# Dayline

An installable schedule tracker built with React, TypeScript, and Vite. Shows the current timeslot or break and the next event using the device’s local clock. Updates every second and refreshes when reopened.

## Run locally

```sh
npm ci
npm run dev
```

## Check and build

```sh
npm test
npm run build
npm run preview
```

## Deploy to Vercel

Push this repository to GitHub, GitLab, or Bitbucket and import it into Vercel. Use the **Vite** framework preset. The included `vercel.json` sets the build command to `npm run build` and output directory to `dist`. No environment variables or database are required.

Alternatively, deploy from this directory:

```sh
npx vercel
# When ready for production:
npx vercel --prod
```

See [Vercel’s Vite guide](https://vercel.com/docs/frameworks/frontend/vite).

## Schedule

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

Monday through Thursday use all ten slots. Friday uses only slots 1–8 and ends at 14:05. Slot 4 assumes the original `09:30–09:15` was a typo for `09:30–10:15`. Adjust timings in `src/schedule.ts`.

Use **Edit schedule** to add subjects or activities for each weekday; switch days before saving to edit multiple days together. The supplied school data is preloaded and changes save to browser local storage on the current device. Clearing site data clears the schedule. There is no account or synchronization between devices. Breaks appear as current when active; the next card shows the next teaching timeslot. After school and during weekends, the next event is the next school day’s first slot.

## Install and use offline

On the deployed HTTPS URL, choose **Install app** or your browser’s installation option. On iPhone/iPad, open in Safari and choose **Share → Add to Home Screen**. Installation availability depends on browser support; [MDN explains installation requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

The production build generates a web manifest, 192px/512px icons, a maskable icon, and a Workbox service worker that precaches the app. Once it has loaded online and the service worker is active, the schedule works offline. Local development does not enable the service worker; test offline support using `npm run build` followed by `npm run preview`. Optional Google Fonts fall back to system fonts offline. App updates are applied automatically; schedule data is retained independently in local storage.

## Spreadsheet timetables and teacher mappings

The supplied 2026/2027 timetable (33 classes) and PDF teacher directory (68 entries) are included as initial data. Select **Your class** to choose a timetable. The current/next cards and timetable rows resolve numeric codes to subjects and teachers, including multiple codes such as `02, 06`. Assemblies and other text activities remain intact. Code `69` appears in the original timetable but has no entry in the supplied teacher directory; the app flags it instead of guessing.

- **Upload timetable:** accepts `.xlsx`, `.xls`, or `.csv` in the supplied school layout: `HARI`, `JAM KE`, and class columns such as `X.1`, `XI.1`, or `XII.1`. Indonesian and English weekday names are supported. Merged day cells and school-wide activities are expanded. A complete Monday–Friday grid is required. Review the preview and choose **Apply import** to replace class timetables. Existing teacher mappings are preserved.
- **Upload teachers:** accepts a spreadsheet with `Code`, `Teacher`, `Subject` columns, or `Kode`, `Nama Guru`, `Mata Pelajaran`. Column order may vary. Codes are normalized to two digits. Matching codes are updated, new codes are added, and other teachers are kept. Duplicate codes and incomplete rows are rejected before anything is changed.
- **Teacher & subject list:** manually add, edit, or remove mappings and save. **Download spreadsheet** exports the current editor contents as a compatible `.xlsx` template that you can edit and upload later.
- **Edit schedule:** change slots for the selected class using codes, comma-separated codes, or plain activity text. Finish saving or canceling before switching classes or importing data.

Uploads are read locally in the browser, with a 10 MB limit; spreadsheet data is never uploaded to a server. Classes, the selected class, timetable edits, and teacher mappings are saved together in local storage and work offline. Legacy manually entered schedules are retained as **My schedule**. All changes remain specific to this browser/device.

The supplied workbook is also a test fixture so automated checks cover its actual merged layout and all 33 class schedules. Spreadsheet parsing uses [SheetJS Community Edition](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) and loads when importing/exporting; the PWA caches that module for offline use.
