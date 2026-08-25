---
name: Schema setup
description: How to initialize a fresh AgriConnect development database without conflicting overlapping schema definitions.
---

Treat the current Drizzle schema and the historical SQL migrations as overlapping schema sources, not one ordered migration stream.

**Why:** Replaying both sources in full can stop on duplicate tables, while relying on only one can omit core relations.

**How to apply:** Before changing the bootstrap process, identify which source owns each relation and verify a clean database contains the tables required by the application.