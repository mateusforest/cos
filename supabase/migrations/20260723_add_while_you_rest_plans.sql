create extension if not exists pgcrypto;

create table if not exists public.while_you_rest_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid null references public.profiles (id) on delete set null,
  request_text text not null,
  plan jsonb not null default '[]'::jsonb,
  job_ids jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'running', 'completed', 'partial', 'waiting_confirmation', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists while_you_rest_plans_workspace_created_idx
  on public.while_you_rest_plans (workspace_id, created_at desc);

create index if not exists while_you_rest_plans_user_created_idx
  on public.while_you_rest_plans (user_id, created_at desc);

alter table public.while_you_rest_plans enable row level security;

drop policy if exists "workspace members can read while you rest plans" on public.while_you_rest_plans;
create policy "workspace members can read while you rest plans"
  on public.while_you_rest_plans
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = while_you_rest_plans.workspace_id
        and wm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'master'
    )
  );
