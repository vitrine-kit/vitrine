// Order pipeline (scaffold, filled in M8). The order's critical logic lives in the package,
// not the copy-in registry: a bug here = an incident for every client.
import type { Cart, Order } from '@vitrine-kit/contracts';

export interface OrderPipelineContext {
  cart: Cart;
  /** Filled by pipeline stages (order creation). */
  order?: Order;
  /** Arbitrary stage data (payment, stock reservation, shipping). */
  meta: Record<string, unknown>;
}

export type OrderStage<T = OrderPipelineContext> = (ctx: T) => T | Promise<T>;

/**
 * Runs the context through the stages sequentially. Any stage error aborts the
 * pipeline (rollback/idempotency are the responsibility of specific stages in M8).
 */
export async function runPipeline<T>(
  ctx: T,
  stages: ReadonlyArray<OrderStage<T>>,
): Promise<T> {
  let current = ctx;
  for (const stage of stages) {
    current = await stage(current);
  }
  return current;
}
