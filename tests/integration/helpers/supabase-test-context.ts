import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { expect } from "vitest";

dotenv.config({ path: ".env.test.local" });

export type UserRole = "client" | "event_organizer" | "event_staff" | "admin";
export type CapacityPool = "paid" | "guest_list";

export type TestUser = {
  id: string;
  email: string;
  client: SupabaseClient;
};

export type RpcResult = {
  success: boolean;
  result: string;
  message: string;
  event_id?: string;
  slug?: string;
  ticket_id?: string;
};

export type TestEvent = {
  eventId: string;
  slug: string;
};

type TicketTypeInput = {
  title: string;
  description?: string | null;
  price_cents: number;
  currency?: string;
  max_quantity: number | null;
  capacity_pool: CapacityPool | string;
  sort_order?: number;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.test.local`);
  return value;
}

function client(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export class SupabaseTestContext {
  readonly admin: SupabaseClient;
  readonly publishableKey: string;
  readonly supabaseUrl: string;
  readonly runId = `inside-expanded-${Date.now()}-${randomUUID()}`;
  private readonly userIds: string[] = [];
  private readonly eventIds: string[] = [];
  private readonly sharedUsers = new Map<UserRole, TestUser>();

  constructor() {
    this.supabaseUrl = requiredEnv("TEST_SUPABASE_URL");
    this.publishableKey = requiredEnv("TEST_SUPABASE_PUBLISHABLE_KEY");
    this.admin = client(
      this.supabaseUrl,
      requiredEnv("TEST_SUPABASE_SERVICE_ROLE_KEY")
    );
  }

  anonymousClient() {
    return client(this.supabaseUrl, this.publishableKey);
  }

  async createUser(role: UserRole, unique = false): Promise<TestUser> {
    const sharedUser = this.sharedUsers.get(role);
    if (!unique && sharedUser) return sharedUser;

    const email = `${this.runId}-${role}-${randomUUID()}@example.com`;
    const password = `Test-${randomUUID()}-Aa1!`;
    const { data, error } = await this.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Expanded test ${role}` },
    });

    expect(error).toBeNull();
    expect(data.user).not.toBeNull();
    const userId = data.user?.id as string;
    this.userIds.push(userId);

    const { error: profileError } = await this.admin.from("profiles").upsert({
      id: userId,
      email,
      full_name: `Expanded test ${role}`,
      role,
    });
    expect(profileError).toBeNull();

    const authenticated = this.anonymousClient();
    const { error: signInError } = await authenticated.auth.signInWithPassword({
      email,
      password,
    });
    expect(signInError).toBeNull();

    const testUser = { id: userId, email, client: authenticated };
    if (!unique) this.sharedUsers.set(role, testUser);
    return testUser;
  }

  async createEvent(
    organizer: TestUser,
    options: {
      title?: string;
      paidCapacity?: number;
      guestListCapacity?: number;
      ticketTypes?: TicketTypeInput[];
      startsAt?: Date;
      endsAt?: Date | null;
    } = {}
  ): Promise<TestEvent> {
    const startsAt = options.startsAt ?? new Date(Date.now() + 7 * 86_400_000);
    const endsAt =
      options.endsAt === undefined
        ? new Date(startsAt.getTime() + 3 * 3_600_000)
        : options.endsAt;
    const ticketTypes = options.ticketTypes ?? [
      {
        title: "General Admission",
        description: "Paid test ticket",
        price_cents: 1000,
        currency: "EUR",
        max_quantity: options.paidCapacity ?? 3,
        capacity_pool: "paid",
        sort_order: 1,
      },
      {
        title: "Guest List",
        description: "Free test ticket",
        price_cents: 0,
        currency: "EUR",
        max_quantity: options.guestListCapacity ?? 2,
        capacity_pool: "guest_list",
        sort_order: 2,
      },
    ];

    const { data, error } = await organizer.client.rpc(
      "create_event_with_ticket_types",
      {
        new_title: options.title ?? `Expanded Event ${randomUUID()}`,
        new_description: "Created by expanded integration tests.",
        new_location: "Test Venue",
        new_starts_at: startsAt.toISOString(),
        new_ends_at: endsAt?.toISOString() ?? null,
        new_max_tickets: options.paidCapacity ?? 3,
        new_max_guest_list: options.guestListCapacity ?? 2,
        new_slug_base: `expanded-${randomUUID()}`,
        ticket_types_json: ticketTypes,
      }
    );
    expect(error).toBeNull();
    const result = data as RpcResult;
    expect(result.success).toBe(true);
    this.eventIds.push(result.event_id as string);
    return { eventId: result.event_id as string, slug: result.slug as string };
  }

  trackEvent(eventId: string) {
    this.eventIds.push(eventId);
  }

  async ticketTypes(eventId: string) {
    const { data, error } = await this.admin
      .from("ticket_types")
      .select("id,title,price_cents,currency,max_quantity,capacity_pool,is_active")
      .eq("event_id", eventId)
      .order("sort_order");
    expect(error).toBeNull();
    return data ?? [];
  }

  async claim(user: TestUser, eventId: string, ticketTypeId: string) {
    const { data, error } = await user.client.rpc("claim_ticket_for_type", {
      target_event_id: eventId,
      target_ticket_type_id: ticketTypeId,
    });
    expect(error).toBeNull();
    return data as RpcResult;
  }

  async ticket(eventId: string, userId: string) {
    const { data, error } = await this.admin
      .from("tickets")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();
    expect(error).toBeNull();
    return data;
  }

  async cleanup() {
    for (const eventId of [...new Set(this.eventIds)].reverse()) {
      await this.admin.from("check_ins").delete().eq("event_id", eventId);
      await this.admin.from("tickets").delete().eq("event_id", eventId);
      await this.admin.from("ticket_types").delete().eq("event_id", eventId);
      await this.admin
        .from("event_staff_assignments")
        .delete()
        .eq("event_id", eventId);
      await this.admin
        .from("event_page_view_stats")
        .delete()
        .eq("event_id", eventId);
      await this.admin.from("app_action_logs").delete().eq("entity_id", eventId);
      await this.admin.from("events").delete().eq("id", eventId);
    }

    for (const userId of this.userIds.reverse()) {
      await this.admin.from("app_action_logs").delete().eq("actor_user_id", userId);
      await this.admin.from("profiles").delete().eq("id", userId);
      await this.admin.auth.admin.deleteUser(userId);
    }
  }
}

export const integrationEnabled = process.env.ALLOW_INTEGRATION_TESTS === "true";
export const TEST_TIMEOUT_MS = 45_000;
export const HOOK_TIMEOUT_MS = 120_000;
