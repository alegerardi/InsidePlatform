begin;

create or replace function public.claim_ticket(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.events%rowtype;
  v_existing_ticket public.tickets%rowtype;
  v_ticket_count integer;
  v_ticket_id uuid;
  v_ticket_code text;
  v_qr_token text;
  v_attempt integer := 0;
begin
  if v_user_id is null then
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
    return jsonb_build_object(
      'success', false,
      'result', 'event_not_found',
      'message', 'Event not found.'
    );
  end if;

  if v_event.status not in ('published', 'active') then
    return jsonb_build_object(
      'success', false,
      'result', 'event_not_available',
      'message', 'Tickets are not available for this event.'
    );
  end if;

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

  select count(*)
  into v_ticket_count
  from public.tickets
  where event_id = target_event_id
    and status in ('active', 'used');

  if v_ticket_count >= v_event.max_tickets then
    return jsonb_build_object(
      'success', false,
      'result', 'sold_out',
      'message', 'This event is sold out.'
    );
  end if;

  loop
    v_attempt := v_attempt + 1;

    v_ticket_code := upper(
      substr(encode(gen_random_bytes(2), 'hex'), 1, 3)
      || '-'
      || substr(encode(gen_random_bytes(3), 'hex'), 1, 6)
    );

    v_qr_token := encode(gen_random_bytes(32), 'hex');

    begin
      insert into public.tickets (
        event_id,
        user_id,
        ticket_code,
        qr_token,
        status
      )
      values (
        target_event_id,
        v_user_id,
        v_ticket_code,
        v_qr_token,
        'active'
      )
      returning id into v_ticket_id;

      exit;
    exception
      when unique_violation then
        if v_attempt >= 5 then
          return jsonb_build_object(
            'success', false,
            'result', 'error',
            'message', 'Could not generate a unique ticket. Please try again.'
          );
        end if;
    end;
  end loop;

  return jsonb_build_object(
    'success', true,
    'result', 'success',
    'message', 'Ticket created successfully.',
    'ticket_id', v_ticket_id
  );
end;
$$;

revoke all on function public.claim_ticket(uuid) from public;
grant execute on function public.claim_ticket(uuid) to authenticated;

commit;