export type CameraState = "idle" | "starting" | "active" | "error";

export type QrCodeScannerProps = {
  eventId: string;
};

export type ScanResult = {
  success: boolean;
  result:
    | "success"
    | "already_used"
    | "wrong_event"
    | "unauthorized"
    | "invalid"
    | "error";
  message: string;
  ticket_code?: string;
  event_title?: string;
  client_name?: string | null;
  client_email?: string | null;
  ticket_type_title?: string | null;
  ticket_price_cents?: number | null;
  ticket_currency?: string | null;
  price_cents?: number | null;
  currency?: string | null;
};