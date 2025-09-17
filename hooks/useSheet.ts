import { useState, useCallback, useEffect } from 'react';
import { parseFormula } from '@/lib/parser';
import { engine } from '@/lib/engine';
import type { Sheet, CellAddress, Cell } from '@/types';

interface UseSheetResult {
  sheet: Sheet | null;
  evaluated: Map<CellAddress, any>;
  loading: boolean;
  fetchSheet: () => Promise<void>;
  commitCell: (addr: CellAddress, raw: string) => Promise<void>;
}

export function useSheet(sheetId: string): UseSheetResult {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [evaluated, setEvaluated] = useState<Map<CellAddress, any>>(new Map());
  const [loading, setLoading] = useState(true);

  const parseAll = useCallback((s: Sheet) => {
    for (const addr in s.cells) {
      const cell = s.cells[addr as CellAddress];
      if (cell?.kind === 'formula' && !cell.ast) {
        try {
          cell.ast = parseFormula(
            cell.src.startsWith('=') ? cell.src.slice(1) : cell.src
          );
        } catch {
          // parse error will reflect when evaluating
        }
      }
    }
  }, []);

  const fetchSheet = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sheets/${sheetId}`);
      if (response.ok) {
        const data: Sheet = await response.json();
        parseAll(data);
        setSheet(data);
        setEvaluated(engine.evaluateSheet(data));
      }
    } catch (e) {
      console.error('Failed to fetch sheet:', e);
    } finally {
      setLoading(false);
    }
  }, [sheetId, parseAll]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  const commitCell = useCallback(
    async (addr: CellAddress, raw: string) => {
      if (!sheet) return;
      const trimmed = raw.trim();
      let editBody: { addr: CellAddress; kind: string; [key: string]: any };
      if (trimmed === '') {
        editBody = { addr, kind: 'clear' };
      } else if (trimmed.startsWith('=')) {
        editBody = { addr, kind: 'formula', formula: trimmed };
      } else if (!isNaN(Number(trimmed))) {
        editBody = { addr, kind: 'literal', value: Number(trimmed) };
      } else if (['true', 'false'].includes(trimmed.toLowerCase())) {
        editBody = {
          addr,
          kind: 'literal',
          value: trimmed.toLowerCase() === 'true',
        };
      } else {
        editBody = { addr, kind: 'literal', value: trimmed };
      }

      setSheet((prev) => {
        if (!prev) return prev;
        const next: Sheet = { ...prev, cells: { ...prev.cells } };
        if (editBody.kind === 'clear') {
          delete next.cells[addr];
          engine.updateCell(next, addr, undefined);
        } else if (editBody.kind === 'literal') {
          next.cells[addr] = { kind: 'literal', value: editBody.value } as Cell;
          engine.updateCell(next, addr, next.cells[addr]);
        } else if (editBody.kind === 'formula') {
          next.cells[addr] = {
            kind: 'formula',
            src: editBody.formula,
            ast: null as any,
          } as Cell;
          try {
            (next.cells[addr] as any).ast = parseFormula(
              editBody.formula.startsWith('=')
                ? editBody.formula.slice(1)
                : editBody.formula
            );
          } catch {}
          engine.updateCell(next, addr, next.cells[addr]);
        }
        setEvaluated(engine.evaluateSheet(next));
        return { ...next, updatedAt: new Date() };
      });

      try {
        const res = await fetch(`/api/sheets/${sheetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edits: [editBody] }),
        });
        if (!res.ok) {
          console.error('Failed to persist edit');
          fetchSheet();
        } else {
          const updated: Sheet = await res.json();
          parseAll(updated);
          setSheet(updated);
          setEvaluated(engine.evaluateSheet(updated));
        }
      } catch (err) {
        console.error('Network error editing cell', err);
        fetchSheet();
      }
    },
    [sheet, sheetId, parseAll, fetchSheet]
  );

  return { sheet, evaluated, loading, fetchSheet, commitCell };
}
