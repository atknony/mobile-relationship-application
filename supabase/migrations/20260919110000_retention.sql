-- Data retention (GDPR Art. 5(1)(e) storage limitation / KVKK Art. 4).
--
-- What is kept, and for how long:
-- - Unpairing: the pair's photos and moment rows are deleted at once by
--   dissolve-pair (nobody can see them again — moments are only readable
--   inside an active pair); the dissolved pair row goes in the next sweep.
-- - Deleting the account: everything, at once (delete-account).
-- - Pending invites: a day after they expire.
-- - A sign-up that never created a profile: 30 days.
-- - Storage objects nothing references (replaced avatars, photos of deleted
--   moments, everything of a deleted account): 2 days after upload. The grace
--   period covers a photo uploaded by the offline queue whose send is still
--   being retried (OFFLINE_PING_MAX_AGE_MS is 24h).
--
-- The row work is plain SQL; storage objects and auth users have to be removed
-- through their APIs, so the retention-sweep Edge Function does all three and
-- pg_cron calls it once a day. The helpers below are service_role only.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.retention_sweep_rows()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_invites int;
  ended_pairs int;
begin
  delete from public.pairs
   where status = 'pending'
     and coalesce(expires_at, created_at) < now() - interval '1 day';
  get diagnostics expired_invites = row_count;

  -- Cascades to any moment rows dissolve-pair did not already remove.
  delete from public.pairs where status in ('dissolved', 'rejected');
  get diagnostics ended_pairs = row_count;

  return jsonb_build_object('expired_invites', expired_invites, 'ended_pairs', ended_pairs);
end;
$$;

create or replace function public.retention_orphan_objects(max_rows int default 1000)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name
    from storage.objects o
   where o.created_at < now() - interval '2 days'
     and (
       (o.bucket_id = 'moments'
         and not exists (select 1 from public.moments m where m.photo_path = o.name))
       or (o.bucket_id = 'avatars'
         and not exists (select 1 from public.profiles p where p.avatar_url = o.name))
     )
   limit max_rows;
$$;

create or replace function public.retention_stale_signups(max_rows int default 100)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
    from auth.users u
   where u.created_at < now() - interval '30 days'
     and not exists (select 1 from public.profiles p where p.id = u.id)
   limit max_rows;
$$;

-- How retention-sweep knows it was called by the cron job: the shared secret
-- lives only in Vault, readable here and by the job.
create or replace function public.retention_secret_matches(secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- $1, not `secret`: vault.decrypted_secrets has a column of that name (the
  -- ciphertext), and in SQL functions a column wins over a parameter.
  select exists (
    select 1 from vault.decrypted_secrets
     where name = 'retention_sweep_secret' and decrypted_secret = $1
  );
$$;

revoke execute on function public.retention_sweep_rows() from public, anon, authenticated;
revoke execute on function public.retention_orphan_objects(int) from public, anon, authenticated;
revoke execute on function public.retention_stale_signups(int) from public, anon, authenticated;
revoke execute on function public.retention_secret_matches(text) from public, anon, authenticated;
grant execute on function public.retention_sweep_rows() to service_role;
grant execute on function public.retention_orphan_objects(int) to service_role;
grant execute on function public.retention_stale_signups(int) to service_role;
grant execute on function public.retention_secret_matches(text) to service_role;

-- A random secret, created once. The project URL is per project: when this
-- runs against a different project (a separate production one), update it:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'project_url'),
--     'https://<ref>.supabase.co');
select vault.create_secret(
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  'retention_sweep_secret',
  'x-retention-secret header for the retention-sweep Edge Function'
)
where not exists (select 1 from vault.secrets where name = 'retention_sweep_secret');

select vault.create_secret(
  'https://tzhkrhxnfjephtrxbmvp.supabase.co',
  'project_url',
  'Base URL of this project, for pg_cron jobs that call Edge Functions'
)
where not exists (select 1 from vault.secrets where name = 'project_url');

-- 03:17 UTC daily — off the hour, when the fewest people are sending pings.
-- cron.schedule replaces a job of the same name, so re-running is safe.
select cron.schedule(
  'retention-sweep',
  '17 3 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/retention-sweep',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-retention-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'retention_sweep_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $job$
);
