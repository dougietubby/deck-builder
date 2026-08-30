# Schema Debugging & Repair Guide

## Issue Identified
The `profiles` table exists but is missing the `camp` column (and possibly others).

## Step 1: Check Current Schema
Run this in Supabase SQL Editor to see exactly what columns exist:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

This will show you the actual schema of your `profiles` table.

## Step 2: Check for Existing Triggers
Run this to see if ANY triggers exist on auth.users:

```sql
SELECT 
  t.trigger_name,
  t.event_object_schema,
  t.event_object_table,
  t.event_manipulation
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
  OR t.event_object_table = 'users';
```

The issue "No rows returned" suggests the trigger wasn't created at all.

## Step 3A: If `camp` Column Exists
If the query shows `camp` exists, the issue is just the WHERE clause. Skip to Step 4.

## Step 3B: If `camp` Column Doesn't Exist
You need to add it. Run:

```sql
-- Add missing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS camp text,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

## Step 4: Create Missing Trigger
The trigger doesn't exist. Create it:

```sql
-- Create the auto-profile trigger
CREATE OR REPLACE FUNCTION public.handle_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, created_at)
  VALUES (new.id, new.email, now())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Drop old trigger if it exists (and recreate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_user_created();

-- Verify trigger was created
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users'
  OR trigger_name = 'on_auth_user_created';
```

## Step 5: Verify Complete Schema
After adding columns and trigger, run this comprehensive check:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Check RLS policies
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users';
```

Expected output:
- **Columns**: id, display_name, camp, level, xp, created_at, updated_at (7 total)
- **RLS**: rowsecurity = TRUE
- **Policies**: 3 policies (select own, insert own, update own)
- **Triggers**: on_auth_user_created

## Step 6: Test Profile Creation
Once schema is fixed, test the auto-creation trigger:

```sql
-- This won't actually create a new user in auth.users, but it tests the schema

-- First, check if you have any existing profiles
SELECT COUNT(*) as profile_count FROM public.profiles;

-- If you have profiles, check one matches an auth user:
SELECT p.id, p.display_name, p.camp, p.level, p.xp, p.created_at
FROM public.profiles p
LIMIT 1;
```

## Step 7: If Schema Still Wrong
If the commands above don't work, the entire migration needs to be reapplied. 

**NUCLEAR OPTION** (destructive - deletes all profiles):
```sql
-- DROP EXISTING TABLES AND RECREATE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_created() CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Now run the entire create_profiles.sql
-- (Copy entire contents from supabase/sql/create_profiles.sql and paste here)
```

Then paste the complete contents of `supabase/sql/create_profiles.sql`
