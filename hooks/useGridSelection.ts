import { useState, useCallback, useEffect } from 'react';
import { Keys, isArrowKey } from '@/constants/keys';
import type { CellAddress } from '@/types';

interface UseGridSelectionOptions {
  maxCols: number;
  maxRows: number;
  disabled?: boolean;
}

interface UseGridSelectionResult {
  selected: CellAddress | null;
  editing: CellAddress | null;
  setSelected: (addr: CellAddress | null) => void;
  beginEdit: (addr: CellAddress) => void;
  cancelEdit: () => void;
  moveSelection: (dx: number, dy: number) => void;
}

export function useGridSelection({
  maxCols,
  maxRows,
  disabled,
}: UseGridSelectionOptions): UseGridSelectionResult {
  const [selected, setSelected] = useState<CellAddress | null>(null);
  const [editing, setEditing] = useState<CellAddress | null>(null);

  const toLetters = (idx: number) => {
    let s = '';
    let n = idx;
    while (n >= 0) {
      s = String.fromCharCode((n % 26) + 65) + s;
      n = Math.floor(n / 26) - 1;
    }
    return s;
  };

  const toIndex = (letters: string) => {
    let n = 0;
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };

  const moveSelection = useCallback(
    (dx: number, dy: number) => {
      if (!maxCols || !maxRows) return;
      let target: CellAddress | null = selected;
      if (!target) target = 'A1' as CellAddress;
      const match = target.match(/([A-Z]+)([0-9]+)/);
      if (!match) return;
      const [, colLetters, rowStr] = match;
      let rowIdx = parseInt(rowStr, 10) - 1;
      let colIdx = toIndex(colLetters);
      rowIdx = Math.max(0, Math.min(maxRows - 1, rowIdx + dy));
      colIdx = Math.max(0, Math.min(maxCols - 1, colIdx + dx));
      const newAddr = (toLetters(colIdx) + (rowIdx + 1)) as CellAddress;
      setSelected(newAddr);
      setEditing(null);
    },
    [selected, maxCols, maxRows]
  );

  const beginEdit = useCallback((addr: CellAddress) => {
    setSelected(addr);
    setEditing(addr);
  }, []);

  const cancelEdit = useCallback(() => setEditing(null), []);

  useEffect(() => {
    if (disabled) return;
    function handleNav(e: KeyboardEvent) {
      if (editing) return; // ignore while editing
      const k = e.key;
      if (
        isArrowKey(k) ||
        [Keys.Tab, Keys.Enter, Keys.Home, Keys.End].includes(k as any)
      ) {
        e.preventDefault();
        switch (k) {
          case Keys.ArrowUp:
            moveSelection(0, -1);
            break;
          case Keys.ArrowDown:
            moveSelection(0, 1);
            break;
          case Keys.ArrowLeft:
            moveSelection(-1, 0);
            break;
          case Keys.ArrowRight:
            moveSelection(1, 0);
            break;
          case Keys.Tab:
            moveSelection(e.shiftKey ? -1 : 1, 0);
            break;
          case Keys.Enter:
            moveSelection(0, e.shiftKey ? -1 : 1);
            break;
          case Keys.Home: {
            if (!selected) {
              setSelected('A1' as CellAddress);
              break;
            }
            const row = selected.match(/[0-9]+$/)?.[0] || '1';
            setSelected(('A' + row) as CellAddress);
            setEditing(null);
            break;
          }
          case Keys.End: {
            if (!selected) {
              setSelected('A1' as CellAddress);
              break;
            }
            const row = selected.match(/[0-9]+$/)?.[0] || '1';
            const lastCol = toLetters(maxCols - 1);
            setSelected((lastCol + row) as CellAddress);
            setEditing(null);
            break;
          }
        }
      }
    }
    window.addEventListener('keydown', handleNav);
    return () => window.removeEventListener('keydown', handleNav);
  }, [editing, moveSelection, selected, maxCols, maxRows, disabled]);

  return {
    selected,
    editing,
    setSelected,
    beginEdit,
    cancelEdit,
    moveSelection,
  };
}
