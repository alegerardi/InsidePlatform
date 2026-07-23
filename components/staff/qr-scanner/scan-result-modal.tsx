import type { ScanResult } from "./qr-scanner-types";
import {
  formatPrice,
  getResultTitle,
  getTicketCurrency,
  getTicketPrice,
} from "./qr-scanner-utils";

type ScanResultModalProps = {
  scanResult: ScanResult;
  onScanNext: () => Promise<void>;
  onClose: () => void;
};

export function ScanResultModal({
  scanResult,
  onScanNext,
  onClose,
}: ScanResultModalProps) {
  return (
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
              void onScanNext();
            }}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-85"
          >
            Scan next
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}