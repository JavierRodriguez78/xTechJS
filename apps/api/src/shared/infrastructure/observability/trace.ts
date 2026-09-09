import { AsyncLocalStorage } from "node:async_hooks";

interface TraceLogger {
  info(bindings: Record<string, unknown>, message: string): void;
  error(bindings: Record<string, unknown>, message: string): void;
}

interface TraceContext {
  correlationId: string;
  logger: TraceLogger;
}

const traceContext = new AsyncLocalStorage<TraceContext>();

export function startTrace(correlationId: string, logger: TraceLogger): void {
  traceContext.enterWith({ correlationId, logger });
}

export async function traceOperation<T>(component: string, operation: string, action: () => Promise<T> | T): Promise<T> {
  const context = traceContext.getStore();
  if (!context) return action();

  const startedAt = performance.now();
  context.logger.info({ correlationId: context.correlationId, component, operation }, "Operation started");
  try {
    const result = await action();
    context.logger.info({ correlationId: context.correlationId, component, operation, durationMs: Math.round(performance.now() - startedAt) }, "Operation completed");
    return result;
  } catch (error) {
    context.logger.error({ correlationId: context.correlationId, component, operation, durationMs: Math.round(performance.now() - startedAt), err: error }, "Operation failed");
    throw error;
  }
}

export function Traceable(component: string): ClassDecorator {
  return (target) => {
    for (const operation of Object.getOwnPropertyNames(target.prototype)) {
      if (operation === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(target.prototype, operation);
      if (!descriptor || typeof descriptor.value !== "function") continue;
      const original = descriptor.value;
      Object.defineProperty(target.prototype, operation, {
        ...descriptor,
        value: function (this: object, ...args: unknown[]) {
          return traceOperation(component, operation, () => original.apply(this, args));
        }
      });
    }
  };
}