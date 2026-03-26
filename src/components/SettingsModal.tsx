import { FormEvent, useEffect, useState } from "react";

import { formatClockValue } from "@/lib/format";
import type { SettingsRecord, UserRole } from "@/types/dashboard";

type SettingsModalProps = {
  open: boolean;
  role: UserRole;
  settings: SettingsRecord;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: SettingsRecord) => Promise<void>;
};

export function SettingsModal({
  open,
  role,
  settings,
  saving,
  onClose,
  onSave
}: SettingsModalProps) {
  const [form, setForm] = useState(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  if (!open) return null;

  const canEdit = role === "owner";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    await onSave(form);
  }

  function toggleAlert(alert: string) {
    setForm((current) => {
      const exists = current.enabled_alerts.includes(alert);
      return {
        ...current,
        enabled_alerts: exists
          ? current.enabled_alerts.filter((entry) => entry !== alert)
          : [...current.enabled_alerts, alert]
      };
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Operator preferences</h2>
          </div>
          <button className="link-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          <label>
            Daily report time
            <input
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  daily_report_time: event.target.value
                }))
              }
              type="time"
              value={form.daily_report_time}
            />
            <span className="muted">
              Currently {formatClockValue(form.daily_report_time)}
            </span>
          </label>

          <label>
            Low inventory threshold (% of par)
            <input
              disabled={!canEdit}
              max={100}
              min={1}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  low_inventory_threshold: Number(event.target.value)
                }))
              }
              type="number"
              value={form.low_inventory_threshold}
            />
          </label>

          <label>
            Review response target (hours)
            <input
              disabled={!canEdit}
              max={24}
              min={1}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  review_response_target: Number(event.target.value)
                }))
              }
              type="number"
              value={form.review_response_target}
            />
          </label>

          <div>
            <p className="settings-label">Enabled alerts</p>
            <div className="checkbox-grid">
              {["inventory", "reviews", "sales", "labor"].map((alert) => (
                <label className="check-chip" key={alert}>
                  <input
                    checked={form.enabled_alerts.includes(alert)}
                    disabled={!canEdit}
                    onChange={() => toggleAlert(alert)}
                    type="checkbox"
                  />
                  <span>{alert}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="suggestion-actions">
            {!canEdit ? (
              <p className="muted">
                Managers can view settings, but only owners can change them.
              </p>
            ) : null}
            <button
              className="button button-primary"
              disabled={!canEdit || saving}
              type="submit"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
