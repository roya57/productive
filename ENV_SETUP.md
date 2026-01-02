# Environment Variables Setup

## Local Development

1. **Create a `.env.local` file** in the root of your project (same directory as `package.json`)

2. **Option A: Manual setup (Recommended)**

   Create `.env.local` and add:

   ```bash
   # Supabase (optional - already has fallback values in code)
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

   # Todoist (required for Todoist integration)
   VITE_TODOIST_CLIENT_ID=your_todoist_client_id_here
   ```

   - **Supabase values**: Get from Supabase Dashboard > Settings > API (optional since fallbacks exist)
   - **Todoist Client ID**: Get from [Todoist App Management Console](https://developer.todoist.com/appconsole.html) (required)

3. **Option B: Pull from Vercel (if Vercel CLI is installed)**

   ```bash
   # Install Vercel CLI if you haven't
   npm i -g vercel

   # Login to Vercel
   vercel login

   # Pull environment variables
   vercel env pull .env.local
   ```

   **Note:** This only works if you have Vercel CLI installed and are logged in.

4. **Restart your development server** after creating/updating `.env.local`

**Note:** `.env.local` is gitignored and will NOT be committed to your repository (this is intentional for security).

**Current Status:** Your app currently uses hardcoded fallback values for Supabase, so those environment variables are optional. Only `VITE_TODOIST_CLIENT_ID` is required for the new Todoist feature.

## Vercel Deployment

1. Go to your project in the [Vercel Dashboard](https://vercel.com/dashboard)

2. Navigate to **Settings** > **Environment Variables**

3. Add each environment variable:

   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `VITE_TODOIST_CLIENT_ID` - Your Todoist Client ID

4. **Important:** Make sure to select the environments where each variable should be available:

   - **Production** - for production deployments
   - **Preview** - for preview deployments (pull requests, etc.)
   - **Development** - for development deployments (optional)

5. After adding variables, you'll need to **redeploy** your application for changes to take effect.

## Important Notes

- All environment variables in Vite must be prefixed with `VITE_` to be accessible in your code
- Never commit `.env.local` or any file with actual secrets to your repository
- The `.env.local.example` file is safe to commit (it contains no real values)


