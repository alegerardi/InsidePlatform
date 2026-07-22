"use client";

import type { Html5Qrcode } from "html5-qrcode";
import { useCallback, useMemo, useRef, useState } from "react";

type QrCodeScannerProps = {
  eventId: string;
};

type ScanResult = {
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

function extractQrToken(value: string) {
  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    const parts = url.pathname.split("/").filter(Boolean);
    const validateIndex = parts.indexOf("validate");

    if (validateIndex >= 0 && parts[validateIndex + 1]) {
      return parts[validateIndex + 1];
    }
  } catch {
    // The scanned value may already be a raw token or a path.
  }

  const parts = trimmedValue.split("/").filter(Boolean);
  const validateIndex = parts.indexOf("validate");

  if (validateIndex >= 0 && parts[validateIndex + 1]) {
    return parts[validateIndex + 1];
  }

  return trimmedValue;
}

function formatPrice(priceCents: number, currency = "EUR") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

function getResultTitle(result: ScanResult) {
  if (result.success || result.result === "success") {
    return "Access approved";
  }

  if (result.result === "already_used") {
    return "Already checked in";
  }

  if (result.result === "wrong_event") {
    return "Wrong event";
  }

  if (result.result === "unauthorized") {
    return "Unauthorized";
  }

  return "Access not approved";
}

function getTicketPrice(result: ScanResult) {
  return result.ticket_price_cents ?? result.price_cents ?? 0;
}

function getTicketCurrency(result: ScanResult) {
  return result.ticket_currency ?? result.currency ?? "EUR";
}

export function QrCodeScanner({ eventId }: QrCodeScannerProps) {
  const readerId = useMemo(() => `qr-reader-${eventId}`, [eventId]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  const [cameraState, setCameraState] = useState<
    "idle" | "starting" | "active" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      setCameraState("idle");
      return;
    }

    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // The scanner may already be stopped.
    } finally {
      scannerRef.current = null;
      setCameraState("idle");
    }
  }, []);

  const validateScannedValue = useCallback(
    async (decodedText: string) => {
      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;

      try {
        const qrToken = extractQrToken(decodedText);

        if (!qrToken) {
          throw new Error("Invalid QR code.");
        }

        await stopScanner();

        const response = await fetch(`/staff/events/${eventId}/scan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            qrToken,
          }),
        });

        const payload = (await response.json()) as ScanResult;

        if (!response.ok) {
          throw new Error(payload.message || "Could not validate ticket.");
        }

        setScanResult(payload);
      } catch (scanError) {
        setError(
          scanError instanceof Error
            ? scanError.message
            : "Could not validate ticket."
        );
        setCameraState("error");
      } finally {
        isProcessingRef.current = false;
      }
    },
    [eventId, stopScanner]
  );

  const startScanner = useCallback(async () => {
    if (scannerRef.current || cameraState === "starting") {
      return;
    }

    setError(null);
    setScanResult(null);
    setCameraState("starting");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(readerId);

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 280,
            height: 280,
          },
        },
        (decodedText) => {
          void validateScannedValue(decodedText);
        },
        undefined
      );

      setCameraState("active");
    } catch (cameraError) {
      scannerRef.current = null;
      setCameraState("error");
      setError(
        cameraError instanceof Error
          ? cameraError.message
          : "Could not start the camera."
      );
    }
  }, [cameraState, readerId, validateScannedValue]);

  async function handleScanNext() {
    setScanResult(null);
    setError(null);
    await startScanner();
  }

  const isStarting = cameraState === "starting";
  const isActive = cameraState === "active";

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/35">
            QR scanner
          </p>

          <h2 className="mt-3 text-2xl font-semibold text-white">
            Scan ticket
          </h2>
        </div>

        <div className="flex gap-2">
          {!isActive ? (
            <button
              type="button"
              onClick={() => {
                void startScanner();
              }}
              disabled={isStarting}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting ? "Starting..." : "Start camera"}
            </button>
          ) : null}

          {isActive ? (
            <button
              type="button"
              onClick={() => {
                void stopScanner();
              }}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Stop
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/40">
        <div
          id={readerId}
          className="min-h-[360px] overflow-hidden rounded-[1.5rem]"
        />

        {!isActive && !isStarting ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-6 text-center">
            <div>
              <p className="text-sm font-medium text-white">
                Camera scanner ready
              </p>
              <p className="mt-2 max-w-sm text-sm text-white/45">
                Start the camera and point it at the ticket QR code.
              </p>
            </div>
          </div>
        ) : null}

        {isStarting ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6 text-center">
            <p className="text-sm font-medium text-white">Starting camera...</p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          {error}
        </p>
      ) : null}

      {scanResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-6 py-10">
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 shadow-2xl shadow-black/50">
            <div className="border-b border-white/10 p-6">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/35">
                Scan result
              </p>

              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {getResultTitle(scanResult)}
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/55">
                {scanResult.message}
              </p>
            </div>

            <div className="grid gap-3 p-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-white/35">Client</p>
                <p className="mt-1 font-semibold text-white">
                  {scanResult.client_name ||
                    scanResult.client_email ||
                    "Not available"}
                </p>

                {scanResult.client_name && scanResult.client_email ? (
                  <p className="mt-1 text-sm text-white/45">
                    {scanResult.client_email}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-white/35">Ticket</p>
                  <p className="mt-1 font-semibold text-white">
                    {scanResult.ticket_type_title ?? "Ticket"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-white/35">Price</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatPrice(
                      getTicketPrice(scanResult),
                      getTicketCurrency(scanResult)
                    )}
                  </p>
                </div>
              </div>

              {scanResult.ticket_code ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-white/35">Code</p>
                  <p className="mt-1 font-mono font-semibold text-white">
                    {scanResult.ticket_code}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 border-t border-white/10 p-6 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  void handleScanNext();
                }}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-85"
              >
                Scan next
              </button>

              <button
                type="button"
                onClick={() => {
                  setScanResult(null);
                }}
                className="rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}