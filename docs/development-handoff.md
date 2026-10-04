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
- When a requested change is clear and safe to implement, do not stop at a declaration of intended work. Proceed through implementation and relevant tests/CI, then report completed results. If the result is not desired, roll back/revise from the last good state based on the user's feedback. Still stop for genuinely ambiguous rules, destructive/high-risk actions, or other cases that require confirmation.
- **Keep this handoff document itself up to date.** Whenever a task materially changes implemented behavior, confirmed game rules, development policy, known bugs, pending/ambiguous decisions, important file locations, or the continuation procedure, update `docs/development-handoff.md` as part of the same development task/PR whenever practical.
- Do not wait for a separate request to maintain this file. Before finishing a substantial change, explicitly check whether this handoff needs updating.

## Current focus

Recent work centers on character parameter skills, status icons, contextual attack modifiers, active skills/cooldowns, monster roster HP/stat management, and regression coverage.

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
- 9 Z3000: every 2 monster defeats -> ATK +1. Active Pull In (CT 4) manually targets a monster and deals 5 direct damage; range and the conditional follow-up attack remain manual/not simulated.
- 10 Pandaman: counterattack mode; ATK increases by damage received that turn.
- 12 Hime: Energy Storage 0-5; each -> ATK +2 / DEF +2. Active Qigong Training (CT 3) heals self 2 HP up to max HP and, if Energy Storage is active when used, gives ATK +4 for that turn.
- 14 Misaki: Sword Aura 0-3 tracked. Active Sakura Retsukuzan uses manual roster target selection (range is not auto-validated), deals 2 direct damage through roster HP/defeat handling, gains +1 Sword Aura normally, or consumes 2 when used at 3 stacks. The card reward at max stacks is not represented.
- 15 Nardis: hand advantage capped at 3 -> ATK +1 each.
- 16 Jasmine: active Overdrive has CT 4; activation gives MOVE +3 / DEF -3 for the turn, with calculated character parameters clamped to their normal minimum of 0, then the temporary effects expire at turn end. CT is adjusted manually rather than automatically because additional game conditions can reduce it. Existing Overdrive result <10 -> DEF +2, >=10 -> ATK +2; every 13 cumulative movement alternates ATK/DEF.
- 17 Luka: Midnight Slash attack context -> ATK +2.
- 18 Nancy Lo: Firewall -> ATK +2 / DEF +2.
- 21 Al: every 6 Starlight -> ATK +1 / DEF +1.
- 23 Teru: Fox Light follow-up attack; ATK +1 per Fox Light stack in that context.
- 24 Moses: Precision 0-3 -> ATK +2 each; turn end -1.
- 25 Mamushi: Awakening 0-8. At 8, icon automatically changes to True Dragon and ATK +4 applies automatically. No separate True Dragon toggle. Below 8 reverts both.
- 26 Sumikage: absorbed Shadow count -> ATK +1 each.
- 27 Bonnie: the currently selected attack-target monster's Mark stacks are the source of all Mark-based bonuses. Mark >=1 automatically gives ATK +3; while the manual Stealth toggle is active, add that target monster's Mark stack count to ATK. Do not create a Bonnie-side Mark count or a manual 'marked target' toggle. Active Mission: In Secret manually targets a monster and adds Mark +1; Star Coin/card/event rewards are not simulated.
- 28 Rinrin: Area Denial passage -> ATK +2. Active Intercept Tackle manually targets a monster; the target gets DEF -2 and Rinrin gets ATK +2 for 2 turns. Range/movement legality remains manual.
- 103 Jill: Cocktail attack/defense cards, max 3 each -> corresponding ATK/DEF +1 each.
- 104 Dorothy: Warmth 0-5 -> DEF +1 each.
- 106 Tachibana Sherry: Deduction Time 0-4 -> ATK +1 each; turn end -1.

Modifier engine supports fixed, per-stack, floor-per-unit, alternating-step, equality-condition, and current-HP-ratio rules.

## Active skill and cooldown architecture

- Active skills are declarative `activeSkills` entries on character ability rules. Every current character has active-skill name/CT metadata from `csv/character_skills.csv`, so skill/CT management is available even when the skill effect itself is not simulated by the calculator.
- The selected-character UI places `スキル` and `CT n` vertically in the open area to the right of HP/stats, with the chip area pulled left to reduce unused space.
- Current cooldown is stored per skill, not only per character. CT 0 means usable and activation sets CT to that skill's configured maximum. Do not automatically decrement CT at turn end; the `CT n` display is a button for manual adjustment: left click -1, right click +1. This intentionally avoids hard-coding character-specific cooldown-reduction conditions.
- Turn-duration effects are stored separately from permanent/manual modifiers and expire at turn end.
- Any active skill that specifies a monster or character target must use explicit manual target selection regardless of whether the game rule has a range limit. Do not auto-validate skill range; the user is responsible for choosing a legal target. Targeted skills should not consume CT/apply effects until a target is actually selected.
- Entering monster target selection must not automatically switch tabs. Show a persistent target-selection banner above the monster roster, visually highlight selectable active monster cards, and provide a cancel action. Canceling does not consume CT or apply effects; the banner/highlight clears after cancel or successful selection.
- Do not block active-skill/CT coverage on whether the calculator can simulate the skill effect; an empty `effects` list is valid for CT-only tracking.
- Supported generic active effects currently include `modify_stat` targeting self and `heal` targeting self; active effects may carry simple control-value conditions evaluated at activation.
- The first supported generic effect is `modify_stat` targeting self. Keep the effect-dispatch model extensible so future skills can add effects such as monster damage, healing, stack/status changes, target stat changes, and target selection without character-specific button code.
- Jasmine Overdrive is the first implementation: CT 4, MOVE +3 / DEF -3 for one turn.
- Kaisei Fate Echo manually targets a monster, starts a visible Fate Echo counter at 2 beside Mark, adds +1 damage received while active, decrements at each turn end, and disappears at 0. Coin/card rewards are not simulated.


