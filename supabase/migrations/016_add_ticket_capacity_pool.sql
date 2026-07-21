begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'ticket_capacity_pool'
  ) then
    create type public.ticket_capacity_pool as enum ('paid', 'guest_list');
  end if;
end;
$$;

alter table public.ticket_types
add column if not exists capacity_pool public.ticket_capacity_pool not null default 'paid';

alter table public.tickets
add column if not exists ticket_capacity_pool_snapshot public.ticket_capacity_pool not null default 'paid';

update public.tickets t
set ticket_capacity_pool_snapshot = coalesce(tt.capacity_pool, 'paid'::public.ticket_capacity_pool)
from public.ticket_types tt
where t.ticket_type_id = tt.id;

create index if not exists ticket_types_capacity_pool_idx
on public.ticket_types(capacity_pool);

create index if not exists tickets_event_capacity_pool_status_idx
on public.tickets(event_id, ticket_capacity_pool_snapshot, status);

create or replace function public.claim_ticket_for_type(
  target_event_id uuid,
  target_ticket_type_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.events%rowtype;
  v_ticket_type public.ticket_types%rowtype;
  v_existing_ticket public.tickets%rowtype;
  v_ticket public.tickets%rowtype;
  v_pool_ticket_count integer := 0;
  v_type_ticket_count integer := 0;
  v_code text;
  v_qr_token text;
  v_attempt integer := 0;
  v_debug_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'Please log in to claim a ticket.'
    );
  end if;

  select *
  into v_event
  from public.events
  where id = target_event_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'result', 'event_not_found',
      'message', 'Event not found.'
    );
  end if;

  if v_event.status::text not in ('published', 'active') then
    return jsonb_build_object(
      'success', false,
      'result', 'event_not_available',
      'message', 'Tickets are not available for this event.'
    );
  end if;

  if target_ticket_type_id is null then
    select *
    into v_ticket_type
    from public.ticket_types
    where event_id = target_event_id
      and is_active = true
    order by sort_order asc, created_at asc
    limit 1;
  else
    select *
    into v_ticket_type
    from public.ticket_types
    where id = target_ticket_type_id
      and event_id = target_event_id
      and is_active = true;
  end if;

  if not found then
    return jsonb_build_object(
      'success', false,
      'result', 'ticket_type_not_found',
      'message', 'Ticket type not found.'
    );
  end if;

  select *
  into v_existing_ticket
  from public.tickets
  where event_id = target_event_id
    and user_id = v_user_id
    and status::text in ('active', 'used')
  order by created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'success', true,
      'result', 'already_has_ticket',
      'message', 'You already have a ticket for this event.',
      'ticket_id', v_existing_ticket.id,
      'ticket_type_id', v_existing_ticket.ticket_type_id,
      'ticket_type_title', v_existing_ticket.ticket_type_title_snapshot,
      'ticket_price_cents', v_existing_ticket.ticket_price_cents_snapshot,
      'ticket_currency', v_existing_ticket.ticket_currency_snapshot,
      'capacity_pool', v_existing_ticket.ticket_capacity_pool_snapshot
    );
  end if;

  if v_ticket_type.capacity_pool = 'guest_list'::public.ticket_capacity_pool then
    select count(*)::integer
    into v_pool_ticket_count
    from public.tickets
    where event_id = target_event_id
      and ticket_capacity_pool_snapshot = 'guest_list'::public.ticket_capacity_pool
      and status::text in ('active', 'used');

    if v_pool_ticket_count >= coalesce(v_event.max_guest_list, 0) then
      return jsonb_build_object(
        'success', false,
        'result', 'sold_out',
        'message', 'The guest list is full.'
      );
    end if;
  else
    select count(*)::integer
    into v_pool_ticket_count
    from public.tickets
    where event_id = target_event_id
      and ticket_capacity_pool_snapshot = 'paid'::public.ticket_capacity_pool
      and status::text in ('active', 'used');

    if v_pool_ticket_count >= v_event.max_tickets then
      return jsonb_build_object(
        'success', false,
        'result', 'sold_out',
        'message', 'This event is sold out.'
      );
    end if;
  end if;

  if v_ticket_type.max_quantity is not null then
    select count(*)::integer
    into v_type_ticket_count
    from public.tickets
    where event_id = target_event_id
      and ticket_type_id = v_ticket_type.id
      and status::text in ('active', 'used');

    if v_type_ticket_count >= v_ticket_type.max_quantity then
      return jsonb_build_object(
        'success', false,
        'result', 'sold_out',
        'message', 'This ticket type is sold out.'
      );
    end if;
  end if;

  loop
    v_attempt := v_attempt + 1;

    v_code :=
      chr(65 + floor(random() * 26)::integer) ||
      chr(65 + floor(random() * 26)::integer) ||
      chr(65 + floor(random() * 26)::integer) ||
      '-' ||
      lpad(floor(random() * 10000)::integer::text, 4, '0');

    v_qr_token := encode(extensions.gen_random_bytes(32), 'hex');

    begin
      insert into public.tickets (
        event_id,
        user_id,
        ticket_type_id,
        ticket_type_title_snapshot,
        ticket_price_cents_snapshot,
        ticket_currency_snapshot,
        ticket_capacity_pool_snapshot,
        ticket_code,
        qr_token,
        status
      )
      values (
        target_event_id,
        v_user_id,
        v_ticket_type.id,
        v_ticket_type.title,
        v_ticket_type.price_cents,
        v_ticket_type.currency,
        v_ticket_type.capacity_pool,
        v_code,
        v_qr_token,
        'active'
      )
      returning *
      into v_ticket;

      exit;
    exception
      when unique_violation then
        if v_attempt >= 5 then
          v_debug_id := extensions.gen_random_uuid();

          insert into public.app_action_logs (
            actor_user_id,
            action,
            entity_type,
            entity_id,
            result,
            message,
            metadata
          )
          values (
            v_user_id,
            'ticket_claim',
            'event',
            target_event_id,
            'error',
            'Could not generate a unique ticket code or QR token.',
            jsonb_build_object(
              'debug_id', v_debug_id,
              'event_id', target_event_id,
              'ticket_type_id', v_ticket_type.id,
              'capacity_pool', v_ticket_type.capacity_pool
            )
          );

          return jsonb_build_object(
            'success', false,
            'result', 'error',
            'message', 'We could not claim your ticket. Please try again.',
            'debug_id', v_debug_id
          );
        end if;
    end;
  end loop;

  insert into public.app_action_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    result,
    message,
    metadata
  )
  values (
    v_user_id,
    'ticket_claim',
    'ticket',
    v_ticket.id,
    'success',
    'Ticket created successfully.',
    jsonb_build_object(
      'event_id', target_event_id,
      'ticket_type_id', v_ticket_type.id,
      'ticket_type_title', v_ticket_type.title,
      'ticket_price_cents', v_ticket_type.price_cents,
      'ticket_currency', v_ticket_type.currency,
      'capacity_pool', v_ticket_type.capacity_pool
    )
  );

  return jsonb_build_object(
    'success', true,
    'result', 'success',
    'message', 'Ticket created successfully.',
    'ticket_id', v_ticket.id,
    'ticket_type_id', v_ticket_type.id,
    'ticket_type_title', v_ticket_type.title,
    'ticket_price_cents', v_ticket_type.price_cents,
    'ticket_currency', v_ticket_type.currency,
    'capacity_pool', v_ticket_type.capacity_pool
  );

exception
  when others then
    v_debug_id := extensions.gen_random_uuid();

    insert into public.app_action_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      result,
      message,
      metadata
    )
    values (
      v_user_id,
      'ticket_claim',
      'event',
      target_event_id,
      'error',
      'Unexpected database error while claiming ticket.',
      jsonb_build_object(
        'debug_id', v_debug_id,
        'event_id', target_event_id,
        'ticket_type_id', target_ticket_type_id,
        'sqlstate', sqlstate,
        'sqlerrm', sqlerrm
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'error',
      'message', 'We could not claim your ticket. Please try again.',
      'debug_id', v_debug_id
    );
end;
$$;

create or replace function public.claim_ticket(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.claim_ticket_for_type(target_event_id, null);
end;
$$;

revoke all on function public.claim_ticket_for_type(uuid, uuid) from public;
revoke all on function public.claim_ticket(uuid) from public;

grant execute on function public.claim_ticket_for_type(uuid, uuid) to authenticated;
grant execute on function public.claim_ticket(uuid) to authenticated;

commit;