# Health Prototype

A mobile health app built with **React Native (Expo)** that lets users scan meals with their camera, track nutrition, view macro history, and manage their sleep schedule.

## Features

- **Authentication** — email/password login via Supabase Auth
- **Food Scan** — take or upload a photo of a meal; Claude AI (Anthropic) identifies food items and fetches nutritional data from the USDA FoodData Central API
- **Nutrition Tracking** — meals and macro breakdowns (calories, protein, carbs, fat) are saved to a Postgres database
- **History Tab** — donut charts and macro progress over time using react-native-svg
- **Sleep Schedule** — set and manage a personal sleep schedule from the Profile tab

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 54) |
| Language | TypeScript |
| Navigation | React Navigation (bottom tabs + native stack) |
| Backend / DB | Supabase (Postgres, Auth, Storage) |
| AI / Vision | Anthropic Claude API (claude-sonnet) |
| Nutrition Data | USDA FoodData Central API |
| Charts | react-native-svg |
| Validation | Zod |

## Project Structure

```
357-Project/
└── health-prototype/       # All app code lives here
    ├── src/
    │   ├── screens/        # Tab screens (Scan, History, Profile, Login)
    │   ├── components/     # Shared UI components
    │   ├── navigation/     # Navigation configuration
    │   └── services/       # API integrations (foodScan, supabase, etc.)
    ├── db/
    │   ├── schema.sql                   # Main database schema
    │   ├── seed_regulatory_targets.sql  # Seeded nutrition targets
    │   ├── sleep_schedule_migration.sql # Sleep schedule table
    │   └── storage.sql                  # Supabase Storage bucket config
    ├── assets/             # App icons and images
    ├── App.tsx
    └── .env                # Environment variables (not committed)
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- [Expo Go](https://expo.dev/go) app on your phone, **or** an iOS/Android simulator
- A [Supabase](https://supabase.com/) project
- An [Anthropic](https://console.anthropic.com/) API key
- A [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide.html) API key (free)

## Setup

### 1. Install dependencies

```bash
cd health-prototype
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `health-prototype/.env` with your actual keys (see `.env.example` for descriptions).

### 3. Set up the database

In your Supabase project, open the **SQL Editor** and run the following files in order:

```
health-prototype/db/schema.sql
health-prototype/db/seed_regulatory_targets.sql
health-prototype/db/storage.sql
health-prototype/db/sleep_schedule_migration.sql
```

### 4. Enable Anonymous Auth (optional)

If you want to test without creating an account, enable **Anonymous sign-ins** in your Supabase project under **Authentication → Providers**.

## Running the App

```bash
cd health-prototype
npx expo start -c
```

Then choose a target:

| Key | Action |
|---|---|
| `i` | Open in iOS Simulator |
| `a` | Open in Android Emulator |
| Scan QR | Open in Expo Go on your phone |

## Notes

- This is a prototype — some values may be hardcoded for demo purposes.
- The `.env` file contains sensitive keys and is excluded from version control. Never commit it.
