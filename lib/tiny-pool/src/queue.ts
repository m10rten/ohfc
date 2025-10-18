export type Task<T, R = unknown> = {
  data: T;
  resolve: (value: R) => void;
  reject: (reason?: unknown) => void;
};

export class TaskQueue<T, R = unknown> {
  private readonly queue: Task<T, R>[] = [];

  enqueue(task: Task<T, R>): void {
    this.queue.push(task);
  }

  dequeue(): Task<T, R> | undefined {
    return this.queue.shift();
  }

  get length(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.length = 0;
  }
}
