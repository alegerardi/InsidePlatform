import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

dotenv.config({ path: ".env.test.local" });

type UserRole = "client" | "event_organizer" | "event_staff" | "admin";
type CapacityPool = "paid" | "guest_list";

type TestUser = {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  client: SupabaseClient;
};

type RpcResponse = {
  success: boolean;
  result: string;
  message: string;
  event_id?: string;
  slug?: string;
  ticket_id?: string;
  debug_id?: string;
};

type TicketTypeRow = {
  id: string;
  title: string;
  capacity_pool: CapacityPool;
};

type TicketRow = {
  id: string;
  qr_token: string;
  status: string;
};

const shouldRunIntegrationTests =
  process.env.ALLOW_INTEGRATION_TESTS === "true";

const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

const TEST_TIMEOUT_MS = 45_000;
const HOOK_TIMEOUT_MS = 90_000;

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} in .env.test.local`);
  }

  return value;
}

function createSupabaseClient(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

describeIntegration("Supabase database security integration tests", () => {
  let supabaseUrl: string;
  let publishableKey: string;
  let serviceRoleKey: string;
  let admin: SupabaseClient;

  const runId = `inside-test-${Date.now()}`;
  const createdUserIds: string[] = [];
  const createdEventIds: string[] = [];

  beforeAll(() => {
    supabaseUrl = requireEnv("TEST_SUPABASE_URL");
    publishableKey = requireEnv("TEST_SUPABASE_PUBLISHABLE_KEY");
    serviceRoleKey = requireEnv("TEST_SUPABASE_SERVICE_ROLE_KEY");

    admin = createSupabaseClient(supabaseUrl, serviceRoleKey);
  });

  afterAll(async () => {
    await cleanupTestData();
  }, HOOK_TIMEOUT_MS);

  async function cleanupTestData() {
    for (const eventId of createdEventIds.reverse()) {
      await admin.from("check_ins").delete().eq("event_id", eventId);
      await admin.from("tickets").delete().eq("event_id", eventId);
      await admin.from("ticket_types").delete().eq("event_id", eventId);

      await admin
        .from("event_staff_assignments")
        .delete()
        .eq("event_id", eventId);

      await admin
        .from("event_page_view_stats")
        .delete()
        .eq("event_id", eventId);

      await admin.from("app_action_logs").delete().eq("entity_id", eventId);
      await admin.from("events").delete().eq("id", eventId);
    }

    for (const userId of createdUserIds.reverse()) {
      await admin.from("app_action_logs").delete().eq("actor_user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }

  async function createTestUser(role: UserRole): Promise<TestUser> {
    const email = `${runId}-${role}-${randomUUID()}@example.com`;
    const password = `Test-${randomUUID()}-Aa1!`;

    const { data: createdUserData, error: createUserError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: `Test ${role}`,
        },
      });

    if (createUserError) {
      throw new Error(`Could not create test user: ${createUserError.message}`);
    }

    const createdUser = createdUserData.user;

    if (!createdUser) {
      throw new Error("Could not create test user: Supabase returned no user.");
    }

    const userId = createdUser.id;
    createdUserIds.push(userId);

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: `Test ${role}`,
        role,
      },
      {
        onConflict: "id",
      }
    );

    expect(profileError).toBeNull();

    const client = createSupabaseClient(supabaseUrl, publishableKey);

    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    expect(signInError).toBeNull();

    return {
      id: userId,
      email,
      password,
      role,
      client,
    };
  }

  async function createTestEvent(
    organizer: TestUser,
    options?: {
      paidQuantity?: number;
      guestListQuantity?: number;
      paidCapacity?: number;
      guestListCapacity?: number;
      paidPriceCents?: number;
    }
  ) {
    const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
    );

    const paidQuantity = options?.paidQuantity ?? 1;
    const guestListQuantity = options?.guestListQuantity ?? 1;
    const paidCapacity = options?.paidCapacity ?? paidQuantity;
    const guestListCapacity = options?.guestListCapacity ?? guestListQuantity;
    const paidPriceCents = options?.paidPriceCents ?? 1000;

    const { data, error } = await organizer.client.rpc(
      "create_event_with_ticket_types",
      {
        new_title: `Integration Test Event ${randomUUID()}`,
        new_description: "Created by integration tests.",
        new_location: "Test Venue",
        new_starts_at: startsAt.toISOString(),
        new_ends_at: endsAt.toISOString(),
        new_max_tickets: paidCapacity,
        new_max_guest_list: guestListCapacity,
        new_slug_base: `integration-test-${randomUUID()}`,
        ticket_types_json: [
          {
            title: "General Admission",
            description: "Paid test ticket",
            price_cents: paidPriceCents,
            currency: "EUR",
            max_quantity: paidQuantity,
            capacity_pool: "paid",
            sort_order: 1,
          },
          {
            title: "Guest List",
            description: "Guest-list test ticket",
            price_cents: 0,
            currency: "EUR",
            max_quantity: guestListQuantity,
            capacity_pool: "guest_list",
            sort_order: 2,
          },
        ],
      }
    );

    expect(error).toBeNull();

    const result = data as RpcResponse;

    expect(result.success).toBe(true);
    expect(result.event_id).toBeTruthy();

    createdEventIds.push(result.event_id as string);

    return {
      eventId: result.event_id as string,
      slug: result.slug as string,
    };
  }

  async function getTicketTypes(eventId: string) {
    const { data, error } = await admin
      .from("ticket_types")
      .select("id, title, capacity_pool")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true });

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    return data as TicketTypeRow[];
  }

  async function getUserTicket(eventId: string, userId: string) {
    const { data, error } = await admin
      .from("tickets")
      .select("id, qr_token, status")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();

    expect(error).toBeNull();

    return data as TicketRow | null;
  }

  it(
    "allows an organizer to create an event and ticket types atomically",
    async () => {
      const organizer = await createTestUser("event_organizer");

      const event = await createTestEvent(organizer, {
        paidQuantity: 10,
        guestListQuantity: 5,
        paidCapacity: 10,
        guestListCapacity: 5,
      });

      const ticketTypes = await getTicketTypes(event.eventId);

      expect(ticketTypes).toHaveLength(2);
      expect(ticketTypes.some((type) => type.capacity_pool === "paid")).toBe(
        true
      );
      expect(
        ticketTypes.some((type) => type.capacity_pool === "guest_list")
      ).toBe(true);
    },
    TEST_TIMEOUT_MS
  );

  it(
    "blocks a client from creating an event directly through the RPC",
    async () => {
      const clientUser = await createTestUser("client");

      const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await clientUser.client.rpc(
        "create_event_with_ticket_types",
        {
          new_title: "Client Should Not Create Event",
          new_description: null,
          new_location: "Unauthorized Venue",
          new_starts_at: startsAt.toISOString(),
          new_ends_at: null,
          new_max_tickets: 10,
          new_max_guest_list: 0,
          new_slug_base: `client-blocked-${randomUUID()}`,
          ticket_types_json: [
            {
              title: "General Admission",
              description: null,
              price_cents: 1000,
              currency: "EUR",
              max_quantity: 10,
              capacity_pool: "paid",
              sort_order: 1,
            },
          ],
        }
      );

      expect(error).toBeNull();

      const result = data as RpcResponse;

      expect(result.success).toBe(false);
      expect(result.result).toBe("unauthorized");
    },
    TEST_TIMEOUT_MS
  );

  it(
    "keeps paid and guest-list capacity pools separate",
    async () => {
      const organizer = await createTestUser("event_organizer");
      const firstClient = await createTestUser("client");
      const secondClient = await createTestUser("client");

      const event = await createTestEvent(organizer, {
        paidQuantity: 1,
        guestListQuantity: 1,
        paidCapacity: 1,
        guestListCapacity: 1,
        paidPriceCents: 1000,
      });

      const ticketTypes = await getTicketTypes(event.eventId);
      const paidTicketType = ticketTypes.find(
        (ticketType) => ticketType.capacity_pool === "paid"
      );
      const guestListTicketType = ticketTypes.find(
        (ticketType) => ticketType.capacity_pool === "guest_list"
      );

      expect(paidTicketType).toBeTruthy();
      expect(guestListTicketType).toBeTruthy();

      const { data: firstPaidClaim, error: firstPaidClaimError } =
        await firstClient.client.rpc("claim_ticket_for_type", {
          target_event_id: event.eventId,
          target_ticket_type_id: paidTicketType?.id,
        });

      expect(firstPaidClaimError).toBeNull();
      expect((firstPaidClaim as RpcResponse).success).toBe(true);

      const { data: secondPaidClaim, error: secondPaidClaimError } =
        await secondClient.client.rpc("claim_ticket_for_type", {
          target_event_id: event.eventId,
          target_ticket_type_id: paidTicketType?.id,
        });

      expect(secondPaidClaimError).toBeNull();
      expect((secondPaidClaim as RpcResponse).success).toBe(false);

      const { data: secondGuestListClaim, error: secondGuestListClaimError } =
        await secondClient.client.rpc("claim_ticket_for_type", {
          target_event_id: event.eventId,
          target_ticket_type_id: guestListTicketType?.id,
        });

      expect(secondGuestListClaimError).toBeNull();
      expect((secondGuestListClaim as RpcResponse).success).toBe(true);
    },
    TEST_TIMEOUT_MS
  );

  it(
    "blocks unassigned staff from validating a ticket for an event",
    async () => {
      const organizer = await createTestUser("event_organizer");
      const clientUser = await createTestUser("client");
      const unassignedStaff = await createTestUser("event_staff");

      const event = await createTestEvent(organizer, {
        paidQuantity: 2,
        guestListQuantity: 1,
        paidCapacity: 2,
        guestListCapacity: 1,
      });

      const ticketTypes = await getTicketTypes(event.eventId);
      const paidTicketType = ticketTypes.find(
        (ticketType) => ticketType.capacity_pool === "paid"
      );

      expect(paidTicketType).toBeTruthy();

      const { data: claimResult, error: claimError } =
        await clientUser.client.rpc("claim_ticket_for_type", {
          target_event_id: event.eventId,
          target_ticket_type_id: paidTicketType?.id,
        });

      expect(claimError).toBeNull();
      expect((claimResult as RpcResponse).success).toBe(true);

      const ticket = await getUserTicket(event.eventId, clientUser.id);

      expect(ticket).not.toBeNull();
      expect(ticket?.qr_token).toBeTruthy();

      const { data: validationResult, error: validationError } =
        await unassignedStaff.client.rpc("validate_ticket_qr_for_event", {
          target_event_id: event.eventId,
          target_qr_token: ticket?.qr_token,
        });

      expect(validationError).toBeNull();

      const result = validationResult as RpcResponse;

      expect(result.success).toBe(false);
      expect(result.result).toBe("unauthorized");
    },
    TEST_TIMEOUT_MS
  );

  it(
    "blocks cancellation when issued paid tickets created revenue",
    async () => {
      const organizer = await createTestUser("event_organizer");
      const clientUser = await createTestUser("client");

      const event = await createTestEvent(organizer, {
        paidQuantity: 2,
        guestListQuantity: 1,
        paidCapacity: 2,
        guestListCapacity: 1,
        paidPriceCents: 1000,
      });

      const ticketTypes = await getTicketTypes(event.eventId);
      const paidTicketType = ticketTypes.find(
        (ticketType) => ticketType.capacity_pool === "paid"
      );

      expect(paidTicketType).toBeTruthy();

      const { data: claimResult, error: claimError } =
        await clientUser.client.rpc("claim_ticket_for_type", {
          target_event_id: event.eventId,
          target_ticket_type_id: paidTicketType?.id,
        });

      expect(claimError).toBeNull();
      expect((claimResult as RpcResponse).success).toBe(true);

      const { data: cancelResult, error: cancelError } =
        await organizer.client.rpc("cancel_event_if_no_revenue", {
          target_event_id: event.eventId,
        });

      expect(cancelError).toBeNull();

      const result = cancelResult as RpcResponse;

      expect(result.success).toBe(false);
      expect(result.result).toBe("revenue_exists");
    },
    TEST_TIMEOUT_MS
  );
});