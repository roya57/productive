# Vercel Environment Variables Setup

## Required Environment Variables

For the Todoist sync API function to work, you need to add these environment variables in your Vercel project:

### 1. Supabase URL

**Variable Name:** `SUPABASE_URL` (preferred) or `VITE_SUPABASE_URL`

**Value:** Your Supabase project URL

- Get it from: Supabase Dashboard → Settings → API → Project URL
- Example: `https://uwwsqjdvhtgfyehusbos.supabase.co`

**Note:** Use `SUPABASE_URL` (without VITE* prefix) for serverless functions, as `VITE*` prefixed variables are only available at build time, not runtime.

### 2. Supabase Service Role Key (IMPORTANT!)

**Variable Name:** `SUPABASE_SERVICE_ROLE_KEY`

**Value:** Your Supabase service_role key (NOT the anon key!)

- Get it from: Supabase Dashboard → Settings → API → service_role key (under "Project API keys")
- ⚠️ **WARNING:** This key has admin privileges - keep it secret and never expose it to the frontend!

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - Click "Add New"
   - Enter the variable name (e.g., `SUPABASE_URL`)
   - Enter the value
   - Select which environments it should apply to:
     - ✅ Production
     - ✅ Preview
     - ✅ Development (optional)
   - Click "Save"
5. **Important:** After adding variables, you must **redeploy** your application for changes to take effect

## Variable Summary

| Variable Name               | Where to Get It                                        | Example Value                  |
| --------------------------- | ------------------------------------------------------ | ------------------------------ |
| `SUPABASE_URL`              | Supabase Dashboard → Settings → API → Project URL      | `https://xxxxx.supabase.co`    |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key | `eyJhbGci...` (long JWT token) |

## Verifying Setup

After adding the variables and redeploying:

1. Check Vercel function logs (Functions tab in your project)
2. The logs should no longer show "Missing Supabase configuration"
3. If you still see errors, check that:
   - Variables are spelled correctly
   - You've redeployed after adding variables
   - You're using the service_role key (not anon key)
   - The service_role key is the correct one for your project

## Security Note

⚠️ **Never commit the service_role key to your repository!**

- It should only exist in Vercel environment variables
- It gives full database access, bypassing RLS policies
- Use it only in serverless functions, never in frontend code

