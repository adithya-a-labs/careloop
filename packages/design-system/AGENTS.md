# Design-system agent guide

Author: Adithya A
Scope: `packages/design-system/**`

Root `DESIGN.md` is canonical. Use the `careloop-web-ui` skill for any component or token work.

- Components remain product-data agnostic and composable.
- Tokens carry semantic roles; do not add one-off values when an existing token fits.
- No violet, purple, indigo or cool neon hues.
- Public components support keyboard operation, visible focus, accessible names and consumer class names.
- A token or exported-component change must include its consumer impact and should remain additive when possible.
- Do not introduce runtime access to APIs, authentication, Supabase or care-circle data.

Run package typecheck plus the web build because the application is the primary consumer.
