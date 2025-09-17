import {
  Sheet,
  Cell,
  CellAddress,
  FormulaAst,
  CellValue,
  EvalResult,
  ExplainTrace,
} from '@/types';
import { parseFormula } from '@/lib/parser';
import { iterateRange } from '@/lib/address';
import { evaluateFunction } from '@/lib/dependency-graph/function-registry';
import { EvalContext } from '@/lib/dependency-graph/types';
import { DependencyGraph } from '@/lib/dependency-graph';
export { DependencyGraph } from '@/lib/dependency-graph';

// Main evaluation engine
export class FormulaEngine {
  private depGraph: DependencyGraph = new DependencyGraph();

  evaluateSheet(sheet: Sheet): Map<CellAddress, EvalResult> {
    // Build dependency graph fresh
    this.depGraph = new DependencyGraph();
    const formulaCells: CellAddress[] = [];
    for (const addr in sheet.cells) {
      const a = addr as CellAddress;
      const cell = sheet.cells[a];
      if (cell && cell.kind === 'formula' && cell.ast) {
        formulaCells.push(a);
        // Extract dependencies from AST (shallow traversal)
        const stack: FormulaAst[] = [cell.ast];
        const seen = new Set<string>();
        while (stack.length) {
          const node = stack.pop()!;
          switch (node.type) {
            case 'ref':
              if (!seen.has(node.address)) {
                if (!this.depGraph.hasCycle(a, node.address)) {
                  this.depGraph.addDependency(a, node.address);
                }
                seen.add(node.address);
              }
              break;
            case 'range':
              // For ordering, treat range endpoints as dependencies (simplistic)
              if (!seen.has(node.start)) {
                if (!this.depGraph.hasCycle(a, node.start))
                  this.depGraph.addDependency(a, node.start);
                seen.add(node.start);
              }
              if (!seen.has(node.end)) {
                if (!this.depGraph.hasCycle(a, node.end))
                  this.depGraph.addDependency(a, node.end);
                seen.add(node.end);
              }
              break;
            case 'function':
              for (const arg of node.args) stack.push(arg);
              break;
            case 'binary':
              stack.push(node.left, node.right);
              break;
            case 'unary':
              stack.push(node.operand);
              break;
            default:
              break;
          }
        }
      }
    }
    const order = this.depGraph.getEvaluationOrder(formulaCells);
    const results = new Map<CellAddress, EvalResult>();
    for (const addr of order) {
      results.set(addr, this.evaluateCell(sheet, addr));
    }
    return results;
  }

  evaluateCell(
    sheet: Sheet,
    address: CellAddress,
    trace: boolean = false,
    sharedVisited?: Set<CellAddress>
  ): EvalResult & { explain?: ExplainTrace[] } {
    const cell = sheet.cells[address];
    if (!cell) return { value: null };
    if (cell.kind === 'literal') return { value: cell.value };
    if (cell.kind === 'error')
      return { value: null, error: { code: cell.code, message: cell.message } };
    // Formula
    let ast: FormulaAst | null = cell.ast;
    try {
      if (!ast) {
        // Parse if missing
        ast = parseFormula(
          cell.src.startsWith('=') ? cell.src.slice(1) : cell.src
        );
        cell.ast = ast;
      }
    } catch (e: any) {
      return { value: null, error: { code: 'PARSE', message: e.message } };
    }
    const ctx: EvalContext = {
      sheet,
      currentCell: address,
      // Use a shared visited set propagated through recursive top-level evaluateCell calls
      visited: sharedVisited ?? new Set<CellAddress>(),
      trace: [],
    };
    if (ctx.visited.has(address)) {
      return {
        value: null,
        error: { code: 'CYCLE', message: 'Circular reference' },
      };
    }
    ctx.visited.add(address);
    try {
      const value = this.evaluateAst(ast, ctx);
      const result: EvalResult & { explain?: ExplainTrace[] } = { value };
      if (trace) result.explain = ctx.trace;
      ctx.visited.delete(address);
      return result;
    } catch (e: any) {
      ctx.visited.delete(address);
      if (e && e.__cycle) {
        return {
          value: null,
          error: { code: 'CYCLE', message: 'Circular reference' },
        };
      }
      if (e && e.__ref) {
        return {
          value: null,
          error: { code: 'REF', message: 'Bad reference' },
        };
      }
      if (e && e.__div0) {
        return {
          value: null,
          error: { code: 'DIV0', message: 'Division by zero' },
        };
      }
      return {
        value: null,
        error: { code: 'PARSE', message: e.message || 'Error' },
      };
    }
  }

