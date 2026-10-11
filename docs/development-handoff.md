# Development Handoff

Last updated: 2026-10-10

This is the durable handoff for continuing development, especially `07_skill`. On a new chat or machine, read this file, current `main`, and recent PRs before changing code.

## 現在の作業方針：07を先行し、08へ後日統合（2026-10-09）

この節は過去の「08を作業対象とする」記述より優先します。ユーザーの指定があればその指定を優先します。

### 開発順序と保留範囲

- 次の開発対象は `07_skill`。07の機能・計算・レイアウトを先に完成させ、一区切りついた時点で変更を `08_screen_reader` に移植して画面読取の開発を再開する。
- 08の画面読取の追加・認識精度改善、モンスター対応拡大、見本データ収集はいったん保留。既存実装は削除せず、今は追加作業を進めない。
- 07の変更を各PRで08へ同時反映する運用にはしない。共有正本 `csv/`・`images/` の変更は両版に影響するので、必要な同梱フォールバック・生成データの整合性はその都度確認する。
- 07の各PRでは変更内容と対象ファイル、関係するテスト、後日の08移植で注意する点をこの引き継ぎ書に残す。新しい世代フォルダは勝手に増やさない。
- 1回の作業は30分を目安に区切り、途中でも状況を報告する。終わらない場合は完了済み範囲・残作業・具体的な理由・PR/コミットを残す。

### 統合開始点と08の保持対象

統合差分の基準コミットは `f5c9fec1358a186ca42903a079d1ff9eab9ff281`（PR #171マージ後）。この時点の07と08はすでに異なるため、両ディレクトリの差をすべて07の新規変更と解釈しない。

08に保持するもの：
- `screen-reader*.js`、`screen-reader.css`、ミニキャラ対応表・生成照合データ、読取用のHTML/script読込順、生成スクリプト、匿名化見本、読取テストと08のCI。
- `character.js` 内の `ScreenReaderCharacterBridge` と読取から自キャラ・PTへ反映する接続。
- `map.js` 内の `ScreenReaderMapBridge` と既存イベント/Undoへの接続。
- 移動力の自動読取停止、下側チップ画面の判定、最上部ホバー操作欄。
- ラウンド/進捗同期は設定ON時のみ。名前認識は現状M0017・M0014のみで全種類対応ではない。ラウンド同期はCT/スタックのターン終了処理を代行しない。

アイコン対応表と実画面見本は目的が異なる。ユーザーが想定した表は「モンスターID・名前・アイコン画像」の紐づけ。先に渡したHP/管理番号付きCSVは実画面照合用で、全70種類のスクショ収集は依頼しない。これらの整理も読取再開後に必要範囲で行う。

### 07から08への統合手順

1. 07の一区切りがついたmainを基準に、統合専用ブランチを作成する。開始時と完了時のコミットを記録する。
2. 基準コミット以降の `07_skill/`・共有CSV/画像・07のテストの変更を一覧化する。例：`git diff f5c9fec1358a186ca42903a079d1ff9eab9ff281..HEAD -- 07_skill csv images tests/07-skill.spec.js`。07にすでにあった差も、移植が必要か別途確認する。
3. 07の機能変更を対応する08ファイルへ差分単位で移植する。ディレクトリ全体の上書きや、07のコミットをそのままcherry-pickするだけでは08側の変更にならない。特に `index.html`・`character.js`・`map.js` は読取接続を保持しながら統合する。
4. CSV変更の同梱フォールバック、参照画像、必要な生成データ、通常scriptの順序とトップレベル宣言衝突を確認する。07の変更に対応する08の回帰テストを追加/調整し、既存読取テストも維持する。
5. `npm run check:07`・`npm run check:08`、関係する生成スクリプトの `--check`、07/08のPlaywrightテストと06bの回帰チェックを通す。file://のフォールバック、PT・チップ・スキル・モンスター・Undo・通常レイアウト、08の画像読取と操作欄を確認する。
6. 最終diffと関連CIを確認してからマージする。移植済み/見送りの変更、統合後のコミット、残る認識制約を記録し、その後08の認識改善を再開する。

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

### 08_screen_reader experimental window capture (2026-10-07)

2026-10-09 chip-first follow-up: 08 no longer reads MOVE from status screens (the crop was reported to read hand count). Vision never emits move, automatic stabilization ignores it, and result headings show ATK/DEF only; manual movement/stat calculations remain. Reader controls are a fixed top overlay, hidden until hover; click pins/unpins for touch and keyboard, Escape closes. The overlay does not occupy calculator layout space. User requests lower-popup ratio-based recognition and later round/progress plus monster name/serial-to-HP tracking. Four new screenshots then arrived (20261008211411/36/41/43): lower-popup owners Hanna105 empty, Sherry106 [121], Fanny3 [26,39,36,2], Nancy18 [42,36,24]. Lower popup now uses a height-scaled, left-anchored frame and a separate highlighted-tab/grid layout; original popup remains fallback. The PT portraits identify all four owners, so no extra character table is needed for these frames. Sanitized fixtures retain PT HUD and popup regions only; chips include an empty-slot veto. Round4/progress4 and Round5/event progress5 are visible, as are monster serial5/7 with HP7/7 and command center91/120, but no round/progress/monster automatic updates are implemented in this chip-priority task. These need independent identity/event reconciliation tests before mutation.

2026-10-08 status-chip fix: reviewed 2048x1152 JPEGs (184601/184606/184610) show Nancy18 chip42, Fanny3 chip26, and Sherry106 chip121. Status panels are centered and scale with screen height; stretching the full image to 1536x709 displaced their crops. normalize now keeps a separate aspect-preserving statusFrame while retaining the existing PT HUD mapping. Status header/chips/stats and header/large-chip learning use that frame. Added the three header and chip descriptors from sanitized fixtures, reproducible with scripts/build-screen-reader-status-fixtures.py --check. Full uploads/player names are excluded. Regression checks ownership, empty slots, accumulation and learning. This does not claim full 16:9 PT numeric accuracy, arbitrary HUD scales, all status owners, or small-popup support at other aspect ratios.

2026-10-08 left HUD fix: user screenshot `image(7).png` has shifted PT/self positions despite the same 1536x709 resolution. Verified party: Hanna105 9/9 coin12 Lv0, Sherry106 10/10 coin12 Lv0, Fanny3 10/10 coin12 Lv0, Nancy Lu18 9/9 coin6 Lv0; self Hanna105. Vision now selects between original and left layouts from multiple distinct identities plus at least two coin/star anchors, without caching layout across frames. Learning uses the selected avatar/self crop. Left HP crops discard edge-clipped colored background fragments; max-HP crops exclude the slash. `screen-reader-layout-references.js` supplies reviewed portraits/self and an additional white coin6 glyph. `scripts/build-screen-reader-left-hud-fixture.py --check` rebuilds from sanitized `left-hud.json`; full upload/player names remain outside git. Tests cover exact expectations, layout switching, changed coin values, and retention of unreadable coin/self fields. Only the new normal screen is verified; left-layout popup/status geometry remains unverified, and arbitrary HUD layouts remain unsupported.

2026-10-08 follow-up: the user verified actual screen recognition works and requested further development. PT-avatar fallback now uses masked, calibrated asset crops for all 35 canonical character IDs / 128 outfit images, with 56 monster images as veto candidates. Existing learned/real-frame seeds take precedence. Close candidates and unknowns abstain; duplicate slot IDs remain rejected. Real normal fixture 6234 additionally identifies Megas19, Sherry106 and Bonnie27 beside Hanna105. Self/header identification, chip accumulation and numeric behavior remain unchanged. Rebuild/check `screen-reader-profile-references.js` with `scripts/build-screen-reader-profile-references.py` (Pillow). `111_Max` and `115_03` have insufficient opaque face coverage and still require game-screen training. All-game/all-outfit accuracy is not established. User confirmed the 5 unresolved images are currently unused; keep them excluded and do not spend further effort identifying them.

New regressions exposed an existing duplicate-identity bug: removing the first duplicate during counting left the last duplicate intact. Snapshot repeated IDs before mutation so all conflicting slots are ignored. Flat avatar regions are rejected, and masked features are smoothed to tolerate differences between browser downsampling and generated descriptors; mask edges are excluded from the smoothing comparison.

2026-10-08: `csv/mini_character_mapping.csv` now inventories all 194 profile images: 130 character variants (35 canonical IDs), 59 monster images (10 with multiple candidate IDs), and 5 unresolved images. See `docs/mini-character-mapping.md` for columns and unresolved filenames. All monsters/unknowns are excluded from character recognition. `scripts/build-mini-character-mapping.py --check` validates coverage, names/IDs, reference paths and the generated `mini-character-mapping-data.js` fallback. Run without `--check` after CSV edits. 08 fetches the CSV for training identity previews and falls back for file:// or unavailable/invalid CSV. This does not add uncalibrated profile images to the game-screen matcher or claim recognition coverage for all characters. Existing recognition descriptors and state behavior are unchanged.

The user requested a separate `08_` folder to try game-screen reading. `08_screen_reader` is a copy of current `07_skill` with capture/recognition controls; 07 runtime files are unchanged. Read `08_screen_reader/README.md`. getDisplayMedia selects a PC game window; snapshots, image uploads/paste and auto mode feed local recognition. Auto samples about every 1.2 seconds with per-field two-consecutive-frame stabilization; jobs do not overlap. Stop/reset invalidates pending frames. New Game pauses auto and resets character/PT state, not map/monsters.

User-confirmed: party numbers are coins; filled stars give Lv0..3. Chips are unique and never lost within a match. Arrows change chip pages. Only visible information updates; chip observations accumulate per owner without deletion. No image leaves the browser; no OCR/vision service is required.

Experimental recognition uses reference HUD coordinates normalized from the supplied 1536x709 screens. Avatar seeds are Hanna105, Kaisei13, AL21, Sumikage26; self portrait seed Hanna105; large-header seeds Hanna/Kaisei. Users can add avatar/self/header/chip-position references, stored with the game crop under an isolated localStorage key and exported/imported as validated JSON. 90 canonical chip descriptors plus ATM30/card26 game examples and numeric shape references are bundled. Ambiguous/unknown matches stay untouched. Large status screens read ATK/DEF/MOVE; small popup uses the highlighted PT tab. PVE6 is not party Lv. Map events, monsters, hand, CT and skill controls are not recognized.

