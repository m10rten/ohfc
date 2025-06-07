// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function once<T extends (...args: any[]) => any>(callback: T): T {
  let called = false;
  let result: ReturnType<T>;

  return function (...args: Parameters<T>) {
    if (!called) {
      result = callback(...args);
      called = true;
    }
    return result;
  } as T;
}

export default once;
