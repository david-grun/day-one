# Supabase database and Vercel setup

This guide is for the product owner to configure and deploy DayOne. No hosted project, database connection, deployment, or Power BI publication has been performed or verified by the implementation work. Review the provider's current plan and limits before creating resources.

## Database

1. Use a Supabase project dedicated to DayOne, or a project where the DayOne table names do not conflict. Select a region near the Vercel application region. DayOne's migration creates its own workflow and authentication tables in `public`; it does not alter Supabase's `auth` schema.
2. In the project dashboard select **Connect**. For Vercel runtime copy the **Transaction pooler** PostgreSQL URI (normally port `6543`). Replace the password placeholder with the actual database password; encode reserved characters in the URI. Keep this URL in private environment settings, never in source or chat.
3. For migrations prefer the **Session pooler** URI (normally port `5432`), or an accessible direct PostgreSQL connection. Temporarily set `DATABASE_URL` in your local `.env.local` to that connection, stop the local app, and run the commands below. The pooler supports IPv4 where a direct connection may require IPv6. [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

```powershell
npm run db:migrate
npm run demo:seed
```

Migrations preserve existing records. The second migration enables row-level security and revokes `PUBLIC`, `anon`, and `authenticated` table access for DayOne's own tables. No browser Data API policies are added. The trusted owner PostgreSQL connection serves the backend; server-side checks enforce DayOne roles and record permissions. Do not expose credentials or grant the Data API access to these tables. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

Better Auth creates six fictional accounts in `auth_user` and related DayOne tables. They are **not** Supabase Auth users. Public signup stays disabled; the explicit seed process temporarily enables internal creation only in that process. Demo accounts have a public demo password and this database must contain fictional demonstration records only. This is an interview configuration, not an authentication rollout for real employees.

Use the runtime transaction-pooler URL for the hosted application. The code uses `pg` with up to five connections per instance and no named prepared statements; transaction-mode pooling cannot support session-dependent prepared statements. Check project connection limits and region before the interview. See the connection guide for current mode constraints. A free Supabase project can pause after inactivity, so check its dashboard and health before a rehearsal; plan limits are account-specific.

## Vercel environment

After you push your repository yourself, import it into Vercel as a Next.js project. Set the Node version to a supported current LTS, install with `npm ci`, and build with `npm run build`. Configure private server environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase transaction-pooler PostgreSQL URI with password |
| `BETTER_AUTH_SECRET` | At least 32 random characters; generate a different production secret from the local one |
| `BETTER_AUTH_URL` | Exact HTTPS origin of the site you will use, with no trailing path |
| `POWER_BI_EMBED_MODE` | `public` or `secure`, only after the permitted reporting path is established |
| `POWER_BI_EMBED_URL` | Actual Microsoft-generated HTTPS iframe source, or leave blank |
| `POWER_BI_SNAPSHOT_AT` | UTC timestamp from the exported dataset actually published in that report, or leave blank |

No `NEXT_PUBLIC_DATABASE_URL`, anonymous Supabase key, service-role key, or database password belongs in browser configuration. The application does not require those keys.

`BETTER_AUTH_URL` also defines the accepted Origin for workflow writes. Set it to the exact domain used for the demonstration. A different preview origin must have its own environment configuration; do not broaden trust to arbitrary domains. Set the URL before checking sign-in, create, and sign-off. Keep Preview and Production datasets separate when possible.

Deploy through your authorized Vercel workflow. Seeding is an explicit administrative command and never runs as a build hook or normal startup. Check `/api/health`, sign in, create a fictional hire, complete its own-team task, and refresh. Verify the Supabase tables reflect changes and saved records survive a redeployment. The hosted path is not verified until these checks run with your actual project.

## Rehearsal and backup

Keep a local demo ready as well. The local database and hosted database are separate datasets; they are not silently synchronized. Back up or export the actual hosted state through the Supabase tools available to your plan. The CSV analytics export is a reporting snapshot, not a complete database recovery backup.

For a local backup, stop the application and copy the whole `.dayone/db` directory to a separate folder. To restore, stop the app, preserve the current directory separately, then restore the complete backup to `.dayone/db` and start the app. Never copy an actively written embedded database as a backup.

Power BI setup and update steps are in [bi/README.md](../bi/README.md). Changed CSVs do not automatically refresh a published service report.