The small chip popup occludes the self portrait: never train/infer self from that region while this popup is open. Retain the previously recognized self or use the explicit self picker. Normal gameplay screen 6234 seeds/validates initial self recognition before per-member chip reads. Popup selected-owner identity is separate from self identity. Fixtures include that normal frame plus the four supplied popup/status frames.

`ScreenReaderCharacterBridge` in 08 character.js updates existing states, keeps self independent from PT editor selection, merges chips before absolute observed stat corrections, uses observed max HP and stores owned coins in a dedicated screenCoin field/result table. It does not infer equivalence with existing Coin/Star Coin stack/quantity controls or overwrite those. Missing fields retain state. Observed max HP remains authoritative until another observation/New Game; manual max-HP-affecting changes may require another screen read. Membership events retain contextual monster controls. No canonical game data is changed.

Use `npm run check:08` / `npm run test:08`; CI is `08 screen reader browser smoke`. Fixtures retain recognition regions only, removing player names/chat/map. Tests cover supplied screens, per-owner accumulation, invisible data retention, reset, stabilization, mocked actual video capture/track stop, denial and local profile persistence. Hosted browser CI is required before merge if workspace Chromium is unavailable. Real game-window capture, minimization/background behavior, other characters and different HUD layouts still require PC testing.

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
- 6 Padman: independent signed numeric ATK/DEF/MOVE adjustments from -2 to +2 (default 0), with left-click +1/right-click -1 and bounded direct entry. All three use `UT_Buff/UT_Buff_105_Break.png` via the status CSV and matching 07 fallback. Final stats retain their normal zero floor. Padman's outgoing attack ignores the opponent's pre-die defense stat only when the attack die is 6; the defense die, damage additions/reductions, and minimum-damage rules still apply. Both the 36-outcome table and card-aware probability calculations use this rule, which clears when another character is selected and never affects defense mode. The next-attack fixed die after a roll below 2 remains unimplemented.
- 7 Papara: current HP <= half max HP -> ATK +3.
- 9 Z3000: every 2 monster defeats -> ATK +1. Active Pull In (CT 4) manually targets a monster and deals 5 direct damage; each actual defeat adds to the counter and reduces CT by 2; range and the conditional follow-up attack remain manual/not simulated.
- 10 Pandaman: counterattack mode; ATK increases by damage received that turn.
- 12 Hime: Energy Storage 0-5; each -> ATK +2 / DEF +2. Active Qigong Training (CT 3) heals self 2 HP up to max HP and, if Energy Storage is active when used, gives ATK +4 for that turn.
- 14 Misaki: Sword Aura 0-3 tracked. Active Sakura Retsukuzan uses manual roster target selection (range is not auto-validated), deals 2 direct damage through roster HP/defeat handling, gains +1 Sword Aura normally, or consumes 2 when used at 3 stacks. The card reward at max stacks is not represented.
- 15 Nardis: hand advantage capped at 3 -> ATK +1 each.
- 16 Jasmine: active Overdrive has CT 4; activation gives MOVE +3 / DEF -3 for the turn, with calculated character parameters clamped to their normal minimum of 0, then the temporary effects expire at turn end. Activation prompts for the die result: <10 adds DEF +2, >=10 adds ATK +2 for the turn. CT decrements on turn end, and manual controls remain available. Every 13 cumulative movement alternates ATK/DEF.
- 17 Luka: Midnight Slash selects multiple monsters and deals current ATK +2 direct damage to each. No persistent self ATK context button.
- 18 Nancy Lo: Firewall -> ATK +2 / DEF +2.
- 21 Al: every 6 Starlight -> ATK +1 / DEF +1.
- 23 Teru: Fox Light follow-up attack; ATK +1 per Fox Light stack in that context.
- 24 Moses: Precision 0-3 -> ATK +2 each; turn end -1. Persistent monster Weakness sets its combat die to 0 against Moses in both battle modes.
- 25 Mamushi: Awakening 0-8. At 8, icon automatically changes to True Dragon and ATK +4 applies automatically. No separate True Dragon toggle. Below 8 reverts both.
- 26 Sumikage: skill activation prompts for absorbed Shadow count; snapshot ATK +1 per Shadow expires at turn end. No persistent Shadow control.
- 27 Bonnie: the currently selected attack-target monster's Mark stacks are the source of all Mark-based bonuses. Mark >=1 automatically gives ATK +3; while the manual Stealth toggle is active, add that target monster's Mark stack count to ATK. Do not create a Bonnie-side Mark count or a manual 'marked target' toggle. Active Mission: In Secret manually targets a monster and adds Mark +1; Star Coin/card/event rewards are not simulated.
- 28 Rinrin: Area Denial passage -> ATK +2. Active Intercept Tackle manually selects multiple monster instances with toggle clicks and OK beside Cancel. Each selected monster gets DEF -2, while Rinrin gets ATK +2 once per confirmation regardless of target count. After one turn-end click both changes remain; after the second they expire, preserving independent manual/passive modifiers. Cancellation changes no stats or CT; a single undo restores the entire batch and CT. Range/movement legality remains manual.
- 103 Jill: cocktail-card stack controls removed. Life-changing Cocktail toggle grants MOVE +3 and clears at turn end.
- 104 Dorothy: Warmth 0-5 -> DEF +1 each, UT_Buff_304_piano.png. True Self toggle grants ATK +1 and clears at turn end. Skill activation at Warmth 5 snapshots current DEF as additional ATK until turn end.
- 106 Tachibana Sherry: Deduction Time 0-4 -> ATK +1 each; turn end -1.

Modifier engine supports fixed, per-stack, floor-per-unit, alternating-step, equality-condition, and current-HP-ratio rules.

## Active skill and cooldown architecture

- CT is displayed as `CT remaining / maximum`, including Extra Battery's effective maximum. The accessible label states both values. Additional CT-shortening effects are deferred at the user's request.

- Extra Battery (chip 15) reduces the owning character's active skill CT maximum by 1, with a minimum of 0. Activation (including target confirmation) uses the reduced maximum. Manual CT increments stop at the effective maximum. Acquiring the chip clamps any current CT above the new maximum; removing it restores the maximum without adding to remaining CT.
- Clicking Lightning Core (chip 56) consumes exactly 5 Charge and reduces the owner's remaining skill CT by 1, floored at 0. This remains a manual click; it does not automatically fire on skill activation or track card-use allowance.
- Charge consumption clicks (Airbag 55: 6, Lightning Core 56: 5, Railgun 58: 4) do nothing when Charge is below their full cost, including keyboard activation. Existing +2 Charge clicks and the 10-stack cap are preserved. Airbag/Railgun clicks currently manage Charge only; their damage effects are not simulated by these handlers. Electric Glove's click still grants +2; turn-end consumption/damage is not implemented here.
- Active skills are declarative `activeSkills` entries on character ability rules. Every current character has active-skill name/CT metadata from `csv/character_skills.csv`, so skill/CT management is available even when the skill effect itself is not simulated by the calculator.
- The selected-character UI places `スキル` and `CT n` vertically in the open area to the right of HP/stats, with the chip area pulled left to reduce unused space.
- Current cooldown is stored per skill, not only per character. CT 0 means usable and activation sets CT to that skill's configured maximum. At each turn-end click decrement the selected character's skill CT by 1, with a zero floor. The `CT n` display remains a manual adjustment button (left -1/right +1), and Z3000 defeats reduce CT by 2 in addition. This supersedes the earlier manual-only CT policy.
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

Confirmed character-specific status mappings use UT_Buff assets: Alanna `前ターン被ダメなし` -> `UT_Buff_ConcealedPresence.png`; Z3000 `モンスター撃破数` -> `UT_Buff_109_Break.png`; Nancy Lo `ファイアウォール` -> `UT_Buff_120.png`; Teru `狐光` -> `UT_Buff_124.png`; Bonnie `潜伏` -> `UT_Buff_127.png`; Rinrin `エリア拒止通過` -> `UT_Buff_128_Skill.png`; Jill Life-changing Cocktail toggle -> `UT_Buff_303.png`; Sherry `推理タイム` -> `UT_Buff_306.png`. Kaisei Fate Echo on monsters uses `UT_Buff_114_Max.png`.

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
- Moses (24): Weakness targeting and combat-die-0 are implemented in both calculators; automatic counterattack actions remain outside the simulator.
- Chouten-chan/Ame-chan (101/102): Fan combines persistent roster flags (including defeated monsters) with manual additions; Love is a manual stack control. Internet Angel references Fan for its 3+ self-heal and 9+ permanent once-per-monster Fan ATK reduction; Love Overdose snapshots Love for this-turn movement/healing, consumes 4 Love, and at 4+ permanently raises max HP and the Love cap by 1. Coin/card/other-character rewards remain outside the calculator.
- Nancy Lo (18): Hacking depends on target distance and initiating a forced combat; those actions are not represented by the current skill target resolver.
- Sherry (106): Mighty Magic uses manual multiple-monster selection: click the same roster name buttons to toggle distinct monster instances, then OK beside Cancel confirms. Empty selection disables OK; selecting/deselecting/canceling has no HP/CT effect. Confirmation deals 2 direct damage to each selected active monster and starts CT exactly once. One undo restores the entire batch and CT. Character changes, roster clear/map changes, or undo cancel pending selection; removed/defeated targets are pruned. Spatial throw/destination and range/area legality remain manual.


Review current game data before implementing:
- Teru (23): Three Gods Possession prompts for the possessed ally's ATK/DEF when activated and adds exactly half of each to Teru until turn end. Character selection itself is deferred; odd values may therefore produce .5 stats.
- Dorothy (104): True Self manually represents ally-pass ATK +1 for the turn. Warmth=5 DEF-to-ATK is implemented; the requested workflow does not automatically consume Warmth.

- Pandaman (10): hamburger-related passive max HP +2 is omitted.
- Tono Hanna (105): requested Float MOVE +2 for the turn is implemented. Selecting another character for ally movement effects remains outside this calculator.
- Tachibana Sherry (106): Hanna now has a manual Protect Friend toggle for damage reduction 1; proximity legality remains manual.

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

