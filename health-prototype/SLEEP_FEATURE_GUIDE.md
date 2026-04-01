# Sleep Schedule Feature Upgrade

## Overview
This upgrade adds comprehensive sleep tracking capabilities to the Health Prototype app, including:
- Sleep schedule management with better UI time picker
- Logging actual sleep sessions with quality ratings and notes
- Sleep history view with statistics
- Database persistence for all sleep data

## What's New

### 1. **Sleep Schedule Management** (ProfileScreen.tsx)
- Upgraded time input UI with a visual time picker modal
- Database persistence to `sleep_schedule` table
- Displays weekly sleep statistics (number of nights, average duration, average quality)
- Validation for time entries
- Error handling with user feedback

### 2. **Sleep Log Screen** (SleepLogScreen.tsx)
- Log actual sleep sessions with date and time
- Quality rating (1-5 scale with emoji indicators)
- Optional notes field for additional context
- Automatic calculation of sleep duration
- Handles overnight sleep (crosses midnight)

### 3. **Sleep History Screen** (SleepHistoryScreen.tsx)
- View all past sleep logs with detailed statistics
- 30-day sleep statistics summary (total nights, average duration, average quality)
- Individual log details with quality badges
- Delete logs with confirmation
- Search and filter by date range
- Empty state handling

### 4. **Time Picker Component** (TimePicker.tsx)
- Reusable modal-based time picker
- Scroll wheel UI for hours and minutes
- Touch-friendly design
- Works seamlessly on mobile devices

### 5. **Sleep Service** (sleepService.ts)
- Complete API layer for sleep operations:
  - `getSleepSchedule()` - Fetch user's preferred sleep times
  - `saveSleepSchedule()` - Update sleep schedule
  - `createSleepLog()` - Log a sleep session
  - `getSleepLogs()` - Retrieve sleep logs with pagination
  - `getSleepLogsByDateRange()` - Filter by date
  - `updateSleepLog()` - Edit quality/notes
  - `deleteSleepLog()` - Remove logs
  - `getSleepStats()` - Calculate statistics

### 6. **Navigation Updates** (MainTabs.tsx, SleepNavigator.tsx)
- New "Sleep" tab in bottom navigation
- Nested stack navigation: Sleep Log → Sleep History
- Seamless integration with existing tabs

## Database Schema Changes

### New Table: `sleep_schedule`
```sql
CREATE TABLE sleep_schedule (
  id uuid PRIMARY KEY,
  user_id uuid (unique, foreign key to auth.users)
  sleep_start_time text (HH:MM format)
  sleep_end_time text (HH:MM format)
  created_at timestamptz
  updated_at timestamptz
)
```

### Updated Table: `sleep_logs` (already exists)
- Used for storing individual sleep records
- Includes quality ratings and notes

## Setup Instructions

### 1. Update Supabase Schema
Run the migration script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of db/sleep_schedule_migration.sql
```

This will:
- Create the `sleep_schedule` table
- Set up row-level security policies
- Create appropriate indexes
- Set up automatic timestamp triggers

### 2. Update Navigation Context
The app now passes `userId` through the authentication context. This is handled automatically in `App.tsx`.

## File Structure
```
health-prototype/
├── src/
│   ├── components/
│   │   └── TimePicker.tsx          (New)
│   ├── navigation/
│   │   ├── MainTabs.tsx            (Updated)
│   │   └── SleepNavigator.tsx      (New)
│   ├── screens/
│   │   ├── ProfileScreen.tsx       (Updated)
│   │   ├── SleepLogScreen.tsx      (New)
│   │   └── SleepHistoryScreen.tsx  (New)
│   └── services/
│       └── sleepService.ts         (New)
├── db/
│   └── sleep_schedule_migration.sql (New)
└── App.tsx                         (Updated)
```

## Key Features

### Time Picker
- Visual, scrollable wheel interface for selecting hours and minutes
- Modal-based design that doesn't interfere with form layout
- Touch and scroll support
- Confirmation/Cancel buttons

### Sleep Quality Rating
- 1-5 scale with visual emoji indicators
- Optional field - can log sleep without quality rating
- Color-coded display (green for good, red for poor)

### Statistics
- Automatically calculated across configurable time periods
- Shows trends in sleep duration and quality
- 7-day stats on Profile
- 30-day stats on Sleep History

### Error Handling
- Validation for invalid time ranges
- Network error handling for database operations
- User-friendly error messages
- Success feedback with auto-dismiss

## Usage

1. **Set Sleep Schedule** (Profile Tab)
   - Open Profile → Sleep Schedule
   - Tap time pickers to select sleep and wake times
   - Save preferences

2. **Log Sleep** (Sleep Tab → Log Sleep)
   - Select date of sleep
   - Choose bedtime and wake time
   - Optionally rate quality and add notes
   - Submit to save

3. **View History** (Sleep Tab → Sleep History)
   - See all past sleep logs
   - View statistics summary
   - Delete logs if needed
   - Access from any sleep log entry

## Technical Notes

### Performance
- Pagination on sleep logs (50 per request)
- Efficient date-based queries with indexes
- Memoized statistics calculations

### Security
- Row-level security policies on all tables
- Users can only access their own data
- Automatic user_id enforcement via RLS

### Compatibility
- Uses existing dependencies (no new packages needed)
- Compatible with Expo React Native
- Works with existing Supabase integration
- Uses native React components for UI

## Future Enhancements
- Sleep goal tracking
- Sleep pattern analysis
- Notifications for sleep reminders
- Wearable device integration
- Sleep debt calculations
- Export sleep data
- Advanced charting and visualization

## Troubleshooting

### Sleep data not persisting
- Verify `sleep_schedule_migration.sql` was executed in Supabase
- Check user authentication status
- Review browser console for error messages

### Time picker not responding
- Ensure you're tapping the correct area (the time display button)
- Scroll wheel should be responsive to finger drags
- Confirm button must be tapped to save changes

### Statistics not showing
- Ensure at least one sleep log exists
- Statistics appear only when data is available
- Check network connectivity for data fetch

## Database Recovery

If you need to reset sleep data:
```sql
DELETE FROM public.sleep_logs WHERE user_id = 'your_user_id';
DELETE FROM public.sleep_schedule WHERE user_id = 'your_user_id';
```

## Questions or Issues?
The sleep service provides comprehensive logging. Check the console for detailed error information if operations fail.
