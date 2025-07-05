export const string = (v: unknown): v is string => typeof v === "string" || v instanceof String;

export const number = (v: unknown): v is number => typeof v === "number" || v instanceof Number;

export const boolean = (v: unknown): v is boolean => typeof v === "boolean" || v instanceof Boolean;

export const map = (v: unknown): v is Map<unknown, unknown> => typeof v === "object" && v instanceof Map;
export const set = (v: unknown): v is Set<unknown> => typeof v === "object" && v instanceof Set;

export const nullish = (v: unknown): v is null | undefined => v === null || v === undefined;

export const array = <T>(v: unknown, guard?: (x: unknown) => x is T): v is T[] =>
  Array.isArray(v) && (!guard || v.every(guard));

export const object = <T extends Record<string, unknown>>(
  v: unknown,
  shape?: { [K in keyof T]: (x: unknown) => x is T[K] },
): v is T =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof v === "object" && v !== null && (!shape || Object.entries(shape).every(([k, g]) => g((v as any)[k])));

export const oneOf = <T>(v: unknown, ...guards: Array<(x: unknown) => x is T>): v is T => guards.some((g) => g(v));

export const optional = <T>(v: unknown, guard: (x: unknown) => x is T): v is T | undefined =>
  v === undefined || guard(v);

export const custom =
  <T>(guard: (x: unknown) => boolean) =>
  (v: unknown): v is T =>
    guard(v);

export const is = {
  null: (v: unknown): v is null => v === null,
  undefined: (v: unknown): v is undefined => v === undefined,
  string,
  number,
  boolean,
  array,
  object,
  nullish,
};

export default is;
