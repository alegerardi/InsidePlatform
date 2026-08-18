import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  HOOK_TIMEOUT_MS,
  integrationEnabled,
  type RpcResult,
  SupabaseTestContext,
  TEST_TIMEOUT_MS,
} from "./helpers/supabase-test-context";

const suite = integrationEnabled ? describe : describe.skip;

suite("event creation and cancellation rules", () => {
  let ctx: SupabaseTestContext;
  beforeAll(() => { ctx = new SupabaseTestContext(); });
  afterAll(async () => { await ctx.cleanup(); }, HOOK_TIMEOUT_MS);

  async function invalidCreate(overrides: Record<string, unknown>) {
    const organizer = await ctx.createUser("event_organizer");
    const future = new Date(Date.now() + 7 * 86_400_000);
    const { data, error } = await organizer.client.rpc(
      "create_event_with_ticket_types",
      {
        new_title: "Invalid event",
        new_description: null,
        new_location: "Test",
        new_starts_at: future.toISOString(),
        new_ends_at: new Date(future.getTime() + 3_600_000).toISOString(),
        new_max_tickets: 2,
        new_max_guest_list: 0,
        new_slug_base: `invalid-${randomUUID()}`,
        ticket_types_json: [{
          title: "General",
          price_cents: 1000,
          currency: "EUR",
          max_quantity: 2,
          capacity_pool: "paid",
          sort_order: 1,
        }],
        ...overrides,
      }
    );
    expect(error).toBeNull();
    return data as RpcResult;
  }

  it("allows an admin to create events", async () => {
    const admin = await ctx.createUser("admin");
    const event = await ctx.createEvent(admin);
    expect(event.eventId).toBeTruthy();
  }, TEST_TIMEOUT_MS);

  it("blocks event staff from creating events", async () => {
    const staff = await ctx.createUser("event_staff");
    const future = new Date(Date.now() + 86_400_000);
    const { data } = await staff.client.rpc("create_event_with_ticket_types", {
      new_title: "No",
      new_description: null,
      new_location: null,
      new_starts_at: future.toISOString(),
      new_ends_at: null,
      new_max_tickets: 1,
      new_max_guest_list: 0,
      new_slug_base: `blocked-${randomUUID()}`,
      ticket_types_json: [{ title: "General", price_cents: 0, max_quantity: 1, capacity_pool: "paid" }],
    });
    expect((data as RpcResult).result).toBe("unauthorized");
  }, TEST_TIMEOUT_MS);

  it("rejects a blank title", async () => {
    expect((await invalidCreate({ new_title: "   " })).result).toBe("invalid_event");
  }, TEST_TIMEOUT_MS);

  it("rejects a past start time", async () => {
    expect((await invalidCreate({ new_starts_at: new Date(Date.now() - 60_000).toISOString() })).result).toBe("invalid_event");
  }, TEST_TIMEOUT_MS);

  it("rejects an end time before the start", async () => {
    const start = new Date(Date.now() + 86_400_000);
    expect((await invalidCreate({ new_starts_at: start.toISOString(), new_ends_at: new Date(start.getTime() - 1).toISOString() })).result).toBe("invalid_event");
  }, TEST_TIMEOUT_MS);

  it("rejects paid ticket type capacity above the event pool", async () => {
    expect((await invalidCreate({ new_max_tickets: 1 })).result).toBe("invalid_capacity");
  }, TEST_TIMEOUT_MS);

  it("rejects a negative ticket price without creating an event", async () => {
    const invalidEventTitle = `Negative price ${randomUUID()}`;
    const result = await invalidCreate({
      new_title: invalidEventTitle,
      ticket_types_json: [
        {
          title: "Bad",
          price_cents: -1,
          max_quantity: 1,
          capacity_pool: "paid",
        },
      ],
    });
    const { count, error } = await ctx.admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("title", invalidEventTitle);

    expect(result.result).toBe("invalid_ticket_types");
    expect(error).toBeNull();
    expect(count).toBe(0);
  }, TEST_TIMEOUT_MS);

  it("allows cancellation with only free guest-list tickets and cancels them", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const client = await ctx.createUser("client");
    const event = await ctx.createEvent(organizer);
    const guest = (await ctx.ticketTypes(event.eventId)).find((t) => t.capacity_pool === "guest_list");
    await ctx.claim(client, event.eventId, guest?.id as string);
    const { data } = await organizer.client.rpc("cancel_event_if_no_revenue", { target_event_id: event.eventId });
    expect((data as RpcResult).result).toBe("cancelled");
    expect((await ctx.ticket(event.eventId, client.id))?.status).toBe("cancelled");
  }, TEST_TIMEOUT_MS);

  it("blocks another organizer from cancelling an event", async () => {
    const owner = await ctx.createUser("event_organizer");
    const outsider = await ctx.createUser("event_organizer", true);
    const event = await ctx.createEvent(owner);
    const { data } = await outsider.client.rpc("cancel_event_if_no_revenue", { target_event_id: event.eventId });
    expect((data as RpcResult).result).toBe("unauthorized");
  }, TEST_TIMEOUT_MS);

  it("treats repeated cancellation as idempotent", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const event = await ctx.createEvent(organizer);
    await organizer.client.rpc("cancel_event_if_no_revenue", { target_event_id: event.eventId });
    const { data } = await organizer.client.rpc("cancel_event_if_no_revenue", { target_event_id: event.eventId });
    expect((data as RpcResult).result).toBe("already_cancelled");
  }, TEST_TIMEOUT_MS);
});
