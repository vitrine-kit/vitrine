// Версии/диапазоны kit, проставляемые в скаффолд клиента. В M7 (kit update)
// будут приходить из релиза; пока зафиксированы под текущее состояние монорепо.
export const KIT_VERSION = '0.0.0';
export const CONTRACTS_VERSION = '1.0.0';
export const CONTRACTS_RANGE = '^1.0.0';
export const CORE_RANGE = '^0.1.0';
export const BLUEPRINT_RANGE = '^0.1.0';
export const REACT_RANGE = '^18.3.1';

// Диапазоны стека клиентского приложения (шаблоны M5). Next 15 + Payload 3
// требуют React 19; @maks417/core/react совместим (createElement/Fragment).
export const CLIENT_REACT_RANGE = '^19.0.0';
export const NEXT_RANGE = '^15.1.0';
export const PAYLOAD_RANGE = '^3.0.0';
