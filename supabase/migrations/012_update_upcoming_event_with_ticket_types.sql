begin;

create or replace function public.update_upcoming_event_with_ticket_types(
  target_event_id uuid,
  new_title text,
  new_description text,
  new_location text,
  new_starts_at timestamptz,
  new_ends_at timestamptz,
  new_max_tickets integer,
  new_max_guest_list integer,
  ticket_types_json jsonb
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
  v_item jsonb;
  v_ticket_type_id uuid;
  v_ticket_type_id_text text;
  v_ticket_type_title text;
  v_ticket_type_description text;
  v_price_cents integer;
  v_max_quantity integer;
  v_total_ticket_type_capacity integer := 0;
  v_sort_order integer := 0;
  v_active_ticket_type_ids uuid[] := array[]::uuid[];
  v_saved_ticket_type_id uuid;
  v_debug_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'Please log in to update this event.'
    );
  end if;

  select role
  into v_user_role
  from public.profiles
  where id = v_user_id;

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

  if not (v_user_role = 'admin' or v_event.organizer_id = v_user_id) then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'You are not allowed to update this event.'
    );
  end if;

  if v_event.starts_at <= now() then
    return jsonb_build_object(
      'success', false,
      'result', 'event_not_editable',
      'message', 'Only upcoming events can be edited.'
    );
  end if;

  if length(trim(coalesce(new_title, ''))) = 0 then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_event',
      'message', 'Event title is required.'
    );
  end if;

  if length(trim(coalesce(new_location, ''))) = 0 then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_event',
      'message', 'Event location is required.'
    );
  end if;

  if new_starts_at <= now() then
    return jsonb_build_object(
      'success', false,
      'result', 'event_not_editable',
      'message', 'Event start date must be in the future.'
    );
  end if;

  if new_ends_at is not null and new_ends_at <= new_starts_at then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_event',
      'message', 'End date must be after start date.'
    );
  end if;

  if new_max_tickets < 1 then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_event',
      'message', 'Maximum tickets must be at least 1.'
    );
  end if;

  if new_max_guest_list < 0 then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_event',
      'message', 'Guest-list limit cannot be negative.'
    );
  end if;

  if ticket_types_json is null
    or jsonb_typeof(ticket_types_json) <> 'array'
    or jsonb_array_length(ticket_types_json) = 0
  then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_ticket_types',
      'message', 'At least one ticket type is required.'
    );
  end if;

  for v_item in select * from jsonb_array_elements(ticket_types_json)
  loop
    v_ticket_type_title := trim(coalesce(v_item->>'title', ''));
    v_price_cents := coalesce((v_item->>'price_cents')::integer, -1);
    v_max_quantity := nullif(v_item->>'max_quantity', '')::integer;

    if v_ticket_type_title = '' then
      return jsonb_build_object(
        'success', false,
        'result', 'invalid_ticket_types',
        'message', 'Every ticket type needs a title.'
      );
    end if;

    if v_price_cents < 0 then
      return jsonb_build_object(
        'success', false,
        'result', 'invalid_ticket_types',
        'message', 'Ticket type prices cannot be negative.'
      );
    end if;

    if v_max_quantity is not null and v_max_quantity < 1 then
      return jsonb_build_object(
        'success', false,
        'result', 'invalid_ticket_types',
        'message', 'Ticket type max quantity must be at least 1.'
      );
    end if;

    if v_max_quantity is not null then
      v_total_ticket_type_capacity := v_total_ticket_type_capacity + v_max_quantity;
    end if;
  end loop;

  if v_total_ticket_type_capacity > new_max_tickets then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_ticket_types',
      'message', 'The sum of ticket type quantities cannot be greater than the event maximum tickets.'
    );
  end if;

  update public.events
  set
    title = trim(new_title),
    description = nullif(trim(coalesce(new_description, '')), ''),
    location = trim(new_location),
    starts_at = new_starts_at,
    ends_at = new_ends_at,
    max_tickets = new_max_tickets,
    max_guest_list = new_max_guest_list
  where id = target_event_id;

  for v_item in select * from jsonb_array_elements(ticket_types_json)
  loop
    v_ticket_type_id_text := nullif(trim(coalesce(v_item->>'id', '')), '');
    v_ticket_type_id := v_ticket_type_id_text::uuid;
    v_ticket_type_title := trim(coalesce(v_item->>'title', ''));
    v_ticket_type_description := nullif(trim(coalesce(v_item->>'description', '')), '');
    v_price_cents := (v_item->>'price_cents')::integer;
    v_max_quantity := nullif(v_item->>'max_quantity', '')::integer;

    if v_ticket_type_id is null then
      insert into public.ticket_types (
        event_id,
        title,
        description,
        price_cents,
        currency,
        max_quantity,
        is_active,
        sort_order
      )
      values (
        target_event_id,
        v_ticket_type_title,
        v_ticket_type_description,
        v_price_cents,
        'EUR',
        v_max_quantity,
        true,
        v_sort_order
      )
      returning id into v_saved_ticket_type_id;
    else
      update public.ticket_types
      set
        title = v_ticket_type_title,
        description = v_ticket_type_description,
        price_cents = v_price_cents,
        currency = 'EUR',
        max_quantity = v_max_quantity,
        is_active = true,
        sort_order = v_sort_order
      where id = v_ticket_type_id
        and event_id = target_event_id
      returning id into v_saved_ticket_type_id;

      if v_saved_ticket_type_id is null then
        return jsonb_build_object(
          'success', false,
          'result', 'invalid_ticket_types',
          'message', 'Invalid ticket type for this event.'
        );
      end if;
    end if;

    v_active_ticket_type_ids := array_append(v_active_ticket_type_ids, v_saved_ticket_type_id);
    v_sort_order := v_sort_order + 1;
  end loop;

  update public.ticket_types
  set is_active = false
  where event_id = target_event_id
    and not (id = any(v_active_ticket_type_ids));

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
    'event_update',
    'event',
    target_event_id,
    'success',
    'Upcoming event updated successfully.',
    jsonb_build_object(
      'ticket_type_count', jsonb_array_length(ticket_types_json),
      'starts_at', new_starts_at,
      'max_tickets', new_max_tickets
    )
  );

  return jsonb_build_object(
    'success', true,
    'result', 'success',
    'message', 'Event updated successfully.'
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
      'event_update',
      'event',
      target_event_id,
      'error',
      'Unexpected database error while updating event.',
      jsonb_build_object(
        'debug_id', v_debug_id,
        'sqlstate', sqlstate,
        'sqlerrm', sqlerrm
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'error',
      'message', 'We could not update this event. Please try again.',
      'debug_id', v_debug_id
    );
end;
$$;

revoke all on function public.update_upcoming_event_with_ticket_types(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  jsonb
) from public;

grant execute on function public.update_upcoming_event_with_ticket_types(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  jsonb
) to authenticated;

commit;