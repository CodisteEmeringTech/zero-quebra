type Props = { title: string; subtitle?: string; right?: React.ReactNode };

export function PageHeader({ title, subtitle, right }: Props) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right && <div className="page-header-right">{right}</div>}
    </header>
  );
}
