# ⚠️ IMMEDIATE ACTIONS REQUIRED

## Summary
Your Supabase database has a **schema mismatch**:
- ✅ Table `profiles` exists
- ❌ Missing column: `camp`  
- ❌ Missing trigger: `on_auth_user_created`

This means the SQL migration from `supabase/sql/create_profiles.sql` was **never fully applied**.

---

## Quick Fix (5 minutes)

### 1. Go to Supabase Dashboard → SQL Editor

### 2. Copy and paste THIS ENTIRE BLOCK:

```sql
-- Step 1: Add missing columns if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS camp text,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Step 2: Create or recreate the trigger function
CREATE OR REPLACE FUNCTION public.handle_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, created_at)
  VALUES (new.id, new.email, now())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Step 3: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_user_created();

-- Step 4: Verify everything is correct
SELECT 'COLUMNS' as check_type, COUNT(*)::text as result
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
UNION ALL
SELECT 'TRIGGER EXISTS' as check_type, 
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
  ) THEN 'YES' ELSE 'NO' END as result;
```

### 3. Click "Run" and wait for success

You should see:
```
Success. Rows affected: 0
Success. Rows affected: 0
Success. Rows affected: 0
Success. Rows affected: 0
Success. Rows affected: 2
```

(The last one shows the verification query results)

### 4. Verify the fix worked:

Run this separate query to confirm:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

You should see 7 columns:
- id
- display_name
- camp
- level
- xp
- created_at
- updated_at

---

## After Fix Complete ✅

Once the schema is repaired:

1. **Refresh the browser** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear localStorage**: `localStorage.clear()` in console
3. **Start fresh testing** from the beginning using [AUTH_TESTING_GUIDE.md](AUTH_TESTING_GUIDE.md)

---

## Why This Happened

The migration file `supabase/sql/create_profiles.sql` exists in your repo, but it was never executed against the Supabase database. This could be because:
- Manual deployment wasn't run
- Migration tools weren't configured
- The migration was partially run at some point

For future deploys, ensure migrations are run before testing:
1. Either use Supabase CLI: `supabase db push`
2. Or manually run migrations in SQL Editor before testing

---

## Need Help?

If the fix fails or returns errors:
1. Screenshot the error
2. Run the verification query from [SCHEMA_REPAIR_GUIDE.md](SCHEMA_REPAIR_GUIDE.md)
3. Check what's different from expected schema
