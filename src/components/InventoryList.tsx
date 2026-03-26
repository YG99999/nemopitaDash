import type { InventoryItem } from "@/types/dashboard";

type InventoryListProps = {
  items: InventoryItem[];
};

export function InventoryList({ items }: InventoryListProps) {
  if (items.length === 0) {
    return <p className="empty-state">No inventory alerts right now.</p>;
  }

  return (
    <div className="table-list">
      {items.map((item) => (
        <div className="table-row" key={item.item}>
          <div>
            <strong>{item.item}</strong>
            <p className="muted">
              {item.qty} remaining of {item.par_level} par
            </p>
          </div>
          <span className={`status-badge status-${item.status}`}>
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}
