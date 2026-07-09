# Standalone e-Sukan Firebase

This is a separate Vite + React e-Sukan app copied from the Sin Ming Space workflow but backed directly by Google Firebase Firestore.

## Main Features

- Generates an Excel student namelist template.
- Imports completed namelists with `Name`, `Class`, `IC`, and `Rumah Sukan`.
- Uses normalized `IC` as the student document key.
- Adds sports events in bulk by category, following the Sin Ming e-Sukan flow.
- Registers students into created events.
- Enters event results against registered students.
- Generates printable result slips for each event.
- Provides a realtime live board with fullscreen display and `total-only` mode by default.
- Includes light and dark professional dashboard themes.

## Local Setup

```powershell
cd "C:\Users\User\Desktop\Apps development VSCode Raymond\sinming space\esukan-standalone-firebase"
copy .env.example .env.local
npm install
npm run dev
```

Fill `.env.local` with your Firebase web app config:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ESUKAN_SITE_ID=sinming-esukan
```

## Vercel

Create a new GitHub repo or branch from this folder, then create a new Vercel project with:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: the `VITE_FIREBASE_*` values above

## Firestore Shape

Data is stored under:

```text
esukanSites/{VITE_ESUKAN_SITE_ID}/settings/app
esukanSites/{VITE_ESUKAN_SITE_ID}/students/{IC}
esukanSites/{VITE_ESUKAN_SITE_ID}/events/{eventId}
esukanSites/{VITE_ESUKAN_SITE_ID}/registrations/{eventId}_{IC}
```

For a public open-entry deployment, configure Firestore rules deliberately. For a private admin-only deployment, add Firebase Auth before opening write access broadly.
