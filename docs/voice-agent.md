# Voice and CareBridge

The voice endpoint accepts a validated transcript and converts it into a draft action. `voice/tools.py` is the sole allow-list. Every mutating proposal requires a human confirmation before persistence.

CareBridge routes work to narrow specialists:

- care event: capture an observation or update;
- coordination: suggest ownership from declared availability;
- handoff: summarize recent events and open work;
- memory: prepare a family memory for review.

Agents do not receive database clients, raw SQL, clinical tools or medication mutation tools. Provider credentials stay server-side.
