import type { Sheet, CellAddress, ExplainTrace } from '@/types';

export interface EvalContext {
  sheet: Sheet;
  currentCell: CellAddress;
  visited: Set<CellAddress>;
  trace: ExplainTrace[];
}
