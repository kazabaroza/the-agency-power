export default function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">{title}</h1>{sub && <p className="muted mt-1 text-sm">{sub}</p>}</div>
      {children}
    </div>
  );
}
