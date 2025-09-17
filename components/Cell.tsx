'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Cell as CellType, CellAddress } from '@/types';

interface Props {
  address: CellAddress;
  cell?: CellType;
  sheet?: any;
  value?: any;
  error?: { code: string; message: string } | undefined;
  selected: boolean;
  rangeSelected?: boolean;
  editing: boolean;
  onSelect: () => void;
  onBeginEdit: () => void;
  onCommit: (
    addr: CellAddress,
    raw: string,
    source?: 'enter' | 'tab' | 'blur'
  ) => void;
  onCancel: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
}

export const Cell: React.FC<Props> = ({
  address,
  cell,
  value: evaluatedValue,
  error: evaluatedError,
  selected,
  rangeSelected,
  editing,
  onSelect,
  onBeginEdit,
  onCommit,
  onCancel,
  onMouseDown,
  onMouseEnter,
}) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize draft when entering edit mode
  useEffect(() => {
    if (editing) {
      const original = cell
        ? cell.kind === 'literal'
          ? String(cell.value)
          : cell.kind === 'formula'
          ? cell.src
          : ''
        : '';
      setDraft(original);
      // focus after state flush
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing, cell]);

  const display = (() => {
    if (!cell) return '';
    if (cell.kind === 'literal') return String(cell.value);
    if (cell.kind === 'error') return `#${cell.code}`;
    if (cell.kind === 'formula') {
      if (evaluatedError) return `#${evaluatedError.code}`;
      if (evaluatedValue === null || evaluatedValue === undefined) return '';
      return String(evaluatedValue);
    }
    return '';
  })();

  function handleKey(e: React.KeyboardEvent) {
    if (!editing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onBeginEdit();
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Direct typing starts edit replacing content
        onBeginEdit();
        setDraft(e.key);
        e.preventDefault();
      }
      return;
    }

    if (editing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onCommit(address, draft, 'enter');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab') {
        // let parent handle moving selection after commit
        onCommit(address, draft, 'tab');
      }
    }
  }

  function handleDoubleClick() {
    if (!editing) onBeginEdit();
  }

  function handleBlur() {
    if (editing) {
      onCommit(address, draft, 'blur');
    }
  }

  const classes = [
    'grid-cell',
    editing && 'editing',
    selected && 'selected active',
    !selected && rangeSelected && 'range',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <td
      className={classes}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKey}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      tabIndex={0}
      role='gridcell'
      aria-selected={selected || !!rangeSelected}
      data-address={address}
    >
      {editing ? (
        <input
          ref={inputRef}
          className='grid-cell-input'
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
        />
      ) : (
        <span className='block truncate pointer-events-none'>{display}</span>
      )}
    </td>
  );
};
