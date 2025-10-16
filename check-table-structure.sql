-- ============================================
-- CHECK TABLE STRUCTURE
-- ============================================

-- Check what columns exist in user_settings table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what columns exist in profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current data in user_settings (if any)
SELECT * FROM user_settings LIMIT 5;

-- Check current data in profiles (if any)
SELECT * FROM profiles LIMIT 5;
