# BikeGuard Web App

Full-stack BikeGuard demo with a polished frontend and a Node/Express backend.

## Setup

1. Install dependencies:
   - `npm install`
2. Copy env:
   - `cp .env.example .env`
3. Start server:
   - `npm run dev`

Open `http://localhost:3000`.

## Demo login

- Email: `demo@bikeguard.app`
- Password: `demo1234` (or `DEMO_PASSWORD` from `.env`)

## Login email alerts (Gmail)

On every successful login, an email is sent to the owner.

Update `.env`:
- `OWNER_EMAIL` = address to receive alerts
- `SMTP_USER` = Gmail address used to send
- `SMTP_PASS` = Gmail App Password (not your normal password)
- `ADMIN_EMAILS` = comma-separated list of admin emails

## Google Maps

Add your API key in `app.js` by setting `window.GOOGLE_MAPS_API_KEY` before the app loads.
Example (top of `app.js`):

```js
window.GOOGLE_MAPS_API_KEY = 'YOUR_KEY'
```

## Features

- Profile page (name, phone, medical info, emergency contacts)
- Ride tracking start/stop with live timer
- Edit/update rides and issues
- Email alerts on login, SOS, and issue updates
- Export rides/issues CSV and summary PDF
- Admin dashboard (users + SOS events)
 - Single-page UI with landing, auth, dashboard, and admin views

## Deployment (GitHub)

1. Initialize git and push to GitHub:
   - `git init`
   - `git add .`
   - `git commit -m "BikeGuard backend"`
   - `git remote add origin <your-repo-url>`
   - `git push -u origin main`
2. Run in production by cloning the repo and starting:
   - `npm install`
   - `npm run dev` (or `npm start`)

If you want a hosted deployment with HTTPS and a managed database, tell me and I’ll migrate the DB and provide a Render/Railway setup.
## API (summary)

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/dashboard`
- `GET /api/rides`
- `POST /api/rides`
- `GET /api/issues`
- `POST /api/issues`
- `GET /api/contacts`
- `POST /api/contacts`
- `POST /api/sos`
