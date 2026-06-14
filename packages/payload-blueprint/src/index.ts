// @maks417/payload-blueprint
// Базовые Payload-коллекции + аддитивный extend() (контракт 5).
// Финальная привязка к Payload buildConfig — в шаблоне backend-payload (M5).

export const PAYLOAD_BLUEPRINT_VERSION = '0.0.0' as const;

export * from './collections.js';
export * from './blueprint.js';
