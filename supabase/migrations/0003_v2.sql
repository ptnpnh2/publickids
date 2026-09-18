-- V2: extra-job money ledger, bounded reminders, camera events, and new task/submission fields.

alter table tasks
  add column if not exists money_amount numeric(10,2),
  add column if not exists nonce boolean not null default false,
  add column if not exists exercise jsonb,
  add column if not exists reading jsonb,
  add column if not exists camera_id text;

alter table submissions
  add column if not exists nonce jsonb,
  add column if not exists reps_claimed int,
  add column if not exists reps_counted int,
  add column if not exists reflection jsonb,
  add column if not exists camera_clip jsonb;

-- Money is a separate, append-only ledger (§1.5): never mixed with points.
create table if not exists money_ledger (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references members(id) on delete cascade,
  kind text not null check (kind in ('earn','payout','interest','move','spend','give')),
  amount numeric(10,2) not null,
  jar text not null check (jar in ('save','spend','give')),
  reason text not null,
  ref_type text, ref_id text,
  settled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists money_ledger_child on money_ledger(child_id, created_at);
create or replace function money_no_negative() returns trigger language plpgsql as $$
begin
  if new.amount < 0 and (select coalesce(sum(amount),0) from money_ledger where child_id = new.child_id and jar = new.jar) + new.amount < 0 then
    raise exception 'money.notEnough';
  end if;
  return new;
end $$;
drop trigger if exists money_no_negative on money_ledger;
create trigger money_no_negative before insert on money_ledger for each row execute function money_no_negative();
drop trigger if exists money_append_only on money_ledger;
create trigger money_append_only before delete on money_ledger for each row execute function forbid_change();
-- only the `settled` flag may change
create or replace function money_only_settled() returns trigger language plpgsql as $$
begin
  if new.settled is distinct from old.settled and row(new.id,new.family_id,new.child_id,new.kind,new.amount,new.jar,new.reason,new.ref_type,new.ref_id,new.created_at)
     = row(old.id,old.family_id,old.child_id,old.kind,old.amount,old.jar,old.reason,old.ref_type,old.ref_id,old.created_at) then
    return new;
  end if;
  raise exception 'append-only';
end $$;
drop trigger if exists money_only_settled on money_ledger;
create trigger money_only_settled before update on money_ledger for each row execute function money_only_settled();

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references members(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  date_key date not null,
  kind text not null check (kind in ('window_open','closing_soon','parent')),
  created_at timestamptz not null default now()
);
create index if not exists reminders_lookup on reminders(task_id, child_id, date_key);

create table if not exists camera_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references members(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  camera_id text not null,
  status text not null check (status in ('requested','received','failed')),
  seconds int not null check (seconds between 1 and 60),
  note text,
  created_at timestamptz not null default now()
);

alter table money_ledger enable row level security;
alter table reminders enable row level security;
alter table camera_events enable row level security;
create policy money_read on money_ledger for select using (family_id = current_family_id() and can_see_child(child_id));
create policy money_parent_settle on money_ledger for update using (family_id = current_family_id() and is_parent());
create policy reminders_rw on reminders for all using (family_id = current_family_id() and can_see_child(child_id));
create policy camera_read on camera_events for select using (family_id = current_family_id() and can_see_child(child_id));
create policy camera_child_insert on camera_events for insert with check (family_id = current_family_id() and child_id = current_member_id());

insert into schema_meta (key, value) values ('version', '3') on conflict (key) do update set value = excluded.value, updated_at = now();
