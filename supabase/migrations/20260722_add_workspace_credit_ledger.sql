create extension if not exists pgcrypto;

create table if not exists public.workspace_credit_balances (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.workspace_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid null references public.profiles (id) on delete set null,
  type text not null check (type in ('credit', 'debit', 'refund')),
  amount bigint not null check (amount > 0),
  feature text not null,
  provider text null,
  reason text not null,
  idempotency_key text not null,
  original_transaction_id uuid null references public.workspace_credit_transactions (id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint workspace_credit_transactions_refund_link_check check (
    (type = 'refund' and original_transaction_id is not null)
    or (type in ('credit', 'debit') and original_transaction_id is null)
  )
);

create unique index if not exists workspace_credit_transactions_workspace_idempotency_idx
  on public.workspace_credit_transactions (workspace_id, idempotency_key);

create unique index if not exists workspace_credit_transactions_single_refund_idx
  on public.workspace_credit_transactions (original_transaction_id)
  where type = 'refund';

create index if not exists workspace_credit_transactions_workspace_created_idx
  on public.workspace_credit_transactions (workspace_id, created_at desc);

alter table public.workspace_credit_balances enable row level security;
alter table public.workspace_credit_transactions enable row level security;

drop policy if exists "workspace members can read credit balances" on public.workspace_credit_balances;
create policy "workspace members can read credit balances"
  on public.workspace_credit_balances
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = workspace_credit_balances.workspace_id
        and wm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'master'
    )
  );

drop policy if exists "workspace members can read credit transactions" on public.workspace_credit_transactions;
create policy "workspace members can read credit transactions"
  on public.workspace_credit_transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = workspace_credit_transactions.workspace_id
        and wm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'master'
    )
  );

