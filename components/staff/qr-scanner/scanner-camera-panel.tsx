import type { CameraState } from "./qr-scanner-types";

type ScannerCameraPanelProps = {
  readerId: string;
  cameraState: CameraState;
  error: string | null;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
};

export function ScannerCameraPanel({
  readerId,
  cameraState,
  error,
  onStart,
  onStop,
}: ScannerCameraPanelProps) {
  const isStarting = cameraState === "starting";
  const isActive = cameraState === "active";

  return (
    <>
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
                void onStart();
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
                void onStop();
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
    </>
  );
}