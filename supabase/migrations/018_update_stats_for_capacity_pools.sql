begin;

drop function if exists public.get_my_organizer_event_stats();
drop function if exists public.get_my_organizer_ticket_type_stats();
drop function if exists public.get_my_organizer_entrance_time_stats();

create or replace function public.get_my_organizer_event_stats()
returns table (
  event_id uuid,

  tickets_sold integer,
  paid_tickets_sold integer,
  guest_list_tickets_claimed integer,

  active_tickets integer,
  used_tickets integer,
  cancelled_tickets integer,

  gross_revenue_cents bigint,

  successful_entrances integer,
  paid_successful_entrances integer,
  guest_list_successful_entrances integer,

  duplicate_scan_attempts integer,
  invalid_scan_attempts integer,

  event_remaining_capacity integer,
  paid_remaining_capacity integer,
  guest_list_remaining_capacity integer,

  page_views bigint
)
language sql
security definer
set search_path = public
as $$
  with allowed_events as (
    select
      e.id,
      e.max_tickets,
      e.max_guest_list
    from public.events e
    where
      public.is_admin()
      or e.organizer_id = auth.uid()
  ),
  ticket_stats as (
    select
      t.event_id,

      count(*) filter (
        where t.status::text in ('active', 'used')
      )::integer as tickets_sold,

      count(*) filter (
        where t.status::text in ('active', 'used')
          and t.ticket_capacity_pool_snapshot::text = 'paid'
      )::integer as paid_tickets_sold,

      count(*) filter (
        where t.status::text in ('active', 'used')
          and t.ticket_capacity_pool_snapshot::text = 'guest_list'
      )::integer as guest_list_tickets_claimed,

      count(*) filter (
        where t.status::text = 'active'
      )::integer as active_tickets,

      count(*) filter (
        where t.status::text = 'used'
      )::integer as used_tickets,

      count(*) filter (
        where t.status::text = 'cancelled'
      )::integer as cancelled_tickets,

      coalesce(
        sum(t.ticket_price_cents_snapshot) filter (
          where t.status::text in ('active', 'used')
        ),
        0
      )::bigint as gross_revenue_cents

    from public.tickets t
    join allowed_events ae on ae.id = t.event_id
    group by t.event_id
  ),
  check_in_stats as (
    select
      c.event_id,

      count(*) filter (
        where c.result::text = 'success'
      )::integer as successful_entrances,

      count(*) filter (
        where c.result::text = 'success'
          and t.ticket_capacity_pool_snapshot::text = 'paid'
      )::integer as paid_successful_entrances,

      count(*) filter (
        where c.result::text = 'success'
          and t.ticket_capacity_pool_snapshot::text = 'guest_list'
      )::integer as guest_list_successful_entrances,

      count(*) filter (
        where c.result::text = 'already_used'
      )::integer as duplicate_scan_attempts,

      count(*) filter (
        where c.result::text in ('invalid', 'invalid_ticket', 'wrong_event', 'unauthorized')
      )::integer as invalid_scan_attempts

    from public.check_ins c
    join allowed_events ae on ae.id = c.event_id
    left join public.tickets t on t.id = c.ticket_id
    group by c.event_id
  ),
  page_view_stats as (
    select
      epvs.event_id,
      coalesce(sum(epvs.raw_views), 0)::bigint as page_views
    from public.event_page_view_stats epvs
    join allowed_events ae on ae.id = epvs.event_id
    group by epvs.event_id
  )
  select
    ae.id as event_id,

    coalesce(ts.tickets_sold, 0)::integer as tickets_sold,
    coalesce(ts.paid_tickets_sold, 0)::integer as paid_tickets_sold,
    coalesce(ts.guest_list_tickets_claimed, 0)::integer as guest_list_tickets_claimed,

    coalesce(ts.active_tickets, 0)::integer as active_tickets,
    coalesce(ts.used_tickets, 0)::integer as used_tickets,
    coalesce(ts.cancelled_tickets, 0)::integer as cancelled_tickets,

    coalesce(ts.gross_revenue_cents, 0)::bigint as gross_revenue_cents,

    coalesce(cis.successful_entrances, 0)::integer as successful_entrances,
    coalesce(cis.paid_successful_entrances, 0)::integer as paid_successful_entrances,
    coalesce(cis.guest_list_successful_entrances, 0)::integer as guest_list_successful_entrances,

    coalesce(cis.duplicate_scan_attempts, 0)::integer as duplicate_scan_attempts,
    coalesce(cis.invalid_scan_attempts, 0)::integer as invalid_scan_attempts,

    greatest(ae.max_tickets - coalesce(ts.paid_tickets_sold, 0), 0)::integer as event_remaining_capacity,
    greatest(ae.max_tickets - coalesce(ts.paid_tickets_sold, 0), 0)::integer as paid_remaining_capacity,
    greatest(coalesce(ae.max_guest_list, 0) - coalesce(ts.guest_list_tickets_claimed, 0), 0)::integer as guest_list_remaining_capacity,

    coalesce(pvs.page_views, 0)::bigint as page_views

  from allowed_events ae
  left join ticket_stats ts on ts.event_id = ae.id
  left join check_in_stats cis on cis.event_id = ae.id
  left join page_view_stats pvs on pvs.event_id = ae.id;
