# Database Setup Instructions

## Quick Fix for Settings Error

The error you're seeing is because the `user_settings` table doesn't exist yet. Here's how to fix it:

### Option 1: Run SQL in Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration SQL**
   - Copy the contents of `setup_user_settings.sql` file
   - Paste it into the SQL editor
   - Click "Run" to execute the migration

### Option 2: Use Supabase CLI (If Available)

If you have Supabase CLI installed:

```bash
# Navigate to your project directory
cd /Users/mac/bias-to-profit

# Push the migration
supabase db push
```

### Option 3: Manual Table Creation

If you prefer to create the table manually, run this SQL in your Supabase SQL Editor:

```sql
-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## What This Fixes

After running the migration, you'll have:

✅ **Settings Table**: `user_settings` table with proper structure
✅ **Row Level Security**: Users can only access their own settings
✅ **Automatic Timestamps**: `created_at` and `updated_at` fields
✅ **JSON Storage**: Flexible JSONB column for settings
✅ **Proper Indexing**: Fast lookups by user_id

## Fallback Behavior

The app now includes fallback behavior:

- **Local Storage**: Settings are saved locally if database is unavailable
- **Default Settings**: App uses sensible defaults if no settings found
- **Error Handling**: Graceful error handling with user-friendly messages
- **No Crashes**: App continues to work even without the database table

## Verification

After running the migration:

1. **Refresh your app** - The settings errors should disappear
2. **Open Settings** - Click the Settings button in the header
3. **Change a setting** - Try changing a preference
4. **Check persistence** - Refresh the page and verify settings are saved

## Troubleshooting

### If you still see errors:

1. **Check RLS Policies**: Make sure the policies are created correctly
2. **Verify User ID**: Ensure the user is properly authenticated
3. **Check Console**: Look for any remaining error messages
4. **Test Settings**: Try opening the settings modal

### Common Issues:

- **Permission Denied**: Check RLS policies are correct
- **Table Not Found**: Make sure the migration ran successfully
- **Column Not Found**: Verify the table structure matches the code

## Next Steps

Once the database is set up:

1. **Test Settings**: Try changing various settings
2. **Import/Export**: Test the settings backup features
3. **User Experience**: Settings will now persist across sessions
4. **Performance**: Settings are cached for fast access

---

*This setup is required for the new settings system to work properly. The app will function with defaults until the database is set up.*
