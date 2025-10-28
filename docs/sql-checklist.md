# SQL Change Checklist

When adding or updating SQL migrations or functions:

- ✅ **Fully qualify every column reference** (`table_alias.column`) to avoid ambiguity.
- ✅ **Avoid session-level parameter settings** such as `set plpgsql.variable_conflict`; managed Postgres rejects them.
- ✅ **Preserve security posture** — keep `SECURITY DEFINER` only when necessary and limit the logic to minimal tables.
- ✅ **Return consistent shapes** (e.g., JSON objects or fixed table signatures) for RPCs relied on by the client.
- ✅ **Prefer additive, idempotent migrations**; never drop/rename columns that existing clients depend on.
- 🚫 **Do not embed entitlement decisions in UI components.** Fetch entitlements via shared RPC/context instead.
- 📝 Log the migration purpose in commit messages and keep structured logs in functions where applicable.
