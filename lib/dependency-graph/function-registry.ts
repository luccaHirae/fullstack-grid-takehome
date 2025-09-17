import { iterateRange } from '@/lib/address';
import type { FormulaAst, CellValue } from '@/types';
import type { EvalContext } from '@/lib/dependency-graph/types';

export type FunctionHandler = (
  args: FormulaAst[],
  ctx: EvalContext,
  evalAst: (a: FormulaAst, ctx: EvalContext) => CellValue
) => CellValue;

function flatten(values: (CellValue | CellValue[])[]): CellValue[] {
  const out: CellValue[] = [];
  for (const v of values) Array.isArray(v) ? out.push(...v) : out.push(v);
  return out;
}

const handlers: Record<string, FunctionHandler> = {
  SUM(args, ctx, evalAst) {
    const vals = flatten(
      args.map((a) =>
        a.type === 'range' ? [...rangeValues(a, ctx, evalAst)] : evalAst(a, ctx)
      ) as any
    );
    let sum = 0;
    for (const v of vals) if (typeof v === 'number') sum += v;
    return sum;
  },
  AVG(args, ctx, evalAst) {
    const vals = flatten(
      args.map((a) =>
        a.type === 'range' ? [...rangeValues(a, ctx, evalAst)] : evalAst(a, ctx)
      ) as any
    );
    let sum = 0,
      count = 0;
    for (const v of vals)
      if (typeof v === 'number') {
        sum += v;
        count++;
      }
    return count ? sum / count : 0;
  },
  MIN(args, ctx, evalAst) {
    const vals = flatten(
      args.map((a) =>
        a.type === 'range' ? [...rangeValues(a, ctx, evalAst)] : evalAst(a, ctx)
      ) as any
    ).filter((v) => typeof v === 'number') as number[];
    return vals.length ? Math.min(...vals) : 0;
  },
  MAX(args, ctx, evalAst) {
    const vals = flatten(
      args.map((a) =>
        a.type === 'range' ? [...rangeValues(a, ctx, evalAst)] : evalAst(a, ctx)
      ) as any
    ).filter((v) => typeof v === 'number') as number[];
    return vals.length ? Math.max(...vals) : 0;
  },
  COUNT(args, ctx, evalAst) {
    const vals = flatten(
      args.map((a) =>
        a.type === 'range' ? [...rangeValues(a, ctx, evalAst)] : evalAst(a, ctx)
      ) as any
    );
    let count = 0;
    for (const v of vals) if (v !== null && v !== undefined) count++;
    return count;
  },
  IF(args, ctx, evalAst) {
    if (args.length < 2) return null;
    const cond = evalAst(args[0], ctx);
    const truthy = !!cond;
    return truthy
      ? args[1]
        ? evalAst(args[1], ctx)
        : null
      : args[2]
      ? evalAst(args[2], ctx)
      : null;
  },
};

function* rangeValues(
  node: FormulaAst & { type: 'range' },
  ctx: EvalContext,
  evalAst: (a: FormulaAst, ctx: EvalContext) => CellValue
): Generator<CellValue> {
  for (const cell of iterateRange(node.start, node.end, 'col-major')) {
    const refNode: FormulaAst = {
      type: 'ref',
      address: cell,
      absolute: { col: false, row: false },
    } as any;
    try {
      const v = evalAst(refNode, ctx);
      yield v;
    } catch {
      continue; // skip errors inside ranges
    }
  }
}

export function evaluateFunction(
  name: string,
  args: FormulaAst[],
  ctx: EvalContext,
  evalAst: (a: FormulaAst, ctx: EvalContext) => CellValue
): CellValue {
  const handler = handlers[name.toUpperCase()];
  if (!handler) {
    const err: any = new Error(`Unknown function: ${name}`);
    err.__parse = true;
    throw err;
  }
  return handler(args, ctx, evalAst);
}
