import { EventEmitter } from 'events'

export class TypedEventEmitter<Events extends Record<string, unknown[]>> {
  private readonly emitter = new EventEmitter()
  
  on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): this {
    this.emitter.on(event as string, listener as (...args: unknown[]) => void)
    return this
  }
  
  emit<K extends keyof Events>(event: K, ...args: Events[K]): boolean {
    return this.emitter.emit(event as string, ...args)
  }
  
  off<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): this {
    this.emitter.off(event as string, listener as (...args: unknown[]) => void)
    return this
  }
}