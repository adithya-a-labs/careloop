# Shared-contract agent guide

Author: Adithya A
Scope: `packages/shared/**`

Shared exports are stable contracts, not a dumping ground.

- Keep exports runtime-independent and free of browser, server, provider or database clients.
- Use explicit domain names and narrow unions for states that cross application boundaries.
- Preserve the canonical safety notice unless Adithya A explicitly changes the product boundary.
- Prefer additive changes. Coordinate breaking changes with every web/API consumer in the same delivery.
- Do not duplicate generated database types manually when a reliable generation workflow is introduced.

Run shared-package typecheck and all affected consumer typechecks.
