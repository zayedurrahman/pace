# Pace cloud account setup (optional)

Pace remains usable offline without an account. Authentication and cross-device sync are not active in this static build because no Supabase project has been configured.

## Supabase setup

1. Create a Supabase project and enable Email auth. In Authentication → URL Configuration, add `https://zayedurrahman.github.io` as a site URL and `https://zayedurrahman.github.io/pace/**` as a redirect URL. Add your Netlify origin too if you deploy there.
2. In Authentication → Providers, enable Google only after configuring OAuth credentials in Google Cloud Console. Keep the OAuth client secret in Supabase, never in Pace's JavaScript.
3. Create a private user data table. Example SQL:

```sql
create table public.pace_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.pace_backups enable row level security;
create policy "read own pace backup" on public.pace_backups for select using (auth.uid() = user_id);
create policy "insert own pace backup" on public.pace_backups for insert with check (auth.uid() = user_id);
create policy "update own pace backup" on public.pace_backups for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

4. To activate accounts, add the official Supabase browser client as a relative-compatible CDN dependency and initialize it with the project's URL and **publishable anon key**. The anon key is public by design; RLS must be enabled and tested. Never use a service-role key in the browser.
5. Build sign-up, sign-in, Google OAuth, sign-out and password-reset UI using Supabase Auth. After sign-in, merge the validated local Pace backup into the user's row, then sync on explicit save. Do not overwrite local state until a validated remote payload has been downloaded and backed up locally.
6. Test two separate accounts and verify neither can read or overwrite the other's row. Test offline mode, expired sessions, reset-password redirects, and export/import before relying on sync.

## Push notifications

Web Push needs a push service endpoint and VAPID credentials, plus a server-side scheduler for reminders while Pace is closed. Browser notification permission alone cannot reliably schedule background alarms. Configure a Supabase Edge Function or other trusted server to store subscriptions and send reminders; keep the VAPID private key server-side. The current app does not request notification permission on page load and does not claim background push is active.

## Local data

Current local data stays on the device. `hsc28` is retained; study workflow data uses the app's existing versioned store, and the new timeline/tasks/notes/cards use `pace.hub.v1`. JSON export includes the hub data, import validates the core Pace backup and restores a valid hub payload, and Reset clears both stores after the existing confirmations.