## Battle card images

Attack/Defense battle-card artwork in `07_skill/index.html` and `06b_chara/index.html` uses `images/UT_HandCard`. The user-confirmed mapping is: Atk1/2/3/4/5/6/7 -> UT_HandCard_10001/10003/10005/10007/10008/10009/10010.png; Def1/2/3 -> UT_HandCard_10002/10004/10006.png; reset images remain named AtkReset.jpg / DefReset.jpg but also live in UT_HandCard. Do not restore references to the legacy AtkCard/DefCard folders.

## Character status icons

Confirmed character-specific status mappings use UT_Buff assets: Alanna `前ターン被ダメなし` -> `UT_Buff_ConcealedPresence.png`; Z3000 `モンスター撃破数` -> `UT_Buff_109_Break.png`; Nancy Lo `ファイアウォール` -> `UT_Buff_120.png`; Teru `狐光` -> `UT_Buff_124.png`; Bonnie `潜伏` -> `UT_Buff_127.png`; Rinrin `エリア拒止通過` -> `UT_Buff_128_Skill.png`; Jill cocktail attack/defense controls -> `UT_Buff_303_piano.png`; Sherry `推理タイム` -> `UT_Buff_306.png`. Kaisei Fate Echo on monsters uses `UT_Buff_114_Max.png`.

## Status icons

Mappings live in `csv/status_icon_map_all.csv`. Confirmed status/buff assets should reference `images/UT_Buff` explicitly via `UT_Buff/<file>`. The previously unresolved legacy icon mappings were user-confirmed and completed; `docs/icon-migration.md` records the mapping table. Character skill tooltip Attack/Defense/HP icons also load from `images/UT_Buff`. Direct 07_skill stat UI references use `UT_Buff/Attack.png`, `Defense.png`, `Hp.png`, and `run.png`; roster marks use `UT_Buff_Lock.png`. `Boss.png` also uses `images/UT_Buff/Boss.png`; 07_skill no longer intentionally depends on the legacy `images/icon` folder. Recent mappings:
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

- Z3000 (9): Pull In's 5 direct damage is implemented. The 7-space range is intentionally manual; the optional immediate attack when ATK >= 7 is not represented as a separate combat action.
- Papara (7): Bite-sized healing is intentionally not simulated. Activating the skill forces the existing half-HP-or-lower ATK +3 condition through the end of the current turn.
- Character-target active skills (Ren 8, Lulu 11, Al 21, Jill 103, Dorothy 104, and related effects) need a shared manual character-target selection flow before their target effects can be safely implemented.
- Moses (24): Weakness can be manually targeted, but its combat-die-0 effect is not represented by the current outgoing-damage calculator.
- Chouten-chan/Ame-chan (101/102): Fan and Love are manual stack controls. Internet Angel references Fan for its 3+ Fan self-heal; Love Overdose snapshots Love for this-turn movement/healing, consumes 4 Love, and at 4+ permanently raises max HP and the Love cap by 1. Coin/card/other-character rewards remain outside the calculator.
- Nancy Lo (18): Hacking depends on target distance and initiating a forced combat; those actions are not represented by the current skill target resolver.
- Sherry (106): Mighty Magic uses the manual monster-target flow and deals 2 direct damage to the selected monster. Spatial throw/destination and multi-monster area handling are intentionally manual.


Review current game data before implementing:
- Teru (23): Three Gods Possession prompts for the possessed ally's ATK/DEF when activated and adds exactly half of each to Teru until turn end. Character selection itself is deferred; odd values may therefore produce .5 stats.
- Dorothy (104): ally-pass ATK +1 behavior and Warmth=5 DEF-to-ATK/consume-all effect remain incomplete.

- Pandaman (10): hamburger-related passive max HP +2 is omitted.
- Tono Hanna (105): movement +2 to another character may require movement-target support.
- Tachibana Sherry (106): Hanna damage reduction is not represented.

All current character IDs now have an ability-rule entry for active-skill/CT metadata. Characters without supported calculator effects may intentionally have CT-only active skill entries; do not infer additional effect controls from that.

## Important recent PRs

- #116 initial character abilities
- #117 character skill tooltip initialization fix
- #118 Moses Precision icon
- #119 batch status icons
- #120 additional character stat controls
- #121 contextual attack modifiers
- #122 Mamushi automatic True Dragon at Awakening 8
- #123 monster HP stability and roster numeric-input commit fix
- #126 active skill cooldown framework
- #127 manual CT controls and stacked skill/CT layout
- #128 active-skill spacing and character stat floor
- #129 active skill CT tracking for all characters

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
