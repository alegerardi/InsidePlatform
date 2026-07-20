begin;

alter table public.check_ins
add column if not exists staff_user_id uuid references auth.users(id) on delete set null;

alter table public.check_ins
add column if not exists message text;

alter table public.check_ins
add column if not exists created_at timestamptz not null default now();

create index if not exists check_ins_staff_user_id_idx
on public.check_ins(staff_user_id);

create index if not exists check_ins_event_id_created_at_idx
on public.check_ins(event_id, created_at desc);

create index if not exists check_ins_ticket_id_created_at_idx
on public.check_ins(ticket_id, created_at desc);

commit;