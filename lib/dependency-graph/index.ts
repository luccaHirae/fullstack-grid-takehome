import type { CellAddress } from '@/types';

export class DependencyGraph {
  private dependencies: Map<CellAddress, Set<CellAddress>> = new Map();
  private dependents: Map<CellAddress, Set<CellAddress>> = new Map();

  addDependency(from: CellAddress, to: CellAddress): void {
    if (!this.dependencies.has(from)) this.dependencies.set(from, new Set());
    if (!this.dependents.has(to)) this.dependents.set(to, new Set());
    this.dependencies.get(from)!.add(to);
    this.dependents.get(to)!.add(from);
  }

  removeDependencies(cell: CellAddress): void {
    const deps = this.dependencies.get(cell);
    if (!deps) return;
    for (const dep of deps) {
      const rev = this.dependents.get(dep);
      if (rev) {
        rev.delete(cell);
        if (rev.size === 0) this.dependents.delete(dep);
      }
    }
    this.dependencies.delete(cell);
  }

  getDependencies(cell: CellAddress): Set<CellAddress> {
    return this.dependencies.get(cell) || new Set();
  }

  getDependents(cell: CellAddress): Set<CellAddress> {
    return this.dependents.get(cell) || new Set();
  }

  hasCycle(from: CellAddress, to: CellAddress): boolean {
    if (from === to) return true;
    const visited = new Set<CellAddress>();
    const stack: CellAddress[] = [to];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === from) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const next = this.dependencies.get(cur);
      if (next) for (const n of next) stack.push(n);
    }
    return false;
  }

  getEvaluationOrder(cells: CellAddress[]): CellAddress[] {
    const cellSet = new Set(cells.map((c) => c));
    const inDegree: Map<CellAddress, number> = new Map();
    for (const c of cellSet) inDegree.set(c, 0);
    for (const c of cellSet) {
      const deps = this.dependencies.get(c);
      if (!deps) continue;
      for (const d of deps)
        if (cellSet.has(d)) inDegree.set(d, (inDegree.get(d) || 0) + 1);
    }
    const queue: CellAddress[] = [];
    for (const [c, deg] of inDegree) if (deg === 0) queue.push(c);
    const order: CellAddress[] = [];
    while (queue.length) {
      const cur = queue.shift()!;
      order.push(cur);
      const deps = this.dependencies.get(cur);
      if (!deps) continue;
      for (const d of deps) {
        if (!cellSet.has(d)) continue;
        const deg = (inDegree.get(d) || 0) - 1;
        inDegree.set(d, deg);
        if (deg === 0) queue.push(d);
      }
    }
    if (order.length !== cellSet.size) {
      for (const c of cellSet) if (!order.includes(c)) order.push(c);
    }
    return order;
  }
}