- Sherry, Rinrin, and Luka enable `multipleTargets` in active-skill metadata. Other implemented targeted skills retain immediate single-click confirmation.
- Rinrin's source description affects all monsters passed during the tackle; her manual DEF -2 target implementation now supports multiple targets. The self ATK +2 is applied once, and existing two-turn effect timers remove only these skill modifiers after two turn-end clicks.
- Pandaman's area taunt and Lulu's area movement reduction are not simulated. Luka's passage damage is supported through explicit multiple targets. Megas's random/area damage, Sykes's zone effects, and Bonnie's investigation phases also have multi-monster scope, but those effects are not the existing single-target active-skill selection flow. Do not claim Sherry is the only multi-monster ability in the game.

## Character workflows and persistent monster statuses (2026-10-06)

This section supersedes older manual-only CT and placeholder-control notes above.

- Turn end now reduces the selected character's CT by 1 (floor 0) and expires its turn effects/toggles. Manual CT controls and chip cap/reductions remain available. Z3000 gains one defeat count and CT -2 per actual newly defeated monster while selected; a skill that defeats its target sets CT before defeat processing, so that same kill correctly reduces its new CT. Undo restores CT, counts, active effects, current HP, and monster status state.
- Ren: Juju Shield manual toggle, UT_Buff_Shield.png; while enabled it contributes damage reduction 99. Consumption remains a manual toggle-off action.
- Jasmine: Overdrive prompts for a nonnegative integer die result. Below 10 gives DEF +2; 10+ gives ATK +2, alongside existing MOVE +3/DEF -3. All skill modifiers expire on turn end, leaving cumulative-movement modifiers intact. Canceled/empty/invalid input starts no CT or effects.
- Luka: no persistent Night Slash toggle. Skill uses multi-monster selection with toggle clicks/OK and deals current calculated ATK +2 direct damage to each selected monster; no self ATK buff. Range/movement remain manual.
- Rin: Life Book numeric counter, UT_Buff_121_Passive.png; tracking only.
- Teru: skill already prompts for ally ATK/DEF and snapshots one half of each for the turn; no separate possession toggle. Foxfire controls remain independent.
- Moses: each roster monster has a persistent Weakness toggle. Weak Point Counter can also target and enable it. Against Moses only, a weak opponent's combat die is 0: outgoing table columns all show 0; incoming table rows and defense-choice labels all show 0. The 36-outcome table, card probabilities, evade comparisons and recommendations use the same die behavior. Other characters retain normal dice.
- Sumikage: absorbed Shadows entered only when activating Dark Fusion; ATK +1 each until turn end.
- Bonnie: roster Investigation Target toggle, UT_Buff_127_Skill.png, persists through turn end. Her targeted skill enables it and adds the existing Mark +1. Infiltration Investigation sits after Stealth: left/right advances/returns across Phase One/Two/Three/Truth (UT_Event_12702..12705.png), default Phase One, bounded at endpoints. It tracks the phase without automatically executing map/area rewards.
- Sykes: persistent per-monster Erosion count, UT_Buff_129_Skill.png; left +1/right -1. Each stack contributes one extra damage when that monster is the attack target, including supported direct-damage character skills. It is not decremented at turn end.
- KAngel: Fan uses UT_Buff_301.png. Each monster's persistent Fan toggle contributes one to the displayed Fan total; defeated Fan monsters remain counted. The total also permits manual additions for other fans. At skill activation with Fan >=9, each live Fan monster receives one permanent ATK -1 at most once per individual. Fan monsters attacking KAngel/Ame additionally have ATK -1 in combat; this stacks with the skill's permanent reduction. Field resets/deletion remove those roster entries; defeat alone does not remove Fan count.
- Ame: Love uses UT_Buff_302_Passive.png. Existing activation snapshot MOVE/heal, Love -4 (floor 0), and at initial Love >=4 permanent max HP/control cap +1 are retained.
- Jill: Life-changing Cocktail toggle, UT_Buff_303.png, gives MOVE +3 while on and clears at turn end.
- Dorothy: True Self toggle, UT_Buff_304.png, gives ATK +1 until turn end. Skill at Warmth 5 snapshots current DEF (including existing modifiers) as additional ATK for the turn; subsequent edits do not alter the snapshot. Warmth is not automatically consumed by this requested workflow.
- Hanna: Doll Making 0..7, UT_Buff_305_1.png, changes to Doll Complete/UT_Buff_305_Awake.png at 7. Float skill grants MOVE +2 until turn end. Protect Friend toggle, UT_Platform_306.png, adds damage reduction 1 while enabled.
- Requested character icon mappings are in the canonical status CSV and identical 07 fallback. Weakness, Investigation Target, Erosion, Fan and permanent Fan reduction live on monster instance objects and are included in existing roster undo snapshots.

## Monster status control visibility and layout

2026-10-08 (07 and 08): Fate Echo uses the shared 20px icon / numeric stack control without visible label or input. Self Kaisei still applies 2 through skill target selection; positive stacks allow left +1/right -1 and turn-end -1. When Kaisei is a PT member (not self), the control remains visible at zero/off; activating from zero sets 2, active clicks increment by 1 and right clicks decrement. Countdown to zero switches aria-pressed off. Active marks remain editable even if Kaisei leaves the party; zero controls disappear when no PT Kaisei remains. Existing undo, defeated disabling and opponent refresh are preserved. Weakness uses UT_Buff_125_Skill.png in both versions.

- Weakness controls appear when Moses (24) is self or registered in PT, Investigation Target when Bonnie (27) participates, Erosion when Sykes (29) participates, and Fan when KAngel (101) participates. Controls for all participating IDs appear together after Mark, regardless of the current PT chip-edit target. Registration/removal refreshes controls through `party-members-change` without resetting map progress. Hiding a control does not remove its stored state/effects/Fan count. Existing combat effects still use the actual self character; PT editor selection does not switch the calculator's character. Ame retains shared Fan combat effects without the Fan toggle UI.
- These controls sit directly after Mark in each monster name, sharing the Mark field/button dimensions (22px button, 20px image, 13px stack count). Status clicks do not register combat targets or trigger the name button. Normal Mark remains available as before.

## PT registration and member editing

- The existing selected-character outer frame retains its exact full width and 118px height. Its rightmost 50px contains vertical Self/PT tabs; existing self controls retain their behavior inside the remaining space.
- Clicking a character while Self mode is selected sets the player's character through the original selection path and then automatically opens PT mode. Initial default Mimi initialization stays in Self mode. PT mode reuses the same character list for registration and preserves hover abilities and keyboard activation.
- PT contains a fixed 2x2 grid. Self initially occupies 1st; drag a filled slot onto any other slot (including an empty slot) to swap positions. Self identity follows the selected character ID, independently of display position. Duplicate IDs and more than three other members are rejected. Registration fills the first empty slot; right-click a registered list character or its slot background/name to remove it. Self cannot be removed.
- Lv sits immediately to the right of each name. The row below shows current/max HP, ATK, DEF and MOVE in that order (two columns on narrow screens). Self uses the original character state and calculated modifiers, refreshed through `updateStats` for edits, chips, skills, turn effects and undo. Other members have separate page-session state (Lv, current HP, acquired chips, manual ATK/DEF/MOVE). Registration starts at Lv0 with full HP; removal clears that member's state. Level increases add only the max-HP increase to current HP; decreases and chip removal clamp current HP to the new maximum. Acquiring max-HP chips raises maximum HP without automatically healing.
- Click a PT member's name/background (or Enter/Space on the focused frame) to select the chip-edit target. The highlighted frame/`aria-current` and chip status show the target. Chip-list clicks toggle acquisition only for that target, and pressed states update when switching targets. Selection follows character identity when dragged; removing the edit target falls back to self. The Self tab restores self as chip-edit target. PT member selection does not replace self or reset map/skill/CT state.
- PT member chip calculations read the canonical loaded rules: owned constant stat/max-HP bonuses, HP-full/half-HP conditions, and bonuses derived from extra max HP. Stack-dependent formulas, toggles, attack/move phases, map stacks and member character abilities remain outside this requested scope. Fixed always-owned rules apply; no new stack or toggle UI is created. HP edits immediately recalculate HP-conditioned bonuses. Member manual stat corrections remain independent of chip bonuses.
- Every member's own acquired chips appear to the right of its PT identity/stats, separated by a vertical rule like the self UI, in stored acquisition order (top-to-bottom, then next column). These are display-only icons with native name/effect tooltips; acquisition/removal uses the shared chip list and self's charge/other chip actions remain on the original self UI. The chip area follows the member when dragged and updates on acquisition/removal. It normally uses two rows with squares sized to its available height (19px desktop / 17px narrow). Only when that two-row capacity is exceeded does it switch to three rows and shrink squares to fit available width/height. A shared ResizeObserver recalculates on visibility/width changes. Icon gaps are 1px; the divider has 2px spacing on either side. Extremely dense selections can scroll horizontally after the 6px minimum size; outer frame and 2x2 dimensions stay fixed.
- Left-click the PT Lv or portrait button to raise level, right-click either to lower it, matching self controls (Lv0..3, ArrowDown also lowers). These right-clicks stop propagation so they do not remove registration. Self level buttons use the existing level/HP update path. PT HP icons change current HP by +1/−1 (left/right), bounded by 0..maximum, without inputs or frame resizing. ATK/DEF/MOVE icons similarly adjust manual stat corrections, clamped at zero. All icon controls stop propagation so they neither remove members nor alter the chip-edit target. Self icon edits remain linked to original self parameters; PT MOVE also supports a manual correction.
- PT registration/removal/reordering and other-member level edits do not select a different self character or alter its chips/stats/CT/map progression. Changing self replaces it at its current party position and clears any duplicate member slot. Outer dimensions remain unchanged at desktop and narrow widths; small screens wrap stats and omit portraits at 500px or less.
- PT is page-session registration only; it does not yet drive ally skill targets, persistence, or networking.


## 08 world reader (2026-10-09)

