export interface ILimiter {
  /**
   * Checks if at least one token is currently available.
   * Does not modify the token bucket state.
   *
   * @returns {boolean} True if a token is available, false otherwise.
   */
  check(): boolean;

  /**
   * Removes a token from the bucket if one is available.
   *
   * @returns {boolean} True if a token was taken, false if none were available.
   */
  take(): boolean;

  /**
   * Immediately refills the token bucket to its maximum capacity.
   * Manual override — bypasses normal refill timing.
   */
  fill(): void;

  /**
   * Returns the number of milliseconds until the next token is scheduled to be added.
   *
   * @returns {number} Milliseconds until next token generation.
   */
  cooldown(): number;

  /**
   * Returns the current number of available tokens.
   *
   * @returns {number} Number of available tokens.
   */
  available(): number;

  /**
   * Returns an array of timestamps (in milliseconds) of the most recent token consumptions.
   *
   * @returns {number[]} Array of UNIX timestamps for past token consumptions.
   */
  logs(): number[];

  /**
   * Synchronously attempts to consume a token.
   *
   * @returns {boolean} True if a token was successfully consumed, false if none were available.
   */
  consumeSync(): boolean;

  /**
   * Asynchronously waits until a token is available, then consumes it.
   * Resolves once the token is taken.
   *
   * @returns {Promise<void>} Promise resolving when a token has been consumed.
   */
  consume(): Promise<void>;

  /**
   * Asynchronously waits until a token is available, without consuming it.
   * Resolves once a token is available.
   *
   * @returns {Promise<void>} Promise resolving when a token becomes available.
   */
  wait(): Promise<void>;
}

export type LimiterOptions = {
  /** Maximum number of tokens in the bucket */
  capacity: number;

  /** Number of tokens to regenerate per interval */
  refillRate: number;

  /** Interval in milliseconds over which refillRate tokens are added */
  interval: number;

  /** Maximum number of token usage timestamps to keep in the log */
  logSize?: number; // optional — defaults to e.g. 10 if omitted
};
