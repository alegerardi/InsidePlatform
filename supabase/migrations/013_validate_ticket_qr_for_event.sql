begin;

create or replace function public.validate_ticket_qr_for_event(
  target_event_id uuid,
  target_qr_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_role public.user_role;
  v_event public.events%rowtype;
  v_ticket public.tickets%rowtype;
  v_client_name text;
  v_client_email text;
  v_ticket_type_title text;
  v_ticket_price_cents integer;
  v_ticket_currency text;
  v_debug_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'Please log in to validate tickets.'
    );
  end if;

  if length(trim(coalesce(target_qr_token, ''))) = 0 then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid',
      'message', 'Invalid QR code.'
    );
  end if;

  select role
  into v_user_role
  from public.profiles
  where id = v_user_id;

  select *
  into v_event
  from public.events
  where id = target_event_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'result', 'event_not_found',
      'message', 'Event not found.'
    );
  end if;

  if not (
    v_user_role = 'admin'
    or v_event.organizer_id = v_user_id
    or exists (
      select 1
      from public.event_staff_assignments esa
      where esa.event_id = target_event_id
        and esa.staff_user_id = v_user_id
    )
  ) then
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
      'ticket_scan',
      'event',
      target_event_id,
      'unauthorized',
      'Unauthorized QR scan attempt.',
      jsonb_build_object(
        'event_id', target_event_id
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'You are not allowed to validate tickets for this event.'
    );
  end if;

  select *
  into v_ticket
  from public.tickets
  where qr_token = target_qr_token
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
      'ticket_scan',
      'event',
      target_event_id,
      'invalid',
      'Invalid QR code scanned.',
      jsonb_build_object(
        'event_id', target_event_id
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'invalid',
      'message', 'Invalid ticket QR code.'
    );
  end if;

  select
    coalesce(nullif(trim(p.full_name), ''), p.email, 'Client'),
    p.email
  into
    v_client_name,
    v_client_email
  from public.profiles p
  where p.id = v_ticket.user_id;

  v_client_name := coalesce(v_client_name, 'Client');
  v_ticket_type_title := coalesce(v_ticket.ticket_type_title_snapshot, 'General Admission');
  v_ticket_price_cents := coalesce(v_ticket.ticket_price_cents_snapshot, 0);
  v_ticket_currency := coalesce(v_ticket.ticket_currency_snapshot, 'EUR');

  if v_ticket.event_id <> target_event_id then
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
      'ticket_scan',
      'event',
      target_event_id,
      'wrong_event',
      'Ticket QR belongs to a different event.',
      jsonb_build_object(
        'target_event_id', target_event_id,
        'ticket_event_id', v_ticket.event_id,
        'ticket_id', v_ticket.id,
        'ticket_code', v_ticket.ticket_code
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'wrong_event',
      'message', 'This ticket belongs to a different event.',
      'ticket_id', v_ticket.id,
      'ticket_code', v_ticket.ticket_code,
      'client_name', v_client_name,
      'ticket_type_title', v_ticket_type_title,
      'ticket_price_cents', v_ticket_price_cents,
      'ticket_currency', v_ticket_currency
    );
  end if;

  if v_ticket.status = 'used' then
    insert into public.check_ins (
      ticket_id,
      event_id,
      checked_by,
      staff_user_id,
      result,
      message,
      checked_at,
      created_at
    )
    values (
      v_ticket.id,
      v_ticket.event_id,
      v_user_id,
      v_user_id,
      'already_used',
      'Ticket already used.',
      now(),
      now()
    );

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
      'ticket_scan',
      'ticket',
      v_ticket.id,
      'already_used',
      'Already-used ticket scanned.',
      jsonb_build_object(
        'event_id', v_ticket.event_id,
        'ticket_code', v_ticket.ticket_code,
        'client_name', v_client_name,
        'ticket_type_title', v_ticket_type_title
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'already_used',
      'message', 'This ticket was already used.',
      'ticket_id', v_ticket.id,
      'ticket_code', v_ticket.ticket_code,
      'client_name', v_client_name,
      'ticket_type_title', v_ticket_type_title,
      'ticket_price_cents', v_ticket_price_cents,
      'ticket_currency', v_ticket_currency
    );
  end if;

  if v_ticket.status <> 'active' then
    insert into public.check_ins (
      ticket_id,
      event_id,
      checked_by,
      staff_user_id,
      result,
      message,
      checked_at,
      created_at
    )
    values (
      v_ticket.id,
      v_ticket.event_id,
      v_user_id,
      v_user_id,
      'invalid',
      'Ticket is not active.',
      now(),
      now()
    );

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
      'ticket_scan',
      'ticket',
      v_ticket.id,
      'invalid',
      'Inactive ticket scanned.',
      jsonb_build_object(
        'event_id', v_ticket.event_id,
        'ticket_code', v_ticket.ticket_code,
        'ticket_status', v_ticket.status,
        'client_name', v_client_name,
        'ticket_type_title', v_ticket_type_title
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'invalid',
      'message', 'This ticket is not active.',
      'ticket_id', v_ticket.id,
      'ticket_code', v_ticket.ticket_code,
      'client_name', v_client_name,
      'ticket_type_title', v_ticket_type_title,
      'ticket_price_cents', v_ticket_price_cents,
      'ticket_currency', v_ticket_currency
    );
  end if;

  update public.tickets
  set
    status = 'used',
    used_at = now(),
    used_by = v_user_id
  where id = v_ticket.id;

  insert into public.check_ins (
    ticket_id,
    event_id,
    checked_by,
    staff_user_id,
    result,
    message,
    checked_at,
    created_at
  )
  values (
    v_ticket.id,
    v_ticket.event_id,
    v_user_id,
    v_user_id,
    'success',
    'Ticket validated successfully.',
    now(),
    now()
  );

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
    'ticket_scan',
    'ticket',
    v_ticket.id,
    'success',
    'Ticket validated successfully from staff scanner.',
    jsonb_build_object(
      'event_id', v_ticket.event_id,
      'ticket_code', v_ticket.ticket_code,
      'client_name', v_client_name,
      'ticket_type_title', v_ticket_type_title
    )
  );

  return jsonb_build_object(
    'success', true,
    'result', 'success',
    'message', 'Ticket validated successfully.',
    'ticket_id', v_ticket.id,
    'ticket_code', v_ticket.ticket_code,
    'client_name', v_client_name,
    'ticket_type_title', v_ticket_type_title,
    'ticket_price_cents', v_ticket_price_cents,
    'ticket_currency', v_ticket_currency
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
      'ticket_scan',
      'event',
      target_event_id,
      'error',
      'Unexpected database error while scanning QR.',
      jsonb_build_object(
        'debug_id', v_debug_id,
        'sqlstate', sqlstate,
        'sqlerrm', sqlerrm
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'error',
      'message', 'We could not validate this ticket. Please try again.',
      'debug_id', v_debug_id
    );
end;
$$;

revoke all on function public.validate_ticket_qr_for_event(uuid, text) from public;

grant execute on function public.validate_ticket_qr_for_event(uuid, text) to authenticated;

commit;