-- Guard so re-running setup on an already-initialised project is harmless.
-- (0001 uses plain CREATE TABLE; this file only records that the schema is at v2.)
create table if not exists schema_meta (key text primary key, value text not null, updated_at timestamptz not null default now());
insert into schema_meta (key, value) values ('version', '2') on conflict (key) do update set value = excluded.value, updated_at = now();
