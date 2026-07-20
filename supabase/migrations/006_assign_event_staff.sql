begin;

create or replace function public.assign_event_staff_by_email(
  target_event_id uuid,
  target_staff_email text
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
  v_staff_profile public.profiles%rowtype;
  v_email text := lower(trim(target_staff_email));
  v_existing_assignment_id uuid;
  v_debug_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'Please log in to add event staff.'
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

  if not (v_user_role = 'admin' or v_event.organizer_id = v_user_id) then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'You are not allowed to add staff for this event.'
    );
  end if;

  if v_email = '' then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_email',
      'message', 'Insert a valid staff email.'
    );
  end if;

  select *
  into v_staff_profile
  from public.profiles
  where lower(email) = v_email
    and role = 'event_staff'
  limit 1;

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
      'event_staff_assign',
      'event',
      target_event_id,
      'staff_not_found',
      'No event_staff profile found with this email.',
      jsonb_build_object('staff_email', v_email)
    );

    return jsonb_build_object(
      'success', false,
      'result', 'staff_not_found',
      'message', 'No event staff profile found with this email.'
    );
  end if;

  select id
  into v_existing_assignment_id
  from public.event_staff_assignments
  where event_id = target_event_id
    and staff_user_id = v_staff_profile.id
  limit 1;

  if found then
    return jsonb_build_object(
      'success', true,
      'result', 'already_assigned',
      'message', 'This staff member is already assigned to this event.',
      'staff_email', v_staff_profile.email
    );
  end if;

  insert into public.event_staff_assignments (
    event_id,
    staff_user_id,
    assigned_by
  )
  values (
    target_event_id,
    v_staff_profile.id,
    v_user_id
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
    'event_staff_assign',
    'event',
    target_event_id,
    'success',
    'Event staff assigned successfully.',
    jsonb_build_object(
      'staff_user_id', v_staff_profile.id,
      'staff_email', v_staff_profile.email
    )
  );

  return jsonb_build_object(
    'success', true,
    'result', 'success',
    'message', 'Staff added successfully.',
    'staff_email', v_staff_profile.email
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
      'event_staff_assign',
      'event',
      target_event_id,
      'error',
      'Unexpected database error while assigning event staff.',
      jsonb_build_object(
        'debug_id', v_debug_id,
        'sqlstate', sqlstate,
        'sqlerrm', sqlerrm,
        'staff_email', v_email
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'error',
      'message', 'We could not add this staff member. Please try again.',
      'debug_id', v_debug_id
    );
end;
$$;

create or replace function public.get_my_event_staff_assignments()
returns table (
  event_id uuid,
  staff_user_id uuid,
  staff_email text
)
language sql
security definer
set search_path = public
as $$
  select
    esa.event_id,
    esa.staff_user_id,
    p.email as staff_email
  from public.event_staff_assignments esa
  join public.events e
    on e.id = esa.event_id
  join public.profiles p
    on p.id = esa.staff_user_id
  where
    e.organizer_id = auth.uid()
    or public.is_admin()
  order by p.email asc;
$$;

revoke all on function public.assign_event_staff_by_email(uuid, text) from public;
grant execute on function public.assign_event_staff_by_email(uuid, text) to authenticated;

revoke all on function public.get_my_event_staff_assignments() from public;
grant execute on function public.get_my_event_staff_assignments() to authenticated;

commit;