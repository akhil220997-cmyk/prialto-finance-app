interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  caption?: string;
}

// Plain accessible table — used both as a standalone view and as the
// "table view" fallback the dataviz skill requires alongside every chart.
export function DataTable<T>({ columns, rows, caption }: DataTableProps<T>) {
  return (
    <div className="hover-card overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
      <table className="w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-[var(--gridline)] text-[var(--text-secondary)]">
            {columns.map((col) => (
              <th
                key={col.header}
                scope="col"
                className={`px-4 py-2.5 font-medium ${col.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--gridline)] last:border-0 hover:bg-white/[0.03]">
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`px-4 py-2.5 tabular-nums text-[var(--text-primary)] ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
