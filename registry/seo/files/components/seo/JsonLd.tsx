// Встраивает JSON-LD в страницу. Использование:
//   <JsonLd data={productJsonLd(product, { baseUrl })} />
export interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD безопасен — сериализованные данные, не пользовательский HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
