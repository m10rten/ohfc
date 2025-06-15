export const is = {
  string: (v: unknown): v is string => typeof v === "string",

  number: (v: unknown): v is number => typeof v === "number",

  boolean: (v: unknown): v is boolean => typeof v === "boolean",

  null: (v: unknown): v is null => v === null,

  undefined: (v: unknown): v is undefined => v === undefined,

  nullish: (v: unknown): v is null | undefined => v === null || v === undefined,

  array: <T>(v: unknown, guard?: (x: unknown) => x is T): v is T[] => Array.isArray(v) && (!guard || v.every(guard)),

  object: <T extends Record<string, unknown>>(
    v: unknown,
    shape?: { [K in keyof T]: (x: unknown) => x is T[K] },
  ): v is T =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof v === "object" && v !== null && (!shape || Object.entries(shape).every(([k, g]) => g((v as any)[k]))),

  oneOf: <T>(v: unknown, ...guards: Array<(x: unknown) => x is T>): v is T => guards.some((g) => g(v)),

  optional: <T>(v: unknown, guard: (x: unknown) => x is T): v is T | undefined => v === undefined || guard(v),

  custom:
    <T>(guard: (x: unknown) => boolean) =>
    (v: unknown): v is T =>
      guard(v),
};