$$;

create or replace function public.get_my_organizer_ticket_type_stats()
returns table (
  event_id uuid,
  ticket_type_id uuid,
  ticket_type_title text,
  price_cents integer,
  currency text,
  max_quantity integer,
  capacity_pool public.ticket_capacity_pool,
  is_active boolean,
  sort_order integer,
  sold_count integer,
  active_count integer,
  used_count integer,
  successful_entrances integer,
  gross_revenue_cents bigint,
  remaining_quantity integer
)
language sql
security definer
set search_path = public
as $$
  with allowed_events as (
    select e.id
    from public.events e
    where
      public.is_admin()
      or e.organizer_id = auth.uid()
  ),
  ticket_type_base as (
    select
      tt.event_id,
      tt.id as ticket_type_id,
      tt.title as ticket_type_title,
      tt.price_cents,
      tt.currency,
      tt.max_quantity,
      tt.capacity_pool,
      tt.is_active,
      tt.sort_order
    from public.ticket_types tt
    join allowed_events ae on ae.id = tt.event_id
  ),
  ticket_stats as (
    select
      t.event_id,
      t.ticket_type_id,

      count(*) filter (
        where t.status::text in ('active', 'used')
      )::integer as sold_count,

      count(*) filter (
        where t.status::text = 'active'
      )::integer as active_count,

      count(*) filter (
        where t.status::text = 'used'
      )::integer as used_count,

      coalesce(
        sum(t.ticket_price_cents_snapshot) filter (
          where t.status::text in ('active', 'used')
        ),
        0
      )::bigint as gross_revenue_cents

    from public.tickets t
    join allowed_events ae on ae.id = t.event_id
    where t.ticket_type_id is not null
    group by t.event_id, t.ticket_type_id
  ),
  entrance_stats as (
    select
      t.event_id,
      t.ticket_type_id,
      count(*)::integer as successful_entrances
    from public.check_ins c
    join public.tickets t on t.id = c.ticket_id
    join allowed_events ae on ae.id = t.event_id
    where c.result::text = 'success'
      and t.ticket_type_id is not null
    group by t.event_id, t.ticket_type_id
  )
  select
    ttb.event_id,
    ttb.ticket_type_id,
    ttb.ticket_type_title,
    ttb.price_cents,
    ttb.currency,
    ttb.max_quantity,
    ttb.capacity_pool,
    ttb.is_active,
    ttb.sort_order,

    coalesce(ts.sold_count, 0)::integer as sold_count,
    coalesce(ts.active_count, 0)::integer as active_count,
    coalesce(ts.used_count, 0)::integer as used_count,
    coalesce(es.successful_entrances, 0)::integer as successful_entrances,
    coalesce(ts.gross_revenue_cents, 0)::bigint as gross_revenue_cents,

    case
      when ttb.max_quantity is null then null
      else greatest(ttb.max_quantity - coalesce(ts.sold_count, 0), 0)
    end::integer as remaining_quantity

  from ticket_type_base ttb
  left join ticket_stats ts
    on ts.event_id = ttb.event_id
    and ts.ticket_type_id = ttb.ticket_type_id
  left join entrance_stats es
    on es.event_id = ttb.event_id
    and es.ticket_type_id = ttb.ticket_type_id
  order by ttb.event_id, ttb.capacity_pool, ttb.sort_order, ttb.ticket_type_title;
$$;

create or replace function public.get_my_organizer_entrance_time_stats()
returns table (
  event_id uuid,
  bucket_start timestamptz,
  successful_entrances integer,
  paid_successful_entrances integer,
  guest_list_successful_entrances integer
)
language sql
security definer
set search_path = public
as $$
  with allowed_events as (
    select e.id
    from public.events e
    where
      public.is_admin()
      or e.organizer_id = auth.uid()
  )
  select
    c.event_id,

    to_timestamp(
      floor(extract(epoch from coalesce(c.checked_at, c.created_at)) / 900) * 900
    ) as bucket_start,

    count(*) filter (
      where c.result::text = 'success'
    )::integer as successful_entrances,

    count(*) filter (
      where c.result::text = 'success'
        and t.ticket_capacity_pool_snapshot::text = 'paid'
    )::integer as paid_successful_entrances,

    count(*) filter (
      where c.result::text = 'success'
        and t.ticket_capacity_pool_snapshot::text = 'guest_list'
    )::integer as guest_list_successful_entrances

  from public.check_ins c
  join allowed_events ae on ae.id = c.event_id
  left join public.tickets t on t.id = c.ticket_id
  where c.result::text = 'success'
  group by c.event_id, bucket_start
  order by c.event_id, bucket_start;
$$;

revoke all on function public.get_my_organizer_event_stats() from public;
revoke all on function public.get_my_organizer_ticket_type_stats() from public;
revoke all on function public.get_my_organizer_entrance_time_stats() from public;

grant execute on function public.get_my_organizer_event_stats() to authenticated;
grant execute on function public.get_my_organizer_ticket_type_stats() to authenticated;
grant execute on function public.get_my_organizer_entrance_time_stats() to authenticated;

commit;