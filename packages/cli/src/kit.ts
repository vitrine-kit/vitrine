// Kit versions/ranges written into the client scaffold. In M7 (kit update)
// they'll come from the release; for now they're fixed to the monorepo's current state.
export const KIT_VERSION = '0.0.0';
export const CONTRACTS_VERSION = '1.0.0';
export const CONTRACTS_RANGE = '^1.0.0';
export const CORE_RANGE = '^0.1.0';
export const BLUEPRINT_RANGE = '^0.1.0';
export const REACT_RANGE = '^18.3.1';

// Client app stack ranges (M5 templates). Next 15 + Payload 3
// require React 19; @vitrine-kit/core/react is compatible (createElement/Fragment).
export const CLIENT_REACT_RANGE = '^19.0.0';
export const NEXT_RANGE = '^15.1.0';
export const PAYLOAD_RANGE = '^3.0.0';
