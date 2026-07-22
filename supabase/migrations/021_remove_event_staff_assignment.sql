begin;

create or replace function public.remove_event_staff_assignment(
  target_event_id uuid,
  target_staff_user_id uuid
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
  staff_email text;
  assignment_exists boolean := false;
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
      'message', 'You are not allowed to remove staff from this event.'
    );
  end if;

  select exists (
    select 1
    from public.event_staff_assignments esa
    where esa.event_id = target_event_id
      and esa.staff_user_id = target_staff_user_id
  )
  into assignment_exists;

  if not assignment_exists then
    return jsonb_build_object(
      'success', true,
      'result', 'already_removed',
      'message', 'This staff member is not assigned to this event.'
    );
  end if;

  select p.email
  into staff_email
  from public.profiles p
  where p.id = target_staff_user_id;

  delete from public.event_staff_assignments esa
  where esa.event_id = target_event_id
    and esa.staff_user_id = target_staff_user_id;

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
    'event_staff_remove',
    'event',
    target_event_id,
    'success',
    'Event staff assignment removed.',
    jsonb_build_object(
      'staff_user_id', target_staff_user_id,
      'staff_email', staff_email
    )
  );

  return jsonb_build_object(
    'success', true,
    'result', 'removed',
    'message', coalesce('Staff removed: ' || staff_email, 'Staff removed.')
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
      'event_staff_remove',
      'event',
      target_event_id,
      'error',
      'Unexpected error while removing event staff.',
      jsonb_build_object(
        'debug_id', debug_id,
        'target_staff_user_id', target_staff_user_id,
        'sqlstate', sqlstate,
        'sqlerrm', sqlerrm
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'error',
      'message', 'Could not remove staff.',
      'debug_id', debug_id
    );
end;
$$;

revoke all on function public.remove_event_staff_assignment(uuid, uuid) from public;

grant execute on function public.remove_event_staff_assignment(uuid, uuid) to authenticated;

commit;