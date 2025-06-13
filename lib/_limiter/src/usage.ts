export class Usage {
  private readonly maxLogSize: number;
  private readonly timestamps: number[] = [];

  constructor(maxLogSize: number) {
    this.maxLogSize = maxLogSize;
  }

  add(): void {
    this.timestamps.push(Date.now());
    if (this.timestamps.length > this.maxLogSize) {
      this.timestamps.shift();
    }
  }

  getLogs(): number[] {
    return [...this.timestamps];
  }
}
