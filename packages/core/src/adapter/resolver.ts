// Runtime адаптера (контракт 2). Реестр фабрик по backend; отдаёт активный
// CatalogSource / CommerceBackend по site.config. Реализации (Payload*/Vendure*)
// регистрируются в lib/adapter клиента.
import type {
  Backend,
  CatalogSource,
  CommerceBackend,
  SiteConfig,
} from '@vitrine-kit/contracts';

export interface AdapterFactory {
  backend: Backend;
  createCatalog(config: SiteConfig): CatalogSource;
  /** Отсутствует для чисто-каталожных бэкендов. */
  createCommerce?(config: SiteConfig): CommerceBackend;
}

export interface AdapterRegistry {
  register(factory: AdapterFactory): void;
  resolveCatalog(config: SiteConfig): CatalogSource;
  resolveCommerce(config: SiteConfig): CommerceBackend;
  clear(): void;
}

export function createAdapterRegistry(): AdapterRegistry {
  const factories = new Map<Backend, AdapterFactory>();

  function register(factory: AdapterFactory): void {
    factories.set(factory.backend, factory);
  }

  function factoryFor(config: SiteConfig): AdapterFactory {
    const f = factories.get(config.backend);
    if (!f) {
      throw new Error(`[vitrine] не зарегистрирован адаптер для backend "${config.backend}"`);
    }
    return f;
  }

  function resolveCatalog(config: SiteConfig): CatalogSource {
    return factoryFor(config).createCatalog(config);
  }

  function resolveCommerce(config: SiteConfig): CommerceBackend {
    if (config.tier === 'catalog') {
      throw new Error('[vitrine] CommerceBackend недоступен на уровне tier "catalog"');
    }
    const f = factoryFor(config);
    if (!f.createCommerce) {
      throw new Error(`[vitrine] backend "${config.backend}" не реализует CommerceBackend`);
    }
    return f.createCommerce(config);
  }

  function clear(): void {
    factories.clear();
  }

  return { register, resolveCatalog, resolveCommerce, clear };
}

/** Глобальный реестр адаптеров по умолчанию. */
export const adapters: AdapterRegistry = createAdapterRegistry();
