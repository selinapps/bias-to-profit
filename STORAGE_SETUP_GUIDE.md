# 📸 Storage Setup Guide - Trade Screenshots

## 🎯 Quick Setup (2 minutes)

### Method 1: Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project

2. **Create Storage Bucket**
   - Click **"Storage"** in left sidebar
   - Click **"Create a new bucket"**
   - Name: `trade-images`
   - Toggle **"Public"** to **ON** ✅
   - Click **"Create bucket"**

3. **Set Up Policies**
   - Click **"Policies"** tab
   - Click **"New Policy"** (4 times)

   **Policy 1: Upload**
   ```
   Name: Users can upload trade images
   Target roles: authenticated
   Operation: INSERT
   USING: bucket_id = 'trade-images'
   ```

   **Policy 2: Read**
   ```
   Name: Public can view trade images
   Target roles: public
   Operation: SELECT
   USING: bucket_id = 'trade-images'
   ```

   **Policy 3: Update**
   ```
   Name: Users can update their own trade images
   Target roles: authenticated
   Operation: UPDATE
   USING: bucket_id = 'trade-images'
   WITH CHECK: bucket_id = 'trade-images'
   ```

   **Policy 4: Delete**
   ```
   Name: Users can delete their own trade images
   Target roles: authenticated
   Operation: DELETE
   USING: bucket_id = 'trade-images'
   ```

### Method 2: SQL Commands (Advanced)

1. **Go to SQL Editor**
   - Supabase Dashboard → SQL Editor
   - Click **"New Query"**

2. **Run the Setup Script**
   - Copy contents from `setup_storage_policies.sql`
   - Paste and click **"Run"**
   - Should see: ✅ Success messages

## 🔍 Visual Setup Guide

### Step 1: Create Bucket
```
┌─────────────────────────────────┐
│  📁 Storage                     │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │  Create a new bucket        ││
│  │                             ││
│  │  Name: trade-images         ││
│  │  Public: [ON] ✅            ││
│  │                             ││
│  │  [Create bucket]            ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### Step 2: Add Policies
```
┌─────────────────────────────────┐
│  📁 trade-images                │
├─────────────────────────────────┤
│  Files    Policies    Settings  │
│     ↑         ↑                 │
│  (empty)  [New Policy]          │
└─────────────────────────────────┘
```

### Step 3: Policy Configuration
```
┌─────────────────────────────────┐
│  🛡️ New Policy                  │
├─────────────────────────────────┤
│  Name: Users can upload...      │
│  Target roles: authenticated    │
│  Operation: INSERT              │
│  USING: bucket_id = 'trade-images' │
│                                 │
│  [Save policy]                 │
└─────────────────────────────────┘
```

## ✅ Verification Steps

### Check Bucket Exists
```sql
-- Run in SQL Editor
SELECT name, public, created_at 
FROM storage.buckets 
WHERE name = 'trade-images';
```

**Expected Result:**
```
name         | public | created_at
trade-images | true   | 2025-01-31...
```

### Check Policies Exist
```sql
-- Run in SQL Editor
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';
```

**Expected Result:**
```
policyname                           | cmd    | roles
Users can upload trade images        | INSERT | {authenticated}
Public can view trade images         | SELECT | {public}
Users can update their own trade... | UPDATE | {authenticated}
Users can delete their own trade...  | DELETE | {authenticated}
```

## 🧪 Test Upload

### Test in Your App
1. **Open your trading app**
2. **Go to a trade → Manage**
3. **Try uploading an image**
4. **Should see success message**

### Test URL Access
1. **Upload a test image**
2. **Copy the URL from console**
3. **Open in new tab**
4. **Should display the image**

## 🚨 Troubleshooting

### "Bucket does not exist"
**Solution:**
1. Create bucket manually in Dashboard
2. Make sure it's public
3. Try upload again

### "Permission denied"
**Solution:**
1. Check user is logged in
2. Verify upload policy exists
3. Check bucket is public

### "Image won't display"
**Solution:**
1. Check public read policy exists
2. Verify bucket is public
3. Check URL format

### "Upload fails silently"
**Solution:**
1. Check file size (must be < 5MB)
2. Check file format (JPG/PNG/GIF)
3. Check browser console for errors

## 📋 Complete Checklist

- [ ] Created `trade-images` bucket
- [ ] Made bucket public
- [ ] Added upload policy (authenticated)
- [ ] Added read policy (public)
- [ ] Added update policy (authenticated)
- [ ] Added delete policy (authenticated)
- [ ] Tested upload in app
- [ ] Tested image display
- [ ] Verified URL access

## 🎯 Quick Commands

### Create Everything at Once
```sql
-- Run this single command in SQL Editor
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-images', 'trade-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload trade images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trade-images');

CREATE POLICY "Public can view trade images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'trade-images');

CREATE POLICY "Users can update their own trade images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'trade-images')
WITH CHECK (bucket_id = 'trade-images');

CREATE POLICY "Users can delete their own trade images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'trade-images');
```

### Verify Everything Works
```sql
-- Check bucket
SELECT name, public FROM storage.buckets WHERE name = 'trade-images';

-- Check policies
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

## 🎉 Success Indicators

When everything is working, you should see:

1. **In Supabase Dashboard:**
   - `trade-images` bucket exists
   - 4 policies listed
   - Bucket shows as "Public"

2. **In Your App:**
   - Upload button works
   - Images preview correctly
   - No error messages
   - Images display in trade history

3. **In Browser:**
   - Screenshot URLs open directly
   - Images load without authentication
   - No CORS errors in console

---

**That's it! Your screenshot upload feature is now ready! 📸✨**
