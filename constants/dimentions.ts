export const GRID_DIMENSIONS = {
  cellWidth: 104, // --cell-width
  cellHeight: 32, // --cell-height
  rowHeaderWidth: 40, // --row-header-width
  headerHeight: 32, // --header-height
} as const;

export type GridDimensions = typeof GRID_DIMENSIONS;
