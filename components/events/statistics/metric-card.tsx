type MetricCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  large?: boolean;
};

export function MetricCard({
  label,
  value,
  helper,
  large = false,
}: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>

      <p
        className={
          large
            ? "mt-3 text-4xl font-semibold tracking-tight text-white"
            : "mt-3 text-3xl font-semibold tracking-tight text-white"
        }
      >
        {value}
      </p>

      {helper ? <p className="mt-2 text-sm text-white/45">{helper}</p> : null}
    </div>
  );
}