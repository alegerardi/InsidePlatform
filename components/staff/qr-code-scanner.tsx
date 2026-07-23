"use client";

import { ScannerCameraPanel } from "./qr-scanner/scanner-camera-panel";
import { ScanResultModal } from "./qr-scanner/scan-result-modal";
import type { QrCodeScannerProps } from "./qr-scanner/qr-scanner-types";
import { useQrScanner } from "./qr-scanner/use-qr-scanner";

export function QrCodeScanner({ eventId }: QrCodeScannerProps) {
  const {
    readerId,
    cameraState,
    error,
    scanResult,
    startScanner,
    stopScanner,
    handleScanNext,
    closeScanResult,
  } = useQrScanner(eventId);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <ScannerCameraPanel
        readerId={readerId}
        cameraState={cameraState}
        error={error}
        onStart={startScanner}
        onStop={stopScanner}
      />

      {scanResult ? (
        <ScanResultModal
          scanResult={scanResult}
          onScanNext={handleScanNext}
          onClose={closeScanResult}
        />
      ) : null}
    </section>
  );
}