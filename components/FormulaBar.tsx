'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Cell, CellAddress } from '@/types';

interface FormulaBarProps {
  selected: CellAddress | null;
  cell: Cell | undefined;
  editing: boolean;
  onBeginEdit: () => void;
  onCommit: (raw: string) => void;
  onCancel: () => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  selected,
  cell,
  editing,
  onBeginEdit,
  onCommit,
  onCancel,
}) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected && !editing) {
      if (!cell) setDraft('');
      else if (cell.kind === 'literal') setDraft(String(cell.value));
      else if (cell.kind === 'formula') setDraft(cell.src);
      else setDraft('');
    }
  }, [selected, cell, editing]);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing]);

  function handleKey(e: React.KeyboardEvent) {
    if (editing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onCommit(draft);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    } else {
      if (e.key === 'Enter' && selected) {
        e.preventDefault();
        onBeginEdit();
      }
    }
  }

  const showAddr = selected || '';

  const barClasses = ['formula-bar', 'w-full'];
  if (!selected) barClasses.push('inactive');

  return (
    <div className={barClasses.join(' ')}>
      <div className='formula-address' aria-label='Active cell address'>
        {showAddr || '—'}
      </div>
      <div className='formula-input-wrap'>
        {selected && draft.startsWith('=') && !editing && (
          <span className='formula-fx'>fx</span>
        )}
        <input
          ref={inputRef}
          className='formula-input'
          value={draft}
          placeholder={
            selected ? 'Enter value or =formula' : 'No cell selected'
          }
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => {
            if (!editing && selected) onBeginEdit();
          }}
          aria-label='Formula input'
        />
      </div>
    </div>
  );
};
