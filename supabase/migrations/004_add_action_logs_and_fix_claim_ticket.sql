begin;

create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_action_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  result text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists app_action_logs_created_at_idx
on public.app_action_logs(created_at desc);

create index if not exists app_action_logs_actor_user_id_idx
on public.app_action_logs(actor_user_id);

create index if not exists app_action_logs_action_idx
on public.app_action_logs(action);

alter table public.app_action_logs enable row level security;

drop policy if exists "Admins can read app action logs" on public.app_action_logs;

create policy "Admins can read app action logs"
on public.app_action_logs
for select
to authenticated
using (public.is_admin());

create or replace function public.claim_ticket(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
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
  v_debug_id uuid;
begin
  if v_user_id is null then
    insert into public.app_action_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      result,
      message
    )
    values (
      null,
      'ticket_claim',
      'event',
      target_event_id,
      'unauthorized',
      'Anonymous user tried to claim ticket.'
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
      message
    )
    values (
      v_user_id,
      'ticket_claim',
      'event',
      target_event_id,
      'event_not_found',
      'Event not found.'
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
      jsonb_build_object('event_status', v_event.status)
    );

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
      jsonb_build_object('event_id', target_event_id)
    );

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
        'ticket_count', v_ticket_count,
        'max_tickets', v_event.max_tickets
      )
    );

    return jsonb_build_object(
      'success', false,
      'result', 'sold_out',
      'message', 'This event is sold out.'
    );
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
            jsonb_build_object('debug_id', v_debug_id)
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
    jsonb_build_object('event_id', target_event_id)
  );

  return jsonb_build_object(
    'success', true,
    'result', 'success',
    'message', 'Ticket created successfully.',
    'ticket_id', v_ticket_id
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
        'sqlerrm', sqlerrm
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

revoke all on function public.claim_ticket(uuid) from public;
grant execute on function public.claim_ticket(uuid) to authenticated;

commit;