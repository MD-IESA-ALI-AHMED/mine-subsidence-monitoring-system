import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import s from './Table.module.css';

/**
 * columns: [{ key, label, render?(row), sortValue?(row), numeric?, sortable? }]
 * Rows are keyboard-reachable when onRowClick is given (Enter or Space opens them).
 */
export function Table({ columns, rows, rowKey, onRowClick, selectedKey, initialSort, label }) {
  const [sort, setSort] = useState(initialSort ?? null); // { key, dir: 1 | -1 }

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const val = col?.sortValue ?? ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key) =>
    setSort((cur) => (cur?.key === key ? { key, dir: -cur.dir } : { key, dir: 1 }));

  return (
    <div className={s.wrap}>
      <table className={s.table} aria-label={label}>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={c.numeric ? s.num : ''}
                  aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
                >
                  {c.sortable === false ? (
                    c.label
                  ) : (
                    <button type="button" className={s.sortBtn} onClick={() => toggleSort(c.key)}>
                      {c.label}
                      {active &&
                        (sort.dir === 1 ? (
                          <ArrowUp size={11} strokeWidth={1.5} aria-hidden />
                        ) : (
                          <ArrowDown size={11} strokeWidth={1.5} aria-hidden />
                        ))}
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                className={`${onRowClick ? s.clickable : ''} ${key === selectedKey ? s.selected : ''}`}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) =>
                        (e.key === 'Enter' || e.key === ' ') &&
                        (e.preventDefault(), onRowClick(row))
                    : undefined
                }
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.numeric ? s.num : ''}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
