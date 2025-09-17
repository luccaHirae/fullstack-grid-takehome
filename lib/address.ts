import { type CellAddress, toCellAddress } from '@/types';

// Column index to letters (0 -> A)
export function colToLetter(col: number): string {
  if (col < 0) throw new Error('Negative column');
  let s = '';
  let n = col;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

// Letters to column index (A -> 0)
export function letterToCol(letters: string): number {
  if (!/^[A-Z]+$/.test(letters)) throw new Error('Invalid letters');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// Parse address with optional $ markers
export function parseAddress(addr: string): {
  col: number;
  row: number;
  absoluteCol: boolean;
  absoluteRow: boolean;
} {
  const m = addr.match(/^(\$)?([A-Z]+)(\$)?(\d+)$/);
  if (!m) throw new Error(`Invalid address: ${addr}`);
  const [, colAbs, letters, rowAbs, digits] = m;
  const col = letterToCol(letters);
  const row = parseInt(digits, 10) - 1;
  return { col, row, absoluteCol: !!colAbs, absoluteRow: !!rowAbs };
}

export function formatAddress(
  col: number,
  row: number,
  absoluteCol: boolean = false,
  absoluteRow: boolean = false
): CellAddress {
  if (col < 0 || row < 0) throw new Error('Negative indices');
  const letters = colToLetter(col);
  const c = `${absoluteCol ? '$' : ''}${letters}`;
  const r = `${absoluteRow ? '$' : ''}${row + 1}`;
  return toCellAddress(c + r);
}

export function parseRange(range: string): {
  start: CellAddress;
  end: CellAddress;
} {
  const parts = range.split(':');
  if (parts.length !== 2) throw new Error('Invalid range');
  return { start: toCellAddress(parts[0]), end: toCellAddress(parts[1]) };
}

// Generator for iterating a rectangular region
export function* iterateRange(
  start: CellAddress,
  end: CellAddress,
  order: 'col-major' | 'row-major' = 'col-major'
): Generator<CellAddress> {
  const a = parseAddress(start);
  const b = parseAddress(end);
  const minCol = Math.min(a.col, b.col);
  const maxCol = Math.max(a.col, b.col);
  const minRow = Math.min(a.row, b.row);
  const maxRow = Math.max(a.row, b.row);
  if (order === 'col-major') {
    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        yield formatAddress(c, r);
      }
    }
  } else {
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        yield formatAddress(c, r);
      }
    }
  }
}

export function getCellsInRange(
  start: CellAddress,
  end: CellAddress
): CellAddress[] {
  return Array.from(iterateRange(start, end, 'col-major'));
}
