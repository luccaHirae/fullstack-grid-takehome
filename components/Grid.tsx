'use client';

import React, { useRef } from 'react';
import { Cell } from '@/components/Cell';
import { GRID_DIMENSIONS } from '@/constants/dimentions';
import { colLetter } from '@/lib/utils';
import type { Sheet, Cell as CellType, CellAddress, EvalResult } from '@/types';

export interface GridProps {
  sheet: Sheet;
  evaluated?: Map<CellAddress, EvalResult>;
  maxCols?: number;
  maxRows?: number;
  selected: CellAddress | null;
  range?: { start: CellAddress; end: CellAddress } | null;
  onRangeChange?: (r: { start: CellAddress; end: CellAddress } | null) => void;
  onSelect: (addr: CellAddress) => void;
  onBeginEdit: (addr: CellAddress) => void;
  editing: CellAddress | null;
  onCommit: (
    addr: CellAddress,
    raw: string,
    source?: 'enter' | 'tab' | 'blur'
  ) => void;
  onCancelEdit: () => void;
}

export const Grid: React.FC<GridProps> = ({
  sheet,
  evaluated,
  maxCols = 26,
  maxRows = 50,
  selected,
  range,
  onRangeChange,
  onSelect,
  onBeginEdit,
  editing,
  onCommit,
  onCancelEdit,
}) => {
  const cols = Math.min(sheet.cols, maxCols);
  const rows = Math.min(sheet.rows, maxRows);

  // Helpers to convert addresses
  const parseAddr = (addr: CellAddress) => {
    const m = addr.match(/([A-Z]+)([0-9]+)/)!;
    const letters = m[1];
    const row = parseInt(m[2], 10) - 1;
    let col = 0;
    for (const ch of letters) col = col * 26 + (ch.charCodeAt(0) - 64);
    return { col: col - 1, row };
  };

  const inRange = (addr: CellAddress) => {
    if (!range) return false;
    const a = parseAddr(range.start);
    const b = parseAddr(range.end);
    const c = parseAddr(addr);
    const minCol = Math.min(a.col, b.col);
    const maxCol = Math.max(a.col, b.col);
    const minRow = Math.min(a.row, b.row);
    const maxRow = Math.max(a.row, b.row);
    return (
      c.col >= minCol && c.col <= maxCol && c.row >= minRow && c.row <= maxRow
    );
  };

  // Mouse drag selection
  const mouseDownRef = useRef(false);
  const anchorRef = useRef<CellAddress | null>(null);

  const handleMouseDown = (addr: CellAddress) => () => {
    mouseDownRef.current = true;
    anchorRef.current = addr;
    onSelect(addr);
    onRangeChange?.({ start: addr, end: addr });
  };

  const handleMouseEnter = (addr: CellAddress) => () => {
    if (!mouseDownRef.current || !anchorRef.current) return;
    onRangeChange?.({ start: anchorRef.current, end: addr });
  };

  const handleMouseUp = () => {
    mouseDownRef.current = false;
    anchorRef.current = null;
  };

  return (
    <div
      className='grid-wrapper border rounded bg-white relative'
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <table className='min-w-max border-collapse select-none text-sm'>
        <thead>
          <tr>
            <th className='grid-row-header-corner top-0 left-0 z-20 w-[var(--row-header-width)] h-[var(--header-height)]' />
            {Array.from({ length: cols }, (_, c) => (
              <th key={c} className='grid-col-header top-0 px-2'>
                {colLetter(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              <th className='grid-row-header left-0'>{r + 1}</th>
              {Array.from({ length: cols }, (_, c) => {
                const addr = (colLetter(c) + (r + 1)) as CellAddress;
                const cell: CellType | undefined = sheet.cells[addr];
                const evalResult = evaluated?.get(addr);
                return (
                  <Cell
                    key={addr}
                    address={addr}
                    cell={cell}
                    value={evalResult?.value}
                    error={evalResult?.error}
                    sheet={sheet}
                    selected={selected === addr}
                    rangeSelected={selected !== addr && inRange(addr)}
                    editing={editing === addr}
                    onSelect={() => onSelect(addr)}
                    onBeginEdit={() => onBeginEdit(addr)}
                    onCommit={onCommit}
                    onCancel={onCancelEdit}
                    onMouseDown={handleMouseDown(addr)}
                    onMouseEnter={handleMouseEnter(addr)}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {range &&
        (() => {
          const a = parseAddr(range.start);
          const b = parseAddr(range.end);
          const minCol = Math.min(a.col, b.col);
          const maxCol = Math.max(a.col, b.col);
          const minRow = Math.min(a.row, b.row);
          const maxRow = Math.max(a.row, b.row);
          const {
            cellWidth,
            cellHeight,
            rowHeaderWidth: leftOffset,
            headerHeight: topOffset,
          } = GRID_DIMENSIONS;
          const x = leftOffset + minCol * cellWidth;
          const y = topOffset + minRow * cellHeight;
          const w = (maxCol - minCol + 1) * cellWidth;
          const h = (maxRow - minRow + 1) * cellHeight;
          return (
            <div
              className='pointer-events-none absolute z-30'
              style={{
                transform: `translate(${x}px, ${y}px)`,
                width: w,
                height: h,
              }}
            >
              <div className='range-overlay-box w-full h-full' />
            </div>
          );
        })()}
    </div>
  );
};
