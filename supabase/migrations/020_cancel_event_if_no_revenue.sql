begin;

create or replace function public.cancel_event_if_no_revenue(
  target_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_role public.user_role;
  event_record public.events%rowtype;
  gross_revenue_cents integer := 0;
  cancelled_ticket_count integer := 0;
  debug_id uuid;
begin
  if current_user_id is null then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'You must be logged in.'
    );
  end if;

  select p.role
  into current_user_role
  from public.profiles p
  where p.id = current_user_id;

  select *
  into event_record
  from public.events e
  where e.id = target_event_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'result', 'event_not_found',
      'message', 'Event not found.'
    );
  end if;

  if current_user_role is null
    or (
      current_user_role <> 'admin'::public.user_role
      and event_record.organizer_id <> current_user_id
    )
  then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'You are not allowed to cancel this event.'
    );
  end if;

  if event_record.status = 'cancelled'::public.event_status then
    return jsonb_build_object(
      'success', true,
      'result', 'already_cancelled',
      'message', 'Event is already cancelled.'
    );
  end if;

  if event_record.status = 'completed'::public.event_status then
    return jsonb_build_object(
      'success', false,
      'result', 'completed_event',
      'message', 'Completed events cannot be cancelled from this control.'
    );
  end if;

  if event_record.starts_at <= now() then
    return jsonb_build_object(
      'success', false,
      'result', 'event_locked',
      'message', 'Only upcoming events can be cancelled from this control.'
    );
  end if;

  select coalesce(sum(t.ticket_price_cents_snapshot), 0)::integer
  into gross_revenue_cents
  from public.tickets t
  where t.event_id = target_event_id
    and t.status::text in ('active', 'used');

  if gross_revenue_cents > 0 then
    return jsonb_build_object(
      'success', false,
      'result', 'revenue_exists',
      'message', 'This event has issued paid tickets and cannot be cancelled from this control.'
    );
  end if;

  update public.events
  set status = 'cancelled'::public.event_status,
      updated_at = now()
  where id = target_event_id;

  update public.tickets
  set status = 'cancelled'::public.ticket_status
  where event_id = target_event_id
    and status = 'active'::public.ticket_status;

  get diagnostics cancelled_ticket_count = row_count;

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
    current_user_id,
    'event_cancel',
    'event',
    target_event_id,
    'success',
    'Event cancelled without deleting related data.',
    jsonb_build_object(
      'previous_status', event_record.status::text,
      'new_status', 'cancelled',
      'gross_revenue_cents', gross_revenue_cents,
      'cancelled_active_tickets', cancelled_ticket_count
    )
  );

  return jsonb_build_object(
    'success', true,
    'result', 'cancelled',
    'message', 'Event cancelled.'
  );

exception
  when others then
    debug_id := extensions.gen_random_uuid();

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
      current_user_id,
      'event_cancel',
      'event',
      target_event_id,
      'error',
      'Unexpected error while cancelling event.',
      jsonb_build_object(
        'debug_id', debug_id,
        'sqlstate', sqlstate,
        'sqlerrm', sqlerrm
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'error',
      'message', 'Could not cancel event.',
      'debug_id', debug_id
    );
end;
$$;

revoke all on function public.cancel_event_if_no_revenue(uuid) from public;

grant execute on function public.cancel_event_if_no_revenue(uuid) to authenticated;

commit;