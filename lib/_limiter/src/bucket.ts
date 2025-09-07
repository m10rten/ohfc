export class Bucket {
  private tokens: number;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.tokens = capacity;
  }

  refill(amount: number): void {
    this.tokens = Math.min(this.tokens + amount, this.capacity);
  }

  fill(): void {
    this.tokens = this.capacity;
  }

  consume(): boolean {
    if (this.tokens > 0) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  available(): number {
    return this.tokens;
  }
}
