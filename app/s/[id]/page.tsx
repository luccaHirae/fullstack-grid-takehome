'use client';

import { useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Grid } from '@/components/Grid';
import { FormulaBar } from '@/components/FormulaBar';
import { SheetSkeleton } from '@/components/Skeleton';
import { useSheet } from '@/hooks/useSheet';
import { useGridSelection } from '@/hooks/useGridSelection';

export default function SheetPage() {
  const params = useParams();
  const sheetId = params.id as string;

  const { sheet, evaluated, loading, commitCell } = useSheet(sheetId);

  const maxCols = useMemo(() => Math.min(sheet?.cols || 0, 26), [sheet]);
  const maxRows = useMemo(() => Math.min(sheet?.rows || 0, 50), [sheet]);
  const {
    selected,
    editing,
    setSelected,
    beginEdit,
    cancelEdit,
    moveSelection,
  } = useGridSelection({
    maxCols,
    maxRows,
    disabled: loading || !sheet,
  });

  const formulaBarCommit = useCallback(
    (raw: string) => {
      if (selected) commitCell(selected, raw);
    },
    [selected, commitCell]
  );

  if (loading)
    return (
      <div className='p-4'>
        <SheetSkeleton />
      </div>
    );
  if (!sheet)
    return <div className='p-4 text-sm text-red-600'>Sheet not found</div>;

  const selectedCell = selected ? sheet.cells[selected] : undefined;

  return (
    <div className='p-4 flex flex-col gap-3 min-w-0'>
      <header className='sheet-toolbar'>
        <div className='flex items-center gap-3 min-w-0'>
          <h1 className='sheet-toolbar-title truncate'>{sheet.name}</h1>
          <span className='sheet-toolbar-meta hidden md:inline-block'>
            Sheet
          </span>
        </div>
        <div className='sheet-toolbar-actions'>
          <button className='btn-neutral'>Sort</button>
          <button className='btn-neutral'>Filter</button>
          <span className='hidden md:inline h-5 w-px bg-[var(--border)]' />
          <button className='btn-accent'>Export CSV</button>
        </div>
      </header>
      <FormulaBar
        selected={selected}
        cell={selectedCell}
        editing={!!editing && editing === selected}
        onBeginEdit={() => selected && beginEdit(selected)}
        onCommit={formulaBarCommit}
        onCancel={cancelEdit}
      />
      <div className='before-grid-space' />
      <Grid
        sheet={sheet}
        evaluated={evaluated}
        selected={selected}
        editing={editing}
        onSelect={(addr) => {
          setSelected(addr);
          cancelEdit();
        }}
        onBeginEdit={beginEdit}
        onCommit={async (addr, raw, source) => {
          await commitCell(addr, raw);
          if (source === 'enter') {
            moveSelection(0, 1);
          } else if (source === 'tab') {
            moveSelection(1, 0);
          }
        }}
        onCancelEdit={cancelEdit}
      />
    </div>
  );
}
