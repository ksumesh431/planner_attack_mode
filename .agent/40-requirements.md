# Requirement register

This is the single source of truth for strict project requirements. When the user adds, changes, or removes a requirement, update this file in the same change and propagate it to the affected guidance file.

- **Status values:** `active`, `superseded`, `retired`
- **Last updated:** 2026-11-06

## Active requirements

| ID | Status | Requirement | Detailed guidance |
| --- | --- | --- | --- |
| REQ-001 | active | Use the relevant Go skills where required, loaded from change context rather than unconditionally. | `.agent/10-go.md` |
| REQ-002 | active | Use Bun and Bun ecosystem tools whenever possible; avoid the traditional Node ecosystem. | `.agent/00-workflow.md`, `.agent/20-frontend.md` |
| REQ-003 | active | Keep the app lightweight and optimized. Use the browser skill to inspect the UI, check performance, and capture screenshots when needed. | `.agent/30-quality.md` |
| REQ-004 | active | Responsive UI is mandatory, with the phone layout prioritized. | `.agent/20-frontend.md` |
| REQ-005 | active | New or changed strict requirements must be recorded here and propagated to the guidance files in the same change. | this file, `AGENTS.md` |

## Change protocol

1. **New requirement:** assign the next free ID (`REQ-NNN`) and add an `active` row.
2. **Changed requirement:** mark the old row `superseded`, then add a new `active` row with the next free ID and a note such as `replaces REQ-002`. Never edit history in place, and never leave two active rules that conflict.
3. **Removed requirement:** mark the row `retired`; do not delete it.
4. Update the detailed guidance file(s) listed in the row, and update `AGENTS.md` if the rule is a non-negotiable.
5. Add a change-log row with the date, IDs, what changed, and the files touched.
6. Include the instruction changes in the same commit as the implementation.
7. Mention the requirement change in the final summary to the user.

### Worked example

The user later allows npm for one specific tool:

- Change the `REQ-002` row to `superseded`.
- Add `REQ-006 | active | Bun by default; npm is allowed only for <tool> | .agent/00-workflow.md, .agent/20-frontend.md`.
- Update both guidance files and `AGENTS.md` if the non-negotiable wording changes.
- Add a change-log row: `2026-11-07 | REQ-002, REQ-006 | Allowed npm for <tool> | .agent/00-workflow.md, .agent/20-frontend.md`.

## Change log

| Date | IDs | Change | Files updated |
| --- | --- | --- | --- |
| 2026-11-06 | REQ-001 – REQ-005 | Initial register created from the user's project instructions. | `AGENTS.md`, `.agent/*.md`, `.opencode/opencode.jsonc` |
