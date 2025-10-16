# 📸 Screenshot Upload & Custom Tags Guide

## 🎉 What's New

### 1. **Trade Screenshot Upload**
- Upload screenshots directly when closing trades
- Preview images before uploading
- 5MB file size limit
- Supports JPG, PNG, GIF formats
- View screenshots in trade history

### 2. **Customizable Tags**
- Create your own mistake tags
- Create your own good action tags
- Edit in Settings → Trading tab
- Automatically used in Manage Trade screen

## 🚀 How to Use

### Uploading Screenshots

1. **Open Manage Trade Screen**:
   - Click "Manage" on any open trade
   - Enter your exit price

2. **Add Screenshot**:
   - Click the dashed upload area
   - Select an image from your device
   - Preview appears instantly
   - Remove with X button if needed

3. **Close Trade**:
   - Complete your reflection
   - Screenshot uploads automatically
   - View it later in trade history

### Customizing Tags

1. **Open Settings**:
   - Click Settings icon in header
   - Go to "Trading" tab
   - Scroll to "Custom Trade Tags" section

2. **Add Mistake Tags**:
   ```
   ❌ Entered too early
   ❌ Ignored stop loss
   ❌ FOMO entry
   ❌ Wrong time of day
   ❌ Didn't wait for confirmation
   ```
   - One tag per line
   - Use any text you want
   - Live preview below

3. **Add Good Action Tags**:
   ```
   ✅ Followed my plan
   ✅ Waited for setup
   ✅ Perfect entry
   ✅ Disciplined exit
   ✅ Good risk management
   ```
   - One tag per line
   - Customize to your strategy
   - Live preview below

4. **Save & Use**:
   - Tags save automatically
   - Appear in Manage Trade screen
   - Use defaults if empty

## 📁 Files Changed

### New Migrations:
- `supabase/migrations/20250131000001_add_custom_tags_and_screenshots.sql`
- `apply_custom_tags_migration.sql` (standalone)

### Updated Components:
- `ManageTradeSheet.tsx` - Screenshot upload + custom tags
- `SettingsModal.tsx` - Tag customization UI
- `TradeCard.tsx` - Screenshot display
- `types.ts` - New database fields

### Database Changes:
- `user_settings.custom_mistake_tags` (text[])
- `user_settings.custom_good_actions` (text[])
- `user_settings.default_model` (text)
- `trades.screenshot_url` (already exists, now used)

## 🛠️ Setup Instructions

### Step 1: Apply Database Migration

#### Option A: Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor**
4. Click **New Query**
5. Copy contents of `apply_custom_tags_migration.sql`
6. Paste and click **Run**
7. Should see: ✅ Migration successful!

#### Option B: CLI
```bash
npx supabase db push
```

### Step 2: Create Storage Bucket (For Screenshots)

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `trade-images`
3. Make it **Public**
4. Set policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload trade images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'trade-images');

