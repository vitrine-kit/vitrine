// Order pipeline (каркас, наполняется в M8). Критлогика заказа живёт в пакете,
// не в copy-in реестре: баг здесь = инцидент у всех клиентов.
import type { Cart, Order } from '@maks417/contracts';

export interface OrderPipelineContext {
  cart: Cart;
  /** Заполняется шагами пайплайна (создание заказа). */
  order?: Order;
  /** Произвольные данные шагов (платёж, резерв склада, доставка). */
  meta: Record<string, unknown>;
}

export type OrderStage<T = OrderPipelineContext> = (ctx: T) => T | Promise<T>;

/**
 * Последовательно прогоняет контекст через шаги. Любая ошибка шага прерывает
 * пайплайн (откат/идемпотентность — ответственность конкретных шагов в M8).
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
