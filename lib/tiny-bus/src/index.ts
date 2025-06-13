export type EventMap = Record<string, unknown>;

export type EventHandler<T> = (payload: T) => void | Promise<void>;

export class TinyBus<Events extends EventMap> {
  private readonly listeners: { [K in keyof Events]?: EventHandler<Events[K]>[] } = {};

  /**
   * Register an event handler for a given event name.
   */
  on<K extends keyof Events>(eventName: K, handler: EventHandler<Events[K]>): void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName]?.push(handler);
  }

  /**
   * Unregister an event handler for a given event name.
   */
  off<K extends keyof Events>(eventName: K, handler: EventHandler<Events[K]>): void {
    const handlers = this.listeners[eventName];
    if (!handlers) return;

    this.listeners[eventName] = handlers.filter((h) => h !== handler);
  }

  /**
   * Emit an event with an optional payload.
   */
  emit<K extends keyof Events>(eventName: K, payload: Events[K]): void {
    const handlers = this.listeners[eventName];
    if (!handlers) return;

    handlers.forEach((handler) => handler(payload));
  }

  /**
   * Remove all listeners for all events or for a specific event.
   */
  clear<K extends keyof Events>(eventName?: K): void {
    if (eventName) {
      delete this.listeners[eventName];
    } else {
      (Object.keys(this.listeners) as (keyof Events)[]).forEach((key) => {
        delete this.listeners[key];
      });
    }
  }
}
