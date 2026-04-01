# Health Prototype (React Native)

Mobile health app prototype built with **React Native (Expo)**.

## Stack
- Frontend: React Native + Expo + TypeScript
- Navigation: React Navigation (bottom tabs)
- Backend: Supabase (Postgres, Auth, Storage)
- Charts: react-native-svg (donut charts in History tab)

## Features (prototype)
- Login screen
- Bottom navigation with 3 tabs:
  - Scan (photo upload/capture + food parsing)
  - History (macro progress + projections)
  - Profile (sleep schedule)
- Food scan flow:
  - Upload image to Supabase Storage (`meal-photos` bucket)
  - Save meals and meal items in Postgres
  - Uses mock parser by default if no scan API key is set

## Project Location
App code is inside:
- `health-prototype/`

## Setup
1. Install dependencies:
```bash
cd health-prototype
npm install
```

2. Create env file at `health-prototype/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. (Optional) Live food scan API instead of mock parser:
```env
EXPO_PUBLIC_CALORIEMAMA_API_URL=your_scan_api_url
EXPO_PUBLIC_CALORIEMAMA_API_KEY=your_scan_api_key
```

4. In Supabase SQL Editor, run:
- `health-prototype/db/schema.sql`
- `health-prototype/db/seed_regulatory_targets.sql`
- `health-prototype/db/storage.sql`

## Run
```bash
cd health-prototype
npx expo start -c
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- or scan the QR code in Expo Go

## Notes
- This is a prototype, so parts are intentionally hardcoded.
- For DB writes from the app, enable Anonymous Auth in Supabase.