- `screen-reader-world.js` adds local round/progress and monster label matching. Height-normalized left anchoring reads Round and world labels; center anchoring reads nine progress cells. The single blue cell is resolved from at least three consistent numeric neighbours, including when an event icon hides its own number. Unknown/ambiguous observations abstain.
- Monster references currently cover only M0017 (爆竹ゲロゲロ) and M0014 (指揮センター), extracted from the supplied 2048x1152 screenshots. Connected red HP glyphs anchor a nearby white name template and serial. All must agree; occluded labels abstain. Full monster coverage needs more readable examples. Existing character portrait mapping is unrelated to these name references.
- Map synchronization is explicit opt-in in reader details and defaults off. No extra world analysis runs while off. Select actual map/difficulty first. Stable automatic frames require two consecutive equal clock/individual observations; map/difficulty changes reset stability. Frame hashing includes the world area.
- `ScreenReaderMapBridge` sets absolute round/progress and catches up numeric CSV event groups once using existing executed-event keys. It validates each unique name+serial identity, map and calculated maximum HP before updating or adding. Missing/ambiguous labels never delete monsters; old rounds are rejected. Undo snapshots include the change. Clock synchronization does not synthesize turn-end actions or decrement CT/stacks; those remain manual. Canonical parameters/CSV are unchanged.
- `build-screen-reader-world-fixtures.py` generates privacy-masked fixtures and glyph/name references. `tests/08-world-reader.spec.js` covers original/downscaled images, icon progress, missing label/serial/HP, event idempotence, independent serials, HP retention, stale frames, mismatched maxima, undo and controller opt-in. It is included in test:08 and workflow path filters.


## 07 PT received support controls (2026-10-09)

- User scope: no hand management. Accept effect amounts/toggles directly; skip ambiguous mechanics. 08 remains paused and these changes are 07-only for later integration.
- Self conditions now expose controls when the relevant non-self donor is registered in PT: Ren shield (manual toggle, damage reduction 99), Jill cocktail ATK/DEF counts (0..3) and explicit +1 heal, Yume confirmed ATK bonus amount, Bonnie received Stealth toggle (+target Mark ATK; manually off after combat), Dorothy ATK +1 toggle and pass healing +1 button, Pandaman food-trigger healing +2 button. The user confirms the actual in-game trigger/range before applying. This does not activate or simulate donor skill/CT or cards.
- Cocktail, Yume, Dorothy ATK and received Stealth expire on the existing turn-end button. Shield remains until manually consumed/changed. Removing a donor preserves received effects and keeps nonzero controls editable; zero controls disappear. Shield consumption/reflection is manual, reflection damage is not simulated.
- Received amounts live in self ability numbers and HP, so existing roster Undo restores changes. Healing caps at max HP. The controls use canonical icons, update calculator and PT self view, and do not select a different self or change map progress.
- Deferred: Al received Starlight stat conversion is not added: the source states the six-stack ATK/DEF passive for Al himself, and whether other recipients get that conversion needs confirmation. Final grant amounts would be entered directly rather than computed from cards. Lulu Heal needs stack healing/consumption rules; Yume automatic excess-heal conversion needs conversion/rounding rules (manual confirmed ATK amount is supported); Teru needs additional attack/damage timing; Hanna next-move consumption remains manual (no position/movement tracking); Jill card-to-healing classification and move-die +3 need confirmation (manual +1 HP steps are supported); Dorothy Warmth consumption order remains separate. Bonnie infiltration phase effects, PT caster CT and skills, monster movement/taunt/zones, random damage allocation and per-member timers need further implementation. Existing manual Kaisei/Weakness/Investigation/Erosion/Fan controls remain available.
- Changed files to port later: 07_skill/js/character.js, 07_skill/js/map.js (enable Undo immediately when a self effect snapshot is recorded) and related cases in tests/07-skill.spec.js. Preserve 08 CharacterBridge and MapBridge while transplanting.

- PT KAngel: roster action button applies permanent ATK -1 to live Fan monsters once per individual using the existing reduction flag. Use only after confirming the nine-Fan skill trigger in-game; character Fan totals/caster CT are not inferred. Disabled if no eligible Fan exists. Undo and active calculator target refresh are included.

- PT Hanna: received next MOVE +2 toggle, manually off after movement (does not expire at turn end). When self is Sherry, a pass-event button adds Reasoning Time +1 up to four; existing self turn-end decay and ATK calculation apply. Only the received +2 is recorded; duplicate grants are not automatically summed.


## 07 Teru follow-up (2026-10-09)

- User confirmed: use pre-consumption Foxfire for damage, consume one after a battle that actually triggered pursuit, minimum pursuit damage 1. No hand tracking, kill attribution or damage-source classification. 08 is unchanged.
- Attack table, expectation, defeat probability and card-aware graph now combine the ordinary hit with a separate dice-free Teru hit only if the ordinary hit leaves the enemy alive and pursuit is enabled with Foxfire >0. Pursuit = max(1, Teru display ATK + Foxfire - current enemy DEF) + target Mark/Erosion bonus. Main attack cards and ordinary attack-only chip modifiers do not increase Teru pursuit. Existing card selectors describe a prospective battle, not a managed hand; they do not automatically grant Foxfire.
- PT Teru: received Possession toggle, final Teru ATK (including possession stat bonus, excluding Foxfire), and Foxfire count are manual self-state controls, included in Undo. Received possession persists through generic turn end because its true expiry depends on party order; manually switch off at the recipient's next turn end. Nonzero controls stay editable after donor removal.
- Self Teru: Foxfire pursuit toggle no longer increases self display ATK. When enabled, enter possessed ally's battle ATK in 憑依先の戦闘ATK; that replaces the main attack calculator's ATK while Teru's own ATK supplies pursuit. Disable to return to own ordinary combat. Do not use pursuit mode for Teru's own ordinary attack.
- Possession snapshots each supplied stat's half rounded up, persists through generic turn end, and clears only via テルのターン開始. Recasting replaces the previous snapshot. Explicit lifecycle operations support Undo.
- Attack UI shows pursuit preview and 追撃後の戦闘終了（狐光−1）. Press once after an actual pursuit; do not press when the main hit alone killed the opponent. Calculation, card selection and HP edits never consume Foxfire or apply damage automatically. Actual opponent HP remains manually updated.
- When self is Sykes, pursuit preview adds two Erosion stacks relative to the pre-battle target state (one for main hit, one for pursuit per the supplied verification article). This is prediction only; actual Erosion count remains manually updated. No ordinary attack chip stack gains are dispatched for pursuit.
- References: https://note.com/kikka624/n/n727197d33249 ; https://note.com/numata_27/n/ndbaf0a6e18e3 ; https://note.com/brisk_cedum9178/n/n1f1235971403 . Player verification articles, not an official exhaustive effect specification. Unsupported pursuit interactions: Fate Echo, shields/damage reduction and unverified chip effects; do not assume ordinary combat modifiers apply. Enemy-turn reflected main damage is not calculated by this attack-mode preview.
- Port later: 07_skill/js/calculator.js, character.js, character-ability-rules.js, style.css and Teru test cases. Shared target-requirements CSV documents the current 07 behavior.


## 07 Padman / Moses / Teru clarification (2026-10-09)

- Padman: マジで怒ったぞ toggle automatically enables on skill use and expires on generic turn end. While on, the three manual passive corrections resolve to +2 and their editors are disabled; turning off restores the previous manual values. 次の攻撃ダイス6 is an independent manual toggle, with unsupported rows shown as － and six valid combinations; manually disable after the actual attack. No die-result or battle completion tracking is introduced.
- Moses: Precise stacks set evade minimum to 1+stacks (1..4). Defense-mode choices separately normalize defense over 1..6 and evade over minimum..6. Defense table has explicit 防御の表 / 回避の表 buttons for Moses. Evade table/graph/summary exclude lower faces, show － in their cells and normalize over 6*(7-minimum). Ordinary defense keeps all six faces. Switching self away from Moses resets evade view/minimum. Weakness still sets enemy battle die to zero.
- Teru: user confirmed Mark, Fate Echo and damage reduction apply independently to both main hit and pursuit. Pursuit base remains minimum 1 before increases/reduction; final reduction allows zero, following existing combat conventions. Enemy survival after actual reduced main hit controls follow-up. Foxfire still consumed only via explicit battle-end button.
- Position, hand and random target/damage tracking are out of current scope; results entered directly. Nancy distance/retaliation handling is excluded. Al's stat conversion is self-only; PT Al stats remain deferred. Lulu's stack-loss extra effects are excluded and do not require a new healing formula.
- 08 remains unchanged; port these calculator/character/rules/tests changes later.


## 07 bounded PT pair regression (2026-10-09)

- `pair-tests/07-party-pairs.spec.js` derives the 35 self × 34 non-self donor matrix from canonical character stats. Each self uses an independent fresh page and records individual pair checkpoints; no test hooks are added to app code. Registration and removal use DOM events in the browser for bounded cost; focused interactions use normal Playwright clicks.
- Common checks: duplicate registration rejection, self identity/ability snapshot/HP/ATK/DEF/MOVE/CT/calculator/chip/clock isolation; donor level/manual ATK/HP/chip editing; support visibility; monster Weakness/Investigation/Erosion/Fan/Fate Echo availability; donor removal cleanup and fresh re-registration. No skill is assumed implemented merely because CT exists.
- Focused coverage: Teru/Sykes Erosion prediction, Hanna/Sherry different expiry, three received buffs composing without sharing timers, Dorothy manual Warmth plus capped party heal; existing 07 tests cover Undo, skill targets, stacks, die probabilities and ordinary pointer input. Dorothy healing-trigger Warmth acquisition is not inferred here: automatic event linking remains separate from its manual stack control.
- Dedicated command/config/workflow: test:07:pairs / playwright.pairs.config.js / 07-party-pairs.yml. Per-self timeout45s, suite12min, failures3, workers2, retries0, CI job15min. JSON reports, per-pair JSONL, coverage attachments, failure traces upload even on failure/cancellation. PAIR_SELF_IDS allows selected self groups to rerun.
- Scope: 07 only. 08 merging and deferred ability additions are not part of the matrix test work.


## 07 full-party lifecycle and image audit (2026-10-09)

