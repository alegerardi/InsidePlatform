begin;

create table if not exists public.ticket_types (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'EUR',
  max_quantity integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ticket_types_title_not_empty check (length(trim(title)) > 0),
  constraint ticket_types_price_non_negative check (price_cents >= 0),
  constraint ticket_types_max_quantity_positive check (
    max_quantity is null or max_quantity > 0
  )
);

create index if not exists ticket_types_event_id_idx
on public.ticket_types(event_id);

create index if not exists ticket_types_event_id_active_idx
on public.ticket_types(event_id, is_active);

create trigger ticket_types_set_updated_at
before update on public.ticket_types
for each row
execute function public.set_updated_at();

alter table public.ticket_types enable row level security;

drop policy if exists "Public can read active ticket types for public events"
on public.ticket_types;

create policy "Public can read active ticket types for public events"
on public.ticket_types
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.events e
    where e.id = ticket_types.event_id
      and e.status in ('published', 'active')
  )
);

drop policy if exists "Organizers can read own ticket types"
on public.ticket_types;

create policy "Organizers can read own ticket types"
on public.ticket_types
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.events e
    where e.id = ticket_types.event_id
      and e.organizer_id = auth.uid()
  )
);

drop policy if exists "Organizers can insert ticket types for own events"
on public.ticket_types;

create policy "Organizers can insert ticket types for own events"
on public.ticket_types
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.events e
    where e.id = ticket_types.event_id
      and e.organizer_id = auth.uid()
      and e.starts_at > now()
  )
);

drop policy if exists "Organizers can update ticket types for upcoming own events"
on public.ticket_types;

create policy "Organizers can update ticket types for upcoming own events"
on public.ticket_types
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.events e
    where e.id = ticket_types.event_id
      and e.organizer_id = auth.uid()
      and e.starts_at > now()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.events e
    where e.id = ticket_types.event_id
      and e.organizer_id = auth.uid()
      and e.starts_at > now()
  )
);

alter table public.tickets
add column if not exists ticket_type_id uuid references public.ticket_types(id) on delete set null;

alter table public.tickets
add column if not exists ticket_type_title_snapshot text;

alter table public.tickets
add column if not exists ticket_price_cents_snapshot integer not null default 0;

alter table public.tickets
add column if not exists ticket_currency_snapshot text not null default 'EUR';

create index if not exists tickets_ticket_type_id_idx
on public.tickets(ticket_type_id);

create index if not exists tickets_event_id_ticket_type_id_idx
on public.tickets(event_id, ticket_type_id);

-- Backfill one default ticket type for existing events.
insert into public.ticket_types (
  event_id,
  title,
  description,
  price_cents,
  currency,
  max_quantity,
  sort_order
)
select
  e.id,
  'General Admission',
  'Default ticket type',
  0,
  'EUR',
  e.max_tickets,
  0
from public.events e
where not exists (
  select 1
  from public.ticket_types tt
  where tt.event_id = e.id
);

-- Backfill existing tickets with the default ticket type.
update public.tickets t
set
  ticket_type_id = tt.id,
  ticket_type_title_snapshot = tt.title,
  ticket_price_cents_snapshot = tt.price_cents,
  ticket_currency_snapshot = tt.currency
from public.ticket_types tt
where tt.event_id = t.event_id
  and t.ticket_type_id is null;

commit;