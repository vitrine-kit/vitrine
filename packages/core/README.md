# @vitrine-kit/core

Vitrine's critical logic: the slot and adapter runtime, the order pipeline, and provider-neutral payment webhook dispatch.

This is where "a bug = an incident for every client at once" (spec §4). That's why it's a **versioned package** rather than copy-in: a critical fix reaches everyone via a version bump.
