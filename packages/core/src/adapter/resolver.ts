// The adapter runtime (contract 2). A registry of factories by backend; returns the active
// CatalogSource / CommerceBackend by site.config. Implementations (Payload*/Vendure*)
// are registered in the client's lib/adapter.
import type {
  Backend,
  CatalogSource,
  CommerceBackend,
  SiteConfig,
} from '@vitrine-kit/contracts';

export interface AdapterFactory {
  backend: Backend;
  createCatalog(config: SiteConfig): CatalogSource;
  /** Absent for catalog-only backends. */
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
      throw new Error(`[vitrine] no adapter registered for backend "${config.backend}"`);
    }
    return f;
  }

  function resolveCatalog(config: SiteConfig): CatalogSource {
    return factoryFor(config).createCatalog(config);
  }

  function resolveCommerce(config: SiteConfig): CommerceBackend {
    if (config.tier === 'catalog') {
      throw new Error('[vitrine] CommerceBackend is unavailable at tier "catalog"');
    }
    const f = factoryFor(config);
    if (!f.createCommerce) {
      throw new Error(`[vitrine] backend "${config.backend}" does not implement CommerceBackend`);
    }
    return f.createCommerce(config);
  }

  function clear(): void {
    factories.clear();
  }

  return { register, resolveCatalog, resolveCommerce, clear };
}

/** The default global adapter registry. */
export const adapters: AdapterRegistry = createAdapterRegistry();
