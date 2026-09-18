-- Kids Incentives — Postgres schema mirroring src/domain/types.ts.
-- Row-level security isolates families; children never read another child's data.
-- NOTE: applied and reviewed against a live project before inviting other families (§7.6).

create extension if not exists "pgcrypto";

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  locale text not null default 'en',
  settings jsonb not null,
  momentum jsonb not null,
  starter jsonb,
  recovery_code_hashes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  auth_user_id uuid unique,               -- Supabase Auth user for adults
  name text not null,
  role text not null check (role in ('parent','coparent','nanny','sponsor','child')),
  emoji text not null default '🙂',
  locale text not null default 'en',
  email text,
  pin_hash text,
  is_supervisor boolean not null default false,
  is_super_user boolean not null default false,
  scoped_child_ids uuid[],
  approval_limit int,
  child jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index on members(family_id);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  emoji text not null,
  image_url text,
  category text not null check (category in ('selfcare','contribution','routine','learning','extra_job','repair')),
  currency text not null check (currency in ('ack','points')),
  base_points int not null check (base_points in (1,2,3,5)),
  fairness text not null,
  micro_steps text[] not null default '{}' check (cardinality(micro_steps) <= 5),
  estimated_minutes int not null,
  completion_definition text not null,
  "window" jsonb not null,
  schedule jsonb not null,
  proof_method text not null check (proof_method in ('none','self_check','parent_observed','photo','audio','video')),
  verification_mode text not null check (verification_mode in ('manual','ai_assist','auto')),
  approver_tier text not null check (approver_tier in ('auto','caregiver','parent')),
  assigned_child_ids uuid[] not null default '{}',
  choice_group text,
  coop boolean not null default false,
  active boolean not null default true,
  proposed_by uuid references members(id),
  created_by uuid not null references members(id),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index on tasks(family_id);

create table task_stages (
  id text primary key,
  family_id uuid not null references families(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  child_id uuid not null references members(id) on delete cascade,
  stage text not null check (stage in ('learning','practicing','independent','graduated')),
  since timestamptz not null default now(),
  booster_until timestamptz,
  confirmed_by jsonb
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  child_id uuid not null references members(id) on delete cascade,
  date_key date not null,
  status text not null check (status in ('submitted','needs_look','approved','retry','withdrawn','help')),
  proof_method text not null,
  proof_path text,                        -- storage object; deleted after resolution by default
  proof_hash text,
  proof_mime text,
  ai jsonb,
  help text,
  note text,
  submitted_at timestamptz not null default now(),   -- server timestamp, never the device clock
  resolved_at timestamptz,
  resolved_by text,
  auto_approved boolean not null default false,
  audit_sample boolean not null default false,
  feedback text,
  appeal jsonb,
  ledger_entry_id uuid,
  reminder_count int not null default 0,
  independent_start boolean not null default true
);
create index on submissions(family_id, date_key);
create index on submissions(child_id, date_key);

-- Append-only ledger: no UPDATE/DELETE grants; corrections are reversal rows.
create table ledger (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references members(id) on delete cascade,
  kind text not null check (kind in ('earn','bonus','milestone','redeem','goal_save','goal_refund','reversal','adjust')),
  amount int not null,
  base_points int,
  eligible_for_boost boolean,
  coefficient numeric(5,3),
  reason text not null,
  ref_type text,
  ref_id text,
  approver_id text,
  config_version int,
  created_at timestamptz not null default now()
);
create index on ledger(child_id, created_at);

create or replace function ledger_no_negative() returns trigger language plpgsql as $$
begin
  if new.amount < 0 and (select coalesce(sum(amount),0) from ledger where child_id = new.child_id) + new.amount < 0 then
    raise exception 'ledger.negativeBalance';
  end if;
  return new;
end $$;
create trigger ledger_no_negative before insert on ledger for each row execute function ledger_no_negative();

create or replace function forbid_change() returns trigger language plpgsql as $$
begin raise exception 'append-only'; end $$;
create trigger ledger_append_only before update or delete on ledger for each row execute function forbid_change();

create table rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null, emoji text not null,
  section text not null check (section in ('quick','save_for','family','extra_job_money')),
  cost int not null check (cost > 0),
  availability text not null default 'always',
  weekly_budget int,
  child_ids uuid[],
  status text not null default 'active',
  proposed_by uuid,
  created_at timestamptz not null default now()
);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  reward_id uuid not null references rewards(id),
  child_id uuid not null references members(id),
  cost int not null,
  status text not null default 'requested',
  ledger_entry_id uuid references ledger(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references members(id),
  title text not null, emoji text not null,
  target_points int not null check (target_points > 0),
  saved_points int not null default 0,
  milestones int[] not null default '{}',
  "primary" boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table coop_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null, emoji text not null,
  target_count int not null,
  contributions jsonb not null default '{}',
  status text not null default 'active',
  celebration text,
  created_at timestamptz not null default now()
);

