import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  HOOK_TIMEOUT_MS,
  integrationEnabled,
  type RpcResult,
  SupabaseTestContext,
  TEST_TIMEOUT_MS,
  type TestUser,
} from "./helpers/supabase-test-context";

const suite = integrationEnabled ? describe : describe.skip;

suite("remaining existing MVP rules", () => {
  let ctx: SupabaseTestContext;
  let organizer: TestUser;
  let outsider: TestUser;
  let client: TestUser;
  let staff: TestUser;

  beforeAll(async () => {
    ctx = new SupabaseTestContext();
    organizer = await ctx.createUser("event_organizer");
    outsider = await ctx.createUser("event_organizer", true);
    client = await ctx.createUser("client");
    staff = await ctx.createUser("event_staff");
  }, HOOK_TIMEOUT_MS);

  afterAll(async () => { await ctx.cleanup(); }, HOOK_TIMEOUT_MS);

  async function updateEvent(
    actor: TestUser,
    eventId: string,
    overrides: Record<string, unknown> = {}
  ) {
    const types = await ctx.ticketTypes(eventId);
    const startsAt = new Date(Date.now() + 9 * 86_400_000);
    const { data, error } = await actor.client.rpc(
      "update_upcoming_event_with_ticket_types",
      {
        target_event_id: eventId,
        new_title: "Updated Event",
        new_description: "Updated description",
        new_location: "Updated Venue",
        new_starts_at: startsAt.toISOString(),
        new_ends_at: new Date(startsAt.getTime() + 3_600_000).toISOString(),
        new_max_tickets: 3,
        new_max_guest_list: 2,
        ticket_types_json: types.map((type, index) => ({
          id: type.id,
          title: type.title,
          description: null,
          price_cents: type.price_cents,
          max_quantity: type.max_quantity,
          capacity_pool: type.capacity_pool,
          sort_order: index,
        })),
        ...overrides,
      }
    );
    expect(error).toBeNull();
    return data as RpcResult;
  }

  async function assignedTicketFixture() {
    const event = await ctx.createEvent(organizer);
    const type = (await ctx.ticketTypes(event.eventId))[0];
    await ctx.claim(client, event.eventId, type.id);
    const ticket = await ctx.ticket(event.eventId, client.id);
    await organizer.client.rpc("assign_event_staff_by_email", {
      target_event_id: event.eventId,
      target_staff_email: staff.email,
    });
    return { event, ticket, type };
  }

  it("allows an owner to edit an upcoming event", async () => {
    const event = await ctx.createEvent(organizer);
    expect((await updateEvent(organizer, event.eventId)).result).toBe("success");
    const { data } = await ctx.admin.from("events").select("title,location").eq("id", event.eventId).single();
    expect(data).toEqual({ title: "Updated Event", location: "Updated Venue" });
  }, TEST_TIMEOUT_MS);

  it("blocks another organizer from editing the event", async () => {
    const event = await ctx.createEvent(organizer);
    expect((await updateEvent(outsider, event.eventId)).result).toBe("unauthorized");
  }, TEST_TIMEOUT_MS);

  it("rejects lowering pool capacity below issued tickets", async () => {
    const event = await ctx.createEvent(organizer);
    const paid = (await ctx.ticketTypes(event.eventId))[0];
    await ctx.claim(client, event.eventId, paid.id);
    expect((await updateEvent(organizer, event.eventId, { new_max_tickets: 0 })).result).toBe("invalid_event");
  }, TEST_TIMEOUT_MS);

  it("keeps an unsuccessful edit atomic", async () => {
    const event = await ctx.createEvent(organizer, { title: "Atomic Original" });
    const result = await updateEvent(organizer, event.eventId, {
      new_title: "Must Not Persist",
      ticket_types_json: [{ title: "Bad", price_cents: -1, max_quantity: 1, capacity_pool: "paid" }],
    });
    const { data } = await ctx.admin.from("events").select("title").eq("id", event.eventId).single();
    expect(result.result).toBe("invalid_ticket_types");
    expect(data?.title).toBe("Atomic Original");
  }, TEST_TIMEOUT_MS);

  it("validates an assigned ticket by case-insensitive manual code", async () => {
    const fixture = await assignedTicketFixture();
    const { data } = await staff.client.rpc("validate_ticket_by_code", {
      target_event_id: fixture.event.eventId,
      target_ticket_code: fixture.ticket?.ticket_code.toLowerCase(),
    });
    expect((data as RpcResult).result).toBe("success");
    expect((await ctx.ticket(fixture.event.eventId, client.id))?.status).toBe("used");
  }, TEST_TIMEOUT_MS);

  it("returns already_used on repeated manual validation", async () => {
    const fixture = await assignedTicketFixture();
    await staff.client.rpc("validate_ticket_by_code", { target_event_id: fixture.event.eventId, target_ticket_code: fixture.ticket?.ticket_code });
    const { data } = await staff.client.rpc("validate_ticket_by_code", { target_event_id: fixture.event.eventId, target_ticket_code: fixture.ticket?.ticket_code });
    expect((data as RpcResult).result).toBe("already_used");
  }, TEST_TIMEOUT_MS);

  it("rejects an invalid manual ticket code", async () => {
    const fixture = await assignedTicketFixture();
    const { data } = await staff.client.rpc("validate_ticket_by_code", { target_event_id: fixture.event.eventId, target_ticket_code: `NO-${randomUUID()}` });
    expect((data as RpcResult).result).toBe("invalid_ticket");
  }, TEST_TIMEOUT_MS);

  it("prevents a client from reading another client's ticket", async () => {
    const otherClient = await ctx.createUser("client", true);
    const event = await ctx.createEvent(organizer);
    const type = (await ctx.ticketTypes(event.eventId))[0];
    await ctx.claim(client, event.eventId, type.id);
    const { data, error } = await otherClient.client.from("tickets").select("id").eq("event_id", event.eventId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  }, TEST_TIMEOUT_MS);

  it("prevents a client from changing their role directly", async () => {
    const { data: updatedRows, error } = await client.client
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", client.id)
      .select("id");
    expect(error).toBeNull();
    expect(updatedRows).toEqual([]);
    const { data } = await ctx.admin.from("profiles").select("role").eq("id", client.id).single();
    expect(data?.role).toBe("client");
  }, TEST_TIMEOUT_MS);

  it("prevents an organizer from reading another private draft event", async () => {
    const event = await ctx.createEvent(organizer);
    await ctx.admin.from("events").update({ status: "draft" }).eq("id", event.eventId);
    const { data, error } = await outsider.client.from("events").select("id").eq("id", event.eventId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  }, TEST_TIMEOUT_MS);

  it("records public page views only for public events", async () => {
    const publicEvent = await ctx.createEvent(organizer);
    const draftEvent = await ctx.createEvent(organizer);
    await ctx.admin.from("events").update({ status: "draft" }).eq("id", draftEvent.eventId);
    const anonymous = ctx.anonymousClient();
    await anonymous.rpc("record_event_page_view", { target_event_id: publicEvent.eventId });
    await anonymous.rpc("record_event_page_view", { target_event_id: draftEvent.eventId });
    const { data } = await ctx.admin.from("event_page_view_stats").select("event_id,raw_views").in("event_id", [publicEvent.eventId, draftEvent.eventId]);
    expect(data?.find((row) => row.event_id === publicEvent.eventId)?.raw_views).toBe(1);
    expect(data?.some((row) => row.event_id === draftEvent.eventId)).toBe(false);
  }, TEST_TIMEOUT_MS);

  it("reports organizer ticket, revenue, capacity, and page-view statistics", async () => {
    const fixture = await assignedTicketFixture();
    await ctx.anonymousClient().rpc("record_event_page_view", { target_event_id: fixture.event.eventId });
    const { data, error } = await organizer.client.rpc("get_my_organizer_event_stats");
    expect(error).toBeNull();
    const row = data?.find((item) => item.event_id === fixture.event.eventId);
    expect(row).toMatchObject({
      tickets_sold: 1,
      paid_tickets_sold: 1,
      gross_revenue_cents: 1000,
      paid_remaining_capacity: 2,
      page_views: 1,
    });
  }, TEST_TIMEOUT_MS);

  it("does not return another organizer's statistics", async () => {
    const event = await ctx.createEvent(organizer);
    const { data, error } = await outsider.client.rpc("get_my_organizer_event_stats");
    expect(error).toBeNull();
    expect(data?.some((row) => row.event_id === event.eventId)).toBe(false);
  }, TEST_TIMEOUT_MS);

  it("creates audit logs for sensitive successful actions", async () => {
    const fixture = await assignedTicketFixture();
    await staff.client.rpc("validate_ticket_by_code", {
      target_event_id: fixture.event.eventId,
      target_ticket_code: fixture.ticket?.ticket_code,
    });
    const { data, error } = await ctx.admin
      .from("app_action_logs")
      .select("action,result")
      .eq("actor_user_id", staff.id)
      .eq("action", "ticket_validate_manual")
      .eq("result", "success");
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT_MS);
});
