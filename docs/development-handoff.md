# Development Handoff

Last updated: 2026-10-06

This is the durable handoff for continuing development, especially `07_skill`. On a new chat or machine, read this file, current `main`, and recent PRs before changing code.

## Development principles

- `main` is the source of truth; do not depend on chat history for implemented behavior.
- Use small focused branches/PRs and add regression tests for behavior changes.
- For `07_skill` changes, confirm both `07 skill browser smoke` and `06b browser smoke` pass before merge.
- Preserve unrelated behavior.
- User preference: for requested changes that are ready to merge, complete the relevant checks, merge, and then report the result. Do not routinely stop at PR creation or ask for another merge confirmation. If checks fail, conflicts remain, or a genuinely ambiguous/destructive decision blocks progress, report the blocker.
- Do not guess ambiguous game rules such as rounding, timing, target, stacking, or duration; confirm them first.
- Unambiguous character parameter skills may be implemented directly; surface ambiguous ones for confirmation.
- Prefer explicit repository icon mappings/assets over inferred filenames.
- When a requested change is clear and safe to implement, do not stop at a declaration of intended work. Proceed through implementation and relevant tests/CI, then report completed results. If the result is not desired, roll back/revise from the last good state based on the user's feedback. Still stop for genuinely ambiguous rules, destructive/high-risk actions, or other cases that require confirmation.
- **Keep this handoff document itself up to date.** Whenever a task materially changes implemented behavior, confirmed game rules, development policy, known bugs, pending/ambiguous decisions, important file locations, or the continuation procedure, update `docs/development-handoff.md` as part of the same development task/PR whenever practical.
- Do not wait for a separate request to maintain this file. Before finishing a substantial change, explicitly check whether this handoff needs updating.

## Current focus

### Map event video output

`docs/map-event-output/README.md` is the durable instruction for AI-assisted video analysis. `AGENTS.md` routes video-only attachments to it when this repository is the task context. Resolve map/difficulty from filename or folder; ask if either is missing, ambiguous, or inconsistent. Use the central upper progress track and event icon positions, not Round.

Reference data remains in `csv/` and `images/`. Green-frame and random-label assets are in `images/MapEvent/assets/`. Approved Library/normal observations and diagrams are in `docs/map-event-output/samples/library-normal/`; the Dragon random-label-only example is separate in `samples/random/`. Library progress 1 (M0116×1, M0117×1, M0025×3) was accepted as confirmed on 2026-10-06. Progress 4/7/10 spawns and progress 4/10 global ATK+1/DEF+1 were also accepted. Library has no random component for this task. Position coordinates still come from existing reference diagrams; do not claim every location was independently verified from video.

`scripts/map_event_output.py` renders a reviewed observation JSON into candidate/pending CSVs, monster-free green-frame/random-label PNGs, preserved reference images, and a ZIP. It does not recognize video or alter runtime data. Use `scripts/requirements-map-event.txt`; validate with `python3 -m unittest discover -s tests/map_event_output -v`. AI should read video/create observations and include evidence/report files; users need only supply video and identify map/difficulty. New chats still need this repository as context.

On 2026-10-06 the user clarified that the final red X in the central upper progress track marks the game-over progress. Derive its numeric position from adjacent numbers: X immediately after 17 means game over at 18. Library/normal progress 18 is confirmed from the supplied screen and user explanation. The approved sample now has seven CSV rows, including `ゲームオーバー` with no monsters, zero bonuses, and no position image. A recording may stop after all progress events and the terminal marker have been checked; seeing the actual game-over screen is not required to read this scheduled endpoint. Distinguish the visible endpoint from witnessing the game-over transition. If the X/adjacent numbers are unreadable, report uncertainty rather than substitute Round or assume 18 for another map/difficulty.

No source `csv/map_event.csv`, existing MapEvent diagrams, calculator processing order, or bundled fallbacks were changed by adding this workflow. Reconcile existing multi-difficulty rows before importing candidates; never blindly append duplicates. Missing assets/unknown IDs are reported rather than substituted.

Recent work centers on character parameter skills, status icons, contextual attack modifiers, active skills/cooldowns, monster roster HP/stat management, and regression coverage.

### Character-target planning data

`csv/character_target_requirements.csv` is a planning inventory, not runtime configuration. It records 12 related characters, original ability text, CT, target/range descriptions, required inputs, existing implementation, unresolved rules, manual scope, and the source commit. Keep `csv/character_skills.csv` authoritative for game descriptions. Rows include single-target skills, group effects, passage effects, and a proximity passive; these must not all be wired to the same activation flow.

Before implementing character targets, decide how participating players are registered (including whether multiple instances of the same character are supported). Existing state is keyed by character ID; it does not establish a participating-player roster. Use stable target identity, defer CT/effect changes until target confirmation, and preserve cancellation without mutation. Target eligibility, effect expiry, snapshot timing, stacking, and movement-die versus movement-stat semantics marked in the CSV need confirmation before affected effects are implemented.

