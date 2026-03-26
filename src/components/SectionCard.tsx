import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({
  title,
  eyebrow,
  action,
  children
}: SectionCardProps) {
  return (
    <section className="panel section-card">
      <div className="section-header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
