# Test Appointment Website — LocalStorage with Backend Hosting

- Backend: Node/Express only serves static files and a health check. No database. Safe to deploy on Render.
- Frontend: All data stored in `localStorage`. Timetable UI with clickable blocks. Terms form marks a slot as booked locally.

## Deploy on Render

1. Push to GitHub.
2. New → Blueprint → point at this repo (uses `render.yaml`).
3. Build: `npm install` — Start: `npm start`.
4. Open the app. Data stays per browser.

## Files

- `public/index.html`, `public/terms.html`, `public/styles.css`, `public/script.js`
- `server.js` static hosting
- `render.yaml` blueprint
