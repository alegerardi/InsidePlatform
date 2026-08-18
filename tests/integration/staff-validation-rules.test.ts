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

suite("staff assignment and ticket validation", () => {
  let ctx: SupabaseTestContext;
  beforeAll(() => { ctx = new SupabaseTestContext(); });
  afterAll(async () => { await ctx.cleanup(); }, HOOK_TIMEOUT_MS);

  async function assignedFixture() {
    const organizer = await ctx.createUser("event_organizer");
    const staff = await ctx.createUser("event_staff");
    const client = await ctx.createUser("client");
    const event = await ctx.createEvent(organizer);
    const type = (await ctx.ticketTypes(event.eventId))[0];
    await ctx.claim(client, event.eventId, type.id);
    const ticket = await ctx.ticket(event.eventId, client.id);
    const { data } = await organizer.client.rpc("assign_event_staff_by_email", {
      target_event_id: event.eventId,
      target_staff_email: staff.email,
    });
    expect((data as RpcResult).success).toBe(true);
    return { organizer, staff, client, event, ticket };
  }

  it("assigns staff and treats a duplicate assignment idempotently", async () => {
    const fixture = await assignedFixture();
    const { data } = await fixture.organizer.client.rpc("assign_event_staff_by_email", {
      target_event_id: fixture.event.eventId,
      target_staff_email: fixture.staff.email,
    });
    expect((data as RpcResult).result).toBe("already_assigned");
  }, TEST_TIMEOUT_MS);

  it("rejects assignment of a client profile", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const client = await ctx.createUser("client");
    const event = await ctx.createEvent(organizer);
    const { data } = await organizer.client.rpc("assign_event_staff_by_email", {
      target_event_id: event.eventId,
      target_staff_email: client.email,
    });
    expect((data as RpcResult).result).toBe("staff_not_found");
  }, TEST_TIMEOUT_MS);

  it("blocks another organizer from assigning staff", async () => {
    const owner = await ctx.createUser("event_organizer");
    const outsider = await ctx.createUser("event_organizer", true);
    const staff = await ctx.createUser("event_staff");
    const event = await ctx.createEvent(owner);
    const { data } = await outsider.client.rpc("assign_event_staff_by_email", {
      target_event_id: event.eventId,
      target_staff_email: staff.email,
    });
    expect((data as RpcResult).result).toBe("unauthorized");
  }, TEST_TIMEOUT_MS);

  it("allows assigned staff to validate a QR ticket", async () => {
    const fixture = await assignedFixture();
    const { data } = await fixture.staff.client.rpc("validate_ticket_qr_for_event", {
      target_event_id: fixture.event.eventId,
      target_qr_token: fixture.ticket?.qr_token,
    });
    expect((data as RpcResult).result).toBe("success");
    const updated = await ctx.ticket(fixture.event.eventId, fixture.client.id);
    expect(updated?.status).toBe("used");
    expect(updated?.used_by).toBe(fixture.staff.id);
    expect(updated?.used_at).toBeTruthy();
  }, TEST_TIMEOUT_MS);

  it("returns already_used on a second QR scan", async () => {
    const fixture = await assignedFixture();
    await fixture.staff.client.rpc("validate_ticket_qr_for_event", {
      target_event_id: fixture.event.eventId,
      target_qr_token: fixture.ticket?.qr_token,
    });
    const { data } = await fixture.staff.client.rpc("validate_ticket_qr_for_event", {
      target_event_id: fixture.event.eventId,
      target_qr_token: fixture.ticket?.qr_token,
    });
    expect((data as RpcResult).result).toBe("already_used");
  }, TEST_TIMEOUT_MS);

  it("returns invalid for an unknown QR token", async () => {
    const fixture = await assignedFixture();
    const { data } = await fixture.staff.client.rpc("validate_ticket_qr_for_event", {
      target_event_id: fixture.event.eventId,
      target_qr_token: randomUUID(),
    });
    expect((data as RpcResult).result).toBe("invalid");
  }, TEST_TIMEOUT_MS);

  it("returns wrong_event without consuming the ticket", async () => {
    const organizer = await ctx.createUser("event_organizer");
    const staff = await ctx.createUser("event_staff");
    const client = await ctx.createUser("client");
    const source = await ctx.createEvent(organizer);
    const target = await ctx.createEvent(organizer);
    const type = (await ctx.ticketTypes(source.eventId))[0];
    await ctx.claim(client, source.eventId, type.id);
    const ticket = await ctx.ticket(source.eventId, client.id);
    await organizer.client.rpc("assign_event_staff_by_email", { target_event_id: target.eventId, target_staff_email: staff.email });
    const { data } = await staff.client.rpc("validate_ticket_qr_for_event", { target_event_id: target.eventId, target_qr_token: ticket?.qr_token });
    expect((data as RpcResult).result).toBe("wrong_event");
    expect((await ctx.ticket(source.eventId, client.id))?.status).toBe("active");
  }, TEST_TIMEOUT_MS);

  it("removes staff idempotently and revokes validation access", async () => {
    const fixture = await assignedFixture();
    const first = await fixture.organizer.client.rpc("remove_event_staff_assignment", {
      target_event_id: fixture.event.eventId,
      target_staff_user_id: fixture.staff.id,
    });
    expect((first.data as RpcResult).result).toBe("removed");
    const second = await fixture.organizer.client.rpc("remove_event_staff_assignment", {
      target_event_id: fixture.event.eventId,
      target_staff_user_id: fixture.staff.id,
    });
    expect((second.data as RpcResult).result).toBe("already_removed");
    const validation = await fixture.staff.client.rpc("validate_ticket_qr_for_event", {
      target_event_id: fixture.event.eventId,
      target_qr_token: fixture.ticket?.qr_token,
    });
    expect((validation.data as RpcResult).result).toBe("unauthorized");
  }, TEST_TIMEOUT_MS);

  it("creates a check-in record for successful validation", async () => {
    const fixture = await assignedFixture();
    await fixture.staff.client.rpc("validate_ticket_qr_for_event", {
      target_event_id: fixture.event.eventId,
      target_qr_token: fixture.ticket?.qr_token,
    });
    const { data, error } = await ctx.admin.from("check_ins").select("result,checked_by").eq("ticket_id", fixture.ticket?.id);
    expect(error).toBeNull();
    expect(data).toContainEqual({ result: "success", checked_by: fixture.staff.id });
  }, TEST_TIMEOUT_MS);
});
