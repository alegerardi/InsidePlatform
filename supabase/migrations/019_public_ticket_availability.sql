begin;

create or replace function public.get_public_ticket_types_for_event(
  target_event_id uuid
)
returns table (
  id uuid,
  event_id uuid,
  title text,
  description text,
  price_cents integer,
  currency text,
  capacity_pool public.ticket_capacity_pool,
  sort_order integer,
  is_sold_out boolean
)
language sql
security definer
set search_path = public
as $$
  with event_row as (
    select
      e.id,
      e.max_tickets,
      e.max_guest_list
    from public.events e
    where e.id = target_event_id
      and e.status::text in ('published', 'active')
  ),
  pool_counts as (
    select
      count(*) filter (
        where t.ticket_capacity_pool_snapshot::text = 'paid'
          and t.status::text in ('active', 'used')
      )::integer as paid_issued,

      count(*) filter (
        where t.ticket_capacity_pool_snapshot::text = 'guest_list'
          and t.status::text in ('active', 'used')
      )::integer as guest_list_issued
    from public.tickets t
    join event_row e on e.id = t.event_id
  ),
  type_counts as (
    select
      t.ticket_type_id,
      count(*)::integer as issued_count
    from public.tickets t
    join event_row e on e.id = t.event_id
    where t.status::text in ('active', 'used')
      and t.ticket_type_id is not null
    group by t.ticket_type_id
  )
  select
    tt.id,
    tt.event_id,
    tt.title,
    tt.description,
    tt.price_cents,
    tt.currency,
    tt.capacity_pool,
    tt.sort_order,

    (
      case
        when tt.capacity_pool::text = 'guest_list' then
          pc.guest_list_issued >= coalesce(e.max_guest_list, 0)
        else
          pc.paid_issued >= e.max_tickets
      end
      or (
        tt.max_quantity is not null
        and coalesce(tc.issued_count, 0) >= tt.max_quantity
      )
    )::boolean as is_sold_out

  from public.ticket_types tt
  join event_row e on e.id = tt.event_id
  cross join pool_counts pc
  left join type_counts tc on tc.ticket_type_id = tt.id
  where tt.is_active = true
  order by tt.capacity_pool, tt.sort_order, tt.title;
$$;

revoke all on function public.get_public_ticket_types_for_event(uuid) from public;

grant execute on function public.get_public_ticket_types_for_event(uuid) to anon;
grant execute on function public.get_public_ticket_types_for_event(uuid) to authenticated;

commit;