create table momentum_states (
  child_id uuid primary key references members(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  level_key text not null,
  since timestamptz not null default now(),
  candidate_lower_key text,
  candidate_since timestamptz,
  paused_for_review boolean not null default false,
  last_review_at timestamptz,
  last_week_closed date
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references members(id),
  rule_id text,
  description text not null,
  status text not null check (status in ('pause','understand','repair','support','closed')),
  created_by uuid not null references members(id),
  created_at timestamptz not null default now(),
  cooling_off_until timestamptz not null,
  causes text[] not null default '{}',
  repair_plan text, support text,
  response_cost jsonb,
  child_explanation text,
  appeal jsonb,
  closed_at timestamptz, undone_at timestamptz
);

create table agreements (
  family_id uuid primary key references families(id) on delete cascade,
  version int not null default 1,
  intro text not null,
  rules jsonb not null default '[]',
  review_every_weeks int not null default 5 check (review_every_weeks between 4 and 6),
  next_review_at timestamptz not null,
  assents jsonb not null default '[]',
  change_requests jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table audit (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  actor_id text not null,
  action text not null,
  target_type text not null,
  target_id text,
  before jsonb, after jsonb,
  child_explanation text,
  created_at timestamptz not null default now()
);
create trigger audit_append_only before update or delete on audit for each row execute function forbid_change();

create table reflections (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references members(id),
  ref_type text not null, ref_id text,
  difficulty text, what_helped text, what_to_change text,
  created_at timestamptz not null default now()
);

create table kudos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  from_id uuid not null references members(id),
  to_id uuid not null references members(id),
  text text not null,
  created_at timestamptz not null default now()
);

-- ---------- Row-level security ----------
-- Helpers resolve the caller's member row. Children authenticate through a
-- family-scoped session (edge function issues a JWT with member_id + family_id claims).
create or replace function current_member_id() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'member_id', '')::uuid,
                  (select id from members where auth_user_id = auth.uid() limit 1));
$$;
create or replace function current_family_id() returns uuid language sql stable as $$
  select family_id from members where id = current_member_id();
$$;
create or replace function current_role_name() returns text language sql stable as $$
  select role from members where id = current_member_id();
$$;
create or replace function is_adult() returns boolean language sql stable as $$
  select current_role_name() in ('parent','coparent','nanny','sponsor');
$$;
create or replace function is_parent() returns boolean language sql stable as $$
  select current_role_name() in ('parent','coparent');
$$;
create or replace function can_see_child(cid uuid) returns boolean language sql stable as $$
  select case
    when current_role_name() in ('parent','coparent') then true
    when current_role_name() in ('nanny','sponsor') then cid = any((select coalesce(scoped_child_ids, '{}') from members where id = current_member_id()))
    else cid = current_member_id() end;
$$;

alter table families enable row level security;
alter table members enable row level security;
alter table tasks enable row level security;
alter table task_stages enable row level security;
alter table submissions enable row level security;
alter table ledger enable row level security;
alter table rewards enable row level security;
alter table redemptions enable row level security;
alter table goals enable row level security;
alter table coop_goals enable row level security;
alter table momentum_states enable row level security;
alter table incidents enable row level security;
alter table agreements enable row level security;
alter table audit enable row level security;
alter table reflections enable row level security;
alter table kudos enable row level security;

create policy fam_read on families for select using (id = current_family_id());
create policy fam_write on families for update using (id = current_family_id() and is_parent());

create policy members_read on members for select using (family_id = current_family_id() and (is_adult() or id = current_member_id()));
create policy members_write on members for all using (family_id = current_family_id() and is_parent());

