begin;

create or replace function public.create_event_with_ticket_types(
  new_title text,
  new_description text,
  new_location text,
  new_starts_at timestamptz,
  new_ends_at timestamptz,
  new_max_tickets integer,
  new_max_guest_list integer,
  new_slug_base text,
  ticket_types_json jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_role public.user_role;

  normalized_title text := trim(coalesce(new_title, ''));
  normalized_description text := nullif(trim(coalesce(new_description, '')), '');
  normalized_location text := nullif(trim(coalesce(new_location, '')), '');
  normalized_max_tickets integer := coalesce(new_max_tickets, 0);
  normalized_max_guest_list integer := coalesce(new_max_guest_list, 0);

  slug_base text;
  generated_slug text;
  slug_suffix text;

  created_event_id uuid;
  ticket_type_count integer := 0;

  ticket_type_record jsonb;
  ticket_type_title text;
  ticket_type_description text;
  ticket_type_price_cents integer;
  ticket_type_currency text;
  ticket_type_max_quantity integer;
  ticket_type_capacity_pool text;
  ticket_type_sort_order integer;

  paid_ticket_type_capacity integer := 0;
  guest_list_ticket_type_capacity integer := 0;
  has_guest_list_type boolean := false;

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

  if current_user_role not in ('event_organizer'::public.user_role, 'admin'::public.user_role) then
    return jsonb_build_object(
      'success', false,
      'result', 'unauthorized',
      'message', 'Only organizers can create events.'
    );
  end if;

  if normalized_title = '' then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_event',
      'message', 'Event title is required.'
    );
  end if;

  if new_starts_at is null then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_event',
      'message', 'Event start date is required.'
    );
  end if;

  if new_starts_at <= now() then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_event',
      'message', 'Event start date must be in the future.'
    );
  end if;

  if new_ends_at is not null and new_ends_at <= new_starts_at then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_event',
      'message', 'Event end date must be after the start date.'
    );
  end if;

  if normalized_max_tickets < 1 then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_capacity',
      'message', 'Paid ticket capacity must be at least 1.'
    );
  end if;

  if normalized_max_guest_list < 0 then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_capacity',
      'message', 'Guest-list capacity cannot be negative.'
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

  for ticket_type_record in
    select value
    from jsonb_array_elements(ticket_types_json)
  loop
    ticket_type_count := ticket_type_count + 1;

    ticket_type_title := trim(coalesce(ticket_type_record->>'title', ''));
    ticket_type_description := nullif(trim(coalesce(ticket_type_record->>'description', '')), '');
    ticket_type_price_cents := coalesce((ticket_type_record->>'price_cents')::integer, 0);
    ticket_type_currency := upper(trim(coalesce(ticket_type_record->>'currency', 'EUR')));
    ticket_type_max_quantity := nullif(ticket_type_record->>'max_quantity', '')::integer;
    ticket_type_capacity_pool := lower(trim(coalesce(ticket_type_record->>'capacity_pool', 'paid')));
    ticket_type_sort_order := coalesce((ticket_type_record->>'sort_order')::integer, ticket_type_count);

    if ticket_type_title = '' then
      return jsonb_build_object(
        'success', false,
        'result', 'invalid_ticket_types',
        'message', 'Ticket type title is required.'
      );
    end if;

    if ticket_type_price_cents < 0 then
      return jsonb_build_object(
        'success', false,
        'result', 'invalid_ticket_types',
        'message', 'Ticket price cannot be negative.'
      );
    end if;

    if ticket_type_currency = '' then
      ticket_type_currency := 'EUR';
    end if;

    if ticket_type_max_quantity is not null and ticket_type_max_quantity < 1 then
      return jsonb_build_object(
        'success', false,
        'result', 'invalid_ticket_types',
        'message', 'Ticket type quantity must be at least 1.'
      );
    end if;

    if ticket_type_capacity_pool not in ('paid', 'guest_list') then
      return jsonb_build_object(
        'success', false,
        'result', 'invalid_ticket_types',
        'message', 'Invalid ticket capacity pool.'
      );
    end if;

    if ticket_type_capacity_pool = 'guest_list' then
      has_guest_list_type := true;
      guest_list_ticket_type_capacity :=
        guest_list_ticket_type_capacity + coalesce(ticket_type_max_quantity, 0);
    else
      paid_ticket_type_capacity :=
        paid_ticket_type_capacity + coalesce(ticket_type_max_quantity, 0);
    end if;
  end loop;

  if ticket_type_count = 0 then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_ticket_types',
      'message', 'At least one ticket type is required.'
    );
  end if;

  if has_guest_list_type and normalized_max_guest_list < 1 then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_capacity',
      'message', 'Guest-list capacity must be at least 1 when guest-list tickets exist.'
    );
  end if;

  if paid_ticket_type_capacity > normalized_max_tickets then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_capacity',
      'message', 'The sum of paid ticket type quantities cannot exceed paid capacity.'
    );
  end if;

  if guest_list_ticket_type_capacity > normalized_max_guest_list then
    return jsonb_build_object(
      'success', false,
      'result', 'invalid_capacity',
      'message', 'The sum of guest-list ticket type quantities cannot exceed guest-list capacity.'
    );
  end if;

  slug_base := lower(
    trim(
      both '-' from regexp_replace(
        coalesce(nullif(trim(new_slug_base), ''), normalized_title),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      )
    )
  );

  if slug_base = '' then
    slug_base := 'event';
  end if;

  generated_slug := slug_base;

  while exists (
    select 1
    from public.events e
    where e.slug = generated_slug
  ) loop
    slug_suffix := replace(left(extensions.gen_random_uuid()::text, 8), '-', '');
    generated_slug := slug_base || '-' || slug_suffix;
  end loop;

  insert into public.events (
    organizer_id,
    title,
    slug,
    description,
    location,
    starts_at,
    ends_at,
    max_tickets,
    max_guest_list,
    status
  )
  values (
    current_user_id,
    normalized_title,
    generated_slug,
    normalized_description,
    normalized_location,
    new_starts_at,
    new_ends_at,
    normalized_max_tickets,
    normalized_max_guest_list,
    'published'::public.event_status
  )
  returning id into created_event_id;

  ticket_type_count := 0;

  for ticket_type_record in
    select value
    from jsonb_array_elements(ticket_types_json)
  loop
    ticket_type_count := ticket_type_count + 1;

    ticket_type_title := trim(coalesce(ticket_type_record->>'title', ''));
    ticket_type_description := nullif(trim(coalesce(ticket_type_record->>'description', '')), '');
    ticket_type_price_cents := coalesce((ticket_type_record->>'price_cents')::integer, 0);
    ticket_type_currency := upper(trim(coalesce(ticket_type_record->>'currency', 'EUR')));
    ticket_type_max_quantity := nullif(ticket_type_record->>'max_quantity', '')::integer;
    ticket_type_capacity_pool := lower(trim(coalesce(ticket_type_record->>'capacity_pool', 'paid')));
    ticket_type_sort_order := coalesce((ticket_type_record->>'sort_order')::integer, ticket_type_count);

    insert into public.ticket_types (
      event_id,
      title,
      description,
      price_cents,
      currency,
      max_quantity,
      capacity_pool,
      sort_order,
      is_active
    )
    values (
      created_event_id,
      ticket_type_title,
      ticket_type_description,
      ticket_type_price_cents,
      coalesce(nullif(ticket_type_currency, ''), 'EUR'),
      ticket_type_max_quantity,
      ticket_type_capacity_pool::public.ticket_capacity_pool,
      ticket_type_sort_order,
      true
    );
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
    current_user_id,
    'event_create',
    'event',
    created_event_id,
    'success',
    'Event created with ticket types atomically.',
    jsonb_build_object(
      'slug', generated_slug,
      'ticket_type_count', ticket_type_count,
      'max_tickets', normalized_max_tickets,
      'max_guest_list', normalized_max_guest_list
    )
  );

  return jsonb_build_object(
    'success', true,
    'result', 'created',
    'message', 'Event created.',
    'event_id', created_event_id,
    'slug', generated_slug
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
      'event_create',
      'event',
      created_event_id,
      'error',
      'Unexpected error while creating event with ticket types.',
      jsonb_build_object(
        'debug_id', debug_id,
        'sqlstate', sqlstate,
        'sqlerrm', sqlerrm
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'error',
      'message', 'Could not create event.',
      'debug_id', debug_id
    );
end;
$$;

revoke all on function public.create_event_with_ticket_types(
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  text,
  jsonb
) from public;

grant execute on function public.create_event_with_ticket_types(
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  text,
  jsonb
) to authenticated;

commit;