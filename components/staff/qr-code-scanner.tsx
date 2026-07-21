"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

type QrCodeScannerProps = {
  eventId: string;
};

type ScanResult = {
  success: boolean;
  result:
    | "success"
    | "already_used"
    | "invalid"
    | "wrong_event"
    | "unauthorized"
    | "event_not_found"
    | "error"
    | "invalid_request";
  message: string;
  ticket_id?: string;
  ticket_code?: string;
  client_name?: string;
  ticket_type_title?: string;
  ticket_price_cents?: number;
  ticket_currency?: string;
  debug_id?: string;
};

function extractQrToken(scannedValue: string) {
  const value = scannedValue.trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const validateIndex = pathParts.indexOf("validate");
    const token = pathParts[validateIndex + 1];

    if (validateIndex >= 0 && token) {
      return decodeURIComponent(token);
    }
  } catch {
    // The scanned value is not a full URL. Continue with fallback parsing.
  }

  const validatePathMatch = value.match(/\/validate\/([^/?#]+)/);

  if (validatePathMatch?.[1]) {
    return decodeURIComponent(validatePathMatch[1]);
  }

  const looksLikeRawToken = /^[A-Za-z0-9_-]{16,200}$/.test(value);

  if (looksLikeRawToken) {
    return value;
  }

  return null;
}

function formatPrice(priceCents?: number, currency?: string) {
  if (typeof priceCents !== "number" || !currency) {
    return null;
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

function getResultTitle(result: ScanResult) {
  if (result.result === "success") {
    return "Successful ticket";
  }

  if (result.result === "already_used") {
    return "Ticket already used";
  }

  if (result.result === "wrong_event") {
    return "Wrong event";
  }

  if (result.result === "unauthorized") {
    return "Unauthorized";
  }

  return "Ticket not valid";
}

function getResultBoxClass(result: ScanResult) {
  if (result.result === "success") {
    return "border-green-300 bg-green-50 text-green-800";
  }

  if (result.result === "already_used" || result.result === "wrong_event") {
    return "border-yellow-300 bg-yellow-50 text-yellow-800";
  }

  return "border-red-300 bg-red-50 text-red-800";
}

export function QrCodeScanner({ eventId }: QrCodeScannerProps) {
  const readerId = `qr-scanner-reader-${eventId}`;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const hasScannedRef = useRef(false);

  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Scanner is off.");
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      return;
    }

    try {
      if (isRunningRef.current) {
        await scanner.stop();
      }

      scanner.clear();
    } catch (stopError) {
      console.warn("QR scanner stop error", stopError);
    } finally {
      scannerRef.current = null;
      isRunningRef.current = false;
      hasScannedRef.current = false;
      setIsRunning(false);
      setStatus("Scanner is off.");
    }
  }, []);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (!scanner) {
        return;
      }

      scanner
        .stop()
        .catch(() => {
          // Ignore cleanup errors.
        })
        .finally(() => {
          try {
            scanner.clear();
          } catch {
            // Ignore cleanup errors.
          }
        });
    };
  }, []);

  const validateScannedToken = useCallback(
    async (qrToken: string) => {
      setError(null);
      setStatus("Ticket detected. Validating...");

      await stopScanner();

      try {
        const response = await fetch(
          `/staff/events/${encodeURIComponent(eventId)}/scan`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ qrToken }),
          }
        );

        const result = (await response.json()) as ScanResult;

        setScanResult(result);
        setStatus("Scan complete.");
      } catch (requestError) {
        console.error("QR scan request error", requestError);

        setScanResult({
          success: false,
          result: "error",
          message: "Could not contact the validation server. Please try again.",
        });
        setStatus("Scan failed.");
      }
    },
    [eventId, stopScanner]
  );

  const startScanner = useCallback(async () => {
    setError(null);
    setScanResult(null);
    setStatus("Starting camera...");

    if (scannerRef.current || isRunningRef.current) {
      return;
    }

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 260,
            height: 260,
          },
        },
        async (decodedText) => {
          if (hasScannedRef.current) {
            return;
          }

          const qrToken = extractQrToken(decodedText);

          if (!qrToken) {
            setError("This QR code is not a valid Inside ticket QR.");
            return;
          }

          hasScannedRef.current = true;

          await validateScannedToken(qrToken);
        },
        () => {
          // This callback fires constantly while searching for a QR.
        }
      );

      isRunningRef.current = true;
      setIsRunning(true);
      setStatus("Scanner is active. Point the camera at the ticket QR code.");
    } catch (startError) {
      console.error("QR scanner start error", startError);

      scannerRef.current = null;
      isRunningRef.current = false;
      hasScannedRef.current = false;
      setIsRunning(false);
      setStatus("Scanner is off.");
      setError(
        "Could not start the camera. Check camera permission, HTTPS, and browser compatibility."
      );
    }
  }, [readerId, validateScannedToken]);

  const closeResult = useCallback(() => {
    setScanResult(null);
    setError(null);
    setStatus("Scanner is off.");
  }, []);

  const scanAnother = useCallback(async () => {
    setScanResult(null);
    setError(null);
    await startScanner();
  }, [startScanner]);

  const formattedPrice = scanResult
    ? formatPrice(scanResult.ticket_price_cents, scanResult.ticket_currency)
    : null;

  return (
    <section className="rounded-lg border p-5">
      <div>
        <h2 className="text-lg font-semibold">QR camera scanner</h2>

        <p className="mt-1 text-sm text-gray-600">
          Use this to scan a client ticket QR code at the entrance.
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border bg-black p-2">
        <div id={readerId} className="min-h-[280px] bg-black" />
      </div>

      <p className="mt-3 text-sm text-gray-600">{status}</p>

      {error ? (
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startScanner}
          disabled={isRunning}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start scanner
        </button>

        <button
          type="button"
          onClick={stopScanner}
          disabled={!isRunning}
          className="rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Stop scanner
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        The camera only reads the QR code. Final validation still happens securely
        on the server.
      </p>

      {scanResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className={`rounded-md border p-4 ${getResultBoxClass(scanResult)}`}>
              <p className="text-sm font-medium uppercase tracking-wide">
                {getResultTitle(scanResult)}
              </p>

              <h3 className="mt-2 text-2xl font-bold">
                {scanResult.result === "success"
                  ? `Successful ticket for ${scanResult.client_name ?? "Client"}`
                  : scanResult.message}
              </h3>

              {scanResult.result !== "success" && scanResult.client_name ? (
                <p className="mt-3">
                  Client: <span className="font-semibold">{scanResult.client_name}</span>
                </p>
              ) : null}

              {scanResult.ticket_type_title ? (
                <p className="mt-3">
                  Ticket type:{" "}
                  <span className="font-semibold">
                    {scanResult.ticket_type_title}
                  </span>
                </p>
              ) : null}

              {formattedPrice ? (
                <p className="mt-1">
                  Price: <span className="font-semibold">{formattedPrice}</span>
                </p>
              ) : null}

              {scanResult.ticket_code ? (
                <p className="mt-1">
                  Code:{" "}
                  <span className="font-mono font-semibold">
                    {scanResult.ticket_code}
                  </span>
                </p>
              ) : null}

              {scanResult.debug_id ? (
                <p className="mt-3 text-sm">
                  Reference: <span className="font-mono">{scanResult.debug_id}</span>
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={scanAnother}
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
              >
                Scan another ticket
              </button>

              <button
                type="button"
                onClick={closeResult}
                className="rounded-md border px-4 py-2 text-sm font-medium"
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