create or replace function public.get_workspace_credit_balance(p_workspace_id uuid)
returns table (
  status text,
  balance bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  balance_row public.workspace_credit_balances%rowtype;
begin
  if p_workspace_id is null then
    return query select 'failed'::text, 0::bigint, null::timestamptz;
    return;
  end if;

  select *
  into balance_row
  from public.workspace_credit_balances
  where workspace_id = p_workspace_id;

  if not found then
    return query select 'success'::text, 0::bigint, null::timestamptz;
    return;
  end if;

  return query
  select 'success'::text, balance_row.balance, balance_row.updated_at;
end;
$$;

create or replace function public.credit_workspace_credits(
  p_workspace_id uuid,
  p_user_id uuid,
  p_amount bigint,
  p_feature text,
  p_provider text,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  status text,
  balance bigint,
  transaction_id uuid,
  original_transaction_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  balance_row public.workspace_credit_balances%rowtype;
  existing_tx public.workspace_credit_transactions%rowtype;
  created_tx public.workspace_credit_transactions%rowtype;
begin
  if p_workspace_id is null or p_user_id is null or p_amount is null or p_amount <= 0 then
    return query select 'failed'::text, 0::bigint, null::uuid, null::uuid;
    return;
  end if;

  if coalesce(trim(p_feature), '') = '' or coalesce(trim(p_reason), '') = '' or coalesce(trim(p_idempotency_key), '') = '' then
    return query select 'failed'::text, 0::bigint, null::uuid, null::uuid;
    return;
  end if;

  insert into public.workspace_credit_balances (workspace_id, balance)
  values (p_workspace_id, 0)
  on conflict (workspace_id) do nothing;

  select *
  into balance_row
  from public.workspace_credit_balances
  where workspace_id = p_workspace_id
  for update;

  select *
  into existing_tx
  from public.workspace_credit_transactions
  where workspace_id = p_workspace_id
    and idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return query
    select 'already_processed'::text, balance_row.balance, existing_tx.id, existing_tx.original_transaction_id;
    return;
  end if;

  update public.workspace_credit_balances
  set balance = balance + p_amount,
      updated_at = timezone('utc'::text, now())
  where workspace_id = p_workspace_id
  returning *
  into balance_row;

  insert into public.workspace_credit_transactions (
    workspace_id,
    user_id,
    type,
    amount,
    feature,
    provider,
    reason,
    idempotency_key,
    metadata
  )
  values (
    p_workspace_id,
    p_user_id,
    'credit',
    p_amount,
    trim(p_feature),
    nullif(trim(coalesce(p_provider, '')), ''),
    trim(p_reason),
    trim(p_idempotency_key),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning *
  into created_tx;

  return query
  select 'success'::text, balance_row.balance, created_tx.id, created_tx.original_transaction_id;
end;
$$;

create or replace function public.debit_workspace_credits(
  p_workspace_id uuid,
  p_user_id uuid,
  p_amount bigint,
  p_feature text,
  p_provider text,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  status text,
  balance bigint,
  transaction_id uuid,
  original_transaction_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  balance_row public.workspace_credit_balances%rowtype;
  existing_tx public.workspace_credit_transactions%rowtype;
  created_tx public.workspace_credit_transactions%rowtype;
begin
  if p_workspace_id is null or p_user_id is null or p_amount is null or p_amount <= 0 then
    return query select 'failed'::text, 0::bigint, null::uuid, null::uuid;
    return;
  end if;

  if coalesce(trim(p_feature), '') = '' or coalesce(trim(p_reason), '') = '' or coalesce(trim(p_idempotency_key), '') = '' then
    return query select 'failed'::text, 0::bigint, null::uuid, null::uuid;
    return;
  end if;

  insert into public.workspace_credit_balances (workspace_id, balance)
  values (p_workspace_id, 0)
  on conflict (workspace_id) do nothing;

  select *
  into balance_row
  from public.workspace_credit_balances
  where workspace_id = p_workspace_id
  for update;

  select *
  into existing_tx
  from public.workspace_credit_transactions
  where workspace_id = p_workspace_id
    and idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return query
    select 'already_processed'::text, balance_row.balance, existing_tx.id, existing_tx.original_transaction_id;
    return;
  end if;

  if balance_row.balance < p_amount then
    return query
    select 'insufficient_credits'::text, balance_row.balance, null::uuid, null::uuid;
    return;
  end if;

  update public.workspace_credit_balances
  set balance = balance - p_amount,
      updated_at = timezone('utc'::text, now())
  where workspace_id = p_workspace_id
  returning *
  into balance_row;

  insert into public.workspace_credit_transactions (
    workspace_id,
    user_id,
    type,
    amount,
    feature,
    provider,
    reason,
    idempotency_key,
    metadata
  )
  values (
    p_workspace_id,
    p_user_id,
    'debit',
    p_amount,
    trim(p_feature),
    nullif(trim(coalesce(p_provider, '')), ''),
    trim(p_reason),
    trim(p_idempotency_key),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning *
  into created_tx;

  return query
  select 'success'::text, balance_row.balance, created_tx.id, created_tx.original_transaction_id;
end;
$$;

create or replace function public.refund_workspace_credits(
  p_workspace_id uuid,
  p_user_id uuid,
  p_original_transaction_id uuid,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  status text,
  balance bigint,
  transaction_id uuid,
  original_transaction_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  balance_row public.workspace_credit_balances%rowtype;
  existing_tx public.workspace_credit_transactions%rowtype;
  original_tx public.workspace_credit_transactions%rowtype;
  existing_refund public.workspace_credit_transactions%rowtype;
  created_tx public.workspace_credit_transactions%rowtype;
begin
  if p_workspace_id is null or p_user_id is null or p_original_transaction_id is null then
    return query select 'failed'::text, 0::bigint, null::uuid, null::uuid;
    return;
  end if;

  if coalesce(trim(p_reason), '') = '' or coalesce(trim(p_idempotency_key), '') = '' then
    return query select 'failed'::text, 0::bigint, null::uuid, null::uuid;
    return;
  end if;

  insert into public.workspace_credit_balances (workspace_id, balance)
  values (p_workspace_id, 0)
  on conflict (workspace_id) do nothing;

  select *
  into balance_row
  from public.workspace_credit_balances
  where workspace_id = p_workspace_id
  for update;

  select *
  into existing_tx
  from public.workspace_credit_transactions
  where workspace_id = p_workspace_id
    and idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return query
    select 'already_processed'::text, balance_row.balance, existing_tx.id, existing_tx.original_transaction_id;
    return;
  end if;

  select *
  into original_tx
  from public.workspace_credit_transactions
  where id = p_original_transaction_id
    and workspace_id = p_workspace_id
  for update;

  if not found or original_tx.type <> 'debit' then
    return query
    select 'not_found'::text, balance_row.balance, null::uuid, null::uuid;
    return;
  end if;

  select *
  into existing_refund
  from public.workspace_credit_transactions
  where original_transaction_id = p_original_transaction_id
    and type = 'refund'
  limit 1;

  if found then
    return query
    select 'already_processed'::text, balance_row.balance, existing_refund.id, existing_refund.original_transaction_id;
    return;
  end if;

  update public.workspace_credit_balances
  set balance = balance + original_tx.amount,
      updated_at = timezone('utc'::text, now())
  where workspace_id = p_workspace_id
  returning *
  into balance_row;

  insert into public.workspace_credit_transactions (
    workspace_id,
    user_id,
    type,
    amount,
    feature,
    provider,
    reason,
    idempotency_key,
    original_transaction_id,
    metadata
  )
  values (
    p_workspace_id,
    p_user_id,
    'refund',
    original_tx.amount,
    original_tx.feature,
    original_tx.provider,
    trim(p_reason),
    trim(p_idempotency_key),
    p_original_transaction_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning *
  into created_tx;

  return query
  select 'success'::text, balance_row.balance, created_tx.id, created_tx.original_transaction_id;
end;
$$;

revoke all on function public.get_workspace_credit_balance(uuid) from public, anon, authenticated;
revoke all on function public.credit_workspace_credits(uuid, uuid, bigint, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.debit_workspace_credits(uuid, uuid, bigint, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.refund_workspace_credits(uuid, uuid, uuid, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.get_workspace_credit_balance(uuid) to service_role;
grant execute on function public.credit_workspace_credits(uuid, uuid, bigint, text, text, text, text, jsonb) to service_role;
grant execute on function public.debit_workspace_credits(uuid, uuid, bigint, text, text, text, text, jsonb) to service_role;
grant execute on function public.refund_workspace_credits(uuid, uuid, uuid, text, text, jsonb) to service_role;
