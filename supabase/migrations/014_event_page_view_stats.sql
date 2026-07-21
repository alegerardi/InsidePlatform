begin;

create table if not exists public.event_page_view_stats (
  event_id uuid not null references public.events(id) on delete cascade,
  view_date date not null default current_date,
  raw_views bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, view_date)
);

alter table public.event_page_view_stats enable row level security;

create index if not exists event_page_view_stats_event_id_idx
on public.event_page_view_stats(event_id);

create index if not exists event_page_view_stats_view_date_idx
on public.event_page_view_stats(view_date desc);

drop trigger if exists event_page_view_stats_set_updated_at on public.event_page_view_stats;

create trigger event_page_view_stats_set_updated_at
before update on public.event_page_view_stats
for each row
execute function public.set_updated_at();

drop policy if exists "Organizers can read own event page view stats"
on public.event_page_view_stats;

create policy "Organizers can read own event page view stats"
on public.event_page_view_stats
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.events e
    where e.id = event_page_view_stats.event_id
      and e.organizer_id = auth.uid()
  )
);

create or replace function public.record_event_page_view(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_event_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and e.status in ('published', 'active')
  ) then
    return;
  end if;

  insert into public.event_page_view_stats (
    event_id,
    view_date,
    raw_views
  )
  values (
    target_event_id,
    current_date,
    1
  )
  on conflict (event_id, view_date)
  do update
  set
    raw_views = public.event_page_view_stats.raw_views + 1,
    updated_at = now();
end;
$$;

revoke all on function public.record_event_page_view(uuid) from public;

grant execute on function public.record_event_page_view(uuid) to anon;
grant execute on function public.record_event_page_view(uuid) to authenticated;

commit;