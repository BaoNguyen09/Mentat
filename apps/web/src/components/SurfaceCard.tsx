import type { PropsWithChildren, ReactNode } from "react";

import { cx } from "../lib/utils";

interface SurfaceCardProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SurfaceCard({
  eyebrow,
  title,
  description,
  action,
  className,
  children,
}: SurfaceCardProps) {
  return (
    <section className={cx("surface-card", className)}>
      <header className="surface-card__header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {description ? (
            <p className="surface-card__description">{description}</p>
          ) : null}
        </div>
        {action ? <div>{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