-- Allow public read access
CREATE POLICY "Public can view trade images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trade-images');
```

### Step 3: Restart Your App
```bash
npm run dev
```

## 📸 Screenshot Features

### Upload Interface
```
┌─────────────────────────────┐
│  📷 Trade Screenshot        │
├─────────────────────────────┤
│  ┌─────────────────────┐   │
│  │  ⬆️  Upload          │   │
│  │  screenshot          │   │
│  │  (optional)          │   │
│  │  Max 5MB             │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### After Upload
```
┌─────────────────────────────┐
│  📷 Trade Screenshot        │
├─────────────────────────────┤
│  ┌─────────────────────┐   │
│  │                      │   │
│  │   [Preview Image]    │ ❌ │
│  │                      │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### In Trade History
```
┌─────────────────────────────────┐
│ EURUSD LONG • Closed            │
│ +1.5R • $150                    │
├─────────────────────────────────┤
│ ┌─────────────────────────┐    │
│ │   [Chart Screenshot]    │    │
│ │   (click to enlarge)    │    │
│ └─────────────────────────┘    │
│                                 │
│ 📚 Lessons: Perfect setup...    │
│ ✅ Followed plan               │
│ ✅ Good entry timing           │
└─────────────────────────────────┘
```

## 🎨 Custom Tags UI

### Settings Screen
```
╔════════════════════════════════╗
║  ⚙️  Settings → Trading         ║
╠════════════════════════════════╣
║  📝 Custom Trade Tags          ║
║                                ║
║  ❌ Custom Mistake Tags        ║
║  ┌──────────────────────────┐ ║
║  │ ❌ Entered too early      │ ║
║  │ ❌ Ignored stop loss      │ ║
║  │ ❌ Wrong session          │ ║
║  └──────────────────────────┘ ║
║                                ║
║  Preview:                      ║
║  [❌ Entered too early]        ║
║  [❌ Ignored stop loss]        ║
║                                ║
║  ✅ Custom Good Action Tags    ║
║  ┌──────────────────────────┐ ║
║  │ ✅ Followed plan          │ ║
║  │ ✅ Perfect entry          │ ║
║  │ ✅ Good timing            │ ║
║  └──────────────────────────┘ ║
║                                ║
║  Preview:                      ║
║  [✅ Followed plan]            ║
║  [✅ Perfect entry]            ║
╚════════════════════════════════╝
```

### Manage Trade Screen (Using Custom Tags)
```
╔════════════════════════════════╗
║  ❌ Mistakes (if any)          ║
╠════════════════════════════════╣
║  [❌ Entered too early]        ║
║  [❌ Wrong session]            ║
║  [Your custom tags here...]    ║
╚════════════════════════════════╝
```

## 💡 Pro Tips

### Screenshot Best Practices
1. **Capture Before Close**: Screenshot your chart before exiting
2. **Include Context**: Show full chart with entry/exit levels
3. **Add Annotations**: Mark key levels on the screenshot first
4. **Review Later**: Click screenshots in history to review

### Custom Tags Tips
1. **Be Specific**: "Late entry on London open" vs "Bad entry"
2. **Use Emojis**: Makes tags visually distinct
3. **Group Similar**: Keep related tags together
4. **Start Simple**: Add 3-5 tags, expand as needed
5. **Review Weekly**: Adjust tags based on patterns

### Tag Categories You Might Create

**Timing Mistakes**:
- ❌ Entered during news
- ❌ Wrong session
- ❌ Too early in trend

**Execution Mistakes**:
- ❌ Ignored setup rules
- ❌ Moved stop loss
- ❌ Added to loser

**Psychological**:
- ❌ Revenge trading
- ❌ FOMO entry
- ❌ Overconfident

**Good Timing**:
- ✅ Perfect session entry
- ✅ Waited for setup
- ✅ Caught the move

**Good Execution**:
- ✅ Followed rules
- ✅ Respected stop
- ✅ Scaled properly

**Good Psychology**:
- ✅ Stayed patient
- ✅ No emotions
- ✅ Trusted process

## 🔍 Troubleshooting

### Screenshot Upload Fails
- **Check file size**: Must be under 5MB
- **Check format**: JPG, PNG, or GIF only
- **Check storage bucket**: Must exist and be public
- **Check permissions**: RLS policies must allow uploads

### Custom Tags Not Showing
- **Save settings**: Changes save automatically
- **Refresh page**: Force reload (Cmd+Shift+R)
- **Check format**: One tag per line in settings
- **Empty = defaults**: Leave blank to use built-in tags

### Screenshot Not Displaying
- **Check URL**: Open in new tab to verify
- **Check bucket**: Must be public for viewing
- **Check RLS**: Public read policy must exist
- **Cache issue**: Hard refresh the page

## 📊 Future Enhancements

With these features, you can later build:
- **Screenshot gallery view**: Browse all trade screenshots
- **Tag analytics**: Most common mistakes/successes
- **AI analysis**: Analyze patterns from screenshots
- **Template tags**: Share tag sets with others
- **Bulk import**: Import tags from CSV

## 🎯 Quick Start Checklist

- [ ] Apply `apply_custom_tags_migration.sql` in Supabase
- [ ] Create `trade-images` storage bucket
- [ ] Set storage policies for uploads
- [ ] Restart dev server
- [ ] Open Settings → Trading
- [ ] Add your custom tags
- [ ] Take a trade screenshot
- [ ] Upload when closing trade
- [ ] Review in trade history

---

**Now your trading journal is even more powerful!** 📈🚀

*Capture every detail, customize your workflow, and learn faster from your trades.*
