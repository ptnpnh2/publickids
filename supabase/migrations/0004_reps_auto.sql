-- V2.1: on-device repetition count stored with the submission (decision support only).
alter table submissions add column if not exists reps_auto jsonb;
insert into schema_meta (key, value) values ('version', '4') on conflict (key) do update set value = excluded.value, updated_at = now();
