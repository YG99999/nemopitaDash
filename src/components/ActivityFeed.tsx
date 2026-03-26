import { formatRelativeDate } from "@/lib/format";
import type { AgentLogRecord } from "@/types/dashboard";

type ActivityFeedProps = {
  logs: AgentLogRecord[];
};

export function ActivityFeed({ logs }: ActivityFeedProps) {
  if (logs.length === 0) {
    return <p className="empty-state">No agent activity has been recorded yet.</p>;
  }

  return (
    <div className="stack-list">
      {logs.map((log) => (
        <article className="activity-item" key={log.id}>
          <div className="activity-heading">
            <div>
              <strong>{log.action_type.replace(/_/g, " ")}</strong>
              <p className="muted">
                {String(log.data?.message || "Agent event received")}
              </p>
            </div>
            <span className={`status-badge status-${log.status || "warning"}`}>
              {log.status}
            </span>
          </div>
          <p className="muted">{formatRelativeDate(log.timestamp)}</p>
        </article>
      ))}
    </div>
  );
}
