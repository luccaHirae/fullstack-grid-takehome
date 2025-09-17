import {
  colToLetter,
  letterToCol,
  parseAddress,
  formatAddress,
  parseRange,
  getCellsInRange,
} from '@/lib/address';
import type { CellAddress } from '@/types';

export {
  colToLetter,
  letterToCol,
  parseAddress,
  formatAddress,
  parseRange,
  getCellsInRange,
};

// Adjust a cell reference when rows/columns are inserted or deleted
export function adjustReference(
  addr: CellAddress,
  insertedAt: { row?: number; col?: number },
  deletedAt: { row?: number; col?: number },
  isAbsolute: { col: boolean; row: boolean }
): CellAddress {
  // TODO: Adjust cell reference based on insert/delete operations
  // Respect absolute references (don't adjust if absolute)
  throw new Error('Not implemented');
}

// Transform a formula when copying/pasting (relative refs change, absolute don't)
export function transformFormula(
  formula: string,
  fromCell: CellAddress,
  toCell: CellAddress
): string {
  // TODO: Transform formula references based on relative offset
  // Parse formula, adjust all relative refs, preserve absolute refs
  throw new Error('Not implemented');
}

// Check if a cell address is valid for given sheet dimensions
export function isValidAddress(
  addr: CellAddress,
  maxRows: number,
  maxCols: number
): boolean {
  try {
    const { col, row } = parseAddress(addr);
    return row >= 0 && row < maxRows && col >= 0 && col < maxCols;
  } catch {
    return false;
  }
}

// Get neighboring cell address (for arrow key navigation)
export function getNeighbor(
  addr: CellAddress,
  direction: 'up' | 'down' | 'left' | 'right',
  maxRows: number,
  maxCols: number
): CellAddress | null {
  const { col, row } = parseAddress(addr);
  let nc = col;
  let nr = row;
  switch (direction) {
    case 'up':
      nr = row - 1;
      break;
    case 'down':
      nr = row + 1;
      break;
    case 'left':
      nc = col - 1;
      break;
    case 'right':
      nc = col + 1;
      break;
  }
  if (nr < 0 || nr >= maxRows || nc < 0 || nc >= maxCols) return null;
  return formatAddress(nc, nr);
}