- `pair-tests/07-party-focus.spec.js` supplements the one-donor matrix with three donors: Padman/Jill/Dorothy/Ren skill and support composition, turn-end Undo, donor removal and re-registration; Sherry/Teru/Hanna/Ren independent persistent effects and pursuit consumption Undo.
- Browser image audit decodes all canonical status, chip, Hero Card2, monster and monster-info assets. A separate rendered audit visits every self character and the implemented received-support groups. Only four explicitly unassigned controls may use text substitutes: Pandaman counter attack/damage received, Nardis excess hand amount, Teru pursuit toggle. User will supply their icons separately. No image mapping is guessed here.
- Runs in existing bounded pair config/workflow (45 seconds per test, 12 minutes suite, 15 minutes CI, stop after three failures). Images audit JSON and failure traces are retained with pair results. 08 stays unchanged.


## 07 mobile touch UI (2026-10-09)

- Checkpoint: `checkpoint/07-before-mobile-20261009` at `1ed9fb62cd7675a1b649a986bb561b63492d1ae4` (local tag `checkpoint-07-before-mobile-20261009`). Work is isolated on `codex/07-mobile-ui`; 08 and calculator rules are unchanged.
- `mobile.css` and `js/mobile.js` activate only for coarse pointers at widths up to 900px. Desktop keeps its layout and pointer semantics. Mobile navigation and self/PT controls move above the main panel, with the character list in a bounded scrolling area; self/PT use flexible height and a vertical roster; assigned chips and dice tables can be expanded.
- Tap numeric icons to choose +/−; CT preserves reversed left/right semantics. Existing event handlers apply the edits. PT operation buttons expose chip editing, swap (including empty slots) and removal; self removal is not offered. Character abilities use an explicit detail dialog. Mobile uses native numeric keyboard, suppressing the custom number pad.
- No cross-device synchronization. Future sync must be hidden and inactive in touch mobile mode, not merely hidden visually. No browser-name-only detection. Real-device keyboard/safe-area/long-press behavior still needs manual verification.
- `npm run test:07:mobile` runs Chromium Pixel 5 and WebKit iPhone 13 emulation, plus 360px portrait/844px landscape and desktop restoration. Suite max5min, test30sec, failures3, CI15min. Screenshots and failure traces retained14days. Existing desktop/06b and bounded1190-pair CI remain required.


## 07 wide desktop / FHD layout (2026-10-09)

- `wide.css` changes only the outer arrangement when viewport width >=1600px and aspect ratio >=3/2, excluding mobile touch mode. At1920x1080, right management rail is520px, gap16px; left uses remaining width. Threshold is deliberately larger than initial1280 proposal to preserve main-view space.
- CSS Grid places main tabs/views on left; round/progress, unchanged118px self/PT frame and monster roster on right. Main content and roster list scroll independently within the viewport; narrow/tall windows keep vertical layout. No state or DOM ownership changes. Mobile retains its existing priority. 08 is unchanged.
- `npm run test:07:wide` / `playwright.wide.config.js` / `07-wide.yml` verify all4 modes at FHD, portrait/narrow/ratio gating, state retention, roster scrolling and HP Undo in Chromium and WebKit. Tests45sec, suite5min, failures3, CI15min; screenshots/reports retained14days. Existing desktop, mobile and pair regressions also required.
- Checkpoint before wide UI:2582a1336d7dec9f07351c25338c9741da0c7785 (mobile approved by user); branch codex/07-wide-layout.

## 07 wide layout refinement (2026-10-09)

- Supersedes initial wide arrangement: right rail35% (minimum580px), round/progress top left, standalone main tabs to its right; main below. Monster roster top right in2 columns, self/PT118px frame bottom right. Only roster list scrolls within right rail.
- Wide map toolbar combines subtabs on left with map/difficulty on right; wrapper is display:contents outside wide mode. Roster help text is hidden only in wide mode, card statistics use2x2 compact rows. Vertical/mobile layout and calculation/state processing remain shared.
- Checkpoint before refinement:3b409c6a8e760a4e813a4f3f24121d60e553cbe6; branch codex/07-wide-refine. Existing bounded wide/mobile/desktop/pair CI remain required.

## 07 compact roster and owned-chip dialog (2026-10-09)

- Wide-mode roster count and Undo/Clear share one row; four statistics fit one compact row (18px icons/13px text, HP three digits).
- Wide-mode Chip button beside Skill opens a native dialog with names and56px owned-chip icons. It moves the original controls, preserving charge/CT activation handlers; closing or leaving wide mode restores their home. Condition toggles remain in the lower status bar. Vertical/mobile keep their chip presentation. New script js/wide-chips.js loads after mobile.js.

## 07 attached tabs / anchored chip popup (2026-10-09)

- Wide main tabs attach to the panel top edge. Explicit per-role border colors match all4 panels; selected bottom border bridges with white.
- Wide roster uses equal12px column/outer spacing; scrollbar is hidden to avoid asymmetric gutter, while wheel/touch/keyboard scrolling remain (list is focusable). Cards use the recovered width.
- Chip dialog sits at bottom right near the opener. Close button, Escape and outside click dismiss it; original self-chip handlers and restoration remain. Each occupied PT slot has a wide-only Chip button with a named read-only ownership list; self slot reuses self actions. Empty ownership has a message. PT chip editing stays on existing character/chip tabs.
- Checkpoint before change:b98ffbc817c5067d510edb4348c74968977c13d1; branch codex/07-wide-details.

## 07 intact panel outline / PT chip counts (2026-10-09)

- Supersedes white tab bridge: wide tabs meet the panel top without covering its border. Selected tab has all4 colored edges; panel outline stays intact and role background colors remain.
- Occupied PT slots show owned-chip count (×0, ×1, ...) directly below Chip button, refreshed by existing renderParty ownership updates. Wide-only control reserves room beside name/statistics; mobile/vertical presentation is preserved.
- Checkpoint:b97c314e1ed75c97bb3931abf1d7e62bc4c2082a; branch codex/07-tab-outline-counts.

## 07 single shared tab edge / opt-in ability hover (2026-10-09)

- Wide tabs share the exact3px top edge with the panel, keeping active bottom color while avoiding stacked6px line. Inactive background clips to padding box so panel outline is not covered. Wide main/map/character subtab gaps are0.
- Character header now holds list/chip tabs, PT/list status and a default-off checkbox for ability hover. Tooltip show (including keyboard focus) requires the checkbox; disabling hides it immediately. Mobile explicit ability details remain available.
- PT chip count is anchored farther down/right beneath its button. Existing owned counts and popup handlers remain shared.
- Checkpoint:7e895f953981894182e3cf23200c6863b06a43c5; branch codex/07-hover-toolbar.

## 07 tab attachment correction (2026-10-09)

- Supersedes overlapping tab edge: tab bottom meets panel top without overlap; tab bottom border is zero so the intact panel top supplies the single shared line. All tabs paint to their rounded border box, including inactive tabs. No gap between tabs.
- Character hover checkbox uses compact label スキルを表示 and auto left margin to stay at the header right edge even when status is empty. Default-off behavior remains.
- Checkpoint:7d14dfc78ebe7766d64e9311e0f698489e7a6f57; branch codex/07-tab-corners. 08 unchanged.

## 07 HP click direction / Pandaman stack icons (2026-10-09)

- HP icons now decrement on primary click and increment on contextmenu for self, all PT slots, and monster roster. Other statistics retain their directions. Mobile plus/minus routes HP events in the reversed direction, preserving the explicit meaning of its buttons. Direct numeric entry and HP clamping/defeat/Undo remain shared.
- Pandaman カウンター攻撃 is a nonnegative stack counter using UT_Buff_Counter.png; このターンに受けたダメージ uses UT_Buff_SangXinBingKuang.png. Counter >0 keeps the existing received-damage ATK bonus once, without multiplying by stacks. Acquisition, consumption and damage entry remain manual; no new lifecycle inference.
- Checkpoint:a6c296f68e7a216d0e1f865978d6c19d59a2eacb; branch codex/07-hp-counter. 08 unchanged.


## 07 Teru persistent inputs / pursuit controls (2026-10-10)

