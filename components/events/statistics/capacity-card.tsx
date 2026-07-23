import { ProgressBar } from "./progress-bar";

type CapacityCardProps = {
  title: string;
  issued: number;
  remaining: number;
  entrances: number;
  capacity: number;
  showEntrances: boolean;
};

export function CapacityCard({
  title,
  issued,
  remaining,
  entrances,
  capacity,
  showEntrances,
}: CapacityCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
            Capacity pool
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
        </div>

        <p className="text-sm text-white/45">{remaining} left</p>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-white/50">Issued</span>
          <span className="font-medium text-white">
            {issued} / {capacity}
          </span>
        </div>

        <ProgressBar value={issued} max={capacity} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/35">Issued</p>
          <p className="mt-1 text-2xl font-semibold text-white">{issued}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/35">
            {showEntrances ? "Entrances" : "Remaining"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {showEntrances ? entrances : remaining}
          </p>
        </div>
      </div>
    </section>
  );
}