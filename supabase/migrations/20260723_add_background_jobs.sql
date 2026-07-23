create extension if not exists pgcrypto;

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid null references public.profiles (id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'waiting_confirmation')),
  idempotency_key text not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  available_at timestamptz not null default timezone('utc'::text, now()),
  locked_at timestamptz null,
  locked_by text null,
  result jsonb not null default '{}'::jsonb,
  error text null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists background_jobs_workspace_idempotency_idx
  on public.background_jobs (workspace_id, idempotency_key);

create index if not exists background_jobs_status_available_idx
  on public.background_jobs (status, available_at asc);

create index if not exists background_jobs_workspace_status_available_idx
  on public.background_jobs (workspace_id, status, available_at asc);

alter table public.background_jobs enable row level security;

drop policy if exists "workspace members can read background jobs" on public.background_jobs;
create policy "workspace members can read background jobs"
  on public.background_jobs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = background_jobs.workspace_id
        and wm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'master'
    )
  );

create or replace function public.claim_background_jobs(
  p_worker_id text,
  p_batch_size integer default 5,
  p_processing_timeout_seconds integer default 900
)
returns setof public.background_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_batch_size integer := greatest(coalesce(p_batch_size, 5), 1);
  normalized_timeout integer := greatest(coalesce(p_processing_timeout_seconds, 900), 60);
begin
  if coalesce(trim(p_worker_id), '') = '' then
    return;
  end if;

  return query
  with candidates as (
    select bg.id
    from public.background_jobs bg
    where (
      (bg.status = 'pending' and bg.available_at <= timezone('utc'::text, now()))
      or (
        bg.status = 'processing'
        and bg.locked_at is not null
        and bg.locked_at <= timezone('utc'::text, now()) - make_interval(secs => normalized_timeout)
      )
    )
    and bg.attempts < bg.max_attempts
    order by bg.available_at asc, bg.created_at asc
    for update skip locked
    limit normalized_batch_size
  ),
  updated as (
    update public.background_jobs bg
    set
      status = 'processing',
      attempts = bg.attempts + 1,
      locked_at = timezone('utc'::text, now()),
      locked_by = trim(p_worker_id),
      started_at = coalesce(bg.started_at, timezone('utc'::text, now())),
      updated_at = timezone('utc'::text, now()),
      error = null
    from candidates
    where bg.id = candidates.id
    returning bg.*
  )
  select * from updated;
end;
$$;
