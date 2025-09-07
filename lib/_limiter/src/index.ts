import { Usage } from "./usage.js";
import { Bucket } from "./bucket.js";

import type { ILimiter, LimiterOptions } from "./types.ts";

export * from "./usage.js";
export * from "./bucket.js";

export type * from "./types.ts";

/**
 * A token bucket rate limiter for controlling the rate of actions.
 *
 * Supports both synchronous and asynchronous consumption, manual refilling,
 * cooldown calculation, and consumption logging.
 */
export class Limiter implements ILimiter {
  private readonly options: LimiterOptions;
  private readonly bucket: Bucket;
  private readonly usage: Usage;
  private lastRefill: number;
  /**
   * Creates a new Limiter instance.
   *
   * @param {LimiterOptions} options Configuration options for the limiter.
   */
  public constructor(options?: Partial<LimiterOptions>) {
    const defaultOptions: LimiterOptions = {
      capacity: 10,
      interval: 10_000,
      refillRate: 5,
      logSize: 10,
    };
    this.options = { ...defaultOptions, ...options };
    this.bucket = new Bucket(this.options.capacity);
    this.usage = new Usage(this.options.logSize ?? 10);
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;

    const tokensToAdd = Math.floor((elapsed / this.options.interval) * this.options.refillRate);

    if (tokensToAdd > 0) {
      this.bucket.refill(tokensToAdd);
      this.lastRefill = now;
    }
  }

  check(): boolean {
    this.refill();
    return this.bucket.available() > 0;
  }

  take(): boolean {
    this.refill();
    if (this.bucket.consume()) {
      this.usage.add();
      return true;
    }
    return false;
  }

  fill(): void {
    this.bucket.fill();
    this.lastRefill = Date.now();
  }

  cooldown(): number {
    this.refill();
    if (this.bucket.available() > 0) return 0;

    const timePerToken = this.options.interval / this.options.refillRate;
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const timeUntilNext = timePerToken - (elapsed % timePerToken);

    return Math.max(0, Math.floor(timeUntilNext));
  }

  available(): number {
    this.refill();
    return this.bucket.available();
  }

  logs(): number[] {
    return this.usage.getLogs();
  }

  consumeSync(): boolean {
    return this.take();
  }

  async consume(): Promise<void> {
    while (!this.take()) {
      await this.sleep(this.cooldown());
    }
  }

  async wait(): Promise<void> {
    while (!this.check()) {
      await this.sleep(this.cooldown());
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
