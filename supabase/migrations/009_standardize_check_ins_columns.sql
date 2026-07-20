begin;

-- Backfill canonical original columns from the newer columns.
update public.check_ins
set checked_by = staff_user_id
where checked_by is null
  and staff_user_id is not null;

update public.check_ins
set checked_at = created_at
where checked_at is null
  and created_at is not null;

-- Backfill newer columns from original columns too, so existing code stays safe.
update public.check_ins
set staff_user_id = checked_by
where staff_user_id is null
  and checked_by is not null;

update public.check_ins
set created_at = checked_at
where created_at is null
  and checked_at is not null;

-- Keep both column pairs synchronized for now.
-- Later we can remove staff_user_id/created_at if we decide to fully standardize.
create or replace function public.sync_check_in_user_and_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.checked_by := coalesce(new.checked_by, new.staff_user_id);
  new.staff_user_id := coalesce(new.staff_user_id, new.checked_by);

  new.checked_at := coalesce(new.checked_at, new.created_at, now());
  new.created_at := coalesce(new.created_at, new.checked_at, now());

  return new;
end;
$$;

drop trigger if exists sync_check_in_user_and_time_trigger on public.check_ins;

create trigger sync_check_in_user_and_time_trigger
before insert or update on public.check_ins
for each row
execute function public.sync_check_in_user_and_time();

create index if not exists check_ins_checked_by_idx
on public.check_ins(checked_by);

create index if not exists check_ins_event_id_checked_at_idx
on public.check_ins(event_id, checked_at desc);

create index if not exists check_ins_ticket_id_checked_at_idx
on public.check_ins(ticket_id, checked_at desc);

commit;