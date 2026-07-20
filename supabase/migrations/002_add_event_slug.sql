begin;

alter table public.events
add column if not exists slug text;

create unique index if not exists events_slug_unique_idx
on public.events(slug)
where slug is not null;

commit;