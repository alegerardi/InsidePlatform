begin;

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
  v_event_ticket_count integer;
  v_type_ticket_count integer;
  v_ticket_id uuid;
  v_ticket_code text;
  v_qr_token text;
  v_attempt integer := 0;
  v_debug_id uuid;
begin
  if v_user_id is null then
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
      null,
      'ticket_claim',
      'event',
      target_event_id,
      'unauthorized',
      'Anonymous user tried to claim ticket.',
      jsonb_build_object('ticket_type_id', target_ticket_type_id)
    );

    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'Please log in to claim your ticket.'
    );
  end if;

  select *
  into v_event
  from public.events
  where id = target_event_id
  for update;

  if not found then
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
      'event_not_found',
      'Event not found.',
      jsonb_build_object('ticket_type_id', target_ticket_type_id)
    );

    return jsonb_build_object(
      'success', false,
      'result', 'event_not_found',
      'message', 'Event not found.'
    );
  end if;

  if v_event.status not in ('published', 'active') then
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
      'event_not_available',
      'Tickets are not available for this event.',
      jsonb_build_object(
        'event_status', v_event.status,
        'ticket_type_id', target_ticket_type_id
      )
    );

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
      and is_active = true
    limit 1;
  end if;

  if not found then
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
      'ticket_type_not_found',
      'Ticket type not found or inactive.',
      jsonb_build_object('ticket_type_id', target_ticket_type_id)
    );

    return jsonb_build_object(
      'success', false,
      'result', 'event_not_available',
      'message', 'This ticket type is not available.'
    );
  end if;

  select *
  into v_existing_ticket
  from public.tickets
  where event_id = target_event_id
    and user_id = v_user_id
  limit 1;

  if found then
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
      v_existing_ticket.id,
      'already_has_ticket',
      'User already has a ticket for this event.',
      jsonb_build_object(
        'event_id', target_event_id,
        'requested_ticket_type_id', v_ticket_type.id,
        'existing_ticket_type_id', v_existing_ticket.ticket_type_id
      )
    );

    return jsonb_build_object(
      'success', true,
      'result', 'already_has_ticket',
      'message', 'You already have a ticket for this event.',
      'ticket_id', v_existing_ticket.id
    );
  end if;

  select count(*)
  into v_event_ticket_count
  from public.tickets
  where event_id = target_event_id
    and status in ('active', 'used');

  if v_event_ticket_count >= v_event.max_tickets then
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
      'sold_out',
      'This event is sold out.',
      jsonb_build_object(
        'ticket_count', v_event_ticket_count,
        'max_tickets', v_event.max_tickets,
        'ticket_type_id', v_ticket_type.id
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'sold_out',
      'message', 'This event is sold out.'
    );
  end if;

  if v_ticket_type.max_quantity is not null then
    select count(*)
    into v_type_ticket_count
    from public.tickets
    where event_id = target_event_id
      and ticket_type_id = v_ticket_type.id
      and status in ('active', 'used');

    if v_type_ticket_count >= v_ticket_type.max_quantity then
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
        'ticket_type',
        v_ticket_type.id,
        'sold_out',
        'This ticket type is sold out.',
        jsonb_build_object(
          'event_id', target_event_id,
          'ticket_type_count', v_type_ticket_count,
          'ticket_type_max_quantity', v_ticket_type.max_quantity
        )
      );

      return jsonb_build_object(
        'success', false,
        'result', 'sold_out',
        'message', 'This ticket type is sold out.'
      );
    end if;
  end if;

  loop
    v_attempt := v_attempt + 1;

    v_ticket_code := upper(
      substr(encode(extensions.gen_random_bytes(2), 'hex'), 1, 3)
      || '-'
      || substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 6)
    );

    v_qr_token := encode(extensions.gen_random_bytes(32), 'hex');

    begin
      insert into public.tickets (
        event_id,
        user_id,
        ticket_type_id,
        ticket_type_title_snapshot,
        ticket_price_cents_snapshot,
        ticket_currency_snapshot,
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
        v_ticket_code,
        v_qr_token,
        'active'
      )
      returning id into v_ticket_id;

      exit;
    exception
      when unique_violation then
        select *
        into v_existing_ticket
        from public.tickets
        where event_id = target_event_id
          and user_id = v_user_id
        limit 1;

        if found then
          return jsonb_build_object(
            'success', true,
            'result', 'already_has_ticket',
            'message', 'You already have a ticket for this event.',
            'ticket_id', v_existing_ticket.id
          );
        end if;

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
            'Could not generate a unique ticket after 5 attempts.',
            jsonb_build_object(
              'debug_id', v_debug_id,
              'ticket_type_id', v_ticket_type.id
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
    v_ticket_id,
    'success',
    'Ticket created successfully.',
    jsonb_build_object(
      'event_id', target_event_id,
      'ticket_type_id', v_ticket_type.id,
      'ticket_type_title', v_ticket_type.title,
      'ticket_price_cents', v_ticket_type.price_cents,
      'ticket_currency', v_ticket_type.currency
    )
  );

  return jsonb_build_object(
    'success', true,
    'result', 'success',
    'message', 'Ticket created successfully.',
    'ticket_id', v_ticket_id,
    'ticket_type_id', v_ticket_type.id,
    'ticket_type_title', v_ticket_type.title,
    'ticket_price_cents', v_ticket_type.price_cents,
    'ticket_currency', v_ticket_type.currency
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
        'sqlstate', sqlstate,
        'sqlerrm', sqlerrm,
        'ticket_type_id', target_ticket_type_id
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
set search_path = public, extensions
as $$
begin
  return public.claim_ticket_for_type(target_event_id, null);
end;
$$;

revoke all on function public.claim_ticket_for_type(uuid, uuid) from public;
grant execute on function public.claim_ticket_for_type(uuid, uuid) to authenticated;

revoke all on function public.claim_ticket(uuid) from public;
grant execute on function public.claim_ticket(uuid) to authenticated;

commit;