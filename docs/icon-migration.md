# Icon migration

The legacy `images/icon` references covered by this migration have been resolved. Confirmed status/buff and character stat tooltip assets now use `images/UT_Buff`.

The user-confirmed replacements are:

| Use | UT_Buff file |
| --- | --- |
| Attack | `Attack.png` |
| Defense | `Defense.png` |
| HP | `Hp.png` |
| コイン | `Coin.png` |
| マーク | `UT_Buff_Lock.png` |
| ジェントル・フレイム | `UT_Buff_1049.png` |
| 反撃 | `UT_Buff_Counter.png` |
| スターコイン | `Coin.png` |
| 鴛鴦連理 | `UT_Buff_1047.png` |
| 真犯人 | `UT_Buff_1067.png` |
| 逆鱗 | `UT_Buff_1026.png` |
| 金鱗 | `UT_Buff_1027.png` |
| 孔雀の羽ばたき | `UT_Buff_1046.png` |
| 深層改造 | `UT_Buff_1033.png` |
| 戦の呪い | `UT_Buff_1041.png` |

Do not move `chip_icon` references into `UT_Buff`; they are a separate asset family.
