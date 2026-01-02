# Todoist OAuth Setup Guide

## The Error: `redirect_uri_not_configured`

This error means the redirect URI in your code doesn't match what's configured in your Todoist app settings.

## Step-by-Step Fix

### 1. Determine Your Redirect URIs

You need to configure redirect URIs for both **local development** and **production**:

**Local Development:**

```
http://localhost:5173/todoist/callback
```

_(Replace `5173` with your Vite dev server port if different)_

**Production (Vercel):**

```
https://your-app-name.vercel.app/todoist/callback
```

_(Replace `your-app-name` with your actual Vercel app name)_

### 2. Configure Redirect URIs in Todoist

1. Go to [Todoist App Management Console](https://developer.todoist.com/appconsole.html)
2. Click on your app (or create a new one if you haven't)
3. In the **OAuth redirect URLs** field, add BOTH URIs:
   - `http://localhost:5173/todoist/callback` (for local dev)
   - `https://your-app-name.vercel.app/todoist/callback` (for production)
4. **Save** your changes

**Note:** You can add multiple redirect URIs - one per line, or separated by commas (check Todoist's interface for exact format).

### 3. Verify Your Redirect URI in Code

The code uses: `${window.location.origin}/todoist/callback`

This automatically uses:

- `http://localhost:5173` when running locally
- `https://your-app-name.vercel.app` when deployed

So make sure the URIs you add to Todoist match these patterns.

### 4. Common Issues

**Issue:** "redirect_uri_not_configured"

- **Solution:** Make sure you added the exact redirect URI (including protocol `http://` or `https://`) to Todoist

**Issue:** "redirect_uri_mismatch"

- **Solution:** The redirect URI in your code must EXACTLY match one of the URIs configured in Todoist (case-sensitive, must include protocol)

**Issue:** Port number mismatch

- **Solution:** Check what port your local dev server uses (`npm run dev` will show it). Common ports: 5173 (Vite default), 3000, 8080

### 5. Client Secret (Required for Token Exchange)

**Important:** You'll also need to add your Todoist Client Secret to your environment variables:

**Local Development (.env.local):**

```bash
VITE_TODOIST_CLIENT_SECRET=your_client_secret_here
```

**Vercel:**

- Add `VITE_TODOIST_CLIENT_SECRET` in Vercel Dashboard > Settings > Environment Variables

**Note:** The Client Secret is sensitive! Never commit it to your repository. It's used server-side to exchange the authorization code for an access token.

### 6. Next Steps (After OAuth Works)

The callback route has been created and will:

1. ✅ Handle the OAuth response at `/todoist/callback`
2. ✅ Exchange the authorization code for an access token
3. ✅ Store the access token securely (currently in localStorage)
4. ⏭️ Next: Use the token to fetch completed tasks from Todoist API

---

**Quick Checklist:**

- [ ] Added `http://localhost:5173/todoist/callback` to Todoist redirect URIs
- [ ] Added your production URL `https://your-app.vercel.app/todoist/callback` to Todoist redirect URIs
- [ ] Saved changes in Todoist App Management Console
- [ ] Verified your Vite dev server port matches the redirect URI


