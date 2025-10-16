-- ============================================
-- SUPABASE STORAGE SETUP FOR TRADE SCREENSHOTS
-- ============================================
-- Run this in your Supabase SQL Editor to enable screenshot uploads
-- This creates the storage bucket and sets up proper permissions

-- Step 1: Create the storage bucket (if it doesn't exist)
-- Note: You can also create this through the Supabase Dashboard UI
-- Go to: Storage → Create Bucket → Name: "trade-images" → Public: Yes

-- Step 2: Create upload policy for authenticated users
CREATE POLICY "Users can upload trade images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'trade-images');

-- Step 3: Create read policy for public access (so screenshots can be viewed)
CREATE POLICY "Public can view trade images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trade-images');

-- Step 4: Create update policy for users to modify their own images
CREATE POLICY "Users can update their own trade images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'trade-images')
WITH CHECK (bucket_id = 'trade-images');

-- Step 5: Create delete policy for users to remove their own images
CREATE POLICY "Users can delete their own trade images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'trade-images');

-- Step 6: Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%trade%'
ORDER BY policyname;

-- Step 7: Test the setup (optional)
-- This will show you if the bucket exists and is accessible
SELECT 
  name,
  id,
  public,
  created_at
FROM storage.buckets 
WHERE name = 'trade-images';

-- ============================================
-- ALTERNATIVE: Manual Setup via Dashboard
-- ============================================
-- If you prefer using the Supabase Dashboard:

-- 1. Go to: https://app.supabase.com
-- 2. Select your project
-- 3. Click "Storage" in the left sidebar
-- 4. Click "Create a new bucket"
-- 5. Name: "trade-images"
-- 6. Make it "Public" (toggle ON)
-- 7. Click "Create bucket"
-- 8. Go to "Policies" tab
-- 9. Click "New Policy" and add these policies:

-- Policy 1: Upload
-- Name: "Users can upload trade images"
-- Target roles: authenticated
-- Operation: INSERT
-- USING expression: bucket_id = 'trade-images'

-- Policy 2: Read
-- Name: "Public can view trade images"
-- Target roles: public
-- Operation: SELECT
-- USING expression: bucket_id = 'trade-images'

-- Policy 3: Update
-- Name: "Users can update their own trade images"
-- Target roles: authenticated
-- Operation: UPDATE
-- USING expression: bucket_id = 'trade-images'
-- WITH CHECK expression: bucket_id = 'trade-images'

-- Policy 4: Delete
-- Name: "Users can delete their own trade images"
-- Target roles: authenticated
-- Operation: DELETE
-- USING expression: bucket_id = 'trade-images'

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If you get "bucket does not exist" error:
-- 1. Create the bucket manually in Dashboard first
-- 2. Then run the policies above

-- If uploads fail with permission error:
-- 1. Check that bucket is public
-- 2. Verify policies are created
-- 3. Check that user is authenticated

-- If images don't display:
-- 1. Check bucket is public
-- 2. Verify public read policy exists
-- 3. Check the URL format in your app

-- To check current policies:
SELECT policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';

-- To delete policies if needed:
-- DROP POLICY "Users can upload trade images" ON storage.objects;
-- DROP POLICY "Public can view trade images" ON storage.objects;
-- DROP POLICY "Users can update their own trade images" ON storage.objects;
-- DROP POLICY "Users can delete their own trade images" ON storage.objects;
