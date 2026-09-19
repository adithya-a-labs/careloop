# Architecture

Author: Adithya A

CareLoop is a small pnpm monorepo with a React client, FastAPI orchestration layer and Supabase persistence.

```text
React/Vite -> validated FastAPI routes -> bounded services/tools -> Supabase
                              \-> provider adapter (optional LLM)
```

The browser uses the Supabase anonymous key only. Privileged credentials and all LLM calls remain in the API. The model may propose only allow-listed tools and receives no arbitrary SQL capability. Mutating voice actions return a preview and require confirmation.

The initial route stubs deliberately return demo payloads. Replace them behind the existing schemas and service ports so UI contracts stay stable.
