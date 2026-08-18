import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  HOOK_TIMEOUT_MS,
  integrationEnabled,
  SupabaseTestContext,
  TEST_TIMEOUT_MS,
} from "./helpers/supabase-test-context";

const suite = integrationEnabled ? describe : describe.skip;

suite("ticket claiming and capacity rules", () => {
  let ctx: SupabaseTestContext;
  beforeAll(() => { ctx = new SupabaseTestContext(); });
  afterAll(async () => { await ctx.cleanup(); }, HOOK_TIMEOUT_MS);

  it("returns the existing ticket on a duplicate claim", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const client = await ctx.createUser("client");
    const event = await ctx.createEvent(organizer);
    const paid = (await ctx.ticketTypes(event.eventId)).find((t) => t.capacity_pool === "paid");
    const first = await ctx.claim(client, event.eventId, paid?.id as string);
    const second = await ctx.claim(client, event.eventId, paid?.id as string);
    expect(second.result).toBe("already_has_ticket");
    expect(second.ticket_id).toBe(first.ticket_id);
  }, TEST_TIMEOUT_MS);

  it("prevents one user from claiming both capacity pools", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const client = await ctx.createUser("client");
    const event = await ctx.createEvent(organizer);
    const types = await ctx.ticketTypes(event.eventId);
    const paid = types.find((t) => t.capacity_pool === "paid");
    const guest = types.find((t) => t.capacity_pool === "guest_list");
    const first = await ctx.claim(client, event.eventId, paid?.id as string);
    const second = await ctx.claim(client, event.eventId, guest?.id as string);
    expect(second.result).toBe("already_has_ticket");
    expect(second.ticket_id).toBe(first.ticket_id);
  }, TEST_TIMEOUT_MS);

  it("rejects a ticket type from another event", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const client = await ctx.createUser("client");
    const first = await ctx.createEvent(organizer);
    const second = await ctx.createEvent(organizer);
    const foreign = (await ctx.ticketTypes(second.eventId))[0];
    expect((await ctx.claim(client, first.eventId, foreign.id)).result).toBe("ticket_type_not_found");
  }, TEST_TIMEOUT_MS);

  it("rejects inactive ticket types", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const client = await ctx.createUser("client");
    const event = await ctx.createEvent(organizer);
    const type = (await ctx.ticketTypes(event.eventId))[0];
    await ctx.admin.from("ticket_types").update({ is_active: false }).eq("id", type.id);
    expect((await ctx.claim(client, event.eventId, type.id)).result).toBe("ticket_type_not_found");
  }, TEST_TIMEOUT_MS);

  it("rejects claims for cancelled events", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const client = await ctx.createUser("client");
    const event = await ctx.createEvent(organizer);
    const type = (await ctx.ticketTypes(event.eventId))[0];
    await organizer.client.rpc("cancel_event_if_no_revenue", { target_event_id: event.eventId });
    expect((await ctx.claim(client, event.eventId, type.id)).result).toBe("event_not_available");
  }, TEST_TIMEOUT_MS);

  it("preserves ticket type financial and capacity snapshots", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const client = await ctx.createUser("client");
    const event = await ctx.createEvent(organizer, {
      ticketTypes: [{ title: "Snapshot VIP", price_cents: 2750, currency: "EUR", max_quantity: 1, capacity_pool: "paid" }],
      paidCapacity: 1,
      guestListCapacity: 0,
    });
    const type = (await ctx.ticketTypes(event.eventId))[0];
    await ctx.claim(client, event.eventId, type.id);
    const ticket = await ctx.ticket(event.eventId, client.id);
    expect(ticket).toMatchObject({
      ticket_type_title_snapshot: "Snapshot VIP",
      ticket_price_cents_snapshot: 2750,
      ticket_currency_snapshot: "EUR",
      ticket_capacity_pool_snapshot: "paid",
    });
  }, TEST_TIMEOUT_MS);

  it("creates non-empty unique ticket credentials", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const firstClient = await ctx.createUser("client");
    const secondClient = await ctx.createUser("client", true);
    const event = await ctx.createEvent(organizer);
    const type = (await ctx.ticketTypes(event.eventId))[0];
    await ctx.claim(firstClient, event.eventId, type.id);
    await ctx.claim(secondClient, event.eventId, type.id);
    const first = await ctx.ticket(event.eventId, firstClient.id);
    const second = await ctx.ticket(event.eventId, secondClient.id);
    expect(first?.ticket_code).toBeTruthy();
    expect(first?.qr_token).toBeTruthy();
    expect(second?.ticket_code).not.toBe(first?.ticket_code);
    expect(second?.qr_token).not.toBe(first?.qr_token);
  }, TEST_TIMEOUT_MS);

  it("allows exactly one concurrent claim for the last capacity unit", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const firstClient = await ctx.createUser("client");
    const secondClient = await ctx.createUser("client", true);
    const event = await ctx.createEvent(organizer, {
      paidCapacity: 1,
      guestListCapacity: 0,
      ticketTypes: [{ title: "Last", price_cents: 1000, max_quantity: 1, capacity_pool: "paid" }],
    });
    const type = (await ctx.ticketTypes(event.eventId))[0];
    const results = await Promise.all([
      ctx.claim(firstClient, event.eventId, type.id),
      ctx.claim(secondClient, event.eventId, type.id),
    ]);
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(results.filter((result) => result.result === "sold_out")).toHaveLength(1);
  }, TEST_TIMEOUT_MS);

  it("does not expose active ticket types for a cancelled event publicly", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const event = await ctx.createEvent(organizer);
    await organizer.client.rpc("cancel_event_if_no_revenue", { target_event_id: event.eventId });
    const { data, error } = await ctx.anonymousClient().rpc("get_public_ticket_types_for_event", { target_event_id: event.eventId });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  }, TEST_TIMEOUT_MS);

  it("marks a sold-out type in public availability", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const client = await ctx.createUser("client");
    const event = await ctx.createEvent(organizer, {
      paidCapacity: 1,
      guestListCapacity: 0,
      ticketTypes: [{ title: "Only", price_cents: 1000, max_quantity: 1, capacity_pool: "paid" }],
    });
    const type = (await ctx.ticketTypes(event.eventId))[0];
    await ctx.claim(client, event.eventId, type.id);
    const { data } = await ctx.anonymousClient().rpc("get_public_ticket_types_for_event", { target_event_id: event.eventId });
    expect(data).toHaveLength(1);
    expect(data?.[0].is_sold_out).toBe(true);
  }, TEST_TIMEOUT_MS);

  it("rejects an unknown ticket type id", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const client = await ctx.createUser("client");
    const event = await ctx.createEvent(organizer);
    expect((await ctx.claim(client, event.eventId, randomUUID())).result).toBe("ticket_type_not_found");
  }, TEST_TIMEOUT_MS);
});
