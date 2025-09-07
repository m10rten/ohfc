import { ValidationError } from "./errors.js";
import { is } from "./is.js";
import type { Check, Validator } from "./types.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeValidator<T>(
  baseCheck: (value: unknown) => value is T,
  checks: Array<{ fn: Check<T>; message?: string }> = [],
  transformer: (value: unknown) => T = (v) => v as T,
): Validator<T> {
  const validator: Validator<T> = {
    check(fn, message) {
      return makeValidator(baseCheck, [...checks, { fn, message }], transformer);
    },
    parse(value: unknown): T {
      const transformed = transformer(value);
      if (!baseCheck(transformed)) {
        throw new ValidationError(`Type validation failed for value: ${JSON.stringify(transformed)}`);
      }
      for (const { fn, message } of checks) {
        if (!fn(transformed)) {
          throw new ValidationError(
            message
              ? `${message} (on value: ${JSON.stringify(transformed)})`
              : `Validation check failed on value: ${JSON.stringify(transformed)}`,
          );
        }
      }
      return transformed;
    },
    is(value: unknown): value is T {
      try {
        validator.parse(value);
        return true;
      } catch {
        return false;
      }
    },
    default(defaultValue: T) {
      // Compose: first apply default, then previous transformer
      return makeValidator(baseCheck, checks, (value: unknown) => transformer(value == null ? defaultValue : value));
    },
    transform<U>(fn: (value: T) => U): Validator<U> {
      // Compose: first apply previous transformer, then fn
      return makeValidator(
        // The baseCheck for U is always true; checks are not carried over
        (_): _ is U => true,
        [],
        (value: unknown) => fn(transformer(value)),
      );
    },
    nullish() {
      return makeValidator<T | null | undefined>(
        (v): v is T | null | undefined => v === null || v === undefined || baseCheck(v),
        [],
        (value: unknown) => (value == null ? value : transformer(value)),
      );
    },
    array() {
      return makeValidator<T[]>(
        (v): v is T[] =>
          is.array(v) &&
          v.every((item) => {
            try {
              validator.parse(item);
              return true;
            } catch {
              return false;
            }
          }),
        [],
        (value: unknown) => {
          if (!is.array(value)) return value as T[];
          return value.map((item) => validator.parse(item));
        },
      );
    },
    _output: undefined as unknown as T,
  };
  return validator;
}

export const t = {
  string: () => makeValidator<string>((v): v is string => is.string(v)),
  number: () => makeValidator<number>((v): v is number => is.number(v)),
  boolean: () => makeValidator<boolean>((v): v is boolean => is.boolean(v)),
  null: () => makeValidator<null>((v): v is null => is.null(v)),
  undefined: () => makeValidator<undefined>((v): v is undefined => is.undefined(v)),
  nullish: () => makeValidator<null | undefined>((v): v is null | undefined => is.nullish(v)),
  object: <S extends Record<string, Validator<any>>>(shape: S) =>
    makeValidator(
      (v): v is { [K in keyof S]: ReturnType<S[K]["parse"]> } =>
        typeof v === "object" && v !== null && Object.keys(shape).every((k) => k in (v as any)),
    ).check((v) => {
      // Validate all fields and collect errors
      for (const key in shape) {
        try {
          shape[key]?.parse((v as any)[key]);
        } catch (err) {
          // Attach key and value info to the error message
          throw new ValidationError(
            `Validation failed on key "${key}" with value: ${JSON.stringify((v as any)[key])}.` +
              (err instanceof ValidationError ? ` Reason: ${err.message}` : ""),
          );
        }
      }
      return true;
    }),
  is,
};

export default t;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace t {
  export type infer<T> = T extends { _output?: infer R } ? R : never;
}
