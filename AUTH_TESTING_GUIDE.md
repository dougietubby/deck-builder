# Authentication Bug Fixes - Testing Guide

## Bugs Fixed ✅

### 1. getSession() Destructuring (Supabase JS v2 API)
**Files**: home.js, profile.js, events.js, cards.js, decks.js, auth.js

**Problem**: Incorrect destructuring of `getSession()` response
```javascript
// ❌ WRONG (was assigning { session } object to session variable)
const { data: session } = await client.auth.getSession();
const user = session?.user; // undefined!

// ✅ FIXED (properly nested destructuring)
const { data: { session } } = await client.auth.getSession();
const user = session?.user; // works!
```

### 2. Missing await on getSupabase() in auth.js
**Problem**: getSupabase() is async but wasn't being awaited
```javascript
// ❌ WRONG
const supabaseClient = getSupabase(); // Returns Promise<Client>

// ✅ FIXED
const supabaseClient = await getSupabase(); // Now in each function
```

### 3. Profile Insertion Return Value
**Problem**: .insert() doesn't return inserted data without .select()
```javascript
// ❌ WRONG
const insert = await client.from('profiles').insert([...]);
return insert.data ? insert.data[0] : null; // Always null!

// ✅ FIXED
const { data: insertedData } = await client
  .from('profiles')
  .insert([...])
  .select()
  .maybeSingle();
return insertedData || null;
```

---

## CRITICAL: Verify SQL Migration

Before testing, you MUST verify that the `create_profiles.sql` migration has been applied to your Supabase database.

### Check in Supabase Dashboard:
1. Go to SQL Editor in your Supabase project
2. Run this query:
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
);
```
Should return: `true`

3. Verify the trigger exists:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'auth.users';
```
Should show trigger: `on_auth_user_created`

### If Migration Not Applied:
Run `supabase/sql/create_profiles.sql` in the Supabase SQL Editor:
1. Copy entire contents of `supabase/sql/create_profiles.sql`
2. Go to Supabase Dashboard → SQL Editor
3. Paste and execute
4. Verify tables and trigger created

---

## End-to-End Testing Checklist

### Test 1: Fresh Magic Link Auth
1. Clear browser localStorage: `localStorage.clear()`
2. In dev tools console, verify session cleared: `await (await getSupabase()).auth.getSession()`
   - Should return: `{ data: { session: null }, error: null }`
3. Go to http://localhost:8080
4. Enter a Grove verification code
5. Enter a unique test email (e.g., test-$(date +%s)@example.com)
6. Click "Send Magic Link"
7. Check email client (or Supabase Email Testing)
8. Click magic link
9. Browser should redirect to /home/

### Test 2: /home/ Page Load
After step 9 above:
- [ ] Page loads (no redirect to /)
- [ ] Welcome message shows: "Welcome back, [email prefix or display_name]"
- [ ] Player name displays
- [ ] Level displays
- [ ] XP displays
- [ ] Camp displays (should be "Unassigned" initially)
- [ ] No console errors

### Test 3: Database Profile Exists
In Supabase SQL Editor, run:
```sql
SELECT id, display_name, level, xp, camp, created_at 
FROM public.profiles 
WHERE id = 'USER_ID_FROM_AUTH.USERS';
```
Should return exactly ONE row with the user's data

### Test 4: Profile Page
1. From /home/, click "Profile" in bottom nav
2. [ ] Profile page loads
3. [ ] Shows same user data
4. [ ] Display name input field populated
5. [ ] Edit display name: change to "Test Player"
6. [ ] Click "Save Changes"
7. [ ] See "Profile updated!" message
8. [ ] Refresh page - display name persists
9. [ ] Go back to /home/ - new name shows on player card

### Test 5: Session Persistence
1. On /home/
2. Refresh page (Ctrl+R or Cmd+R)
3. [ ] Still logged in (no redirect to /)
4. [ ] User data still visible
5. In console, verify session exists:
```javascript
const { data: { session } } = await (await getSupabase()).auth.getSession();
console.log(session?.user?.email);
```
Should show the logged-in email

### Test 6: Navigation
From /home/:
- [ ] Bottom nav visible with 5 items (Home, Profile, Decks, Events, Sign Out)
- [ ] Home nav item highlighted as active
- [ ] Click "Profile" - /profile/ loads, Profile highlighted
- [ ] Click "Decks" - /decks/ loads, Decks highlighted
- [ ] Click "Events" - /events/ loads, Events highlighted
- [ ] Click "Home" - /home/ loads, Home highlighted

### Test 7: Sign Out
1. From any authenticated page, click "Sign Out" in bottom nav
2. [ ] Redirects to / (onboarding page)
3. [ ] Session cleared
4. In console: `await (await getSupabase()).auth.getSession()` → `{ data: { session: null } }`
5. Try to go back to /home/ directly in URL bar
6. [ ] Redirects back to / (not authenticated)

### Test 8: RLS Policies
These should work silently without error:
- [ ] User can SELECT their own profile (verified in Test 2)
- [ ] User can UPDATE their own profile (verified in Test 4)

Check console for RLS errors:
```javascript
// If this shows error, RLS is broken
const { data, error } = await (await getSupabase())
  .from('profiles')
  .select('*')
  .eq('id', 'CURRENT_USER_ID');
console.log(error); // Should be null
```

### Test 9: Cross-User RLS (Security Check)
1. Note the user ID from auth.users table
2. In browser console, try to query another user's profile (use a different UUID):
```javascript
const { data, error } = await (await getSupabase())
  .from('profiles')
  .select('*')
  .eq('id', 'DIFFERENT_USER_ID');
console.log(error);
```
Should return error about RLS violation or empty data

---

## If Tests Fail

### Issue: /home/ redirects to / (not authenticated)
**Cause**: getSession() returning null
**Debug**:
```javascript
// In browser console on /home/ during redirect
const client = await getSupabase();
const { data: { session }, error } = await client.auth.getSession();
console.log('Session:', session);
console.log('Error:', error);
```

### Issue: Profile not found on /home/
**Cause**: DB trigger didn't run or insert failed
**Debug**:
```javascript
// In Supabase Dashboard, check if profile exists
SELECT * FROM public.profiles WHERE id = 'USER_ID';

// Check trigger logs in Supabase Functions
// Check browser console for ensureProfile() errors
```

### Issue: "Profiles: insert own" RLS error
**Cause**: User not properly authenticated when insert happens
**Debug**: Add console logs in ensureProfile():
```javascript
const client = await getSupabase();
const { data: { session } } = await client.auth.getSession();
console.log('Current user:', session?.user?.id);
// Then attempt insert
```

---

## After Tests Pass ✅

Once all tests pass, you can safely:
- Resume UI/UX work
- Continue with new features
- Deploy to production
