# Image Upload Troubleshooting Guide

## Overview
The image upload feature in ScanScreen allows users to capture or select photos, which are then uploaded to Supabase Storage and processed for food scanning.

## How It Works
1. User selects "Take Photo" or "Upload Photo"
2. Image is converted to a blob
3. Photo is uploaded to `meal-photos` bucket in Supabase Storage
4. Photo is parsed for food items (using API or mock data)
5. Meal and food items are saved to database
6. Recent scans are displayed

## Setup Checklist

### 1. **Supabase Storage Configuration**
Run this SQL in your Supabase SQL Editor:

```sql
-- From db/storage.sql - paste the entire contents into Supabase
```

This creates:
- ✓ `meal-photos` bucket
- ✓ Row-level security policies
- ✓ Image MIME type restrictions

**Check if bucket exists:**
- Go to Supabase Dashboard → Storage
- Verify `meal-photos` bucket is listed
- Verify it's public (eye icon shows)

### 2. **Database Tables**
Make sure these tables exist (from schema.sql):
- ✓ `meals` - stores meal records with photo_url
- ✓ `meal_items` - stores parsed food items

### 3. **Authentication**
The app uses either:
- Authenticated user (if logged in)
- Anonymous authentication (fallback)

Make sure in Supabase Settings → Authentication:
- ✓ Email auth enabled (or your provider)
- ✓ Anonymous sign-ins allowed

## Common Issues & Solutions

### Issue: "Storage upload failed" or bucket doesn't exist
**Solution:**
1. Verify `storage.sql` has been run: Check for `meal-photos` bucket in Supabase Dashboard
2. Re-run the entire `storage.sql` file in SQL Editor
3. Check bucket permissions - ensure it's marked as public
4. Refresh browser/app

### Issue: "Anonymous auth failed"
**Solution:**
1. In Supabase Dashboard → Settings → Authentication → Providers
2. Verify "Anonymous sign-ins" is enabled
3. Clear app cache and restart app

### Issue: Image shows in preview but doesn't upload
**Possible causes:**
- Image URI format not supported
- Network connectivity issue
- File too large (limit is 10MB)

**Solution:**
1. Check browser console for error messages (press F12)
2. Try with a smaller image file
3. Check network connectivity
4. Verify Supabase project is running

### Issue: Image uploads but no "recent scans" appear
**Solution:**
1. Check that meal_items were parsed (check console output)
2. Verify PostgreSQL `meals` and `meal_items` tables exist
3. Check if row-level security policies are blocking reads:
   ```sql
   -- In Supabase SQL Editor, check RLS policies
   SELECT * FROM auth.uid();
   ```

### Issue: "image conversion resulted in empty blob"
**Solution:**
1. Use a different image (JPEG or PNG)
2. Try taking a fresh photo instead of uploading from library
3. On mobile, try a different image picker method

## Environment Variables

Optional for live food scanning API:

```env
EXPO_PUBLIC_CALORIEMAMA_API_URL=https://api.example.com/scan
EXPO_PUBLIC_CALORIEMAMA_API_KEY=your_api_key_here
```

Without these, the app uses **mock food data** (returns sample items).

## Debug Mode

To see detailed logs:

1. **Open browser DevTools** (F12) and go to Console tab
2. Look for messages starting with:
   - `Starting food scan with image:`
   - `User ID:`
   - `Photo uploaded to:`
   - `Parsed items:`
   - `Saved meal with ID:`

3. **Copy-paste any error messages** if you need help

## Testing Steps

### Test 1: Take a Photo
1. Click "Take Photo"
2. Capture an image
3. Wait for upload to complete
4. Should see ✓ message

### Test 2: Upload from Library
1. Click "Upload Photo"
2. Select an image
3. Wait for upload to complete
4. Should appear in Recent Scans

### Test 3: Verify Database
1. In Supabase Dashboard → SQL Editor
2. Run:
```sql
SELECT id, photo_url, created_at FROM public.meals ORDER BY created_at DESC LIMIT 5;
SELECT * FROM public.meal_items LIMIT 5;
```
3. You should see your uploaded meals and items

## Performance Tips

- **Image Quality**: App compresses images to 70% quality before processing (reduces file size)
- **File Size**: 10MB max per image
- **Recent Scans**: Shows last 8 scans

## Security Notes

- Photos are stored per user ID in separate folders
- Row-level security ensures users can only see their own photos
- Anonymous users get a temporary session ID

## If All Else Fails

1. **Check Supabase Status**: https://status.supabase.com
2. **Verify Project Credentials** in `supabase.ts`:
   ```typescript
   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
   ```
3. **Reset Storage Bucket**:
   ```sql
   -- WARNING: This deletes all meal photos
   DROP BUCKET IF EXISTS meal_photos;
   -- Then re-run storage.sql
   ```
4. **Check Network**: Try uploading on a different network (WiFi vs cellular, etc.)

## Contact & Logs

When reporting issues, include:
- Error message from app (take a screenshot)
- Browser console logs (F12 → Console tab)
- Supabase project URL (last part before .supabase.co)
- Whether you're on mobile, web, or emulator
