type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "alert" | "success";
};

export function MetricCard({
  label,
  value,
  detail,
  tone = "default"
}: MetricCardProps) {
  return (
    <article className={`panel metric-card tone-${tone}`}>
      <p className="eyebrow">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="muted">{detail}</p>
    </article>
  );
}
