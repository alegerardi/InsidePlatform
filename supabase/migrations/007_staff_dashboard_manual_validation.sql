begin;

create or replace function public.get_my_staff_events()
returns table (
  id uuid,
  title text,
  slug text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.event_status,
  organizer_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.title,
    e.slug,
    e.description,
    e.location,
    e.starts_at,
    e.ends_at,
    e.status,
    e.organizer_id
  from public.event_staff_assignments esa
  join public.events e
    on e.id = esa.event_id
  where esa.staff_user_id = auth.uid()
  order by e.starts_at asc;
$$;

create or replace function public.validate_ticket_by_code(
  target_event_id uuid,
  target_ticket_code text
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
  v_code text := upper(trim(target_ticket_code));
  v_is_authorized boolean := false;
  v_debug_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'Please log in to validate tickets.'
    );
  end if;

  if v_code = '' then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_ticket',
      'message', 'Insert a valid ticket code.'
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

  v_is_authorized :=
    v_user_role = 'admin'
    or v_event.organizer_id = v_user_id
    or exists (
      select 1
      from public.event_staff_assignments esa
      where esa.event_id = target_event_id
        and esa.staff_user_id = v_user_id
    );

  if not v_is_authorized then
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
      'ticket_validate_manual',
      'event',
      target_event_id,
      'unauthorized',
      'User is not authorized to manually validate tickets for this event.',
      jsonb_build_object('ticket_code', v_code)
    );

    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'You are not authorized to validate tickets for this event.'
    );
  end if;

  select *
  into v_ticket
  from public.tickets
  where upper(ticket_code) = v_code
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
      'ticket_validate_manual',
      'event',
      target_event_id,
      'invalid_ticket',
      'No ticket found with this code.',
      jsonb_build_object('ticket_code', v_code)
    );

    return jsonb_build_object(
      'success', false,
      'result', 'invalid_ticket',
      'message', 'Invalid ticket code.'
    );
  end if;

  if v_ticket.event_id <> target_event_id then
    insert into public.check_ins (
      ticket_id,
      event_id,
      staff_user_id,
      result,
      message
    )
    values (
      v_ticket.id,
      target_event_id,
      v_user_id,
      'wrong_event',
      'Ticket belongs to a different event.'
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
      'ticket_validate_manual',
      'ticket',
      v_ticket.id,
      'wrong_event',
      'Ticket belongs to a different event.',
      jsonb_build_object(
        'target_event_id', target_event_id,
        'actual_event_id', v_ticket.event_id,
        'ticket_code', v_code
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'wrong_event',
      'message', 'This ticket belongs to a different event.',
      'ticket_id', v_ticket.id,
      'ticket_code', v_ticket.ticket_code,
      'event_title', v_event.title
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
      'ticket_validate_manual',
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
      'ticket_validate_manual',
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
    'Ticket validated successfully by manual code.'
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
    'ticket_validate_manual',
    'ticket',
    v_ticket.id,
    'success',
    'Ticket validated successfully by manual code.',
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
      entity_id,
      result,
      message,
      metadata
    )
    values (
      v_user_id,
      'ticket_validate_manual',
      'event',
      target_event_id,
      'error',
      'Unexpected database error while manually validating ticket.',
      jsonb_build_object(
        'debug_id', v_debug_id,
        'sqlstate', sqlstate,
        'sqlerrm', sqlerrm,
        'ticket_code', v_code
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

revoke all on function public.get_my_staff_events() from public;
grant execute on function public.get_my_staff_events() to authenticated;

revoke all on function public.validate_ticket_by_code(uuid, text) from public;
grant execute on function public.validate_ticket_by_code(uuid, text) to authenticated;

commit;