export type Task<T> = {
  data: T;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

export class TaskQueue<T> {
  private queue: Task<T>[] = [];

  enqueue(task: Task<T>): void {
    this.queue.push(task);
  }

  dequeue(): Task<T> | undefined {
    return this.queue.shift();
  }

  get length(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}