- Base: latest main `e5a99980137844f90a0b9c3be01ff08786a75c7d` (PR #186). New branch `codex/07-teru-controls-20261010`; old `codex/07-teru-follow-up` was inspected only as reference, not merged. 08 is untouched.
- Current main already had no 攻守増加ストック control. Possession instead prompted for ally ATK/DEF and resolved ceil(source/2) into activeEffects. Those prompts are now persistent Attack/Defense icon inputs beside Skill, stored in self numbers under the same 三神憑依対象攻撃力/防御力 keys. Edits do not mutate the active snapshot; casting replaces it and next Teru turn clears it. Editing inputs and self pursuit mode/stack values now records Undo.
- Self 狐光追加攻撃 remains necessary: it switches main calculation to 憑依先の戦闘ATK while Teru's own ATK supplies the independent pursuit. Visible label is 憑依先の戦闘＋狐光追撃 with instructions; keep off for Teru's own ordinary battle. No automatic damage, Foxfire grant/consumption or hand tracking added. Existing explicit pursuit battle-end consumption remains.
- PT controls are received-effect inputs on the selected self, NOT the PT roster member's ATK/HP state. PTテル憑依 enables pursuit; PTテル攻撃力 supplies pursuit ATK only and is now a standalone Attack icon numeric input; PTテル狐光 is the sole numeric stack control. Removing the donor preserves received values/controls; changing self preserves each character's independent self numbers. Re-registering the PT donor does not infer or overwrite these numbers.
- Pursuit calculation is unchanged: pre-consumption Foxfire, main-hit survival gate, dice-free follow-up, minimum base one with independent target modifiers/reduction, explicit Foxfire -1 and Undo.
- Changed: 07 index.html, js/character.js, style.css; tests/07-skill.spec.js, wide-tests/07-wide.spec.js, mobile-tests/07-mobile.spec.js and this handoff. Later port only these Teru changes to 08 while preserving reader bridges.
- Local syntax: all 20 scripts individually and concatenated order passed; git diff --check passed. Local Playwright execution attempted for Teru and 06b/07, blocked at browser launch (no browser executable). Browser download failed with empty/invalid ZIP in this environment; npm ci also cannot be used because this repository has no lockfile. Existing hosted workflows use npm install. Browser assertions, screenshots, file:// and real touch behavior are pending hosted CI/manual verification at this checkpoint; do not claim local browser success.
- Added focused regressions for persistent source values, snapshot replacement, source/mode Undo, independent PT attack input, donor removal, self switching, file://, wide/mobile input bounds and screenshots. Existing HP direction, Pandaman, tabs and pursuit tests retained.

- First hosted CI: 07 had 59 passing/1 stale CT expectation (Teru no longer cancels a prompt); wide had 13 passing/1 WebKit failure and mobile 11 passing/1 WebKit failure. Trace showed source inputs retained 5/3 but Skill stayed CT0: redundant source-change UI refresh during blur rewrote Skill text and cancelled the pending WebKit click. Source edits now store values without recalculating display, and unchanged changes return immediately; PT pursuit ATK edits still recalculate. Updated CT test reflects actual cast. Revalidation pending.

- Visual QA of hosted failure traces also found mobile CT extending past its frame and desktop's third control row reaching the condition bar. Added a Teru-only bounded mobile flex row and compact two-row desktop grid (Skill/CT then source ATK/DEF), with clearance above display stats. Bounds tests now include Skill, CT and source-versus-stats overlap. The second CI passed 07/06b/wide; final layout revalidation follows.

- Final layout pass found the shared global label margin (15px top/bottom) expanding Teru source rows. Teru stat labels now explicitly have zero margin; desktop stat-row clearance is 14px. Mobile and all existing wide cases already passed; the added wide overlap assertion caught this remaining expansion.

- Final validation on code commit `d0206a82897f470cba17b15f9b154bd4d1e9a56b`, PR https://github.com/Kanoton/damage-calculator/pull/188: all five hosted workflows succeeded. 07 skill 60 passed; 06b command/full default suite 90 passed; wide Chromium/WebKit 14 passed; Android Chromium/iPhone WebKit 12 passed; PT suite 41 passed, including all 1,190 pairs (35 groups × 34, no failed or remaining pairs). file://, source snapshots/replacement, PT removal/self switching, pursuit consumption and Undo pass. Existing HP direction/Pandaman/tab regressions remain green. Inspected final Teru screenshots in both layouts: sources and CT are contained and display stats are separate. Real game sessions and real-device keyboard/touch behavior remain unverified. Local browser limitation remains; successful browser results are hosted CI.


## 07 Teru revised user specification (2026-10-10; supersedes PR #188 notes above)

- User correction: self Teru never supplies pursuit for its own attacks. Removed the self pursuit toggle, possessed-ally battle ATK field and calculator ATK override. getTeruFollowUp returns null for self Teru, and pursuit consumption does not consume self Foxfire. Only Foxfire remains in the self stack bar.
- The two permanent Skill-adjacent Attack/Defense inputs now represent the confirmed INCREASE amounts (not ally source stats). Entered nonnegative integer values add directly to self stats and replace the prior increase immediately. Skill controls CT without applying those amounts again. Generic Turn End resets both inputs/increases; Undo restores them. Ordinary level/chip/manual ATK/DEF remain independent. No ceil(source/2) snapshot or separate Teru Turn Start operation remains.
- PT pursuit references calculatePartyMember(Teru).atk directly, including level, chips and manually reflected possession increases in the roster ATK. Removed the separate received PT Teru ATK input. PT ATK/level/chip changes refresh pursuit prediction. Foxfire and received-possession toggle remain per-self; removing Teru disables pursuit even if received values remain, and re-registration reads the fresh roster member. Self switching retains per-self received values but never assumes a missing donor ATK.
- Updated 07, wide, mobile and bounded PT regression tests for revised inputs, reset/Undo, self pursuit exclusion, direct donor ATK and removal/re-registration. 08 and calculator pursuit damage formulas unchanged. Same open PR #188 is being corrected on the branch already based on latest main e5a99980; no rollback or old-branch merge.
- Checkpoint: syntax check passed (20 individual scripts and actual-order concatenation). Local npm Playwright attempted but temporary/runtime package mismatch blocked collection; direct matching-runtime invocation is next. Hosted CI required before reporting browser success.

- Revised-spec CI checkpoint: wide 14 and mobile 12 passed on implementation commit 7b9b49d; inspected WebKit screenshots. Initial 07/06b runs failed in two new test assertions: counted an unrelated map number as a Teru stack, and attempted donor removal from a hidden character-list panel while Map was active. Fixed the test scope/navigation; no application failure was identified by these errors. Also corrected self-switch expectations because other PT donors remain registered, and added live pursuit summary refresh plus real input blur/Skill clicking in both layout browser suites. Matching-runtime local 07/06b collection succeeded but browser launch was blocked by the missing Chromium executable.

- Final revised-spec validation on code/test commit `4c983574a754406e8bdd042b3572606ca9f6bbcf`: all five hosted workflows succeeded. 07:60 passed (run38026242011); 06b/full default suite:90 passed (38026242108); wide Chromium/WebKit:14 passed (38026241991); mobile Android Chromium/iPhone WebKit:12 passed (38026241963); PT:41 passed (38026242064), all1,190 pairs/35 groups completed, zero failed/remaining. Revised self direct input/no pursuit/reset/Undo, file://, PT ATK live summary, donor removal/re-registration and self switching pass. Existing HP/Pandaman/tab regressions remain green. Visually inspected Teru's wide and mobile screenshots; the only Teru-specific stack is Foxfire (unrelated map controls remain). Local syntax and diff checks pass; real game/physical-device keyboard and touch are still unverified. PR #188 remains open, unmerged. Modified files:07 index.html/js/character.js/js/character-ability-rules.js/style.css; tests/07-skill.spec.js; wide-tests/07-wide.spec.js; mobile-tests/07-mobile.spec.js; pair-tests/07-party-pairs.spec.js and07-party-focus.spec.js; this handoff. 08 untouched.


## 07 eight-character corrections and opt-in exhaustive checks (2026-10-10)

- Supersedes the prior Teru direct-increase interpretation. Self source ATK/DEF fields beside Skill now add ceil(source/2), retaining the requested turn-end reset and input/turn Undo. PT pursuit continues to read the registered Teru's complete calculated roster ATK directly; never halve the complete pursuit ATK again. Self pursuit remains excluded. Main remains e5a99980, open PR #188 is continued without rollback; 08 stays unchanged.
- Nardis: 手札枚数 stores actual own hand count (monster hand count is zero). ATK bonus is min(count,3), rather than clamping the input count. Reference is UT_Buff/UT_Buff_Hand.png. This asset is absent in latest main and workspace; the explicit text fallback remains until the user supplies it. Do not fabricate another icon or claim image display is complete.
- Padman: Skill enables its existing internal maximum-for-turn state. Removed the manual skill toggle from visible controls; three passive modifier fields use Attack/Defense/run icons and show forced +2 while Skill is active, restoring prior manual values at turn end/Undo. Visible character controls are next attack fixed-six plus three numeric modifier fields.
- Ren: party membership exposes one 反撃 toggle using UT_Buff_Counter.png. It tracks state, separately from Juju Shield, with Undo. Reuses the same counter state on self Pandaman to avoid duplicate counter buttons; does not infer automatic grant/consumption.
- Pandaman: 反撃 is a toggle, replacing counter stack counting. Only when on does received-this-turn damage increase ATK. Damage input and icon remain. Toggle Undo added.
- Lulu: selecting Lulu or registering it in PT exposes self ヒール stacks, also deduplicated against chip-related Heal fields. Entered received stacks survive donor removal and remain per-self; zero disappears when Lulu is absent. Heal edits have Undo. No unspecified automatic healing/grant/consumption added.
- Hime: Energy >0 grants fixed ATK+2/DEF+2 regardless of count1..5. Skill conditional ATK+4 and Energy count handling remain.
- Z3000: capture ATK>=7 at skill request. After chosen target receives Skill damage, if still alive, select/register that monster through the normal attack selection path and open Attack. A kill does not open Attack, and an ATK increase caused by that kill does not retroactively enable the threshold. Skill damage/CT/kill Undo remains.
- User's new testing policy: exhaustive checks ONLY when explicitly requested. Pair workflow is workflow_dispatch-only, with a dispatch job guard; no PR/push auto-run. Ordinary CT smoke targets the eight affected IDs6/8/9/10/11/12/15/23; FULL_CHARACTER_CHECK=1 allows the full CT scan only on request. AGENTS.md/WORKING_GUIDE.md updated. Pair expectations are maintained for future explicit runs, but no matrix tests are executed for this work.
- Checkpoint: all20 JS individual/actual-order concatenation syntax and git diff --check passed. 07 lists66 tests including new Nardis count/cap, Ren state/Undo, Lulu self/PT lifecycle, Hime fixed bonus and Z3000 threshold/target/kill tests. Teru/Padman/Pandaman existing expectations and both layout tests updated. Local matching Playwright runtime can collect tests but Chromium executable remains unavailable from earlier verified attempts; hosted 07/06b/wide/mobile CI will supply browser results. UT_Buff_Hand.png display remains blocked by missing asset.

- First eight-character CI checkpoint (6f07c7a): wide14/mobile12 passed; 07 had62 passed/4 failed, default suite92 passed/4 failed. Two failures were stale Padman icon assertions; one used the first roster card after a defeat reordered active/spawned monsters. Updated expected icon paths and target-instance lookup. Lulu Heal had an actual duplicate Undo entry: explicit change followed by native blur change stored the same value twice. Heal setters now ignore unchanged values before recording Undo and normalize stack counts to integers. Z3000 additionally re-renders roster selection after opening Attack, with selection/Undo assertions. No exhaustive workflow was triggered (only four requested standard regression workflows exist).

- Final eight-character validation on `d584a5ecdcd46ef2646c4c28e383757113179265`: 07 66 passed (run38029957707); 06b/full default suite96 passed (38029957712); wide Chromium/WebKit14 passed (38029957702); mobile Android Chromium/iPhone WebKit12 passed (38029957714). All four workflows succeeded. No pair/exhaustive run was triggered, and full CT scan was not enabled. Syntax/diff checks and local-versus-remote content comparison pass. Corrected Heal duplicate Undo and all stale test assertions; Z3000 attack selection/Undo/kill threshold, Hime fixed bonus, Ren/Pandaman counter states, Lulu self/PT Heal lifecycle, Nardis full count/cap and Teru rounded halves/file:// pass. UT_Buff_Hand.png remains missing and image display is explicitly pending user-provided PNG; exact reference/text fallback verified. Real game/physical-device input remains unverified. PR #188 open/unmerged;14 changed files relative to main, all in07, related tests, workflow and development documentation;08 unchanged.


## 07 skill lifecycle / numeric entry follow-up (2026-10-10, Japan; supersedes permanent Teru inputs)

- Base: latest main a31824b8 (PR #188 merged); dedicated branch codex/07-skill-followup-20261010. UT_Buff_Hand.png is now present in main; prior missing-asset notes are resolved. 08 remains untouched.
- Ren: enabling either self Juju Shield or received PT Juju Shield enables the shared Counter toggle in the same Undo snapshot. Shield off and Counter off are independent manual operations; no automatic expiration/consumption inferred. Self Ren now exposes Counter too.
- Misaki: evaluate conditional skill effects before any effect mutates controls. Initial Sword Aura 2 becomes 3; initial 3 becomes 1. Target damage/CT/Undo remain one transaction.
- Nardis: Skill adds three to actual 手札枚数. ATK bonus stays capped at 3. Turn-end card removal is manual; no automatic decrement.
- Jasmine / Sumikage: replace window.prompt with numeric source fields beside Skill, using existing keypad / native mobile numeric keyboard. Inputs retain source values, but applied Skill bonuses resolve only on successful cast. Invalid/empty/fractional/negative input blocks cast. Turn-end removes existing Skill bonus; source editing does not add a second bonus.
- Teru: remove permanent header source fields. Clicking Skill opens a bounded native dialog for ally ATK/DEF, with existing keypad within the modal. Confirm applies ceil(source/2) and CT together; cancel/Escape changes neither. Recast replaces prior values, turn end resets them, Undo restores one cast. Self pursuit remains disabled; PT roster ATK reference unchanged.
- Luka / Sherry: Enter while selecting multiple targets commits the selected set before the focused button's native click can toggle it. Empty selection does not cast. Numeric editor Enter remains numeric confirmation.
- Moses: existing evadeMinimum=1+Precise stacks already implements the requested rule. Added focused stack2 regression: faces3..6, 24 equally weighted combinations; table/base/card-aware probabilities must agree. Ordinary defense remains unchanged.
- PT Bonnie: same bounded phase choice and icons as self Bonnie; forward click/backward contextmenu, received phase per-self, Undo and retention after donor removal. This follows existing manual phase controls; no range/card/event effect inferred.
- Local checks: all20 scripts individually and concatenated passed; diff whitespace check passed; Playwright collected74 07 cases. Local browser execution blocked at launch by missing Chromium headless-shell1234, so hosted CI is required before merge. No exhaustive matrix or full-character CT scan run.
- Pending: hosted 07/06b/wide/mobile CI and visual artifacts, final diff and user-authorized merge / Pages deployment. Physical device / real-game validation remains unverified.

- First hosted CI checkpoint (8dde5139): mobile12 passed; wide12 passed/2 failed. Actual defect: keypad anchored below a modal input overlapped the modal Confirm button in Chromium and WebKit. Positioning now anchors outside the whole modal, preserving access to Confirm/Cancel. Added Jasmine/Sumikage bounds/cast tests in both layout suites (wide18/mobile16 cases). 07/06b were still running at this checkpoint.

- Second checkpoint (a018f5e): 07 73 passed/1 failed; mobile16 passed; wide16 passed/2 failed (Chromium Jasmine/Sumikage row bounds). Teru modal/cancel/recast/Undo and keypad now passed. Empty required skill input was restored to its old value by the shared keypad; required fields now keep blank values so validation blocks casting. Layout trace measured source bottom987 vs stats top986: constrained desktop source/button row to24px. Enter on Cancel keeps its normal cancel behavior. Revalidation follows; no exhaustive runs.

- Final code/test validation at 76dcf874f49ced531af522b4df543a0eaf9e23cc, PR https://github.com/Kanoton/damage-calculator/pull/189: 07 74 passed (38062410405), 06b/default regression104 passed (38062410330), wide Chromium/WebKit18 passed (38062410338), mobile Android Chromium/iPhone WebKit16 passed (38062410342). All4 CI workflows succeeded. Modal keypad overlap, required blank restoration and 1px source-row overlap corrected; viewed final Chromium/WebKit artifacts for Teru and adjacent fields. No exhaustive pair workflow or FULL_CHARACTER_CHECK used. Syntax/diff checks pass. 10 changed files:07 index.html/style.css/js character-ability-rules.js,character.js,map.js,number-pad.js; tests/07-skill.spec.js; wide-tests/07-wide.spec.js; mobile-tests/07-mobile.spec.js; this handoff. Existing HP/tab/Pandaman/PT pursuit/Undo regressions pass. Local Chromium unavailable; browser results are hosted CI. Real game and physical-device keyboard remain unverified. User authorized merging after checks; final documentation commit, CI and Pages verification follow.


## 07 Rinrin / Sykes follow-up (2026-10-11, Japan)

- Base: latest main 05bca166 (PR #189 merged); branch codex/07-rinrin-sykes-20261011. No rollback or old-branch merge. 08 untouched.
- Rinrin: removed the independent Area Passage toggle and its separate permanent ATK+2. Skill opens a bounded Yes / No / Cancel dialog first. Yes starts existing unlimited multiple-monster selection; successful confirmation applies DEF-2 to selected monsters and ATK+2 to Rinrin once. Existing two-turn countdown resets only these skill modifiers after the second Turn End; manual stats stay intact. Target cancel, dialog cancel/Escape and character switch do not cast. No casts without parameter effects and records CT in one Undo snapshot. No new range/position rule inferred.
- Sykes: erosion controls appear only for self Sykes, never from PT membership alone. Existing self-authored hidden counts remain until Turn End; all roster monsters, including defeated entries, then reset to zero. Selected opponent/calculator refreshes and one Undo restores all counts. Other PT monster status controls unchanged.
- Tests: updated affected legacy status expectations and future opt-in pair expectations; added passage No/cancel/switch/file fallback, Sykes hidden/all-monster expiry and Undo, and bounded dialogue/touch tests in both layout suites. No exhaustive pair or full-character CT scan executed.
- Checkpoint: all20 JS and actual script-order concatenation syntax passed. Local Chromium executable remains absent; hosted 07/06b/wide/mobile CI required before merge. Physical-device/real-game validation remains unverified.

- First hosted CI (08b2c44): wide20/mobile18 passed; 07 had76 passed/1 failed. The remaining legacy Kaisei/Bonnie/Rinrin target test skipped the newly required Yes confirmation and was blocked by the modal. Updated that test to use the new flow; all new focused tests passed. Viewed Android Chromium/iPhone WebKit passage screenshots. Local browser test was attempted and blocked by missing Chromium headless-shell1234. Revalidation follows; no exhaustive check.

- Final code/test validation at a3d5fbcd572f58ba78640c908b456803c5289128, PR https://github.com/Kanoton/damage-calculator/pull/190: 07 77 passed (38064133950); 06b/default regression107 passed (38064133945); wide Chromium/WebKit20 passed (38064133946); mobile Android Chromium/iPhone WebKit18 passed (38064133948). All4 workflows succeeded. Passage/cancel/No/target batch/two-end expiry/Undo/file fallback and Sykes hidden/defeated/all-monster reset/calculator refresh/Undo pass. Existing HP/Pandaman/tab/Teru regressions remain green. Viewed final unchanged-code wide and Android/iPhone modal screenshots; local and remote tree contents agree. Nine changed files:07 js/character-ability-rules.js,character.js,map.js andstyle.css; tests/07-skill.spec.js; wide-tests/07-wide.spec.js; mobile-tests/07-mobile.spec.js; future opt-in pair-tests/07-party-pairs.spec.js; this handoff. No08 changes or exhaustive runs. User authorized merge after checks; final documentation CI, merge and Pages deployment verification follow. Physical-device and real-game validation remain unverified.


## 07 Ren / Jill / Dorothy / Hanna / Sherry follow-up (2026-10-11, Japan)

- Base: latest main 4ad878c9 (PR #190 merged plus user's image upload). Isolated worktree/branch codex/07-five-character-20261011 preserves an unrelated existing local Hero Card2 image modification. No rollback or 08 edit.
- Ren/Hanna descriptions: 07 shared tooltip/detail view moves Juju Shield after passives as its own heading and following effect line; inserts the supplied Float explanation after Hanna passives, before Doll Complete. HTTP and file fallback share this presentation; canonical shared descriptions and08 remain untouched.
- Jill: removed Life-changing Cocktail MOVE+3 toggle/modifier; Skill CT remains. Removed PT Jill and PT Dorothy heal action buttons. PT cocktail ATK/DEF numeric icons retain the confirmed artwork and have red/blue 2px borders; effect counts/turn expiry/Undo remain.
- Dorothy: initial Warmth5 snapshots complete DEF into the skill ATK bonus BEFORE consuming all5 Warmth. The added conditional control effect is evaluated with the existing pre-mutation branch logic. Below5 stays unchanged; one Undo restores skill/CT/Warmth/bonus and turn-end expires only skill ATK.
- Hanna: Protect Friend is visible only with registered Sherry106, and its damage reduction also requires that donor. The manual received state is preserved but inactive while Sherry is absent; re-registration restores editable state. Range remains manually confirmed.
- Sherry: both existing Hanna passage-event support operations (next MOVE and Reasoning +1) use explicit UT_Buff/UT_Platform_305.png. Other recipients keep their Doll Complete icon. No new automatic passage or extra operation inferred.
- Tests added for tooltip order/headings in HTTP/file, Warmth5/4/snapshot/reset/Undo, removed controls, independent cocktail amounts/border styles, Hanna donor removal/re-registration and loaded blessing artwork; existing legacy expectations and future opt-in pair expectations updated. Pair/full CT checks not run.
- Checkpoint: all20 scripts and actual-order concatenation syntax pass. Hosted07/06b/wide/mobile CI pending; local browser remains unavailable. Physical-device/game validation unverified. Later08 port must preserve its reader bridges and can apply these07 display/control/rule changes separately.

- Final code/test validation at fed67828ed83e7627ba04c69f8b05bc82d5bcba7, PR https://github.com/Kanoton/damage-calculator/pull/191: all4 hosted workflows succeeded on the first run. 07 82 passed (38093227714), 06b/default regression112 passed (38093227765), wide Chromium/WebKit22 passed (38093227711), mobile Android Chromium/iPhone WebKit20 passed (38093227688). HTTP/file tooltip order and separate headings, Warmth5 pre-consumption DEF snapshot/consume/Undo versus Warmth4 retention, removal of Jill MOVE/PT healing controls, red/blue borders, Hanna donor gating/removal/re-registration, and both loaded Sherry blessing icons pass. Existing HP/Pandaman/tab/Rinrin/Sykes/Teru regressions remain green. Inspected Android/iPhone screenshots for colored icons and no duplicate healing actions. Syntax/diff checks pass; local browser execution attempted but blocked by missing Chromium headless-shell1234. Nine files changed:07 character-ability-rules.js,character-view.js,character.js,style.css; tests/07-skill.spec.js; wide-tests/07-wide.spec.js; mobile-tests/07-mobile.spec.js; future opt-in pair-tests/07-party-pairs.spec.js; this handoff. No exhaustive checks, 08/shared CSV/images unchanged. User-authorized final documentation checks, merge and Pages verification follow; real device/game validation remains unverified.


## 07 anchored skill inputs / Ren / Jill / Sherry follow-up (2026-10-11, Japan)

- Base: latest main fcfa33af (PR #191 merged); isolated branch codex/07-skill-popovers-20261011. Existing unrelated Hero Card2 image edit remains in the original checkout. No08 changes, rollback, exhaustive pair run or full-character CT scan.
- Self Ren: no Counter control, including previously retained received Counter state; self Shield no longer grants Counter. PT Ren Shield still grants the existing Counter toggle, with independent manual off and Undo.
- Jasmine / Sumikage / Teru: clicking Skill opens draft numeric fields anchored just above the Skill button and bounded to the viewport. Jasmine/Sumikage no longer have permanent inputs. Existing keypad (native numeric keyboard on mobile), explicit confirmation, atomic effects/CT/Undo, retained committed sources and turn-end expiry remain. Outside-frame click or Escape cancels the entire draft and closes keypad; no source/effect/CT mutation before confirmation.
- Rinrin: anchored, wider passage confirmation with single-line Yes explanation; existing No/Yes multiple-target/2-turn/Undo semantics remain.
- Ren tooltip: Juju Shield heading stays bold; its following short effect sentence bypasses generic heading detection.
- Jill: preserve icon size/position and existing red/blue outer borders; fill the intervening icon background with the matching color so the frame extends to artwork edge.
- Sherry: restore received next-MOVE Doll Complete to UT_Buff_305_Awake.png, same as other recipients. Separate Friend's Blessing reasoning operation retains UT_Platform_305.png.
- Checkpoint: all20 individual scripts and actual-order concatenation syntax pass; diff whitespace clean. Focused local browser tests attempted but cannot launch because Chromium headless-shell1234 is absent (not application failures). Updated standard/layout expectations; added draft outside/Escape cancellation and non-bold explanation assertions. Hosted07/06b/wide/mobile CI required before authorized merge; physical-device/game input remains unverified.


- First hosted CI at4926849f:07 85 passed (38095399282), wide Chromium/WebKit22 passed (38095399348), mobile Android Chromium/iPhone WebKit20 passed (38095399285). Viewed mobile Jasmine/Rinrin/Jill screenshots: popup near Skill, Yes single line, solid red/blue fill up to artwork without movement.06b still pending. Added matching background-color assertions and deferred keypad position refresh by one animation frame, so modal autofocus and its subsequent anchoring cannot leave the pad at the old centered coordinates. Final revalidation follows.


- Final code/test validation at30533345a0573765d9fda7d514ee273c672a6da9, PR https://github.com/Kanoton/damage-calculator/pull/192: all4 hosted workflows succeeded.07 85 passed (38095573452);06b/default regression115 passed (38095573439);wide Chromium/WebKit22 passed (38095573442);mobile Android Chromium/iPhone WebKit20 passed (38095573443). Outside/Escape draft cancellation closes keypad and preserves sources/stats/CT; confirmed skill, halves/expiry/Undo/file fallback, self/PT Ren controls, normal-weight effect text, Sherry distinct icons and filled cocktail backgrounds pass. Viewed final wide Chromium/WebKit Jasmine/Teru popup-keypad screenshots plus mobile Jasmine/Rinrin/Jill images. Syntax/diff checks pass and local content equals published tree. Nine files changed:07 character-ability-rules.js,character-view.js,character.js,number-pad.js,style.css;tests/07-skill.spec.js;wide-tests/07-wide.spec.js;mobile-tests/07-mobile.spec.js;this handoff.08/shared CSV/images untouched, exhaustive checks not run. Final documentation CI, user-authorized merge and Pages verification follow. Local Chromium missing; physical-device/real-game validation remains unverified.


## 07 in-frame keypad and explicitly requested full check (2026-10-11, Japan)

- Started09:01 JST; user requests stop/checkpoint if unfinished around10:01 JST (one hour). Base latest main64d92c0d; branch codex/07-inline-keypad-fullcheck-20261011.08 untouched; unrelated original Hero Card2 image edit preserved.
- Padman: remove movement-die reference from07 displayed passive description in shared tooltip/detail renderer; canonical shared CSV and08 unchanged. Parameter rules/controls unchanged as requested.
- Jasmine/Sumikage/Teru: numeric dialogs use an in-frame keypad to the right of fields, including mobile. Actions use the same bounded content width at lower right; confirmation labels shortened to 確定. Keypad confirmation/Enter casts Jasmine/Sumikage; Teru ATK confirmation advances to DEF, whose confirmation casts. Draft cancellation outside/Escape and atomic source/effects/CT/Undo retained.
- Rinrin: consistent14px explanation text, naturally bounded width, action row directly below explanation; mobile wraps instead of shrinking text.
- Sherry: existing Friend's Blessing operation still adds Reasoning; also grants next MOVE+2. Received Doll Complete and Blessing movement combine by OR at+2. Blessing movement is manually cleared by right click without changing Reasoning; received movement persists like Doll Complete, with Undo.
- Full-check authorization applies to this request. Added label-gated full-check workflow because available connector cannot dispatch workflows. Label user-requested-full-check is applied only after explicit user authorization; ordinary unlabeled PRs skip the job. Existing manual pair workflow unchanged. Full CT test now handles numeric dialogs/Rinrin cancellation and extends its timeout only when full scan enabled.
- Syntax/all-script-order and diff checks pass. Hosted standard regressions and35-character CT/1,190-pair coverage pending. Physical-device/game input remains unverified. Similar confirmation wording audit will be reported only after requested processing and merge complete.


- First CT scan atc93be196 failed Jasmine cast: pointerdown committed/detached the now in-flow keypad, shrinking the dialog and moving submit under the cursor. Fixed by reserving keypad slot height and fitting its columns. At64b8e27 all35 CTs pass;07 89 passed (38097306992), default119 passed (38097306983; includes07, not119 separate06b tests), wide22 passed (38097307008), mobile20 passed (38097306996). Viewed mobile Teru/Rinrin images: in-frame keypad/right fields, consistent14px explanation and actions below.
- Full pair suite at64b8e27 had39 passed/2 failed: self Pandaman10 and Lulu11 failed first donor because expected support omitted their own baseline Counter/Heal.33 self groups completed34 donors each; affected groups stopped with33 unexecuted donors each. Corrected expected support to union baseline self controls and deduplicated received controls; application behavior unchanged. Full revalidation required; no failed/unexecuted pairs counted as successful.


- Screenshot refinement: mobile Rinrin's original long sentence stranded the final syllable on a second line at14px. Shortened the same ATK/DEF explanation without changing effects and added a one-line text-range assertion on desktop/mobile. Blessing operation now exposes its received movement state through aria-pressed; right-click clearance remains independent of Reasoning. Local focused launch was attempted and blocked by missing Chromium headless-shell1234; all browser results come from hosted CI.

- Received Blessing movement remains clearable after Hanna removal: retain its action while the received flag is active, then hide it after manual clearance without donor. Added donor-removal/clear-state regression; per-self storage remains independent.


- Final application/test validation at1a7d0942322b31d9191790c1c05d800b6ae91303, PR https://github.com/Kanoton/damage-calculator/pull/193: all5 workflows succeeded.07 89 passed (38097667978);default regression119 passed (38097667959;07/06b/08 suites overlap with separate07 run);wide Chromium/WebKit22 passed (38097667969);mobile Android Chromium/iPhone WebKit20 passed (38097668000). Explicit full workflow38097667961: all35 CT traversal passed, pair/focus suite41 passed. Downloaded coverage confirms35 groups ×34 donors =1,190 passed,0 failed,0 remaining. Canonical image audit295 decoded,0 failures. Numeric casts/Enter progression/halves/CT/turn-end/Undo/file fallback, outside/Escape cancellation, retained sources, Sherry OR movement and donor-removal manual clearing, Padman description and one-line14px Rinrin explanation pass. Viewed final Android/iPhone numeric and Rinrin screenshots.
- Full-request label removed AFTER successful exhaustive verification, before results-only documentation commit, to avoid rerunning unchanged exhaustive cases. Final docs commit does not change any validated app/test/workflow source; ordinary final CI still required. No future exhaustive run without new explicit request.11 files changed:07 character-view.js,character.js,number-pad.js,style.css;tests/07-skill.spec.js;wide/mobile specs;pair-tests/07-party-pairs.spec.js;requested-fullcheck workflow;WORKING_GUIDE.md;this handoff.08/sharedCSV/images unchanged. User-authorized merge and Pages verification follow; local Chromium missing and physical-device/game validation unverified.

- Final sizing review: numeric frame width now derives from max-content field + keypad columns, rather than retaining the former360px width. Actions cannot widen the frame; mobile keypad targets are44px high, matching reserved slot space. This final CSS adjustment requires renewed full/ordinary validation; earlier1a7d094 results remain valid for that prior source but are not claimed for this new source.
