import { useState } from "react";

import { formatRelativeDate } from "@/lib/format";
import type { SuggestionRecord, UserRole } from "@/types/dashboard";

type SuggestionListProps = {
  suggestions: SuggestionRecord[];
  role: UserRole;
  busyId: string | null;
  onApprove: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
};

export function SuggestionList({
  suggestions,
  role,
  busyId,
  onApprove,
  onDismiss
}: SuggestionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (suggestions.length === 0) {
    return <p className="empty-state">No pending suggestions right now.</p>;
  }

  return (
    <div className="stack-list">
      {suggestions.map((suggestion) => {
        const detailsOpen = expandedId === suggestion.id;
        const confidence = Number(suggestion.data?.confidence || 0);
        const canAct = role === "owner";

        return (
          <article className="suggestion-card" key={suggestion.id}>
            <div className="suggestion-topline">
              <div>
                <span className="pill">{suggestion.suggestion_type}</span>
                <h3>{suggestion.content}</h3>
              </div>
              <div className="suggestion-meta">
                <strong>{Math.round(confidence * 100)}%</strong>
                <span className="muted">
                  {formatRelativeDate(suggestion.created_at)}
                </span>
              </div>
            </div>

            <button
              className="link-button"
              onClick={() => setExpandedId(detailsOpen ? null : suggestion.id)}
              type="button"
            >
              {detailsOpen ? "Hide context" : "Show context"}
            </button>

            {detailsOpen ? (
              <pre className="suggestion-context">
                {JSON.stringify(suggestion.data, null, 2)}
              </pre>
            ) : null}

            <div className="suggestion-actions">
              <button
                className="button button-secondary"
                disabled={!canAct || busyId === suggestion.id}
                onClick={() => onDismiss(suggestion.id)}
                type="button"
              >
                Dismiss
              </button>
              <button
                className="button button-primary"
                disabled={!canAct || busyId === suggestion.id}
                onClick={() => onApprove(suggestion.id)}
                type="button"
              >
                Approve
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
