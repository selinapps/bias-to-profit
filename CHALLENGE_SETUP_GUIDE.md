# Challenge Status Tracking Setup Guide

This guide will help you set up the new Challenge Status Tracking feature that allows users to track their prop firm challenges (Funded Hive and Topstep).

## 🚀 Quick Setup

### Step 1: Apply Database Migration

1. **Go to your Supabase Dashboard**
   - Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Apply the Migration**
   - Copy the entire contents of `supabase/migrations/20250129000001_create_challenge_phases.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration

### Step 2: Verify Setup

After running the migration, you should see:
- ✅ `challenge_phases` table created
- ✅ `get_challenge_summary` function created
- ✅ Row Level Security policies applied
- ✅ Indexes for performance optimization

### Step 3: Test the Feature

1. **Refresh your application**
2. **Look for the Challenge Status Card** on the main dashboard
3. **Click "Setup Challenge"** to test the setup wizard
4. **Create a test challenge** with your prop firm details

## 📋 What's Included

### Database Schema
- **challenge_phases table**: Stores user challenge data
- **get_challenge_summary function**: Calculates real-time progress metrics
- **Automatic triggers**: Ensures only one active challenge per user
- **Row Level Security**: Protects user data

### UI Components
- **Challenge Status Card**: Real-time progress tracking widget
- **Setup Wizard**: 4-step challenge creation process
- **Progress Indicators**: Visual progress bars and metrics

### Features
- **Real-time Updates**: Automatically updates when trades are closed
- **Progress Calculations**: Shows distance to pass in $ and R multiples
- **Prop Firm Support**: Funded Hive and Topstep (expandable)
- **Phase Tracking**: Phase 1, Phase 2, and Funded account support

## 🎯 How It Works

### Challenge Setup
1. User selects prop firm (Funded Hive or Topstep)
2. User selects challenge phase (1, 2, or Funded)
3. User enters account details (starting balance, profit target)
4. Optional: User enters current balance if already trading

### Real-time Tracking
- **Automatic Updates**: Card updates when trades are closed
- **Progress Calculation**: Based on P&L from trades since challenge start
- **Distance to Pass**: Shows remaining amount needed to pass
- **R Multiple Display**: Shows distance in risk units (250, 500, 1000)

### Challenge States
- **ACTIVE**: Challenge in progress
- **PASSED**: Target reached, ready for next phase

## 🔧 Troubleshooting

### Migration Issues
If the migration fails:
1. Check that you have the correct permissions in Supabase
2. Ensure your database is not in maintenance mode
3. Try running the SQL statements individually

### UI Issues
If the Challenge Status Card doesn't appear:
1. Check browser console for errors
2. Verify the database migration was successful
3. Refresh the application

### Data Issues
If calculations seem incorrect:
1. Check that trades have correct `exit_time` and `pnl` values
2. Verify the challenge start date is correct
3. Ensure trades are marked as 'closed' when completed

## 📊 API Endpoints

The feature includes these API endpoints:
- `POST /api/challenge/create` - Create new challenge
- `POST /api/challenge/update` - Update existing challenge
- `GET /api/challenge/summary` - Get challenge summary with calculations

## 🎨 Customization

### Adding New Prop Firms
1. Update the `PROP_FIRMS` array in `ChallengeSetupWizard.tsx`
2. Add the new firm to the database constraint in the migration
3. Update the TypeScript types in `challenge.ts`

### Modifying Calculations
1. Edit the `get_challenge_summary` function in the migration
2. Update the calculation logic in `useChallenge.tsx`
3. Modify the display logic in `ChallengeStatusCard.tsx`

## 🔄 Future Enhancements

This sprint includes the core functionality. Future sprints will add:
- Risk management guards (circuit breakers)
- Preservation mode
- Advanced challenge rules
- More prop firms
- Historical challenge tracking

## 📞 Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify all database migrations are applied
3. Ensure your Supabase connection is working
4. Review the troubleshooting section above

---

**Happy Trading! 🚀**

The Challenge Status Tracking feature is now ready to help you track your prop firm journey with real-time updates and detailed progress metrics.
