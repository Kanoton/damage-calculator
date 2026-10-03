# Development Handoff

Last updated: 2026-10-03

This is the durable handoff for continuing development, especially `07_skill`. On a new chat or machine, read this file, current `main`, and recent PRs before changing code.

## Development principles

- `main` is the source of truth; do not depend on chat history for implemented behavior.
- Use small focused branches/PRs and add regression tests for behavior changes.
- For `07_skill` changes, confirm both `07 skill browser smoke` and `06b browser smoke` pass before merge.
- Preserve unrelated behavior.
- Do not guess ambiguous game rules such as rounding, timing, target, stacking, or duration; confirm them first.
- Unambiguous character parameter skills may be implemented directly; surface ambiguous ones for confirmation.
- Prefer explicit repository icon mappings/assets over inferred filenames.
- **Keep this handoff document itself up to date.** Whenever a task materially changes implemented behavior, confirmed game rules, development policy, known bugs, pending/ambiguous decisions, important file locations, or the continuation procedure, update `docs/development-handoff.md` as part of the same development task/PR whenever practical.
- Do not wait for a separate request to maintain this file. Before finishing a substantial change, explicitly check whether this handoff needs updating.

## Current focus

Recent work centers on character parameter skills, status icons, contextual attack modifiers, monster roster HP/stat management, and regression coverage.

## Character ability implementation

Primary files:
- `07_skill/js/character-ability-rules.js`
- `07_skill/js/character.js`
- `tests/07-skill.spec.js`

Implemented IDs: `4,6,7,9,10,12,14,15,16,17,18,21,23,24,25,26,27,28,103,104,106`.

Key behavior:
- 4 Alanna: no damage previous turn -> ATK +3.
- 6 Padman: selectable temporary ATK/DEF adjustment -2..+2.
- 7 Papara: current HP <= half max HP -> ATK +3.
- 9 Z3000: every 2 monster defeats -> ATK +1.
- 10 Pandaman: counterattack mode; ATK increases by damage received that turn.
- 12 Hime: Energy Storage 0-5; each -> ATK +2 / DEF +2.
- 14 Misaki: Sword Aura 0-3 tracked; no modifier yet.
- 15 Nardis: hand advantage capped at 3 -> ATK +1 each.
- 16 Jasmine: Overdrive result <10 -> DEF +2, >=10 -> ATK +2; every 13 cumulative movement alternates ATK/DEF.
- 17 Luka: Midnight Slash attack context -> ATK +2.
- 18 Nancy Lo: Firewall -> ATK +2 / DEF +2.
- 21 Al: every 6 Starlight -> ATK +1 / DEF +1.
- 23 Teru: Fox Light follow-up attack; ATK +1 per Fox Light stack in that context.
- 24 Moses: Precision 0-3 -> ATK +2 each; turn end -1.
- 25 Mamushi: Awakening 0-8. At 8, icon automatically changes to True Dragon and ATK +4 applies automatically. No separate True Dragon toggle. Below 8 reverts both.
- 26 Sumikage: absorbed Shadow count -> ATK +1 each.
- 27 Bonnie: marked target -> ATK +3; Stealth additionally adds target Mark stacks to ATK.
- 28 Rinrin: Area Denial passage -> ATK +2.
- 103 Jill: Cocktail attack/defense cards, max 3 each -> corresponding ATK/DEF +1 each.
- 104 Dorothy: Warmth 0-5 -> DEF +1 each.
- 106 Tachibana Sherry: Deduction Time 0-4 -> ATK +1 each; turn end -1.

Modifier engine supports fixed, per-stack, floor-per-unit, alternating-step, equality-condition, and current-HP-ratio rules.

## Status icons

Mappings live in `csv/status_icon_map_all.csv`. Recent mappings:
- Energy Storage -> `UT_Buff_113_Passive.png`
- Sword Aura -> `UT_Buff_115.png`
- cumulative movement -> `UT_Buff_117_Passive.png`
- Starlight -> `UT_Buff_StarLight.png`
- Precision -> `UT_Buff_125_Passive.png`
- Awakening -> `UT_Buff_1026.png`
- True Dragon -> `UT_Buff_1261204.png`
- Warmth -> `UT_Buff_304.png`

Mamushi uses `iconAtMax` to switch Awakening to True Dragon at stack 8.

## Monster roster HP behavior

Primary files:
- `07_skill/js/map.js`
- `07_skill/js/roster-utils.js`
- `07_skill/js/roster-view.js`

Required behavior:
- HP edits must update internal state, not only the visible input.
- Manually edited current HP remains unchanged when another monster is defeated and roster/gimmicks recalculate.
- If recalculated max HP falls below current HP, clamp current HP to the new maximum.
- HP 0 retains existing defeat/removal behavior.
- Keep `damageTaken` synchronized for mechanics that use it.
- Roster numeric handlers must retain a stable reference to their input element; do not reintroduce the closure bug fixed in PR #123.
- Regression coverage exists for edit HP -> defeat another monster -> HP remains stable.

## Known incomplete / ambiguous rules

Review current game data before implementing:
- Teru (23): Three Gods Possession adds half another character's ATK/DEF; rounding needs confirmation.
- Dorothy (104): ally-pass ATK +1 behavior and Warmth=5 DEF-to-ATK/consume-all effect remain incomplete.
- Jasmine (16): one-turn DEF -3 part of Overdrive is omitted.
- Hime (12): Qigong Training ATK +4 while Energy Storage is active is omitted.
- Ame-chan (102): possible max HP +1 at Love >=4 needs max-HP support/confirmation.
- Pandaman (10): hamburger-related passive max HP +2 is omitted.
- Rinrin (28): monster DEF -2 is a target-side effect and is omitted.
- Tono Hanna (105): movement +2 to another character may require movement-target support.
- Tachibana Sherry (106): Hanna damage reduction is not represented.

No current ability-rule entry: `1,2,3,5,8,11,13,19,20,22,29,101,102,105`. Do not assume all require controls; first determine whether their skills affect calculations supported by `07_skill`.

## Important recent PRs

- #116 initial character abilities
- #117 character skill tooltip initialization fix
- #118 Moses Precision icon
- #119 batch status icons
- #120 additional character stat controls
- #121 contextual attack modifiers
- #122 Mamushi automatic True Dragon at Awakening 8
- #123 monster HP stability and roster numeric-input commit fix

Use PR history for exact diffs/rationale when touching the same areas.

## Continuation checklist

1. Read this document.
2. Inspect current `main`; code/tests are authoritative if this file is stale.
3. Review recent PRs touching the target area.
4. Check existing tests.
5. Reproduce bugs with regression tests where practical.
6. Make the smallest appropriate change.
7. Confirm relevant CI.
8. Merge only after CI passes.
9. Before finishing, explicitly check whether this handoff is affected. If implemented rules, development policy, known bugs, important file locations, continuation procedure, or pending decisions changed, update this document in the same task/PR whenever practical.
