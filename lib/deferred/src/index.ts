export class Deferred<T = void> {
  public readonly promise: Promise<T>;
  public resolve!: (value: T | PromiseLike<T>) => void;
  public reject!: (reason: unknown) => void;
  private _isResolved = false;
  private _isRejected = false;

  get isResolved() {
    return this._isResolved;
  }
  get isRejected() {
    return this._isRejected;
  }
  get isPending() {
    return !this._isResolved && !this._isRejected;
  }

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = (value) => {
        this._isResolved = true;
        resolve(value);
      };
      this.reject = (reason) => {
        this._isRejected = true;
        reject(reason);
      };
    });
  }
}

export default Deferred;
