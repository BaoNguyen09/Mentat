import type { FixItem } from "@mentat/types";

import { SurfaceCard } from "./SurfaceCard";

interface FixListCardProps {
  fixList: FixItem[];
}

export function FixListCard({ fixList }: FixListCardProps) {
  return (
    <SurfaceCard
      eyebrow="Fix list"
      title="Next-session corrections"
      description="Render the output exactly how the demo needs it: observation first, drill second."
    >
      {fixList.length === 0 ? (
        <p className="muted-copy">
          Mentat will populate this after a session is finalized.
        </p>
      ) : (
        <div className="stack-sm">
          {fixList.map((fix) => (
            <article className="fix-item" key={fix.item}>
              <div className="fix-item__header">
                <strong>{fix.item}</strong>
                <span className="status-chip status-chip--memory">
                  Repeat next session
                </span>
              </div>
              <p>{fix.specificObservation}</p>
              <div className="fix-item__drill">
                <span className="section-label">Drill</span>
                <strong>{fix.drill}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}
