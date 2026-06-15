// Тонкий клиент Vendure Shop API (GraphQL по fetch, без зависимостей). Сессия
// активного заказа — через bearer-токен (vendure-auth-token). Next-glue.
const SHOP_API = process.env.VENDURE_SHOP_API_URL ?? 'http://localhost:3001/shop-api';

export interface ShopResult<T> {
  data: T;
  token?: string;
}

export async function shopQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<ShopResult<T>> {
  const res = await fetch(SHOP_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const nextToken = res.headers.get('vendure-auth-token') ?? token ?? undefined;
  const json = (await res.json()) as { data: T; errors?: unknown[] };
  if (json.errors) throw new Error(`[vitrine] Vendure GraphQL: ${JSON.stringify(json.errors)}`);
  return { data: json.data, token: nextToken };
}