Suggested sequence: explicit participating-character selection and cancel/confirm flow; Lulu Heal-stack assignment; Ren one-use shield/counter state; Al shared Starlight; Jill card-count effects; Teru target-stat snapshot; Dorothy passage/expiry behavior. The sequence is a proposal, not confirmation of unresolved game rules. No character-target effect is implemented by adding this inventory.

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
- 28 Rinrin: Area Denial passage -> ATK +2. Active Intercept Tackle manually selects multiple monster instances with toggle clicks and OK beside Cancel. Each selected monster gets DEF -2, while Rinrin gets ATK +2 once per confirmation regardless of target count. After one turn-end click both changes remain; after the second they expire, preserving independent manual/passive modifiers. Cancellation changes no stats or CT; a single undo restores the entire batch and CT. Range/movement legality remains manual.
- 103 Jill: Cocktail attack/defense cards, max 3 each -> corresponding ATK/DEF +1 each.
- 104 Dorothy: Warmth 0-5 -> DEF +1 each.
- 106 Tachibana Sherry: Deduction Time 0-4 -> ATK +1 each; turn end -1.

Modifier engine supports fixed, per-stack, floor-per-unit, alternating-step, equality-condition, and current-HP-ratio rules.

## Active skill and cooldown architecture

- CT is displayed as `CT remaining / maximum`, including Extra Battery's effective maximum. The accessible label states both values. Additional CT-shortening effects are deferred at the user's request.

- Extra Battery (chip 15) reduces the owning character's active skill CT maximum by 1, with a minimum of 0. Activation (including target confirmation) uses the reduced maximum. Manual CT increments stop at the effective maximum. Acquiring the chip clamps any current CT above the new maximum; removing it restores the maximum without adding to remaining CT.
- Clicking Lightning Core (chip 56) consumes exactly 5 Charge and reduces the owner's remaining skill CT by 1, floored at 0. This remains a manual click; it does not automatically fire on skill activation or track card-use allowance.
- Charge consumption clicks (Airbag 55: 6, Lightning Core 56: 5, Railgun 58: 4) do nothing when Charge is below their full cost, including keyboard activation. Existing +2 Charge clicks and the 10-stack cap are preserved. Airbag/Railgun clicks currently manage Charge only; their damage effects are not simulated by these handlers. Electric Glove's click still grants +2; turn-end consumption/damage is not implemented here.
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
- Sherry (106): Mighty Magic uses manual multiple-monster selection: click the same roster name buttons to toggle distinct monster instances, then OK beside Cancel confirms. Empty selection disables OK; selecting/deselecting/canceling has no HP/CT effect. Confirmation deals 2 direct damage to each selected active monster and starts CT exactly once. One undo restores the entire batch and CT. Character changes, roster clear/map changes, or undo cancel pending selection; removed/defeated targets are pruned. Spatial throw/destination and range/area legality remain manual.


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

## Project entry points

- `README.md` documents startup, repository structure, verification commands, and the Issue/PR workflow.
- `AGENTS.md` directs AI contributors to the working guide and this handoff before editing.
- `.github/ISSUE_TEMPLATE/` and `.github/pull_request_template.md` capture reproducible bugs, confirmed game rules, acceptance criteria, and validation results.
- This setup changes documentation/templates only; it does not change game behavior or the current working folder.

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

## Character card source images

- Store `UT_Hero_Card2_*.png` source images under `images/UT_Hero_Card2/`.
- The 48 images accidentally uploaded to the repository root were moved into this directory with filenames and binary contents preserved.
- This asset organization does not change runtime image references or character-card rendering.

### 07_skill character list rendering

- Only `07_skill` builds character-list cards from Hero Card2 artwork plus `csv/character_stats.csv`: name, Lv0 ATK/DEF/HP, initial coin, and a nonzero Lv1 coin bonus.
- The user-confirmed 35-character artwork mapping lives in `07_skill/csv/character_hero_card_mapping.csv`; `CHARACTER_HERO_CARD_CSV_SNAPSHOT` in `07_skill/js/character-data.js` provides identical file:// and fetch-failure fallback. Update both when changing the mapping. Image numbers do not equal character IDs.
- `character-data-loader.js` joins artwork filenames by character ID. `character-view.js` creates the list cards; `character.js` keeps its existing hover/focus tooltip and click/keyboard selection handlers.
- Shared character stats and older generations retain their existing `list_img` and rendering. Selected-character controls, portraits, abilities, level changes, chips, and CT behavior are unchanged. Cards show base Lv0 stats rather than the selected character's current modifiers.


- `07_skill` character-list cards use five columns on desktop (over 1000px), four at 801–1000px, two at 501–800px, and one at 500px or narrower. Card widths/column counts stay fixed while portraits are 58×94px and cards have a 104px minimum height. The parameter grid is anchored to the portrait's bottom edge; names occupy the remaining space above it, centered vertically. Names use 15px text, stat values 12px, and coin bonuses 10px directly beside the coin count (no auto left margin). Existing tooltip and selection handlers are unchanged.

## Monster target selection scope review

- Sherry and Rinrin enable `multipleTargets` in active-skill metadata. Other implemented targeted skills retain immediate single-click confirmation.
- Rinrin's source description affects all monsters passed during the tackle; her manual DEF -2 target implementation now supports multiple targets. The self ATK +2 is applied once, and existing two-turn effect timers remove only these skill modifiers after two turn-end clicks.
- Pandaman's area taunt and Lulu's area movement reduction are not simulated. Luka's passage damage, Megas's random/area damage, Sykes's zone effects, and Bonnie's investigation phases also have multi-monster scope, but those effects are not the existing single-target active-skill selection flow. Do not claim Sherry is the only multi-monster ability in the game.