  private evaluateAst(ast: FormulaAst, ctx: EvalContext): CellValue {
    // Recursively evaluate AST nodes
    switch (ast.type) {
      case 'number':
        return ast.value;
      case 'string':
        return ast.value;
      case 'boolean':
        return ast.value;
      case 'ref':
        return this.evaluateCellRef(ast.address, ctx);
      case 'range':
        // Ranges only valid inside functions; if encountered directly return first cell value
        const values = this.evaluateRange(ast.start, ast.end, ctx);
        return values.length ? values[0] ?? null : null;
      case 'function':
        return this.evaluateFunction(ast.name, ast.args, ctx);
      case 'binary':
        return this.evaluateBinaryOp(ast.op, ast.left, ast.right, ctx);
      case 'unary':
        const v = this.evaluateAst(ast.operand, ctx);
        if (v == null) return 0;
        if (typeof v === 'number') return -v;
        if (typeof v === 'boolean') return v ? -1 : 0;
        const num = Number(v);
        return isNaN(num) ? 0 : -num;
      default:
        throw new Error('Unknown AST node type');
    }
  }

  private evaluateCellRef(address: CellAddress, ctx: EvalContext): CellValue {
    if (ctx.visited.has(address)) {
      const err: any = new Error('Cycle');
      err.__cycle = true;
      throw err;
    }
    const target = ctx.sheet.cells[address];
    if (!target) {
      const err: any = new Error('Bad ref');
      err.__ref = true;
      throw err;
    }
    let value: CellValue = null;
    if (target.kind === 'literal') value = target.value;
    else if (target.kind === 'error') {
      const err: any = new Error(target.message);
      err.__ref = target.code === 'REF';
      if (target.code === 'CYCLE') err.__cycle = true;
      if (target.code === 'DIV0') err.__div0 = true;
      throw err;
    } else if (target.kind === 'formula') {
      // Evaluate nested formula
      const nested = this.evaluateCell(ctx.sheet, address, false, ctx.visited);
      if (nested.error) {
        const err: any = new Error(nested.error.message);
        if (nested.error.code === 'CYCLE') err.__cycle = true;
        if (nested.error.code === 'REF') err.__ref = true;
        if (nested.error.code === 'DIV0') err.__div0 = true;
        throw err;
      }
      value = nested.value;
    }
    if (ctx.trace) {
      ctx.trace.push({
        cell: ctx.currentCell,
        dependencies: [address],
        ranges: [],
        value,
        formula:
          ctx.sheet.cells[ctx.currentCell]?.kind === 'formula'
            ? (ctx.sheet.cells[ctx.currentCell] as any).src
            : undefined,
      });
    }
    return value;
  }

  private evaluateRange(
    start: CellAddress,
    end: CellAddress,
    ctx: EvalContext
  ): CellValue[] {
    const collect: CellValue[] = [];
    for (const addr of iterateRange(start, end, 'col-major')) {
      try {
        collect.push(this.evaluateCellRef(addr, ctx));
      } catch {
        /* skip error cells inside ranges */
      }
    }
    if (ctx.trace)
      ctx.trace.push({
        cell: ctx.currentCell,
        dependencies: [],
        ranges: [{ start, end }],
        value: null,
        formula:
          ctx.sheet.cells[ctx.currentCell]?.kind === 'formula'
            ? (ctx.sheet.cells[ctx.currentCell] as any).src
            : undefined,
      });
    return collect;
  }

  private evaluateFunction(
    name: string,
    args: FormulaAst[],
    ctx: EvalContext
  ): CellValue {
    return evaluateFunction(name, args, ctx, (a, innerCtx) =>
      this.evaluateAst(a, innerCtx)
    );
  }

