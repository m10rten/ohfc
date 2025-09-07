export type Check<T> = (value: T) => boolean;

export type Validator<T> = {
  check(fn: Check<T>, message?: string): Validator<T>;
  parse(value: unknown): T;
  is(value: unknown): value is T;
  default(defaultValue: T): Validator<T>;
  transform<U>(fn: (value: T) => U): Validator<U>;
  nullish(): Validator<T | null | undefined>;
  array(): Validator<T[]>;
  _output: T;
};
