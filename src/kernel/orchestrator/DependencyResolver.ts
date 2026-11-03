import { IDependencyResolver, TaskGraph } from "./types";

export class DependencyResolver implements IDependencyResolver {
  /**
   * Calculates execution batches of tasks that can run in parallel.
   * Batch 0 contains tasks with no dependencies.
   * Batch 1 contains tasks whose dependencies are fully resolved in Batch 0, and so on.
   */
  public calculateExecutionOrder(graph: TaskGraph): string[][] {
    if (this.detectCycles(graph)) {
      throw new Error("Circular task dependency detected. Cannot plan execution.");
    }

    const batches: string[][] = [];
    const resolved = new Set<string>();
    const allTaskIds = Array.from(graph.tasks.keys());

    while (resolved.size < allTaskIds.length) {
      const currentBatch: string[] = [];

      for (const id of allTaskIds) {
        if (resolved.has(id)) continue;

        const task = graph.tasks.get(id);
        if (!task) continue;

        // Verify if all dependencies of the current task have been resolved
        const depsResolved = task.dependencies.every((depId) => resolved.has(depId));
        if (depsResolved) {
          currentBatch.push(id);
        }
      }

      if (currentBatch.length === 0) {
        // Safe-guard in case something went unaccounted for
        throw new Error("Task graph execution resolve dead-locked.");
      }

      batches.push(currentBatch);
      for (const id of currentBatch) {
        resolved.add(id);
      }
    }

    return batches;
  }

  /**
   * General DFS cycle-detector for directed task dependency graph.
   */
  public detectCycles(graph: TaskGraph): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const checkNode = (nodeId: string): boolean => {
      if (stack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      stack.add(nodeId);

      const task = graph.tasks.get(nodeId);
      if (task) {
        for (const depId of task.dependencies) {
          if (checkNode(depId)) return true;
        }
      }

      stack.delete(nodeId);
      return false;
    };

    for (const id of graph.tasks.keys()) {
      if (checkNode(id)) return true;
    }

    return false;
  }
}
export default DependencyResolver;