  private evaluateBinaryOp(
    op: string,
    left: FormulaAst,
    right: FormulaAst,
    ctx: EvalContext
  ): CellValue {
    const l = this.evaluateAst(left, ctx);
    const r = this.evaluateAst(right, ctx);
    const canNum = (v: CellValue) => {
      if (v == null) return false;
      if (typeof v === 'number') return true;
      if (typeof v === 'boolean') return true;
      const n = Number(v);
      return !isNaN(n);
    };
    const toNum = (v: CellValue): number => {
      if (v == null) return 0;
      if (typeof v === 'number') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };
    const toStr = (v: CellValue): string => (v == null ? '' : String(v));
    const bothNumeric = canNum(l) && canNum(r);
    switch (op) {
      case '+':
        // Concat if either operand is non-numeric and not boolean
        if (!bothNumeric) {
          return toStr(l) + toStr(r);
        }
        return toNum(l) + toNum(r);
      case '-':
        return toNum(l) - toNum(r);
      case '*':
        return toNum(l) * toNum(r);
      case '/':
        if (toNum(r) === 0) {
          const err: any = new Error('Div0');
          err.__div0 = true;
          throw err;
        }
        return toNum(l) / toNum(r);
      case '^':
        return Math.pow(toNum(l), toNum(r));
      case '<':
        return bothNumeric
          ? toNum(l) < toNum(r)
          : toStr(l).localeCompare(toStr(r)) < 0;
      case '<=':
        return bothNumeric
          ? toNum(l) <= toNum(r)
          : toStr(l).localeCompare(toStr(r)) <= 0;
      case '>':
        return bothNumeric
          ? toNum(l) > toNum(r)
          : toStr(l).localeCompare(toStr(r)) > 0;
      case '>=':
        return bothNumeric
          ? toNum(l) >= toNum(r)
          : toStr(l).localeCompare(toStr(r)) >= 0;
      case '=':
        if (bothNumeric) return toNum(l) === toNum(r);
        return toStr(l) === toStr(r);
      case '<>':
        if (bothNumeric) return toNum(l) !== toNum(r);
        return toStr(l) !== toStr(r);
      default:
        throw new Error(`Unknown operator ${op}`);
    }
  }

  updateCell(
    sheet: Sheet,
    address: CellAddress,
    cell: Cell | undefined
  ): Sheet {
    if (cell) sheet.cells[address] = cell;
    else delete sheet.cells[address];
    // Rebuild graph for this cell only
    this.depGraph.removeDependencies(address);
    if (cell && cell.kind === 'formula') {
      try {
        if (!cell.ast)
          cell.ast = parseFormula(
            cell.src.startsWith('=') ? cell.src.slice(1) : cell.src
          );
        const stack: FormulaAst[] = [cell.ast];
        const seen = new Set<string>();
        while (stack.length) {
          const node = stack.pop()!;
          switch (node.type) {
            case 'ref':
              if (!seen.has(node.address)) {
                if (!this.depGraph.hasCycle(address, node.address))
                  this.depGraph.addDependency(address, node.address);
                seen.add(node.address);
              }
              break;
            case 'range':
              if (!seen.has(node.start)) {
                if (!this.depGraph.hasCycle(address, node.start))
                  this.depGraph.addDependency(address, node.start);
                seen.add(node.start);
              }
              if (!seen.has(node.end)) {
                if (!this.depGraph.hasCycle(address, node.end))
                  this.depGraph.addDependency(address, node.end);
                seen.add(node.end);
              }
              break;
            case 'function':
              for (const arg of node.args) stack.push(arg);
              break;
            case 'binary':
              stack.push(node.left, node.right);
              break;
            case 'unary':
              stack.push(node.operand);
              break;
            default:
              break;
          }
        }
      } catch (e) {
        // parse error will reflect when evaluating
      }
    }
    // Collect affected cells (address plus all dependents recursively)
    const toEval: Set<CellAddress> = new Set([address]);
    const queue: CellAddress[] = [address];
    while (queue.length) {
      const cur = queue.shift()!;
      const dependents = this.depGraph.getDependents(cur);
      for (const d of dependents)
        if (!toEval.has(d)) {
          toEval.add(d);
          queue.push(d);
        }
    }
    // Evaluate in topological order
    const order = this.depGraph.getEvaluationOrder(Array.from(toEval));
    for (const addr of order) {
      const c = sheet.cells[addr];
      if (c && c.kind === 'formula') this.evaluateCell(sheet, addr);
    }
    sheet.updatedAt = new Date();
    return sheet;
  }
}

// Singleton instance
export const engine = new FormulaEngine();
