# Final Setup - Fix All Errors

## Step 1: Run Sleep Schedule Migration (REQUIRED)

This is why you're getting the "Could not find the table 'public.sleep_schedule'" error.

### In Supabase:

1. Go to https://app.supabase.com → Select your project
2. Click **SQL Editor** (left sidebar)
3. Click **New Query** (+)
4. Open `health-prototype/db/sleep_schedule_migration.sql`
5. Copy **all** the code
6. Paste into Supabase SQL Editor
7. Click **Run** button
8. You should see success message (might be "No rows affected")

---

## Step 2: Enable Authentication (If Not Already)

The "Auth session missing" error happens when authentication isn't properly set up.

### In Supabase Dashboard:

1. Go to **Settings** → **Authentication**
2. Under **Providers**, verify:
   - ✓ **Email** is enabled
   - ✓ **Anonymous sign-ins** is enabled (yes, required for demo)
3. Under **Email Auth**:
   - Verify **Confirm email required** is OFF (for testing)
   - Enable **Double confirm required** is OFF

---

## Step 3: Test the App

1. **Refresh** your app completely
2. **Login** with any email (e.g., `test@example.com`)
3. App should authenticate and show main tabs
4. Try:
   - ✓ Upload a photo (Scan tab)
   - ✓ Log sleep (Sleep tab)
   - ✓ Set sleep schedule (Profile tab)

---

## What Was Fixed

### ✅ Authentication Issues
- App now uses proper Supabase auth (anonymous fallback)
- userId is now a valid UUID instead of "g-undefined"
- Login has better error messages

### ✅ Sleep Schedule Table
- Need to run migration SQL (see Step 1)
- Once run: `public.sleep_schedule` table will exist

### ✅ Image Upload
- Now handles blob conversion properly
- Works on both web and mobile

---

## Troubleshooting

**Still getting errors?**

1. **After each SQL change:**
   - Close and restart your app
   - Clear browser cache (Ctrl+Shift+Del)

2. **Check Supabase Status:**
   - https://status.supabase.com

3. **Verify Auth is Enabled:**
   - Supabase Dashboard → Settings → Authentication
   - Try signing out then logging back in

4. **Check Console Logs:**
   - Press F12 (on web) → Console tab
   - Look for error details

---

## Quick Checklist

- [ ] Ran `schema.sql` (main tables)?
- [ ] Ran `storage.sql` (photo bucket)?
- [ ] Ran `sleep_schedule_migration.sql` (sleep schedule table)?
- [ ] Enabled Email auth in Supabase?
- [ ] Enabled Anonymous sign-ins in Supabase?
- [ ] Restarted app after SQL changes?

Once all ✓, errors should be gone!
