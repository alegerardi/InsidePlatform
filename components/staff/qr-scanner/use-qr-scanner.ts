"use client";

import type { Html5Qrcode } from "html5-qrcode";
import { useCallback, useMemo, useRef, useState } from "react";
import type { CameraState, ScanResult } from "./qr-scanner-types";
import { extractQrToken } from "./qr-scanner-utils";

export function useQrScanner(eventId: string) {
  const readerId = useMemo(() => `qr-reader-${eventId}`, [eventId]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
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

  function closeScanResult() {
    setScanResult(null);
  }

  return {
    readerId,
    cameraState,
    error,
    scanResult,
    isStarting: cameraState === "starting",
    isActive: cameraState === "active",
    startScanner,
    stopScanner,
    handleScanNext,
    closeScanResult,
  };
}