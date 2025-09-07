type Subscriber<T> = (value: T) => void;

interface SubscriberRef<T> {
  ref: WeakRef<Subscriber<T>>;
  cleanupToken: Subscriber<T>;
}

/**
 * Signal class that holds a reactive value.
 */
export class Signal<T> {
  private _value: T;
  private readonly subscribers: Set<SubscriberRef<T>>;
  private readonly registry: FinalizationRegistry<SubscriberRef<T>>;

  constructor(initial: T) {
    this._value = initial;
    this.subscribers = new Set();
    this.registry = new FinalizationRegistry((heldRef) => {
      this.subscribers.delete(heldRef);
    });
  }

  /**
   * Get the current value of the signal.
   */
  get value(): T {
    return this._value;
  }
  get(): T {
    return this._value;
  }

  /**
   * Set a new value to the signal and notify subscribers if it changed.
   */
  set value(newValue: T) {
    if (Object.is(this._value, newValue)) {
      return;
    }
    this._value = newValue;
    this.notify();
  }
  set(newValue: T): void {
    if (Object.is(this._value, newValue)) {
      return;
    }
    this._value = newValue;
    this.notify();
  }

  /**
   * Subscribe to value changes.
   * @param callback Function called with the new value on changes.
   * @returns Unsubscribe function.
   */
  subscribe(callback: Subscriber<T>): () => void {
    const subscriberRef: SubscriberRef<T> = {
      ref: new WeakRef(callback),
      cleanupToken: callback,
    };
    this.subscribers.add(subscriberRef);
    this.registry.register(callback, subscriberRef);

    // Immediately call with current value
    callback(this._value);

    return () => {
      this.subscribers.delete(subscriberRef);
      this.registry.unregister(callback);
    };
  }

  /**
   * Notify all subscribers of the current value.
   */
  private notify(): void {
    for (const subscriber of this.subscribers) {
      const cb = subscriber.ref.deref();
      if (cb) {
        cb(this._value);
      } else {
        this.subscribers.delete(subscriber);
      }
    }
  }
}

/**
 * Factory function to create a new Signal.
 * @param initial Initial value.
 * @returns A new Signal instance.
 */
export function signal<T>(initial: T): Signal<T> {
  return new Signal(initial);
}
