begin;

create or replace function public.validate_ticket_by_qr(target_qr_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_role public.user_role;
  v_ticket public.tickets%rowtype;
  v_event public.events%rowtype;
  v_is_authorized boolean := false;
  v_debug_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'Please log in to validate this ticket.'
    );
  end if;

  select role
  into v_user_role
  from public.profiles
  where id = v_user_id;

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
      result,
      message,
      metadata
    )
    values (
      v_user_id,
      'ticket_validate',
      'ticket',
      'invalid_ticket',
      'Ticket not found for QR token.',
      jsonb_build_object('qr_token_prefix', left(target_qr_token, 8))
    );

    return jsonb_build_object(
      'success', false,
      'result', 'invalid_ticket',
      'message', 'Invalid ticket.'
    );
  end if;

  select *
  into v_event
  from public.events
  where id = v_ticket.event_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'result', 'event_not_found',
      'message', 'Event not found.'
    );
  end if;

  v_is_authorized :=
    v_user_role = 'admin'
    or v_event.organizer_id = v_user_id
    or exists (
      select 1
      from public.event_staff_assignments esa
      where esa.event_id = v_event.id
        and esa.staff_user_id = v_user_id
    );

  if not v_is_authorized then
    insert into public.check_ins (
      ticket_id,
      event_id,
      staff_user_id,
      result,
      message
    )
    values (
      v_ticket.id,
      v_ticket.event_id,
      v_user_id,
      'unauthorized',
      'User is not authorized to validate tickets for this event.'
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
      'ticket_validate',
      'ticket',
      v_ticket.id,
      'unauthorized',
      'User is not authorized to validate this ticket.',
      jsonb_build_object('event_id', v_ticket.event_id)
    );

    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'You are not authorized to validate tickets for this event.'
    );
  end if;

  if v_ticket.status = 'used' then
    insert into public.check_ins (
      ticket_id,
      event_id,
      staff_user_id,
      result,
      message
    )
    values (
      v_ticket.id,
      v_ticket.event_id,
      v_user_id,
      'already_used',
      'Ticket was already used.'
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
      'ticket_validate',
      'ticket',
      v_ticket.id,
      'already_used',
      'Ticket was already used.',
      jsonb_build_object('event_id', v_ticket.event_id)
    );

    return jsonb_build_object(
      'success', false,
      'result', 'already_used',
      'message', 'This ticket was already used.',
      'ticket_id', v_ticket.id,
      'ticket_code', v_ticket.ticket_code,
      'event_title', v_event.title
    );
  end if;

  if v_ticket.status <> 'active' then
    insert into public.check_ins (
      ticket_id,
      event_id,
      staff_user_id,
      result,
      message
    )
    values (
      v_ticket.id,
      v_ticket.event_id,
      v_user_id,
      'invalid_ticket',
      'Ticket is not active.'
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
      'ticket_validate',
      'ticket',
      v_ticket.id,
      'invalid_ticket',
      'Ticket is not active.',
      jsonb_build_object(
        'event_id', v_ticket.event_id,
        'ticket_status', v_ticket.status
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'invalid_ticket',
      'message', 'This ticket is not active.',
      'ticket_id', v_ticket.id,
      'ticket_code', v_ticket.ticket_code,
      'event_title', v_event.title
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
    staff_user_id,
    result,
    message
  )
  values (
    v_ticket.id,
    v_ticket.event_id,
    v_user_id,
    'success',
    'Ticket validated successfully.'
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
    'ticket_validate',
    'ticket',
    v_ticket.id,
    'success',
    'Ticket validated successfully.',
    jsonb_build_object('event_id', v_ticket.event_id)
  );

  return jsonb_build_object(
    'success', true,
    'result', 'success',
    'message', 'Ticket validated successfully.',
    'ticket_id', v_ticket.id,
    'ticket_code', v_ticket.ticket_code,
    'event_title', v_event.title
  );

exception
  when others then
    v_debug_id := extensions.gen_random_uuid();

    insert into public.app_action_logs (
      actor_user_id,
      action,
      entity_type,
      result,
      message,
      metadata
    )
    values (
      v_user_id,
      'ticket_validate',
      'ticket',
      'error',
      'Unexpected database error while validating ticket.',
      jsonb_build_object(
        'debug_id', v_debug_id,
        'sqlstate', sqlstate,
        'sqlerrm', sqlerrm,
        'qr_token_prefix', left(target_qr_token, 8)
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

revoke all on function public.validate_ticket_by_qr(text) from public;
grant execute on function public.validate_ticket_by_qr(text) to authenticated;

commit;