create policy tasks_read on tasks for select using (family_id = current_family_id() and (is_adult() or current_member_id() = any(assigned_child_ids) or proposed_by = current_member_id()));
create policy tasks_parent on tasks for all using (family_id = current_family_id() and is_parent());
create policy tasks_propose on tasks for insert with check (family_id = current_family_id() and proposed_by = current_member_id() and active = false);

create policy stages_read on task_stages for select using (family_id = current_family_id() and can_see_child(child_id));
create policy stages_write on task_stages for all using (family_id = current_family_id() and is_parent());

create policy subs_read on submissions for select using (family_id = current_family_id() and can_see_child(child_id));
create policy subs_child_insert on submissions for insert with check (family_id = current_family_id() and child_id = current_member_id());
create policy subs_child_appeal on submissions for update using (child_id = current_member_id()) with check (child_id = current_member_id());
create policy subs_adult_update on submissions for update using (family_id = current_family_id() and is_adult() and can_see_child(child_id));

-- Ledger: readable by the child and adults who can see them; inserts only through
-- SECURITY DEFINER functions (approve_submission, redeem_reward...) — never directly.
create policy ledger_read on ledger for select using (family_id = current_family_id() and can_see_child(child_id));

create policy rewards_read on rewards for select using (family_id = current_family_id());
create policy rewards_parent on rewards for all using (family_id = current_family_id() and is_parent());
create policy rewards_propose on rewards for insert with check (family_id = current_family_id() and proposed_by = current_member_id() and status = 'proposed');

create policy red_read on redemptions for select using (family_id = current_family_id() and can_see_child(child_id));
create policy red_parent on redemptions for update using (family_id = current_family_id() and is_parent());

create policy goals_read on goals for select using (family_id = current_family_id() and can_see_child(child_id));
create policy goals_parent on goals for all using (family_id = current_family_id() and is_parent());
create policy goals_propose on goals for insert with check (family_id = current_family_id() and child_id = current_member_id() and status = 'proposed');

-- Co-op: a child sees the goal but the contributions column is exposed through a view that masks siblings.
create policy coop_read on coop_goals for select using (family_id = current_family_id());
create policy coop_parent on coop_goals for all using (family_id = current_family_id() and is_parent());
create view coop_goals_private as
  select id, family_id, title, emoji, target_count, status, celebration, created_at,
         (select coalesce(sum((value)::int), 0) from jsonb_each_text(contributions)) as total,
         coalesce((contributions ->> current_member_id()::text)::int, 0) as my_contribution
  from coop_goals;

create policy momentum_read on momentum_states for select using (family_id = current_family_id() and can_see_child(child_id));
create policy momentum_parent on momentum_states for all using (family_id = current_family_id() and is_parent());

create policy inc_read on incidents for select using (family_id = current_family_id() and can_see_child(child_id));
create policy inc_parent on incidents for all using (family_id = current_family_id() and is_parent()); -- never nanny, never AI
create policy inc_child_appeal on incidents for update using (child_id = current_member_id()) with check (child_id = current_member_id());

create policy agr_read on agreements for select using (family_id = current_family_id());
create policy agr_parent on agreements for all using (family_id = current_family_id() and is_parent());
create policy agr_child on agreements for update using (family_id = current_family_id()) with check (family_id = current_family_id()); -- assent / change request rows only (enforced by trigger in a later migration)

create policy audit_read on audit for select using (family_id = current_family_id() and is_adult());
create policy audit_insert on audit for insert with check (family_id = current_family_id());

create policy refl_read on reflections for select using (family_id = current_family_id() and can_see_child(child_id));
create policy refl_insert on reflections for insert with check (child_id = current_member_id());

create policy kudos_read on kudos for select using (family_id = current_family_id() and (to_id = current_member_id() or is_adult()));
create policy kudos_insert on kudos for insert with check (family_id = current_family_id() and from_id = current_member_id());

-- Storage: proofs bucket, private, family-prefixed paths `${family_id}/${submission_id}`; lifecycle rule deletes objects after settings.rawProofRetentionDays.
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false) on conflict do nothing;
create policy proofs_rw on storage.objects for all using (bucket_id = 'proofs' and (storage.foldername(name))[1] = current_family_id()::text);
