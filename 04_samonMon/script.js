// 通常の「防御」を選択した場合の最終ダメージ
function getDefenseDamage(
    attackPower,
    defensePower,
    damageAdd,
    damageReduce,
    attackDice,
    defenseDice
) {
    const actualAttack = attackPower + attackDice;
    const actualDefense = defensePower + defenseDice;

    let damage = actualAttack - actualDefense;

    // 1未満のダメージは1に補正
    if (damage < 1) {
        damage = 1;
    }

    let finalDamage = damage + damageAdd - damageReduce;

    // 増加・軽減の計算後は0ダメージを許容する
    // （負のダメージにはならないよう0を下限とする）
    if (finalDamage < 0) {
        finalDamage = 0;
    }

    return finalDamage;
}


// 「回避」を選択した場合の最終ダメージ
function getEvadeDamage(
    attackPower,
    damageAdd,
    damageReduce,
    attackDice,
    defenseDice
) {
    // 攻撃側の出目より大きい、または6なら回避成功
    const evadeSuccess =
        defenseDice > attackDice || defenseDice === 6;

    if (evadeSuccess) {
        // 回避成功時は増加・軽減も計算せず0ダメージ
        return 0;
    }

    // 回避失敗時は防御力を0として計算
    const actualAttack = attackPower + attackDice;
    let damage = actualAttack;

    if (damage < 1) {
        damage = 1;
    }

    let finalDamage = damage + damageAdd - damageReduce;

    // 増加・軽減の計算後は0ダメージを許容する
    if (finalDamage < 0) {
        finalDamage = 0;
    }

    return finalDamage;
}


// 防御側：攻撃ダイスの出目ごとに「防御」と「回避」を比較
// 判定基準
// 1. 「防御」で100%生存できる出目では、必ず防御を推奨
// 2. 100%でない場合は、防御と回避の生存率を比較
// 3. 回避の生存率が高ければ回避
// 4. 生存率が同じなら、成功時に0ダメージとなる回避を推奨
function getDefenseRecommendation(
    attackPower,
    defensePower,
    damageAdd,
    damageReduce,
    hp
) {
    const evadeBetterDice = [];

    for (let attackDice = 1; attackDice <= 6; attackDice++) {
        let defenseSurvivalCount = 0;
        let evadeSurvivalCount = 0;

        for (let defenseDice = 1; defenseDice <= 6; defenseDice++) {
            const defenseDamage = getDefenseDamage(
                attackPower,
                defensePower,
                damageAdd,
                damageReduce,
                attackDice,
                defenseDice
            );

            const evadeDamage = getEvadeDamage(
                attackPower,
                damageAdd,
                damageReduce,
                attackDice,
                defenseDice
            );

            if (defenseDamage < hp) {
                defenseSurvivalCount++;
            }

            if (evadeDamage < hp) {
                evadeSurvivalCount++;
            }
        }

        // その攻撃出目に対して「防御」で100%生存できるなら防御を選ぶ
        if (defenseSurvivalCount === 6) {
            continue;
        }

        // 防御が100%でない場合：
        // 回避の生存率が高い、または同率なら回避を推奨
        if (evadeSurvivalCount >= defenseSurvivalCount) {
            evadeBetterDice.push(attackDice);
        }
    }

    // 推奨表示は3パターンに限定
    if (evadeBetterDice.length === 0) {
        return "回避不要";
    }

    if (
        evadeBetterDice.length === 1 &&
        evadeBetterDice[0] === 6
    ) {
        return "攻撃ダイスが6の場合回避";
    }

    return "回避を選択";
}


// =================================
// バトルカード効果
// 下部グラフ・下部の期待値/確率だけに使用
// =================================

// 指定カードの使用枚数を取得
function getCardCount(calculator, id) {
    const input = calculator.querySelector(`#${id}`);

    if (!input) {
        return 0;
    }

    const value = Number(input.value);

    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.floor(value));
}


// 「合計ボーナス値 → 発生確率」の分布に、
// 1枚ごとのランダム増加を指定枚数ぶん畳み込む
function addUniformCardBonus(distribution, minBonus, maxBonus, count) {
    let result = distribution;

    for (let use = 0; use < count; use++) {
        const next = new Map();
        const rangeSize = maxBonus - minBonus + 1;

        for (const [currentBonus, currentProbability] of result) {
            for (let bonus = minBonus; bonus <= maxBonus; bonus++) {
                const newBonus = currentBonus + bonus;
                const probability =
                    currentProbability / rangeSize;

                next.set(
                    newBonus,
                    (next.get(newBonus) || 0) + probability
                );
            }
        }

        result = next;
    }

    return result;
}


// 攻撃カード込みの攻撃力分布を作成
function getAttackPowerDistribution(calculator, baseAttackPower) {
    const atk1 = getCardCount(calculator, "Atk1");
    const atk2 = getCardCount(calculator, "Atk2");
    const atk3 = getCardCount(calculator, "Atk3");
    const atk4 = getCardCount(calculator, "Atk4");
    const atk5 = getCardCount(calculator, "Atk5");
    const atk6 = getCardCount(calculator, "Atk6");
    const atk7 = getCardCount(calculator, "Atk7");

    let bonusDistribution = new Map([[0, 1]]);

    // ランダム増加カード
    bonusDistribution =
        addUniformCardBonus(bonusDistribution, 1, 3, atk1);

    bonusDistribution =
        addUniformCardBonus(bonusDistribution, 1, 6, atk2);

    bonusDistribution =
        addUniformCardBonus(bonusDistribution, 1, 10, atk3);

    bonusDistribution =
        addUniformCardBonus(bonusDistribution, 1, 20, atk4);

    // 固定増加カード
    const fixedBonus =
        atk5 * 3 +
        atk6 * 5 +
        atk7 * 6;

    const attackPowerDistribution = new Map();

    for (const [randomBonus, probability] of bonusDistribution) {
        let finalAttackPower =
            baseAttackPower +
            randomBonus +
            fixedBonus;

        // Atk7を1枚以上使用している場合は、
        // すべてのカード増加を反映した後の攻撃力を1.5倍
        // 小数点以下は切り捨て
        if (atk7 >= 1) {
            finalAttackPower =
                Math.floor(finalAttackPower * 1.5);
        }

        attackPowerDistribution.set(
            finalAttackPower,
            (attackPowerDistribution.get(finalAttackPower) || 0) +
                probability
        );
    }

    return attackPowerDistribution;
}


// 防御カード込みの防御力分布を作成
function getDefensePowerDistribution(calculator, baseDefensePower) {
    const def1 = getCardCount(calculator, "Def1");
    const def2 = getCardCount(calculator, "Def2");
    const def3 = getCardCount(calculator, "Def3");

    let bonusDistribution = new Map([[0, 1]]);

    // Def1：1枚ごとに1～3
    bonusDistribution =
        addUniformCardBonus(bonusDistribution, 1, 3, def1);

    // Def2：1枚ごとに1～6
    bonusDistribution =
        addUniformCardBonus(bonusDistribution, 1, 6, def2);

    // Def3：1枚ごとに1～10
    bonusDistribution =
        addUniformCardBonus(bonusDistribution, 1, 10, def3);

    const defensePowerDistribution = new Map();

    for (const [randomBonus, probability] of bonusDistribution) {
        const finalDefensePower =
            baseDefensePower +
            randomBonus;

        defensePowerDistribution.set(
            finalDefensePower,
            (defensePowerDistribution.get(finalDefensePower) || 0) +
                probability
        );
    }

    return defensePowerDistribution;
}


// 防御側：防御カードを考慮し、攻撃出目ごとの「防御 / 回避」を比較
function getCardAwareDefenseChoices(
    calculator,
    attackPower,
    defensePower,
    damageAdd,
    damageReduce,
    hp
) {
    const defensePowerDistribution =
        getDefensePowerDistribution(calculator, defensePower);

    const choices = [];
    const epsilon = 1e-10;

    for (let attackDice = 1; attackDice <= 6; attackDice++) {
        let defenseSurvivalProbability = 0;
        let evadeSurvivalProbability = 0;

        for (
            const [cardDefensePower, cardProbability]
            of defensePowerDistribution
        ) {
            for (let defenseDice = 1; defenseDice <= 6; defenseDice++) {
                const diceProbability = cardProbability / 6;

                const defenseDamage = getDefenseDamage(
                    attackPower,
                    cardDefensePower,
                    damageAdd,
                    damageReduce,
                    attackDice,
                    defenseDice
                );

                const evadeDamage = getEvadeDamage(
                    attackPower,
                    damageAdd,
                    damageReduce,
                    attackDice,
                    defenseDice
                );

                if (defenseDamage < hp) {
                    defenseSurvivalProbability += diceProbability;
                }

                if (evadeDamage < hp) {
                    evadeSurvivalProbability += diceProbability;
                }
            }
        }

        let recommendation;

        // 既存ルールを踏襲：防御で100%生存なら防御を優先。
        // それ以外は生存率が高い方を選び、同率なら回避を推奨。
        if (defenseSurvivalProbability >= 1 - epsilon) {
            recommendation = "防御";
        } else if (
            evadeSurvivalProbability + epsilon >=
            defenseSurvivalProbability
        ) {
            recommendation = "回避";
        } else {
            recommendation = "防御";
        }

        choices.push({
            attackDice,
            recommendation,
            defenseSurvivalProbability,
            evadeSurvivalProbability
        });
    }

    return choices;
}


// 防御側：攻撃出目1～6ごとの推奨をカード下に表示
function renderDefenseChoiceGuide(
    calculator,
    attackPower,
    defensePower,
    damageAdd,
    damageReduce,
    hp
) {
    const grid = calculator.querySelector(".defense-choice-grid");

    if (!grid) {
        return;
    }

    const choices = getCardAwareDefenseChoices(
        calculator,
        attackPower,
        defensePower,
        damageAdd,
        damageReduce,
        hp
    );

    grid.innerHTML = choices.map(choice => {
        const defenseRate =
            (choice.defenseSurvivalProbability * 100).toFixed(1);
        const evadeRate =
            (choice.evadeSurvivalProbability * 100).toFixed(1);
        const choiceClass = choice.recommendation === "防御"
            ? "defense-choice"
            : "evade-choice";

        return `
            <div class="defense-choice-cell ${choiceClass}">
                <div class="defense-choice-die">${choice.attackDice}</div>
                <strong>${choice.recommendation}</strong>
                <small class="choice-rate-row"><span class="choice-rate-label">防</span><span class="choice-rate-value">${defenseRate}%</span></small>
                <small class="choice-rate-row"><span class="choice-rate-label">回</span><span class="choice-rate-value">${evadeRate}%</span></small>
            </div>
        `;
    }).join("");
}


// 下部表示用：カード効果を含めたダメージ分布を計算
function calculateCardAwareDamage(
    calculator,
    attackPower,
    defensePower,
    damageAdd,
    damageReduce,
    hp,
    isSurvival
) {
    // 攻撃モードでは攻撃カードだけを反映
    // 防御モードでは防御カードだけを反映
    const attackPowerDistribution = isSurvival
        ? new Map([[attackPower, 1]])
        : getAttackPowerDistribution(calculator, attackPower);

    const defensePowerDistribution = isSurvival
        ? getDefensePowerDistribution(calculator, defensePower)
        : new Map([[defensePower, 1]]);

    const damageCounts = new Map();

    let expectedDamage = 0;
    let defeatProbability = 0;
    let survivalProbability = 0;
    let minDamage = Infinity;
    let maxDamage = 0;

    for (
        const [cardAttackPower, attackPowerProbability]
        of attackPowerDistribution
    ) {
        for (
            const [cardDefensePower, defensePowerProbability]
            of defensePowerDistribution
        ) {
            const cardProbability =
                attackPowerProbability *
                defensePowerProbability;

            for (let attackDice = 1; attackDice <= 6; attackDice++) {
                for (let defenseDice = 1; defenseDice <= 6; defenseDice++) {
                    const finalDamage = getDefenseDamage(
                        cardAttackPower,
                        cardDefensePower,
                        damageAdd,
                        damageReduce,
                        attackDice,
                        defenseDice
                    );

                    const probability =
                        cardProbability / 36;

                    damageCounts.set(
                        finalDamage,
                        (damageCounts.get(finalDamage) || 0) +
                            probability
                    );

                    expectedDamage +=
                        finalDamage * probability;

                    if (finalDamage >= hp) {
                        defeatProbability += probability;
                    } else {
                        survivalProbability += probability;
                    }

                    minDamage =
                        Math.min(minDamage, finalDamage);

                    maxDamage =
                        Math.max(maxDamage, finalDamage);
                }
            }
        }
    }

    return {
        damageCounts,
        minDamage: Number.isFinite(minDamage) ? minDamage : 0,
        maxDamage,
        expectedDamage,
        defeatProbability,
        survivalProbability
    };
}


// ダメージごとの発生確率を、マーカーなしの折れ線グラフで描画
function renderDamageProbabilityGraph(
    calculator,
    damageCounts,
    maxDamage,
    totalCombinations,
    hp
) {
    const svg = calculator.querySelector(".damage-probability-graph");

    if (!svg) {
        return;
    }

    // 横軸は「実際に発生する最小ダメージ」から開始し、
    // 最大値は「実際に発生する最大ダメージ」まで表示する
    const damageValues = Array.from(damageCounts.keys());
    const xMin = damageValues.length > 0
        ? Math.min(...damageValues)
        : 0;
    const xMax = Math.max(xMin, maxDamage);

    const probabilities = [];
    let maxProbability = 0;

    for (let damage = xMin; damage <= xMax; damage++) {
        const count = damageCounts.get(damage) || 0;
        const probability = (count / totalCombinations) * 100;

        probabilities.push({ damage, probability });
        maxProbability = Math.max(maxProbability, probability);
    }

    // 縦軸：
    // 最大発生確率が10%未満なら1%刻み。
    // 10%以上なら5% / 10% / 15% / 20% から見やすい間隔を自動選択する。
    let yTickStep;

    if (maxProbability < 10) {
        yTickStep = 1;
    } else {
        const yTickCandidates = [5, 10, 15, 20];
        yTickStep = 20;

        for (const candidate of yTickCandidates) {
            // 目盛り数が多すぎない範囲（おおむね4～6本）で最小の刻みを採用
            const tickCount = Math.ceil(maxProbability / candidate);
            if (tickCount <= 6) {
                yTickStep = candidate;
                break;
            }
        }
    }

    const yMax = Math.max(
        yTickStep,
        Math.ceil(maxProbability / yTickStep) * yTickStep
    );

    const width = 620;
    // 右側の表示エリアに近い縦横比にして、
    // SVG内部の上下の空白を減らす
    const height = 325;
    const margin = {
        top: 10,
        right: 15,
        bottom: 35,
        left: 50
    };

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const xToSvg = damage => {
        // 最小値と最大値が同じ場合でも0除算にならないよう中央に配置
        if (xMax === xMin) {
            return margin.left + plotWidth / 2;
        }

        return margin.left +
            ((damage - xMin) / (xMax - xMin)) * plotWidth;
    };

    const yToSvg = probability =>
        margin.top + plotHeight - (probability / yMax) * plotHeight;

    const svgParts = [];

    // 折れ線と、その下側の領域を作るための座標
    const linePoints = probabilities
        .map(item => `${xToSvg(item.damage)},${yToSvg(item.probability)}`)
        .join(" ");

    const baselineY = margin.top + plotHeight;
    const areaPoints = [
        `${xToSvg(xMin)},${baselineY}`,
        ...probabilities.map(
            item => `${xToSvg(item.damage)},${yToSvg(item.probability)}`
        ),
        `${xToSvg(xMax)},${baselineY}`
    ].join(" ");

    svgParts.push(
        `<title>ダメージ発生確率</title>`,
        `<desc>折れ線より下側のうち、攻撃・防御の両モードでHP以上の確率範囲を斜線で表示します。</desc>`
    );

    // 攻撃・防御の両モード：HP以上の範囲を斜線で表示
    const isDefenseMode = calculator.dataset.role === "defense";
    const hatchColor = isDefenseMode ? "#5f9bd3" : "#ef6b6b";
    const hatchPatternId = isDefenseMode
        ? "defense-defeat-hatch"
        : "attack-defeat-hatch";
    const probabilityClipId = isDefenseMode
        ? "defense-probability-area"
        : "attack-probability-area";

    // 斜線は「確率の折れ線より下」だけに表示する
    svgParts.push(
        `<defs>
            <pattern id="${hatchPatternId}" patternUnits="userSpaceOnUse" width="8" height="8">
                <line x1="0" y1="8" x2="8" y2="0" stroke="${hatchColor}" stroke-width="1.5" stroke-opacity="0.30"></line>
            </pattern>
            <clipPath id="${probabilityClipId}">
                <polygon points="${areaPoints}"></polygon>
            </clipPath>
        </defs>`
    );

    // HPを境に、攻撃・防御の両モードで「ダメージ >= HP」の範囲を斜線で塗る
    if (hp <= xMax) {
        const hatchStartDamage = Math.max(hp, xMin);
        const hatchStartX = xToSvg(hatchStartDamage);
        const hatchWidth = margin.left + plotWidth - hatchStartX;

        if (hatchWidth > 0) {
            svgParts.push(
                `<rect x="${hatchStartX}" y="${margin.top}" width="${hatchWidth}" height="${plotHeight}" fill="url(#${hatchPatternId})" clip-path="url(#${probabilityClipId})"></rect>`
            );
        }
    }

    // HPが横軸の表示範囲内にある場合は、
    // HP地点の確率グラフとの交点から下端までだけ境界線を表示
    if (hp >= xMin && hp <= xMax) {
        const hpX = xToSvg(hp);
        const hpProbability =
            probabilities.find(item => item.damage === hp)?.probability ?? 0;
        const hpY = yToSvg(hpProbability);

        // 発生しうる最大ダメージがHPと等しい場合は、
        // 斜線範囲が端で消えるため、境界を少し太い実線で強調する
        const isMaxDamageAtHp = maxDamage === hp;
        const boundaryStrokeWidth = isMaxDamageAtHp ? 2.5 : 1.5;
        const boundaryDash = isMaxDamageAtHp
            ? ""
            : ' stroke-dasharray="5 4"';

        svgParts.push(
            `<line x1="${hpX}" y1="${hpY}" x2="${hpX}" y2="${baselineY}" stroke="${hatchColor}" stroke-width="${boundaryStrokeWidth}"${boundaryDash} stroke-opacity="0.85"></line>`
        );
    }

    // 横方向グリッドと縦軸目盛り
    const yTickCount = Math.round(yMax / yTickStep);
    for (let i = 0; i <= yTickCount; i++) {
        const probability = yTickStep * i;
        const y = yToSvg(probability);

        svgParts.push(
            `<line class="graph-grid" x1="${margin.left}" y1="${y}" x2="${margin.left + plotWidth}" y2="${y}"></line>`,
            `<text class="graph-label" x="${margin.left - 8}" y="${y + 4}" text-anchor="end">${probability.toFixed(0)}%</text>`
        );
    }

    // 縦方向グリッドと横軸目盛り
    // 最大値が25を超える場合は5刻み、それ以外は1刻み。
    const xTickStep = xMax > 25 ? 5 : 1;

    // 5刻み時は、表示範囲内にある最初の5の倍数から目盛りを開始する。
    // 横軸そのものの最小値・最大値は従来どおり変えない。
    const firstXTick =
        xTickStep === 1
            ? xMin
            : Math.ceil(xMin / xTickStep) * xTickStep;

    for (
        let damage = firstXTick;
        damage <= xMax;
        damage += xTickStep
    ) {
        const x = xToSvg(damage);

        svgParts.push(
            `<line class="graph-grid" x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + plotHeight}"></line>`,
            `<text class="graph-label" x="${x}" y="${margin.top + plotHeight + 20}" text-anchor="middle">${damage}</text>`
        );
    }

    // 軸
    svgParts.push(
        `<line class="graph-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}"></line>`,
        `<line class="graph-axis" x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}"></line>`
    );

    // マーカーなしの折れ線
    svgParts.push(
        `<polyline class="graph-line" points="${linePoints}"></polyline>`
    );

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.innerHTML = svgParts.join("");
}


function calculateDamage(calculator, isSurvival = false) {
    const attackPower =
        Number(calculator.querySelector('[id^="attackPower"]').value);

    const damageAdd =
        Number(calculator.querySelector('[id^="damageAdd"]').value);

    const hp =
        Number(calculator.querySelector('[id^="hp"]').value);

    const defensePower =
        Number(calculator.querySelector('[id^="defensePower"]').value);

    const damageReduce =
        Number(calculator.querySelector('[id^="damageReduce"]').value);

    const tableBody =
        calculator.querySelector(".damage-table tbody");

    tableBody.innerHTML = "";

    let totalDamage = 0;
    let defeatCount = 0;
    let survivalCount = 0;
    let maxDamage = 0;

    const damageCounts = new Map();
    const totalCombinations = 36;

    for (let attackDice = 1; attackDice <= 6; attackDice++) {
        const row = document.createElement("tr");

        if (attackDice === 1) {
            const attackLabel = document.createElement("th");
            attackLabel.textContent = "攻撃";
            attackLabel.rowSpan = 6;
            attackLabel.classList.add("attack-label");
            row.appendChild(attackLabel);
        }

        const attackCell = document.createElement("th");
        attackCell.textContent = attackDice;
        row.appendChild(attackCell);

        for (let defenseDice = 1; defenseDice <= 6; defenseDice++) {
            // 表・期待値・撃破率/生存率は従来どおり「防御」選択時で計算
            const finalDamage = getDefenseDamage(
                attackPower,
                defensePower,
                damageAdd,
                damageReduce,
                attackDice,
                defenseDice
            );

            const cell = document.createElement("td");
            cell.textContent = finalDamage;

            if (finalDamage >= hp) {
                cell.classList.add("defeat");
                defeatCount++;
            } else {
                survivalCount++;
            }

            row.appendChild(cell);
            totalDamage += finalDamage;

            damageCounts.set(
                finalDamage,
                (damageCounts.get(finalDamage) || 0) + 1
            );

            maxDamage = Math.max(maxDamage, finalDamage);
        }

        tableBody.appendChild(row);
    }

    // 上部の表・期待値・撃破率/生存率は、
    // ここまでの従来計算（カード効果なし）をそのまま使用する

    // 下部グラフ・下部の期待値/確率だけはカード効果を反映する
    const cardAwareResult =
        calculateCardAwareDamage(
            calculator,
            attackPower,
            defensePower,
            damageAdd,
            damageReduce,
            hp,
            isSurvival
        );

    // cardAwareResult.damageCounts は「回数」ではなく確率そのものなので、
    // totalCombinations = 1 として描画する
    renderDamageProbabilityGraph(
        calculator,
        cardAwareResult.damageCounts,
        cardAwareResult.maxDamage,
        1,
        hp
    );

    const futureDamageRange =
        calculator.querySelector(".future-damage-range");

    if (futureDamageRange) {
        futureDamageRange.textContent =
            `${cardAwareResult.minDamage}～${cardAwareResult.maxDamage}`;
    }

    const futureExpectedDamage =
        calculator.querySelector(".future-expected-damage");

    if (futureExpectedDamage) {
        futureExpectedDamage.textContent =
            cardAwareResult.expectedDamage.toFixed(2);
    }

    const futureResultRate =
        calculator.querySelector(".future-result-rate");

    if (futureResultRate) {
        const futureRate = isSurvival
            ? cardAwareResult.survivalProbability * 100
            : cardAwareResult.defeatProbability * 100;

        futureResultRate.textContent =
            futureRate.toFixed(2) + "%";
    }

    const expectedDamage =
        totalDamage / totalCombinations;

    calculator.querySelector(".expected-damage").textContent =
        expectedDamage.toFixed(2);

    if (isSurvival) {
        const survivalRate =
            (survivalCount / totalCombinations) * 100;

        calculator.querySelector(".result-rate").textContent =
            survivalRate.toFixed(2) + "%";

        renderDefenseChoiceGuide(
            calculator,
            attackPower,
            defensePower,
            damageAdd,
            damageReduce,
            hp
        );

        const recommendation =
            calculator.querySelector(".defense-recommendation");

        if (recommendation) {
            recommendation.textContent =
                getDefenseRecommendation(
                    attackPower,
                    defensePower,
                    damageAdd,
                    damageReduce,
                    hp
                );
        }
    } else {
        const defeatRate =
            (defeatCount / totalCombinations) * 100;

        calculator.querySelector(".result-rate").textContent =
            defeatRate.toFixed(2) + "%";
    }
}


// 各モードを初期化
const modes = document.querySelectorAll(".mode-content");

Array.from(modes).filter(mode => mode.dataset.role !== "map").forEach(mode => {
    const isSurvival =
        mode.dataset.role === "defense";

    mode.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener("input", () => {
            calculateDamage(mode, isSurvival);
        });
    });

    mode.querySelectorAll(".plus-button").forEach(button => {
        button.addEventListener("click", () => {
            const input =
                document.getElementById(button.dataset.target);

            input.value = Number(input.value) + 1;
            input.dispatchEvent(new Event("input"));
        });
    });

    mode.querySelectorAll(".minus-button").forEach(button => {
        button.addEventListener("click", () => {
            const input =
                document.getElementById(button.dataset.target);

            const newValue =
                Number(input.value) - 1;

            if (newValue >= 0) {
                input.value = newValue;
                input.dispatchEvent(new Event("input"));
            }
        });
    });

    // カード画像をクリックすると、そのカードの使用枚数を+1
    const addCardFromImage = image => {
        const input =
            document.getElementById(image.dataset.cardTarget);

        if (!input) {
            return;
        }

        input.value = Number(input.value) + 1;
        input.dispatchEvent(new Event("input"));
    };

    mode.querySelectorAll(".battle-card-clickable").forEach(image => {
        image.addEventListener("click", () => {
            addCardFromImage(image);
        });

        image.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                addCardFromImage(image);
            }
        });
    });

    // Restカードを押すと、そのモードのカード使用枚数をすべて0に戻す
    const resetCards = image => {
        const prefix =
            image.dataset.resetCards === "attack"
                ? "Atk"
                : "Def";

        mode.querySelectorAll(`input[id^="${prefix}"]`).forEach(input => {
            input.value = 0;
        });

        // 複数inputのinputイベントを連続発火させず、最後に1回だけ再計算する
        calculateDamage(mode, isSurvival);
    };

    mode.querySelectorAll(".battle-card-reset").forEach(image => {
        image.addEventListener("click", () => {
            resetCards(image);
        });

        image.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                resetCards(image);
            }
        });
    });

    calculateDamage(mode, isSurvival);
});


// 攻撃・防御タブの切り替え
const mainContainer = document.querySelector(".main-container");

document.querySelectorAll(".role-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        const selectedRole = tab.dataset.role;
        mainContainer.classList.toggle("map-mode", selectedRole === "map");

        document.querySelectorAll(".role-tab").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.role === selectedRole
            );
        });

        modes.forEach(mode => {
            mode.classList.toggle(
                "active",
                mode.dataset.role === selectedRole
            );
        });

        mainContainer.classList.toggle(
            "attack-mode",
            selectedRole === "attack"
        );

        mainContainer.classList.toggle(
            "defense-mode",
            selectedRole === "defense"
        );
    });
});

// CSV files are read relative to soruce/ (source/ also works).
// The bundled snapshot keeps the first release usable when opening index.html directly.
function parseMapCSV(text){
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(value);value='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v!==''))rows.push(row);row=[];value='';}
  else value+=c;
 }
 if(quoted)throw Error('CSVの引用符が閉じていません');
 row.push(value);if(row.some(v=>v!==''))rows.push(row);
 const headers=(rows.shift()||[]).map(h=>h.replace(/^\uFEFF/,'').trim());
 return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]??''])));
}
function decrementMonsterMissions(missions,counters,mapId,monsterId){
 missions.filter(row=>row.map_id===mapId&&String(row.monster_id||'').split('|').map(id=>id.trim()).filter(Boolean).includes(monsterId)).forEach(row=>{
 const key=row.map_id+':'+row.ID,maximum=Number(row['カウンタ']);if(!Number.isFinite(maximum)||maximum<0)return;
 const current=counters.has(key)?counters.get(key):maximum;counters.set(key,Math.max(0,current-1));
 });
}
function visibleMonsterRows(data,mapId,level){return (data.maps[mapId]?.ids||[]).map(id=>data.stats.find(s=>s.monster_id===id&&s['難易度']===level)).filter(Boolean);}
function normalizeMapData(raw){
 const maps={};raw.maps.filter(row=>String(row['表示']??'').trim()==='1').forEach(row=>{maps[row.map_id]={name:row['マップ名'],image:'../images/Map/'+row.image,ids:[...new Set(raw.relations.filter(r=>r.map_id===row.map_id).map(r=>r.monster_id))]};});
 return {maps,gimmicks:raw.gimmicks||[],stats:raw.stats,missions:raw.missions,events:raw.events,images:Object.fromEntries(raw.stats.map(s=>[s.image,'../images/Monster/'+s.image])),icons:{'攻撃':'../images/Icon/Attack.png','防御':'../images/Icon/Defense.png','HP':'../images/Icon/Hp.png','コイン':'../images/Icon/Coin.png',reflect:'../images/Icon/Reflect.png'}};
}
function assignMapImage(image,url){
 const variants=[url,url.replace('../images/','../Image/'),url.replace('../images/','../Images/'),url.replace('/Icon/','/icon/'),url.replace('/Monster/','/MonsterImg/'),url.replace('/Map/','/MapImg/')];
 let index=0;image.onerror=()=>{index++;if(index<variants.length)image.src=variants[index];else {image.onerror=null;image.hidden=true;}};image.hidden=false;image.src=variants[0];
}

const INITIAL_MAP_DATA={"missions":[{"map_id":"MAP0001","ID":"M000101","monster_id":"M0004","カウンタ":"4","内容":"海賊サメ撃破","報酬":"チップ1枚"},{"map_id":"MAP0001","ID":"M000102","monster_id":"M0003","カウンタ":"2","内容":"海賊精鋭","報酬":"チップ1枚、ボスの防御力-6"},{"map_id":"MAP0001","ID":"M000103","monster_id":"M0004","カウンタ":"9","内容":"海賊サメ撃破","報酬":"チップ1枚、進捗-1"},{"map_id":"MAP0002","ID":"M000201","monster_id":"M0012","カウンタ":"4","内容":"氷刻青霊撃破","報酬":"チップ1枚"},{"map_id":"MAP0002","ID":"M000202","monster_id":"M0009|M0010","カウンタ":"2","内容":"刀剣霊、長戟霊を撃破","報酬":"チップ1枚"},{"map_id":"MAP0002","ID":"M000203","monster_id":"M0009|M0010","カウンタ":"5","内容":"刀剣霊、長戟霊を撃破","報酬":"チップ1枚、進捗-1"},{"map_id":"MAP0003","ID":"M000301","monster_id":"M0017","カウンタ":"4","内容":"爆竹ゲロゲロを撃破","報酬":"チップ1枚"},{"map_id":"MAP0003","ID":"M000302","monster_id":"M0017","カウンタ":"9","内容":"爆竹ゲロゲロを撃破","報酬":"チップ1枚"},{"map_id":"MAP0003","ID":"M000303","monster_id":"M0018|M0019","カウンタ":"2","内容":"雰囲気ロボ、機械龍蛇を撃破","報酬":"チップ1枚"},{"map_id":"MAP0104","ID":"M010101","monster_id":"M0025","カウンタ":"3","内容":"魔法のティーポットを撃破","報酬":"チップ1枚"},{"map_id":"MAP0104","ID":"M010102","monster_id":"M0118","カウンタ":"2","内容":"グリーティーポットを撃破","報酬":"チップ1枚"},{"map_id":"MAP0104","ID":"M010103","monster_id":"M0119","カウンタ":"2","内容":"大怪盗を撃破","報酬":"チップ1枚"},{"map_id":"MAP0104","ID":"M010104","monster_id":"M0117","カウンタ":"3","内容":"看守を撃破","報酬":"チップ1枚、進捗-1"},{"map_id":"MAP0004","ID":"M000401","monster_id":"M0022","カウンタ":"1","内容":"ゼリーファイターを撃破","報酬":"チップ1枚、マップ移動"},{"map_id":"MAP0004","ID":"M000402","monster_id":"M0025","カウンタ":"3","内容":"魔法のティーポットを撃破","報酬":"チップ1枚"},{"map_id":"MAP0004","ID":"M000403","monster_id":"M0025","カウンタ":"8","内容":"魔法のティーポットを撃破","報酬":"チップ1枚、進捗-1"},{"map_id":"MAP0004","ID":"M000404","monster_id":"M0023","カウンタ":"2","内容":"ゼリーガーディアンを撃破","報酬":"チップ1枚"},{"map_id":"MAP9999","ID":"M000401","monster_id":"M0022","カウンタ":"1","内容":"ゼリーファイターを撃破","報酬":"チップ1枚、マップ移動"},{"map_id":"MAP9999","ID":"M000402","monster_id":"M0025","カウンタ":"4","内容":"魔法のティーポットを撃破","報酬":"チップ1枚"},{"map_id":"MAP9999","ID":"M000403","monster_id":"M0025","カウンタ":"3","内容":"魔法のティーポットを撃破","報酬":"チップ1枚、進捗-1"},{"map_id":"MAP9999","ID":"M000404","monster_id":"M0023","カウンタ":"2","内容":"ゼリーガーディアンを撃破","報酬":"チップ1枚"},{"map_id":"MAP0005","ID":"M000501","monster_id":"M0032|M0033","カウンタ":"2","内容":"コエデカフグ、ムキムキフグを撃破","報酬":"チップ1枚、ルート分岐"},{"map_id":"MAP0005","ID":"M000502","monster_id":"M0030","カウンタ":"2","内容":"蝦兄ぃを撃破","報酬":"チップ1枚"},{"map_id":"MAP0005","ID":"M000503","monster_id":"M0030","カウンタ":"4","内容":"蝦兄ぃを撃破","報酬":"チップ1枚、進捗-1"},{"map_id":"MAP0005","ID":"M000504","monster_id":"","カウンタ":"4","内容":"ひょうたんを拾う","報酬":"「陰陽鯉」取得、真夢梓H-20%、「逆鱗」無効"},{"map_id":"MAP0005","ID":"M000505","monster_id":"M0031","カウンタ":"3","内容":"金ちゃんを撃破","報酬":"チップ1枚"},{"map_id":"MAP0005","ID":"M000506","monster_id":"M0031","カウンタ":"6","内容":"金ちゃんを撃破","報酬":"チップ1枚、進捗-1"},{"map_id":"MAP0005","ID":"M000507","monster_id":"","カウンタ":"11","内容":"金鱗スタックを獲得","報酬":"「無限の蛇」を取得、蒼鯉H-20%、「金龍」が0に"},{"map_id":"MAP0007","ID":"M000701","monster_id":"M0050","カウンタ":"1","内容":"ニワトリ係を撃破","報酬":"クジャクの試練に入る"},{"map_id":"MAP0007","ID":"M000702","monster_id":"","カウンタ":"2","内容":"神秘的な卵を集める","報酬":"オシドリの試練に入る"},{"map_id":"MAP0007","ID":"M000703","monster_id":"M0051","カウンタ":"3","内容":"お出迎え係を撃破する","報酬":"チップ1枚"},{"map_id":"MAP0007","ID":"M000704","monster_id":"M0049","カウンタ":"2","内容":"センズル係を撃破する","報酬":"チップ1枚"},{"map_id":"MAP0007","ID":"M000705","monster_id":"","カウンタ":"1","内容":"ヒメを撃破する","報酬":"ヒメを解放する"},{"map_id":"MAP0006","ID":"M000601","monster_id":"","カウンタ":"1","内容":"誰かがレベルアップ","報酬":"誰かが「支援タイプのガム」を獲得"},{"map_id":"MAP0006","ID":"M000602","monster_id":"M0038","カウンタ":"3","内容":"さるの助手君を撃破","報酬":"チップ1枚"},{"map_id":"MAP0006","ID":"M000603","monster_id":"M0041","カウンタ":"1","内容":"天崩を撃破","報酬":"チップ1枚"},{"map_id":"MAP0006","ID":"M000604","monster_id":"M0042","カウンタ":"1","内容":"厄兆を撃破","報酬":"チップ1枚"},{"map_id":"MAP0006","ID":"M000605","monster_id":"M0039","カウンタ":"3","内容":"ゴリラフランケンちゃんを撃破","報酬":"チップ1枚、進捗-1"}],"maps":[{"map_id":"MAP0001","マップ名":"夢想号","image":"Layout_Dreama.png","表示":"1"},{"map_id":"MAP0002","マップ名":"御魂の祭","image":"Layout_Soul_Celebration.png","表示":"1"},{"map_id":"MAP0003","マップ名":"水郷古鎮","image":"Layout_Water_Town.png","表示":"1"},{"map_id":"MAP0004","マップ名":"魔法学院","image":"Layout_Magic_Academy.png","表示":"1"},{"map_id":"MAP0005","マップ名":"龍宮遊園地","image":"Layout_Dragon_Palace_Amusement_Park.png","表示":"1"},{"map_id":"MAP0006","マップ名":"幽魂路地","image":"Layout_Ghost_Alley.png","表示":"1"},{"map_id":"MAP0007","マップ名":"龍星の中庭","image":"Layout_Garden_Courtyard.png","表示":"1"},{"map_id":"MAP0101","マップ名":"予選運動場","image":"Layout_Qualifier's_Field.png","表示":""},{"map_id":"MAP0102","マップ名":"トーナメント運動場","image":"Layout_Knockout_Round_Stadium.png","表示":""},{"map_id":"MAP0103","マップ名":"決勝大会場","image":"Layout_Grand_Final_Arena.png","表示":""},{"map_id":"MAP0104","マップ名":"異変図書館","image":"Layout_Anomalous_Library.png","表示":"1"}],"stats":[{"monster_id":"M0001","image":"King_Gawu_Sprite.png","モンスター名":"海賊王ガオー","種族":"海賊王ガオー","ボス":"1","反撃":"1","難易度":"普通","攻撃":"5","防御":"6","HP":"88","コイン":""},{"monster_id":"M0001","image":"King_Gawu_Sprite.png","モンスター名":"海賊王ガオー","種族":"海賊王ガオー","ボス":"1","反撃":"1","難易度":"困難","攻撃":"6","防御":"6","HP":"99","コイン":""},{"monster_id":"M0001","image":"King_Gawu_Sprite.png","モンスター名":"海賊王ガオー","種族":"海賊王ガオー","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"6","防御":"6","HP":"111","コイン":""},{"monster_id":"M0001","image":"King_Gawu_Sprite.png","モンスター名":"海賊王ガオー","種族":"海賊王ガオー","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"7","防御":"6","HP":"122","コイン":""},{"monster_id":"M0001","image":"King_Gawu_Sprite.png","モンスター名":"海賊王ガオー","種族":"海賊王ガオー","ボス":"1","反撃":"1","難易度":"極限","攻撃":"7","防御":"6","HP":"155","コイン":""},{"monster_id":"M0002","image":"King_Shark_Sprite.png","モンスター名":"サメタラシ","種族":"サメタラシ","ボス":"","反撃":"1","難易度":"普通","攻撃":"3","防御":"0","HP":"18","コイン":"12"},{"monster_id":"M0002","image":"King_Shark_Sprite.png","モンスター名":"サメタラシ","種族":"サメタラシ","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"0","HP":"18","コイン":"12"},{"monster_id":"M0002","image":"King_Shark_Sprite.png","モンスター名":"サメタラシ","種族":"サメタラシ","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"1","HP":"20","コイン":"12"},{"monster_id":"M0002","image":"King_Shark_Sprite.png","モンスター名":"サメタラシ","種族":"サメタラシ","ボス":"","反撃":"1","難易度":"狂気","攻撃":"5","防御":"2","HP":"22","コイン":"12"},{"monster_id":"M0002","image":"King_Shark_Sprite.png","モンスター名":"サメタラシ","種族":"サメタラシ","ボス":"","反撃":"1","難易度":"極限","攻撃":"6","防御":"2","HP":"24","コイン":"12"},{"monster_id":"M0003","image":"Elite_Pirate_Sprite.png","モンスター名":"海賊精鋭","種族":"海賊精鋭","ボス":"","反撃":"1","難易度":"普通","攻撃":"4","防御":"2","HP":"25","コイン":"15"},{"monster_id":"M0003","image":"Elite_Pirate_Sprite.png","モンスター名":"海賊精鋭","種族":"海賊精鋭","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"2","HP":"30","コイン":"15"},{"monster_id":"M0003","image":"Elite_Pirate_Sprite.png","モンスター名":"海賊精鋭","種族":"海賊精鋭","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"2","HP":"33","コイン":"15"},{"monster_id":"M0003","image":"Elite_Pirate_Sprite.png","モンスター名":"海賊精鋭","種族":"海賊精鋭","ボス":"","反撃":"1","難易度":"狂気","攻撃":"4","防御":"2","HP":"33","コイン":"15"},{"monster_id":"M0003","image":"Elite_Pirate_Sprite.png","モンスター名":"海賊精鋭","種族":"海賊精鋭","ボス":"","反撃":"1","難易度":"極限","攻撃":"4","防御":"2","HP":"35","コイン":"15"},{"monster_id":"M0004","image":"Shark_Pirate_Sprite.png","モンスター名":"海賊サメ","種族":"海賊サメ","ボス":"","反撃":"","難易度":"普通","攻撃":"4","防御":"1","HP":"9","コイン":"6"},{"monster_id":"M0004","image":"Shark_Pirate_Sprite.png","モンスター名":"海賊サメ","種族":"海賊サメ","ボス":"","反撃":"","難易度":"困難","攻撃":"4","防御":"1","HP":"10","コイン":"6"},{"monster_id":"M0004","image":"Shark_Pirate_Sprite.png","モンスター名":"海賊サメ","種族":"海賊サメ","ボス":"","反撃":"","難易度":"悪夢","攻撃":"4","防御":"1","HP":"10","コイン":"6"},{"monster_id":"M0004","image":"Shark_Pirate_Sprite.png","モンスター名":"海賊サメ","種族":"海賊サメ","ボス":"","反撃":"","難易度":"狂気","攻撃":"4","防御":"1","HP":"10","コイン":"6"},{"monster_id":"M0004","image":"Shark_Pirate_Sprite.png","モンスター名":"海賊サメ","種族":"海賊サメ","ボス":"","反撃":"","難易度":"極限","攻撃":"4","防御":"1","HP":"11","コイン":"6"},{"monster_id":"M0005","image":"Thief_Sprite.png","モンスター名":"泥棒","種族":"アライグマ","ボス":"","反撃":"","難易度":"普通","攻撃":"0","防御":"0","HP":"6","コイン":"5"},{"monster_id":"M0005","image":"Thief_Sprite.png","モンスター名":"泥棒","種族":"アライグマ","ボス":"","反撃":"","難易度":"困難","攻撃":"0","防御":"0","HP":"6","コイン":"5"},{"monster_id":"M0005","image":"Thief_Sprite.png","モンスター名":"泥棒","種族":"アライグマ","ボス":"","反撃":"","難易度":"悪夢","攻撃":"0","防御":"0","HP":"6","コイン":"5"},{"monster_id":"M0005","image":"Thief_Sprite.png","モンスター名":"泥棒","種族":"アライグマ","ボス":"","反撃":"","難易度":"狂気","攻撃":"0","防御":"0","HP":"6","コイン":"5"},{"monster_id":"M0005","image":"Thief_Sprite.png","モンスター名":"泥棒","種族":"アライグマ","ボス":"","反撃":"","難易度":"極限","攻撃":"0","防御":"0","HP":"6","コイン":"5"},{"monster_id":"M0006","image":"Tennoji_Masao_Sprite.png","モンスター名":"天王寺雅央","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"普通","攻撃":"3","防御":"1","HP":"140","コイン":""},{"monster_id":"M0006","image":"Tennoji_Masao_Sprite.png","モンスター名":"天王寺雅央","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"困難","攻撃":"4","防御":"1","HP":"160","コイン":""},{"monster_id":"M0006","image":"Tennoji_Masao_Sprite.png","モンスター名":"天王寺雅央","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"1","HP":"180","コイン":""},{"monster_id":"M0006","image":"Tennoji_Masao_Sprite.png","モンスター名":"天王寺雅央","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"4","防御":"1","HP":"240","コイン":""},{"monster_id":"M0006","image":"Tennoji_Masao_Sprite.png","モンスター名":"天王寺雅央","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"極限","攻撃":"4","防御":"1","HP":"444","コイン":""},{"monster_id":"M0007","image":"Martial_Spirit_-_Enmity_Sprite.png","モンスター名":"サムライの化身-怨","種族":"サムライの化身-怨","ボス":"","反撃":"1","難易度":"普通","攻撃":"11","防御":"11","HP":"44","コイン":"18"},{"monster_id":"M0007","image":"Martial_Spirit_-_Enmity_Sprite.png","モンスター名":"サムライの化身-怨","種族":"サムライの化身-怨","ボス":"","反撃":"1","難易度":"困難","攻撃":"11","防御":"11","HP":"44","コイン":"18"},{"monster_id":"M0007","image":"Martial_Spirit_-_Enmity_Sprite.png","モンスター名":"サムライの化身-怨","種族":"サムライの化身-怨","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"11","防御":"11","HP":"44","コイン":"18"},{"monster_id":"M0007","image":"Martial_Spirit_-_Enmity_Sprite.png","モンスター名":"サムライの化身-怨","種族":"サムライの化身-怨","ボス":"","反撃":"1","難易度":"狂気","攻撃":"11","防御":"11","HP":"44","コイン":"18"},{"monster_id":"M0007","image":"Martial_Spirit_-_Enmity_Sprite.png","モンスター名":"サムライの化身-怨","種族":"サムライの化身-怨","ボス":"","反撃":"1","難易度":"極限","攻撃":"11","防御":"11","HP":"44","コイン":"18"},{"monster_id":"M0008","image":"Martial_Spirit_-_Murder_Sprite.png","モンスター名":"サムライの化身-戮","種族":"サムライの化身-戮","ボス":"","反撃":"1","難易度":"普通","攻撃":"8","防御":"5","HP":"66","コイン":"18"},{"monster_id":"M0008","image":"Martial_Spirit_-_Murder_Sprite.png","モンスター名":"サムライの化身-戮","種族":"サムライの化身-戮","ボス":"","反撃":"1","難易度":"困難","攻撃":"8","防御":"5","HP":"66","コイン":"18"},{"monster_id":"M0008","image":"Martial_Spirit_-_Murder_Sprite.png","モンスター名":"サムライの化身-戮","種族":"サムライの化身-戮","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"8","防御":"5","HP":"66","コイン":"18"},{"monster_id":"M0008","image":"Martial_Spirit_-_Murder_Sprite.png","モンスター名":"サムライの化身-戮","種族":"サムライの化身-戮","ボス":"","反撃":"1","難易度":"狂気","攻撃":"8","防御":"5","HP":"66","コイン":"18"},{"monster_id":"M0008","image":"Martial_Spirit_-_Murder_Sprite.png","モンスター名":"サムライの化身-戮","種族":"サムライの化身-戮","ボス":"","反撃":"1","難易度":"極限","攻撃":"8","防御":"5","HP":"66","コイン":"18"},{"monster_id":"M0009","image":"Spear_Spirit_Sprite.png","モンスター名":"長戟霊","種族":"長戟霊","ボス":"","反撃":"1","難易度":"普通","攻撃":"3","防御":"4","HP":"11","コイン":"12"},{"monster_id":"M0009","image":"Spear_Spirit_Sprite.png","モンスター名":"長戟霊","種族":"長戟霊","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"5","HP":"12","コイン":"12"},{"monster_id":"M0009","image":"Spear_Spirit_Sprite.png","モンスター名":"長戟霊","種族":"長戟霊","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"6","防御":"7","HP":"13","コイン":"12"},{"monster_id":"M0009","image":"Spear_Spirit_Sprite.png","モンスター名":"長戟霊","種族":"長戟霊","ボス":"","反撃":"1","難易度":"狂気","攻撃":"7","防御":"8","HP":"15","コイン":"12"},{"monster_id":"M0009","image":"Spear_Spirit_Sprite.png","モンスター名":"長戟霊","種族":"長戟霊","ボス":"","反撃":"1","難易度":"極限","攻撃":"9","防御":"10","HP":"15","コイン":"12"},{"monster_id":"M0010","image":"Sword_Spirit_Sprite.png","モンスター名":"刀剣霊","種族":"刀剣霊","ボス":"","反撃":"","難易度":"普通","攻撃":"4","防御":"0","HP":"22","コイン":"12"},{"monster_id":"M0010","image":"Sword_Spirit_Sprite.png","モンスター名":"刀剣霊","種族":"刀剣霊","ボス":"","反撃":"","難易度":"困難","攻撃":"4","防御":"0","HP":"24","コイン":"12"},{"monster_id":"M0010","image":"Sword_Spirit_Sprite.png","モンスター名":"刀剣霊","種族":"刀剣霊","ボス":"","反撃":"","難易度":"悪夢","攻撃":"5","防御":"1","HP":"25","コイン":"12"},{"monster_id":"M0010","image":"Sword_Spirit_Sprite.png","モンスター名":"刀剣霊","種族":"刀剣霊","ボス":"","反撃":"","難易度":"狂気","攻撃":"5","防御":"2","HP":"29","コイン":"12"},{"monster_id":"M0010","image":"Sword_Spirit_Sprite.png","モンスター名":"刀剣霊","種族":"刀剣霊","ボス":"","反撃":"","難易度":"極限","攻撃":"5","防御":"2","HP":"33","コイン":"12"},{"monster_id":"M0011","image":"Fever_Red_Spirit_Sprite.png","モンスター名":"凶暴赤霊","種族":"凶暴赤霊","ボス":"","反撃":"1","難易度":"普通","攻撃":"4","防御":"4","HP":"5","コイン":"8"},{"monster_id":"M0011","image":"Fever_Red_Spirit_Sprite.png","モンスター名":"凶暴赤霊","種族":"凶暴赤霊","ボス":"","反撃":"1","難易度":"困難","攻撃":"5","防御":"5","HP":"6","コイン":"8"},{"monster_id":"M0011","image":"Fever_Red_Spirit_Sprite.png","モンスター名":"凶暴赤霊","種族":"凶暴赤霊","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"5","HP":"6","コイン":"8"},{"monster_id":"M0011","image":"Fever_Red_Spirit_Sprite.png","モンスター名":"凶暴赤霊","種族":"凶暴赤霊","ボス":"","反撃":"1","難易度":"狂気","攻撃":"6","防御":"6","HP":"6","コイン":"8"},{"monster_id":"M0011","image":"Fever_Red_Spirit_Sprite.png","モンスター名":"凶暴赤霊","種族":"凶暴赤霊","ボス":"","反撃":"1","難易度":"極限","攻撃":"6","防御":"6","HP":"6","コイン":"8"},{"monster_id":"M0012","image":"Frozen_Blue_Spirit_Sprite.png","モンスター名":"氷刻青霊","種族":"氷刻青霊","ボス":"","反撃":"","難易度":"普通","攻撃":"4","防御":"0","HP":"10","コイン":"6"},{"monster_id":"M0012","image":"Frozen_Blue_Spirit_Sprite.png","モンスター名":"氷刻青霊","種族":"氷刻青霊","ボス":"","反撃":"","難易度":"困難","攻撃":"4","防御":"0","HP":"10","コイン":"6"},{"monster_id":"M0012","image":"Frozen_Blue_Spirit_Sprite.png","モンスター名":"氷刻青霊","種族":"氷刻青霊","ボス":"","反撃":"","難易度":"悪夢","攻撃":"5","防御":"0","HP":"11","コイン":"6"},{"monster_id":"M0012","image":"Frozen_Blue_Spirit_Sprite.png","モンスター名":"氷刻青霊","種族":"氷刻青霊","ボス":"","反撃":"","難易度":"狂気","攻撃":"5","防御":"0","HP":"11","コイン":"6"},{"monster_id":"M0012","image":"Frozen_Blue_Spirit_Sprite.png","モンスター名":"氷刻青霊","種族":"氷刻青霊","ボス":"","反撃":"","難易度":"極限","攻撃":"5","防御":"0","HP":"12","コイン":"6"},{"monster_id":"M0013","image":"Lion_Gawu_Sprite.png","モンスター名":"獅子舞いガオー","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"普通","攻撃":"3","防御":"0","HP":"120","コイン":""},{"monster_id":"M0013","image":"Lion_Gawu_Sprite.png","モンスター名":"獅子舞いガオー","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"困難","攻撃":"3","防御":"0","HP":"145","コイン":""},{"monster_id":"M0013","image":"Lion_Gawu_Sprite.png","モンスター名":"獅子舞いガオー","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"1","HP":"160","コイン":""},{"monster_id":"M0013","image":"Lion_Gawu_Sprite.png","モンスター名":"獅子舞いガオー","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"4","防御":"1","HP":"188","コイン":""},{"monster_id":"M0013","image":"Lion_Gawu_Sprite.png","モンスター名":"獅子舞いガオー","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"極限","攻撃":"4","防御":"1","HP":"236","コイン":""},{"monster_id":"M0014","image":"Ground_Control_Sprite.png","モンスター名":"指揮センター","種族":"指揮センター","ボス":"1","反撃":"","難易度":"普通","攻撃":"0","防御":"0","HP":"120","コイン":""},{"monster_id":"M0014","image":"Ground_Control_Sprite.png","モンスター名":"指揮センター","種族":"指揮センター","ボス":"1","反撃":"","難易度":"困難","攻撃":"0","防御":"0","HP":"145","コイン":""},{"monster_id":"M0014","image":"Ground_Control_Sprite.png","モンスター名":"指揮センター","種族":"指揮センター","ボス":"1","反撃":"","難易度":"悪夢","攻撃":"0","防御":"0","HP":"160","コイン":""},{"monster_id":"M0014","image":"Ground_Control_Sprite.png","モンスター名":"指揮センター","種族":"指揮センター","ボス":"1","反撃":"","難易度":"狂気","攻撃":"0","防御":"0","HP":"188","コイン":""},{"monster_id":"M0014","image":"Ground_Control_Sprite.png","モンスター名":"指揮センター","種族":"指揮センター","ボス":"1","反撃":"","難易度":"極限","攻撃":"0","防御":"0","HP":"236","コイン":""},{"monster_id":"M0015","image":"Lion_Gawu_Sprite.png","モンスター名":"フュージョン！獅子舞いガオー！","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"普通","攻撃":"5","防御":"1","HP":"236","コイン":""},{"monster_id":"M0015","image":"Lion_Gawu_Sprite.png","モンスター名":"フュージョン！獅子舞いガオー！","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"困難","攻撃":"5","防御":"1","HP":"236","コイン":""},{"monster_id":"M0015","image":"Lion_Gawu_Sprite.png","モンスター名":"フュージョン！獅子舞いガオー！","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"1","HP":"236","コイン":""},{"monster_id":"M0015","image":"Lion_Gawu_Sprite.png","モンスター名":"フュージョン！獅子舞いガオー！","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"5","防御":"1","HP":"236","コイン":""},{"monster_id":"M0015","image":"Lion_Gawu_Sprite.png","モンスター名":"フュージョン！獅子舞いガオー！","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"極限","攻撃":"5","防御":"1","HP":"236","コイン":""},{"monster_id":"M0016","image":"Cracker_Croak_Sprite.png","モンスター名":"三連爆竹ゲロゲロ","種族":"三連爆竹ゲロゲロ","ボス":"","反撃":"","難易度":"普通","攻撃":"2","防御":"2","HP":"16","コイン":"12"},{"monster_id":"M0016","image":"Cracker_Croak_Sprite.png","モンスター名":"三連爆竹ゲロゲロ","種族":"三連爆竹ゲロゲロ","ボス":"","反撃":"","難易度":"困難","攻撃":"2","防御":"2","HP":"16","コイン":"12"},{"monster_id":"M0016","image":"Cracker_Croak_Sprite.png","モンスター名":"三連爆竹ゲロゲロ","種族":"三連爆竹ゲロゲロ","ボス":"","反撃":"","難易度":"悪夢","攻撃":"2","防御":"2","HP":"16","コイン":"12"},{"monster_id":"M0016","image":"Cracker_Croak_Sprite.png","モンスター名":"三連爆竹ゲロゲロ","種族":"三連爆竹ゲロゲロ","ボス":"","反撃":"","難易度":"狂気","攻撃":"2","防御":"2","HP":"16","コイン":"12"},{"monster_id":"M0016","image":"Cracker_Croak_Sprite.png","モンスター名":"三連爆竹ゲロゲロ","種族":"三連爆竹ゲロゲロ","ボス":"","反撃":"","難易度":"極限","攻撃":"2","防御":"2","HP":"16","コイン":"12"},{"monster_id":"M0017","image":"Cracker_Croak_Sprite.png","モンスター名":"爆竹ゲロゲロ","種族":"爆竹ゲロゲロ","ボス":"","反撃":"","難易度":"普通","攻撃":"1","防御":"1","HP":"7","コイン":"6"},{"monster_id":"M0017","image":"Cracker_Croak_Sprite.png","モンスター名":"爆竹ゲロゲロ","種族":"爆竹ゲロゲロ","ボス":"","反撃":"","難易度":"困難","攻撃":"1","防御":"1","HP":"8","コイン":"6"},{"monster_id":"M0017","image":"Cracker_Croak_Sprite.png","モンスター名":"爆竹ゲロゲロ","種族":"爆竹ゲロゲロ","ボス":"","反撃":"","難易度":"悪夢","攻撃":"1","防御":"2","HP":"8","コイン":"6"},{"monster_id":"M0017","image":"Cracker_Croak_Sprite.png","モンスター名":"爆竹ゲロゲロ","種族":"爆竹ゲロゲロ","ボス":"","反撃":"","難易度":"狂気","攻撃":"1","防御":"2","HP":"8","コイン":"6"},{"monster_id":"M0017","image":"Cracker_Croak_Sprite.png","モンスター名":"爆竹ゲロゲロ","種族":"爆竹ゲロゲロ","ボス":"","反撃":"","難易度":"極限","攻撃":"1","防御":"2","HP":"9","コイン":"6"},{"monster_id":"M0018","image":"Ambient_Enlivener_Robot_Sprite.png","モンスター名":"雰囲気系ロボ","種族":"雰囲気系ロボ","ボス":"","反撃":"1","難易度":"普通","攻撃":"3","防御":"0","HP":"21","コイン":"15"},{"monster_id":"M0018","image":"Ambient_Enlivener_Robot_Sprite.png","モンスター名":"雰囲気系ロボ","種族":"雰囲気系ロボ","ボス":"","反撃":"1","難易度":"困難","攻撃":"3","防御":"1","HP":"22","コイン":"15"},{"monster_id":"M0018","image":"Ambient_Enlivener_Robot_Sprite.png","モンスター名":"雰囲気系ロボ","種族":"雰囲気系ロボ","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"1","HP":"23","コイン":"15"},{"monster_id":"M0018","image":"Ambient_Enlivener_Robot_Sprite.png","モンスター名":"雰囲気系ロボ","種族":"雰囲気系ロボ","ボス":"","反撃":"1","難易度":"狂気","攻撃":"4","防御":"1","HP":"25","コイン":"15"},{"monster_id":"M0018","image":"Ambient_Enlivener_Robot_Sprite.png","モンスター名":"雰囲気系ロボ","種族":"雰囲気系ロボ","ボス":"","反撃":"1","難易度":"極限","攻撃":"4","防御":"1","HP":"28","コイン":"15"},{"monster_id":"M0019","image":"Mechanical_Snake_Dragon_Sprite.png","モンスター名":"機械蛇龍","種族":"機械蛇龍","ボス":"","反撃":"","難易度":"普通","攻撃":"0","防御":"0","HP":"8","コイン":"9"},{"monster_id":"M0019","image":"Mechanical_Snake_Dragon_Sprite.png","モンスター名":"機械蛇龍","種族":"機械蛇龍","ボス":"","反撃":"","難易度":"困難","攻撃":"0","防御":"0","HP":"9","コイン":"9"},{"monster_id":"M0019","image":"Mechanical_Snake_Dragon_Sprite.png","モンスター名":"機械蛇龍","種族":"機械蛇龍","ボス":"","反撃":"","難易度":"悪夢","攻撃":"0","防御":"0","HP":"9","コイン":"9"},{"monster_id":"M0019","image":"Mechanical_Snake_Dragon_Sprite.png","モンスター名":"機械蛇龍","種族":"機械蛇龍","ボス":"","反撃":"","難易度":"狂気","攻撃":"0","防御":"0","HP":"11","コイン":"9"},{"monster_id":"M0019","image":"Mechanical_Snake_Dragon_Sprite.png","モンスター名":"機械蛇龍","種族":"機械蛇龍","ボス":"","反撃":"","難易度":"極限","攻撃":"0","防御":"0","HP":"11","コイン":"9"},{"monster_id":"M0020","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"普通","攻撃":"2","防御":"1","HP":"99","コイン":""},{"monster_id":"M0020","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"困難","攻撃":"2","防御":"1","HP":"110","コイン":""},{"monster_id":"M0020","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"3","防御":"2","HP":"120","コイン":""},{"monster_id":"M0020","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"4","防御":"2","HP":"140","コイン":""},{"monster_id":"M0021","image":"Tennoji_Masao_Academy_Sprite.png","モンスター名":"学院長代理","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"普通","攻撃":"2","防御":"2","HP":"111","コイン":""},{"monster_id":"M0021","image":"Tennoji_Masao_Academy_Sprite.png","モンスター名":"学院長代理","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"困難","攻撃":"3","防御":"2","HP":"130","コイン":""},{"monster_id":"M0021","image":"Tennoji_Masao_Academy_Sprite.png","モンスター名":"学院長代理","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"3","防御":"2","HP":"160","コイン":""},{"monster_id":"M0021","image":"Tennoji_Masao_Academy_Sprite.png","モンスター名":"学院長代理","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"4","防御":"2","HP":"200","コイン":""},{"monster_id":"M0022","image":"Jelly_Fighter_Sprite.png","モンスター名":"ゼリーファイター","種族":"ゼリーファイター","ボス":"","反撃":"1","難易度":"普通","攻撃":"2","防御":"6","HP":"35","コイン":"6"},{"monster_id":"M0022","image":"Jelly_Fighter_Sprite.png","モンスター名":"ゼリーファイター","種族":"ゼリーファイター","ボス":"","反撃":"1","難易度":"困難","攻撃":"2","防御":"6","HP":"36","コイン":"6"},{"monster_id":"M0022","image":"Jelly_Fighter_Sprite.png","モンスター名":"ゼリーファイター","種族":"ゼリーファイター","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"3","防御":"8","HP":"38","コイン":"6"},{"monster_id":"M0022","image":"Jelly_Fighter_Sprite.png","モンスター名":"ゼリーファイター","種族":"ゼリーファイター","ボス":"","反撃":"1","難易度":"狂気","攻撃":"4","防御":"10","HP":"40","コイン":"6"},{"monster_id":"M0023","image":"Jelly_Guard_Sprite.png","モンスター名":"ゼリーガーディアン","種族":"ゼリーガーディアン","ボス":"","反撃":"1","難易度":"普通","攻撃":"3","防御":"4","HP":"15","コイン":"9"},{"monster_id":"M0023","image":"Jelly_Guard_Sprite.png","モンスター名":"ゼリーガーディアン","種族":"ゼリーガーディアン","ボス":"","反撃":"1","難易度":"困難","攻撃":"3","防御":"4","HP":"16","コイン":"9"},{"monster_id":"M0023","image":"Jelly_Guard_Sprite.png","モンスター名":"ゼリーガーディアン","種族":"ゼリーガーディアン","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"4","HP":"18","コイン":"9"},{"monster_id":"M0023","image":"Jelly_Guard_Sprite.png","モンスター名":"ゼリーガーディアン","種族":"ゼリーガーディアン","ボス":"","反撃":"1","難易度":"狂気","攻撃":"4","防御":"4","HP":"20","コイン":"9"},{"monster_id":"M0024","image":"Jelly_Wizard_Sprite.png","モンスター名":"ゼリーウィザード","種族":"ゼリーウィザード","ボス":"","反撃":"","難易度":"普通","攻撃":"2","防御":"1","HP":"15","コイン":"8"},{"monster_id":"M0024","image":"Jelly_Wizard_Sprite.png","モンスター名":"ゼリーウィザード","種族":"ゼリーウィザード","ボス":"","反撃":"","難易度":"困難","攻撃":"3","防御":"1","HP":"16","コイン":"8"},{"monster_id":"M0024","image":"Jelly_Wizard_Sprite.png","モンスター名":"ゼリーウィザード","種族":"ゼリーウィザード","ボス":"","反撃":"","難易度":"悪夢","攻撃":"3","防御":"1","HP":"17","コイン":"8"},{"monster_id":"M0024","image":"Jelly_Wizard_Sprite.png","モンスター名":"ゼリーウィザード","種族":"ゼリーウィザード","ボス":"","反撃":"","難易度":"狂気","攻撃":"3","防御":"1","HP":"21","コイン":"8"},{"monster_id":"M0025","image":"Magic_Teapot_Sprite.png","モンスター名":"魔法のティーポット","種族":"魔法のティーポット","ボス":"","反撃":"","難易度":"普通","攻撃":"3","防御":"1","HP":"10","コイン":"6"},{"monster_id":"M0025","image":"Magic_Teapot_Sprite.png","モンスター名":"魔法のティーポット","種族":"魔法のティーポット","ボス":"","反撃":"","難易度":"困難","攻撃":"3","防御":"1","HP":"11","コイン":"6"},{"monster_id":"M0025","image":"Magic_Teapot_Sprite.png","モンスター名":"魔法のティーポット","種族":"魔法のティーポット","ボス":"","反撃":"","難易度":"悪夢","攻撃":"4","防御":"1","HP":"11","コイン":"6"},{"monster_id":"M0025","image":"Magic_Teapot_Sprite.png","モンスター名":"魔法のティーポット","種族":"魔法のティーポット","ボス":"","反撃":"","難易度":"狂気","攻撃":"4","防御":"1","HP":"12","コイン":"6"},{"monster_id":"M0026","image":"Mutant_Teapot_Sprite.png","モンスター名":"変なティーポット","種族":"変なティーポット","ボス":"","反撃":"","難易度":"普通","攻撃":"4","防御":"2","HP":"7","コイン":"8"},{"monster_id":"M0026","image":"Mutant_Teapot_Sprite.png","モンスター名":"変なティーポット","種族":"変なティーポット","ボス":"","反撃":"","難易度":"困難","攻撃":"5","防御":"2","HP":"7","コイン":"8"},{"monster_id":"M0026","image":"Mutant_Teapot_Sprite.png","モンスター名":"変なティーポット","種族":"変なティーポット","ボス":"","反撃":"","難易度":"悪夢","攻撃":"6","防御":"3","HP":"7","コイン":"8"},{"monster_id":"M0026","image":"Mutant_Teapot_Sprite.png","モンスター名":"変なティーポット","種族":"変なティーポット","ボス":"","反撃":"","難易度":"狂気","攻撃":"6","防御":"3","HP":"8","コイン":"8"},{"monster_id":"M0027","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓","種族":"天川真夢梓","ボス":"1","反撃":"1","難易度":"普通","攻撃":"4","防御":"1","HP":"99","コイン":""},{"monster_id":"M0027","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓","種族":"天川真夢梓","ボス":"1","反撃":"1","難易度":"困難","攻撃":"4","防御":"1","HP":"111","コイン":""},{"monster_id":"M0027","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓","種族":"天川真夢梓","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"2","HP":"120","コイン":""},{"monster_id":"M0027","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓","種族":"天川真夢梓","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"6","防御":"2","HP":"150","コイン":""},{"monster_id":"M0028","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"普通","攻撃":"1","防御":"1","HP":"88","コイン":""},{"monster_id":"M0028","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"困難","攻撃":"2","防御":"2","HP":"100","コイン":""},{"monster_id":"M0028","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"3","防御":"3","HP":"110","コイン":""},{"monster_id":"M0028","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"4","防御":"4","HP":"135","コイン":""},{"monster_id":"M0029","image":"Crab_Soldier_Sprite.png","モンスター名":"蟹兄い","種族":"蟹兄い","ボス":"","反撃":"","難易度":"普通","攻撃":"2","防御":"1","HP":"7","コイン":"6"},{"monster_id":"M0029","image":"Crab_Soldier_Sprite.png","モンスター名":"蟹兄い","種族":"蟹兄い","ボス":"","反撃":"","難易度":"困難","攻撃":"3","防御":"1","HP":"8","コイン":"6"},{"monster_id":"M0029","image":"Crab_Soldier_Sprite.png","モンスター名":"蟹兄い","種族":"蟹兄い","ボス":"","反撃":"","難易度":"悪夢","攻撃":"3","防御":"2","HP":"8","コイン":"6"},{"monster_id":"M0029","image":"Crab_Soldier_Sprite.png","モンスター名":"蟹兄い","種族":"蟹兄い","ボス":"","反撃":"","難易度":"狂気","攻撃":"4","防御":"2","HP":"9","コイン":"6"},{"monster_id":"M0030","image":"Prawn_Soldier_Sprite.png","モンスター名":"蝦兄い","種族":"蝦兄い","ボス":"","反撃":"1","難易度":"普通","攻撃":"3","防御":"1","HP":"20","コイン":"8"},{"monster_id":"M0030","image":"Prawn_Soldier_Sprite.png","モンスター名":"蝦兄い","種族":"蝦兄い","ボス":"","反撃":"1","難易度":"困難","攻撃":"3","防御":"2","HP":"22","コイン":"8"},{"monster_id":"M0030","image":"Prawn_Soldier_Sprite.png","モンスター名":"蝦兄い","種族":"蝦兄い","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"2","HP":"24","コイン":"8"},{"monster_id":"M0030","image":"Prawn_Soldier_Sprite.png","モンスター名":"蝦兄い","種族":"蝦兄い","ボス":"","反撃":"1","難易度":"狂気","攻撃":"4","防御":"2","HP":"26","コイン":"8"},{"monster_id":"M0031","image":"Golden_Fish_Sprite.png","モンスター名":"金ちゃん","種族":"金ちゃん","ボス":"","反撃":"1","難易度":"普通","攻撃":"2","防御":"0","HP":"6","コイン":"5"},{"monster_id":"M0031","image":"Golden_Fish_Sprite.png","モンスター名":"金ちゃん","種族":"金ちゃん","ボス":"","反撃":"1","難易度":"困難","攻撃":"3","防御":"0","HP":"7","コイン":"5"},{"monster_id":"M0031","image":"Golden_Fish_Sprite.png","モンスター名":"金ちゃん","種族":"金ちゃん","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"0","HP":"8","コイン":"5"},{"monster_id":"M0031","image":"Golden_Fish_Sprite.png","モンスター名":"金ちゃん","種族":"金ちゃん","ボス":"","反撃":"1","難易度":"狂気","攻撃":"6","防御":"0","HP":"11","コイン":"5"},{"monster_id":"M0032","image":"Loudmouth_Sprite.png","モンスター名":"コエデカフグ","種族":"コエデカフグ","ボス":"","反撃":"","難易度":"普通","攻撃":"3","防御":"0","HP":"18","コイン":"8"},{"monster_id":"M0032","image":"Loudmouth_Sprite.png","モンスター名":"コエデカフグ","種族":"コエデカフグ","ボス":"","反撃":"","難易度":"困難","攻撃":"3","防御":"0","HP":"20","コイン":"8"},{"monster_id":"M0032","image":"Loudmouth_Sprite.png","モンスター名":"コエデカフグ","種族":"コエデカフグ","ボス":"","反撃":"","難易度":"悪夢","攻撃":"4","防御":"1","HP":"20","コイン":"8"},{"monster_id":"M0032","image":"Loudmouth_Sprite.png","モンスター名":"コエデカフグ","種族":"コエデカフグ","ボス":"","反撃":"","難易度":"狂気","攻撃":"4","防御":"1","HP":"24","コイン":"8"},{"monster_id":"M0033","image":"Martial_Trainee_Sprite.png","モンスター名":"ムキムキフグ","種族":"ムキムキフグ","ボス":"","反撃":"1","難易度":"普通","攻撃":"3","防御":"3","HP":"13","コイン":"8"},{"monster_id":"M0033","image":"Martial_Trainee_Sprite.png","モンスター名":"ムキムキフグ","種族":"ムキムキフグ","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"4","HP":"14","コイン":"8"},{"monster_id":"M0033","image":"Martial_Trainee_Sprite.png","モンスター名":"ムキムキフグ","種族":"ムキムキフグ","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"4","HP":"15","コイン":"8"},{"monster_id":"M0033","image":"Martial_Trainee_Sprite.png","モンスター名":"ムキムキフグ","種族":"ムキムキフグ","ボス":"","反撃":"1","難易度":"狂気","攻撃":"5","防御":"5","HP":"16","コイン":"8"},{"monster_id":"M0034","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓（味方）","種族":"天川真夢梓","ボス":"","反撃":"","難易度":"普通","攻撃":"6","防御":"6","HP":"99","コイン":""},{"monster_id":"M0034","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓（味方）","種族":"天川真夢梓","ボス":"","反撃":"","難易度":"困難","攻撃":"6","防御":"6","HP":"99","コイン":""},{"monster_id":"M0034","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓（味方）","種族":"天川真夢梓","ボス":"","反撃":"","難易度":"悪夢","攻撃":"6","防御":"6","HP":"99","コイン":""},{"monster_id":"M0034","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓（味方）","種族":"天川真夢梓","ボス":"","反撃":"","難易度":"狂気","攻撃":"6","防御":"6","HP":"99","コイン":""},{"monster_id":"M0035","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉（味方）","種族":"天川蒼鯉","ボス":"","反撃":"","難易度":"普通","攻撃":"4","防御":"4","HP":"99","コイン":""},{"monster_id":"M0035","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉（味方）","種族":"天川蒼鯉","ボス":"","反撃":"","難易度":"困難","攻撃":"4","防御":"4","HP":"99","コイン":""},{"monster_id":"M0035","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉（味方）","種族":"天川蒼鯉","ボス":"","反撃":"","難易度":"悪夢","攻撃":"4","防御":"4","HP":"99","コイン":""},{"monster_id":"M0035","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉（味方）","種族":"天川蒼鯉","ボス":"","反撃":"","難易度":"狂気","攻撃":"4","防御":"4","HP":"99","コイン":""},{"monster_id":"M0036","image":"Mad_Scientist_Sprite.png","モンスター名":"ドクター・マサオシュタイン","種族":"天王寺雅央","ボス":"1","反撃":"","難易度":"普通","攻撃":"0","防御":"0","HP":"9","コイン":""},{"monster_id":"M0036","image":"Mad_Scientist_Sprite.png","モンスター名":"ドクター・マサオシュタイン","種族":"天王寺雅央","ボス":"1","反撃":"","難易度":"困難","攻撃":"0","防御":"0","HP":"9","コイン":""},{"monster_id":"M0036","image":"Mad_Scientist_Sprite.png","モンスター名":"ドクター・マサオシュタイン","種族":"天王寺雅央","ボス":"1","反撃":"","難易度":"悪夢","攻撃":"0","防御":"0","HP":"9","コイン":""},{"monster_id":"M0036","image":"Mad_Scientist_Sprite.png","モンスター名":"ドクター・マサオシュタイン","種族":"天王寺雅央","ボス":"1","反撃":"","難易度":"狂気","攻撃":"0","防御":"0","HP":"9","コイン":""},{"monster_id":"M0037","image":"Jack-in-the-Monkey_Sprite.png","モンスター名":"さるのびっくり箱","種族":"さるのびっくり箱","ボス":"","反撃":"","難易度":"普通","攻撃":"4","防御":"0","HP":"8","コイン":"6"},{"monster_id":"M0037","image":"Jack-in-the-Monkey_Sprite.png","モンスター名":"さるのびっくり箱","種族":"さるのびっくり箱","ボス":"","反撃":"","難易度":"困難","攻撃":"4","防御":"0","HP":"9","コイン":"6"},{"monster_id":"M0037","image":"Jack-in-the-Monkey_Sprite.png","モンスター名":"さるのびっくり箱","種族":"さるのびっくり箱","ボス":"","反撃":"","難易度":"悪夢","攻撃":"5","防御":"0","HP":"10","コイン":"6"},{"monster_id":"M0037","image":"Jack-in-the-Monkey_Sprite.png","モンスター名":"さるのびっくり箱","種族":"さるのびっくり箱","ボス":"","反撃":"","難易度":"狂気","攻撃":"5","防御":"0","HP":"11","コイン":"6"},{"monster_id":"M0038","image":"Buzzsaw_Monkey_Assistant_Sprite.png","モンスター名":"さるの助手君","種族":"さるの助手君","ボス":"","反撃":"1","難易度":"普通","攻撃":"3","防御":"1","HP":"16","コイン":"8"},{"monster_id":"M0038","image":"Buzzsaw_Monkey_Assistant_Sprite.png","モンスター名":"さるの助手君","種族":"さるの助手君","ボス":"","反撃":"1","難易度":"困難","攻撃":"3","防御":"1","HP":"18","コイン":"8"},{"monster_id":"M0038","image":"Buzzsaw_Monkey_Assistant_Sprite.png","モンスター名":"さるの助手君","種族":"さるの助手君","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"1","HP":"20","コイン":"8"},{"monster_id":"M0038","image":"Buzzsaw_Monkey_Assistant_Sprite.png","モンスター名":"さるの助手君","種族":"さるの助手君","ボス":"","反撃":"1","難易度":"狂気","攻撃":"4","防御":"2","HP":"22","コイン":"8"},{"monster_id":"M0039","image":"Mad_Ape_Sprite.png","モンスター名":"ゴリフランケンちゃん","種族":"ゴリフランケンちゃん","ボス":"","反撃":"1","難易度":"普通","攻撃":"4","防御":"2","HP":"22","コイン":"8"},{"monster_id":"M0039","image":"Mad_Ape_Sprite.png","モンスター名":"ゴリフランケンちゃん","種族":"ゴリフランケンちゃん","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"2","HP":"24","コイン":"8"},{"monster_id":"M0039","image":"Mad_Ape_Sprite.png","モンスター名":"ゴリフランケンちゃん","種族":"ゴリフランケンちゃん","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"3","HP":"26","コイン":"8"},{"monster_id":"M0039","image":"Mad_Ape_Sprite.png","モンスター名":"ゴリフランケンちゃん","種族":"ゴリフランケンちゃん","ボス":"","反撃":"1","難易度":"狂気","攻撃":"5","防御":"3","HP":"27","コイン":"8"},{"monster_id":"M0040","image":"Candy_Pinata_Sprite.png","モンスター名":"キャンディビニャータ","種族":"キャンディビニャータ","ボス":"","反撃":"1","難易度":"普通","攻撃":"3","防御":"0","HP":"8","コイン":"5"},{"monster_id":"M0040","image":"Candy_Pinata_Sprite.png","モンスター名":"キャンディビニャータ","種族":"キャンディビニャータ","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"0","HP":"9","コイン":"5"},{"monster_id":"M0040","image":"Candy_Pinata_Sprite.png","モンスター名":"キャンディビニャータ","種族":"キャンディビニャータ","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"0","HP":"9","コイン":"5"},{"monster_id":"M0040","image":"Candy_Pinata_Sprite.png","モンスター名":"キャンディビニャータ","種族":"キャンディビニャータ","ボス":"","反撃":"1","難易度":"狂気","攻撃":"5","防御":"0","HP":"10","コイン":"5"},{"monster_id":"M0041","image":"Synthetic_Cataclysm_Sprite.png","モンスター名":"人工生命体―天崩","種族":"人工生命体―天崩","ボス":"","反撃":"","難易度":"普通","攻撃":"4","防御":"1","HP":"26","コイン":"8"},{"monster_id":"M0041","image":"Synthetic_Cataclysm_Sprite.png","モンスター名":"人工生命体―天崩","種族":"人工生命体―天崩","ボス":"","反撃":"","難易度":"困難","攻撃":"4","防御":"1","HP":"28","コイン":"8"},{"monster_id":"M0041","image":"Synthetic_Cataclysm_Sprite.png","モンスター名":"人工生命体―天崩","種族":"人工生命体―天崩","ボス":"","反撃":"","難易度":"悪夢","攻撃":"5","防御":"2","HP":"30","コイン":"8"},{"monster_id":"M0041","image":"Synthetic_Cataclysm_Sprite.png","モンスター名":"人工生命体―天崩","種族":"人工生命体―天崩","ボス":"","反撃":"","難易度":"狂気","攻撃":"6","防御":"2","HP":"33","コイン":"8"},{"monster_id":"M0042","image":"Synthetic_Omen_Sprite.png","モンスター名":"人工生命体―厄兆","種族":"人工生命体―厄兆","ボス":"","反撃":"1","難易度":"普通","攻撃":"4","防御":"2","HP":"26","コイン":"8"},{"monster_id":"M0042","image":"Synthetic_Omen_Sprite.png","モンスター名":"人工生命体―厄兆","種族":"人工生命体―厄兆","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"2","HP":"29","コイン":"8"},{"monster_id":"M0042","image":"Synthetic_Omen_Sprite.png","モンスター名":"人工生命体―厄兆","種族":"人工生命体―厄兆","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"3","HP":"30","コイン":"8"},{"monster_id":"M0042","image":"Synthetic_Omen_Sprite.png","モンスター名":"人工生命体―厄兆","種族":"人工生命体―厄兆","ボス":"","反撃":"1","難易度":"狂気","攻撃":"6","防御":"3","HP":"33","コイン":"8"},{"monster_id":"M0043","image":"Synthetic_Chaos_Sprite.png","モンスター名":"人工生命体―混乱","種族":"人工生命体―混乱","ボス":"","反撃":"1","難易度":"普通","攻撃":"5","防御":"3","HP":"38","コイン":"8"},{"monster_id":"M0043","image":"Synthetic_Chaos_Sprite.png","モンスター名":"人工生命体―混乱","種族":"人工生命体―混乱","ボス":"","反撃":"1","難易度":"困難","攻撃":"6","防御":"3","HP":"42","コイン":"8"},{"monster_id":"M0043","image":"Synthetic_Chaos_Sprite.png","モンスター名":"人工生命体―混乱","種族":"人工生命体―混乱","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"7","防御":"4","HP":"45","コイン":"8"},{"monster_id":"M0043","image":"Synthetic_Chaos_Sprite.png","モンスター名":"人工生命体―混乱","種族":"人工生命体―混乱","ボス":"","反撃":"1","難易度":"狂気","攻撃":"7","防御":"5","HP":"50","コイン":"8"},{"monster_id":"M0044","image":"Rampant_Phoenix_Sprite.png","モンスター名":"ダーク・フェニックス","種族":"ダーク・フェニックス","ボス":"1","反撃":"1","難易度":"普通","攻撃":"0","防御":"0","HP":"150","コイン":""},{"monster_id":"M0044","image":"Rampant_Phoenix_Sprite.png","モンスター名":"ダーク・フェニックス","種族":"ダーク・フェニックス","ボス":"1","反撃":"1","難易度":"困難","攻撃":"1","防御":"1","HP":"180","コイン":""},{"monster_id":"M0044","image":"Rampant_Phoenix_Sprite.png","モンスター名":"ダーク・フェニックス","種族":"ダーク・フェニックス","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"1","防御":"1","HP":"240","コイン":""},{"monster_id":"M0044","image":"Rampant_Phoenix_Sprite.png","モンスター名":"ダーク・フェニックス","種族":"ダーク・フェニックス","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"2","防御":"1","HP":"270","コイン":""},{"monster_id":"M0045","image":"Fen_(Lovebird_Conscious)_Sprite.png","モンスター名":"ヒメ（孔雀）","種族":"ヒメ（孔雀）","ボス":"1","反撃":"1","難易度":"普通","攻撃":"4","防御":"3","HP":"55","コイン":""},{"monster_id":"M0045","image":"Fen_(Lovebird_Conscious)_Sprite.png","モンスター名":"ヒメ（孔雀）","種族":"ヒメ（孔雀）","ボス":"1","反撃":"1","難易度":"困難","攻撃":"5","防御":"4","HP":"70","コイン":""},{"monster_id":"M0045","image":"Fen_(Lovebird_Conscious)_Sprite.png","モンスター名":"ヒメ（孔雀）","種族":"ヒメ（孔雀）","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"4","HP":"88","コイン":""},{"monster_id":"M0045","image":"Fen_(Lovebird_Conscious)_Sprite.png","モンスター名":"ヒメ（孔雀）","種族":"ヒメ（孔雀）","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"6","防御":"5","HP":"99","コイン":""},{"monster_id":"M0046","image":"Fen_(Lovebird_Conscious)_Sprite.png","モンスター名":"ヒメ（鷺鷲）","種族":"ヒメ（鷺鷲）","ボス":"1","反撃":"1","難易度":"普通","攻撃":"3","防御":"2","HP":"50","コイン":""},{"monster_id":"M0046","image":"Fen_(Lovebird_Conscious)_Sprite.png","モンスター名":"ヒメ（鷺鷲）","種族":"ヒメ（鷺鷲）","ボス":"1","反撃":"1","難易度":"困難","攻撃":"3","防御":"3","HP":"65","コイン":""},{"monster_id":"M0046","image":"Fen_(Lovebird_Conscious)_Sprite.png","モンスター名":"ヒメ（鷺鷲）","種族":"ヒメ（鷺鷲）","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"4","HP":"80","コイン":""},{"monster_id":"M0046","image":"Fen_(Lovebird_Conscious)_Sprite.png","モンスター名":"ヒメ（鷺鷲）","種族":"ヒメ（鷺鷲）","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"5","防御":"5","HP":"90","コイン":""},{"monster_id":"M0047","image":"Bronze_Lovebird_Chalice_Sprite.png","モンスター名":"オシドリ係","種族":"オシドリの盃","ボス":"","反撃":"1","難易度":"普通","攻撃":"3","防御":"2","HP":"20","コイン":"12"},{"monster_id":"M0047","image":"Bronze_Lovebird_Chalice_Sprite.png","モンスター名":"オシドリ係","種族":"オシドリの盃","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"2","HP":"22","コイン":"12"},{"monster_id":"M0047","image":"Bronze_Lovebird_Chalice_Sprite.png","モンスター名":"オシドリ係","種族":"オシドリの盃","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"3","HP":"26","コイン":"12"},{"monster_id":"M0047","image":"Bronze_Lovebird_Chalice_Sprite.png","モンスター名":"オシドリ係","種族":"オシドリの盃","ボス":"","反撃":"1","難易度":"狂気","攻撃":"5","防御":"3","HP":"28","コイン":"12"},{"monster_id":"M0048","image":"Bronze_Peacock_Chalice_Sprite.png","モンスター名":"クジャク係","種族":"クジャクの盃","ボス":"","反撃":"1","難易度":"普通","攻撃":"5","防御":"2","HP":"40","コイン":"18"},{"monster_id":"M0048","image":"Bronze_Peacock_Chalice_Sprite.png","モンスター名":"クジャク係","種族":"クジャクの盃","ボス":"","反撃":"1","難易度":"困難","攻撃":"5","防御":"3","HP":"45","コイン":"18"},{"monster_id":"M0048","image":"Bronze_Peacock_Chalice_Sprite.png","モンスター名":"クジャク係","種族":"クジャクの盃","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"6","防御":"4","HP":"50","コイン":"18"},{"monster_id":"M0048","image":"Bronze_Peacock_Chalice_Sprite.png","モンスター名":"クジャク係","種族":"クジャクの盃","ボス":"","反撃":"1","難易度":"狂気","攻撃":"7","防御":"4","HP":"55","コイン":"18"},{"monster_id":"M0049","image":"Bronze_Crane_Chalice_Sprite.png","モンスター名":"センズル係","種族":"ツルの盃","ボス":"","反撃":"1","難易度":"普通","攻撃":"4","防御":"2","HP":"20","コイン":"12"},{"monster_id":"M0049","image":"Bronze_Crane_Chalice_Sprite.png","モンスター名":"センズル係","種族":"ツルの盃","ボス":"","反撃":"1","難易度":"困難","攻撃":"5","防御":"2","HP":"22","コイン":"12"},{"monster_id":"M0049","image":"Bronze_Crane_Chalice_Sprite.png","モンスター名":"センズル係","種族":"ツルの盃","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"2","HP":"24","コイン":"12"},{"monster_id":"M0049","image":"Bronze_Crane_Chalice_Sprite.png","モンスター名":"センズル係","種族":"ツルの盃","ボス":"","反撃":"1","難易度":"狂気","攻撃":"6","防御":"3","HP":"26","コイン":"12"},{"monster_id":"M0050","image":"Poultry_Waiter_Sprite.png","モンスター名":"ニワトリ係","種族":"ニワトリ係","ボス":"","反撃":"","難易度":"普通","攻撃":"4","防御":"2","HP":"18","コイン":"10"},{"monster_id":"M0050","image":"Poultry_Waiter_Sprite.png","モンスター名":"ニワトリ係","種族":"ニワトリ係","ボス":"","反撃":"","難易度":"困難","攻撃":"4","防御":"2","HP":"20","コイン":"10"},{"monster_id":"M0050","image":"Poultry_Waiter_Sprite.png","モンスター名":"ニワトリ係","種族":"ニワトリ係","ボス":"","反撃":"","難易度":"悪夢","攻撃":"5","防御":"2","HP":"20","コイン":"10"},{"monster_id":"M0050","image":"Poultry_Waiter_Sprite.png","モンスター名":"ニワトリ係","種族":"ニワトリ係","ボス":"","反撃":"","難易度":"狂気","攻撃":"5","防御":"2","HP":"23","コイン":"10"},{"monster_id":"M0051","image":"Receptionist_Swallow_Sprite.png","モンスター名":"お出迎え係","種族":"お出迎え係","ボス":"","反撃":"","難易度":"普通","攻撃":"3","防御":"1","HP":"10","コイン":"7"},{"monster_id":"M0051","image":"Receptionist_Swallow_Sprite.png","モンスター名":"お出迎え係","種族":"お出迎え係","ボス":"","反撃":"","難易度":"困難","攻撃":"4","防御":"1","HP":"11","コイン":"7"},{"monster_id":"M0051","image":"Receptionist_Swallow_Sprite.png","モンスター名":"お出迎え係","種族":"お出迎え係","ボス":"","反撃":"","難易度":"悪夢","攻撃":"4","防御":"2","HP":"12","コイン":"7"},{"monster_id":"M0051","image":"Receptionist_Swallow_Sprite.png","モンスター名":"お出迎え係","種族":"お出迎え係","ボス":"","反撃":"","難易度":"狂気","攻撃":"5","防御":"2","HP":"13","コイン":"7"},{"monster_id":"M0101","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"普通","攻撃":"2","防御":"1","HP":"88","コイン":""},{"monster_id":"M0101","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"困難","攻撃":"2","防御":"1","HP":"99","コイン":""},{"monster_id":"M0101","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"3","防御":"2","HP":"110","コイン":""},{"monster_id":"M0101","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"狂気","攻撃":"4","防御":"2","HP":"120","コイン":""},{"monster_id":"M0102","image":"Tennoji_Masao_Academy_Sprite.png","モンスター名":"学院長代理","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"普通","攻撃":"2","防御":"2","HP":"99","コイン":""},{"monster_id":"M0102","image":"Tennoji_Masao_Academy_Sprite.png","モンスター名":"学院長代理","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"困難","攻撃":"3","防御":"2","HP":"111","コイン":""},{"monster_id":"M0102","image":"Tennoji_Masao_Academy_Sprite.png","モンスター名":"学院長代理","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"3","防御":"2","HP":"130","コイン":""},{"monster_id":"M0102","image":"Tennoji_Masao_Academy_Sprite.png","モンスター名":"学院長代理","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"狂気","攻撃":"4","防御":"2","HP":"130","コイン":""},{"monster_id":"M0103","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"普通","攻撃":"2","防御":"1","HP":"30","コイン":"18"},{"monster_id":"M0103","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"困難","攻撃":"2","防御":"1","HP":"35","コイン":"18"},{"monster_id":"M0103","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"3","防御":"2","HP":"40","コイン":"18"},{"monster_id":"M0103","image":"Tennoji_Masao_Academy_Security_Sprite.png","モンスター名":"学院警備官","種族":"天王寺雅央","ボス":"","反撃":"1","難易度":"狂気","攻撃":"4","防御":"2","HP":"45","コイン":"18"},{"monster_id":"M0104","image":"Referee_Amy_Sprite.png","モンスター名":"審判長エイミー","種族":"審判長エイミー","ボス":"","反撃":"1","難易度":"普通","攻撃":"5","防御":"1","HP":"24","コイン":"14"},{"monster_id":"M0104","image":"Referee_Amy_Sprite.png","モンスター名":"審判長エイミー","種族":"審判長エイミー","ボス":"","反撃":"1","難易度":"困難","攻撃":"5","防御":"1","HP":"27","コイン":"14"},{"monster_id":"M0104","image":"Referee_Amy_Sprite.png","モンスター名":"審判長エイミー","種族":"審判長エイミー","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"6","防御":"1","HP":"30","コイン":"14"},{"monster_id":"M0104","image":"Referee_Amy_Sprite.png","モンスター名":"審判長エイミー","種族":"審判長エイミー","ボス":"","反撃":"1","難易度":"狂気","攻撃":"6","防御":"2","HP":"33","コイン":"14"},{"monster_id":"M0105","image":"Treasure_Barrel_Sprite.png","モンスター名":"トレジャーダル","種族":"トレジャーダル","ボス":"","反撃":"","難易度":"普通","攻撃":"0","防御":"0","HP":"4","コイン":"10"},{"monster_id":"M0105","image":"Treasure_Barrel_Sprite.png","モンスター名":"トレジャーダル","種族":"トレジャーダル","ボス":"","反撃":"","難易度":"困難","攻撃":"0","防御":"0","HP":"4","コイン":"10"},{"monster_id":"M0105","image":"Treasure_Barrel_Sprite.png","モンスター名":"トレジャーダル","種族":"トレジャーダル","ボス":"","反撃":"","難易度":"悪夢","攻撃":"0","防御":"0","HP":"4","コイン":"10"},{"monster_id":"M0105","image":"Treasure_Barrel_Sprite.png","モンスター名":"トレジャーダル","種族":"トレジャーダル","ボス":"","反撃":"","難易度":"狂気","攻撃":"0","防御":"0","HP":"4","コイン":"10"},{"monster_id":"M0106","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓","種族":"天川真夢梓","ボス":"1","反撃":"1","難易度":"普通","攻撃":"4","防御":"1","HP":"88","コイン":""},{"monster_id":"M0106","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓","種族":"天川真夢梓","ボス":"1","反撃":"1","難易度":"困難","攻撃":"4","防御":"1","HP":"99","コイン":""},{"monster_id":"M0106","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓","種族":"天川真夢梓","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"2","HP":"111","コイン":""},{"monster_id":"M0106","image":"Amakawa_Mamushi_Sprite.png","モンスター名":"天川真夢梓","種族":"天川真夢梓","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"6","防御":"2","HP":"126","コイン":""},{"monster_id":"M0107","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"普通","攻撃":"1","防御":"1","HP":"80","コイン":""},{"monster_id":"M0107","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"困難","攻撃":"1","防御":"1","HP":"90","コイン":""},{"monster_id":"M0107","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"2","防御":"2","HP":"100","コイン":""},{"monster_id":"M0107","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"3","防御":"3","HP":"111","コイン":""},{"monster_id":"M0108","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"普通","攻撃":"1","防御":"1","HP":"30","コイン":"18"},{"monster_id":"M0108","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"困難","攻撃":"1","防御":"1","HP":"35","コイン":"18"},{"monster_id":"M0108","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"2","防御":"2","HP":"40","コイン":"18"},{"monster_id":"M0108","image":"Amakawa_Souri_Sprite.png","モンスター名":"天川蒼鯉","種族":"天川蒼鯉","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"3","防御":"3","HP":"45","コイン":"18"},{"monster_id":"M0109","image":"High-Tech_Tycoon_Gawu_Sprite.png","モンスター名":"デックジャイアント ガオー","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"普通","攻撃":"3","防御":"1","HP":"128","コイン":""},{"monster_id":"M0109","image":"High-Tech_Tycoon_Gawu_Sprite.png","モンスター名":"デックジャイアント ガオー","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"困難","攻撃":"3","防御":"1","HP":"138","コイン":""},{"monster_id":"M0109","image":"High-Tech_Tycoon_Gawu_Sprite.png","モンスター名":"デックジャイアント ガオー","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"1","HP":"148","コイン":""},{"monster_id":"M0109","image":"High-Tech_Tycoon_Gawu_Sprite.png","モンスター名":"デックジャイアント ガオー","種族":"天王寺雅央","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"4","防御":"1","HP":"158","コイン":""},{"monster_id":"M0110","image":"Mindscape_Airship_Sprite.png","モンスター名":"マインドエアシップ","種族":"マインドエアシップ","ボス":"","反撃":"1","難易度":"普通","攻撃":"4","防御":"2","HP":"15","コイン":"14"},{"monster_id":"M0110","image":"Mindscape_Airship_Sprite.png","モンスター名":"マインドエアシップ","種族":"マインドエアシップ","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"2","HP":"17","コイン":"14"},{"monster_id":"M0110","image":"Mindscape_Airship_Sprite.png","モンスター名":"マインドエアシップ","種族":"マインドエアシップ","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"2","HP":"18","コイン":"14"},{"monster_id":"M0110","image":"Mindscape_Airship_Sprite.png","モンスター名":"マインドエアシップ","種族":"マインドエアシップ","ボス":"","反撃":"1","難易度":"狂気","攻撃":"5","防御":"2","HP":"20","コイン":"14"},{"monster_id":"M0111","image":"Mechanical_Monitor_Sprite.png","モンスター名":"メカ監視員","種族":"メカ監視員","ボス":"","反撃":"","難易度":"普通","攻撃":"2","防御":"2","HP":"14","コイン":"9"},{"monster_id":"M0111","image":"Mechanical_Monitor_Sprite.png","モンスター名":"メカ監視員","種族":"メカ監視員","ボス":"","反撃":"","難易度":"困難","攻撃":"3","防御":"2","HP":"16","コイン":"9"},{"monster_id":"M0111","image":"Mechanical_Monitor_Sprite.png","モンスター名":"メカ監視員","種族":"メカ監視員","ボス":"","反撃":"","難易度":"悪夢","攻撃":"3","防御":"3","HP":"18","コイン":"9"},{"monster_id":"M0111","image":"Mechanical_Monitor_Sprite.png","モンスター名":"メカ監視員","種族":"メカ監視員","ボス":"","反撃":"","難易度":"狂気","攻撃":"4","防御":"3","HP":"20","コイン":"9"},{"monster_id":"M0112","image":"Mechanical_Quarterback_Sprite.png","モンスター名":"メカウォーターバック","種族":"メカウォーターバック","ボス":"","反撃":"1","難易度":"普通","攻撃":"5","防御":"1","HP":"18","コイン":"12"},{"monster_id":"M0112","image":"Mechanical_Quarterback_Sprite.png","モンスター名":"メカウォーターバック","種族":"メカウォーターバック","ボス":"","反撃":"1","難易度":"困難","攻撃":"5","防御":"1","HP":"20","コイン":"12"},{"monster_id":"M0112","image":"Mechanical_Quarterback_Sprite.png","モンスター名":"メカウォーターバック","種族":"メカウォーターバック","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"2","HP":"22","コイン":"12"},{"monster_id":"M0112","image":"Mechanical_Quarterback_Sprite.png","モンスター名":"メカウォーターバック","種族":"メカウォーターバック","ボス":"","反撃":"1","難易度":"狂気","攻撃":"6","防御":"2","HP":"24","コイン":"12"},{"monster_id":"M0113","image":"Mechanical_Javelin_Thrower_Sprite.png","モンスター名":"メカピッチャー","種族":"メカピッチャー","ボス":"","反撃":"","難易度":"普通","攻撃":"3","防御":"0","HP":"8","コイン":"7"},{"monster_id":"M0113","image":"Mechanical_Javelin_Thrower_Sprite.png","モンスター名":"メカピッチャー","種族":"メカピッチャー","ボス":"","反撃":"","難易度":"困難","攻撃":"4","防御":"0","HP":"9","コイン":"7"},{"monster_id":"M0113","image":"Mechanical_Javelin_Thrower_Sprite.png","モンスター名":"メカピッチャー","種族":"メカピッチャー","ボス":"","反撃":"","難易度":"悪夢","攻撃":"4","防御":"1","HP":"10","コイン":"7"},{"monster_id":"M0113","image":"Mechanical_Javelin_Thrower_Sprite.png","モンスター名":"メカピッチャー","種族":"メカピッチャー","ボス":"","反撃":"","難易度":"狂気","攻撃":"4","防御":"1","HP":"11","コイン":"7"},{"monster_id":"M0114","image":"Shark_Pirate_Sprite.png","モンスター名":"メカ海賊サメ","種族":"メカ海賊サメ","ボス":"","反撃":"1","難易度":"普通","攻撃":"4","防御":"1","HP":"10","コイン":"7"},{"monster_id":"M0114","image":"Shark_Pirate_Sprite.png","モンスター名":"メカ海賊サメ","種族":"メカ海賊サメ","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"1","HP":"11","コイン":"7"},{"monster_id":"M0114","image":"Shark_Pirate_Sprite.png","モンスター名":"メカ海賊サメ","種族":"メカ海賊サメ","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"1","HP":"11","コイン":"7"},{"monster_id":"M0114","image":"Shark_Pirate_Sprite.png","モンスター名":"メカ海賊サメ","種族":"メカ海賊サメ","ボス":"","反撃":"1","難易度":"狂気","攻撃":"4","防御":"1","HP":"11","コイン":"7"},{"monster_id":"M0115","image":"Warden_Sprite.png","モンスター名":"ゴクチョー【真相】","種族":"ゴクチョー","ボス":"1","反撃":"1","難易度":"普通","攻撃":"3","防御":"10","HP":"229","コイン":""},{"monster_id":"M0115","image":"Warden_Sprite.png","モンスター名":"ゴクチョー【真相】","種族":"ゴクチョー","ボス":"1","反撃":"1","難易度":"困難","攻撃":"3","防御":"10","HP":"230","コイン":""},{"monster_id":"M0115","image":"Warden_Sprite.png","モンスター名":"ゴクチョー【真相】","種族":"ゴクチョー","ボス":"1","反撃":"1","難易度":"悪夢","攻撃":"4","防御":"10","HP":"231","コイン":""},{"monster_id":"M0115","image":"Warden_Sprite.png","モンスター名":"ゴクチョー【真相】","種族":"ゴクチョー","ボス":"1","反撃":"1","難易度":"狂気","攻撃":"4","防御":"11","HP":"231","コイン":""},{"monster_id":"M0116","image":"Warden_Sprite.png","モンスター名":"ゴクチョー","種族":"ゴクチョー","ボス":"","反撃":"1","難易度":"普通","攻撃":"0","防御":"0","HP":"9","コイン":"6"},{"monster_id":"M0116","image":"Warden_Sprite.png","モンスター名":"ゴクチョー","種族":"ゴクチョー","ボス":"","反撃":"1","難易度":"困難","攻撃":"0","防御":"0","HP":"10","コイン":"6"},{"monster_id":"M0116","image":"Warden_Sprite.png","モンスター名":"ゴクチョー","種族":"ゴクチョー","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"1","防御":"0","HP":"11","コイン":"6"},{"monster_id":"M0116","image":"Warden_Sprite.png","モンスター名":"ゴクチョー","種族":"ゴクチョー","ボス":"","反撃":"1","難易度":"狂気","攻撃":"1","防御":"1","HP":"11","コイン":"6"},{"monster_id":"M0117","image":"Watcher_Sprite.png","モンスター名":"看守","種族":"看守","ボス":"","反撃":"1","難易度":"普通","攻撃":"4","防御":"1","HP":"17","コイン":"12"},{"monster_id":"M0117","image":"Watcher_Sprite.png","モンスター名":"看守","種族":"看守","ボス":"","反撃":"1","難易度":"困難","攻撃":"4","防御":"1","HP":"20","コイン":"12"},{"monster_id":"M0117","image":"Watcher_Sprite.png","モンスター名":"看守","種族":"看守","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"2","HP":"20","コイン":"12"},{"monster_id":"M0117","image":"Watcher_Sprite.png","モンスター名":"看守","種族":"看守","ボス":"","反撃":"1","難易度":"狂気","攻撃":"5","防御":"2","HP":"23","コイン":"12"},{"monster_id":"M0118","image":"Sinful_Teapot_Sprite.png","モンスター名":"グリーティーポット","種族":"グリーティーポット","ボス":"","反撃":"1","難易度":"普通","攻撃":"2","防御":"0","HP":"14","コイン":"9"},{"monster_id":"M0118","image":"Sinful_Teapot_Sprite.png","モンスター名":"グリーティーポット","種族":"グリーティーポット","ボス":"","反撃":"1","難易度":"困難","攻撃":"3","防御":"0","HP":"14","コイン":"9"},{"monster_id":"M0118","image":"Sinful_Teapot_Sprite.png","モンスター名":"グリーティーポット","種族":"グリーティーポット","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"3","防御":"1","HP":"16","コイン":"9"},{"monster_id":"M0118","image":"Sinful_Teapot_Sprite.png","モンスター名":"グリーティーポット","種族":"グリーティーポット","ボス":"","反撃":"1","難易度":"狂気","攻撃":"3","防御":"1","HP":"18","コイン":"9"},{"monster_id":"M0119","image":"Legendary_Thief_Sprite.png","モンスター名":"大怪盗","種族":"大怪盗","ボス":"","反撃":"1","難易度":"普通","攻撃":"4","防御":"0","HP":"13","コイン":"6"},{"monster_id":"M0119","image":"Legendary_Thief_Sprite.png","モンスター名":"大怪盗","種族":"大怪盗","ボス":"","反撃":"1","難易度":"困難","攻撃":"5","防御":"0","HP":"14","コイン":"6"},{"monster_id":"M0119","image":"Legendary_Thief_Sprite.png","モンスター名":"大怪盗","種族":"大怪盗","ボス":"","反撃":"1","難易度":"悪夢","攻撃":"5","防御":"0","HP":"16","コイン":"6"},{"monster_id":"M0119","image":"Legendary_Thief_Sprite.png","モンスター名":"大怪盗","種族":"大怪盗","ボス":"","反撃":"1","難易度":"狂気","攻撃":"5","防御":"1","HP":"16","コイン":"6"}],"events":[{"map_id":"MAP0001","ID":"E000111","難易度":"普通","進捗":"1","内容":"海賊サメ４体出現"},{"map_id":"MAP0001","ID":"E000112","難易度":"普通","進捗":"3","内容":"ガオー出現"},{"map_id":"MAP0001","ID":"E000113","難易度":"普通","進捗":"6","内容":"ガオー起動"},{"map_id":"MAP0001","ID":"E000114","難易度":"普通","進捗":"11","内容":"海賊精鋭２体出現"},{"map_id":"MAP0001","ID":"E000115","難易度":"普通","進捗":"20","内容":"ゲームオーバー"},{"map_id":"MAP0001","ID":"E000121","難易度":"困難","進捗":"1","内容":"海賊サメ４体出現"},{"map_id":"MAP0001","ID":"E000122","難易度":"困難","進捗":"3","内容":"ガオー出現"},{"map_id":"MAP0001","ID":"E000123","難易度":"困難","進捗":"6","内容":"ガオー起動"},{"map_id":"MAP0001","ID":"E000124","難易度":"困難","進捗":"11","内容":"海賊精鋭２体出現"},{"map_id":"MAP0001","ID":"E000125","難易度":"困難","進捗":"11","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0001","ID":"E000126","難易度":"困難","進捗":"20","内容":"ゲームオーバー"},{"map_id":"MAP0001","ID":"E000131","難易度":"悪夢","進捗":"1","内容":"海賊サメ４体出現"},{"map_id":"MAP0001","ID":"E000132","難易度":"悪夢","進捗":"3","内容":"ガオー出現"},{"map_id":"MAP0001","ID":"E000133","難易度":"悪夢","進捗":"5","内容":"ガオー起動"},{"map_id":"MAP0001","ID":"E000134","難易度":"悪夢","進捗":"5","内容":"全モンスターにA+1"},{"map_id":"MAP0001","ID":"E000135","難易度":"悪夢","進捗":"9","内容":"海賊精鋭２体出現"},{"map_id":"MAP0001","ID":"E000136","難易度":"悪夢","進捗":"9","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0001","ID":"E000137","難易度":"悪夢","進捗":"13","内容":"海賊サメ４体出現"},{"map_id":"MAP0001","ID":"E000138","難易度":"悪夢","進捗":"13","内容":"全モンスターにD+1"},{"map_id":"MAP0001","ID":"E000139","難易度":"悪夢","進捗":"18","内容":"ゲームオーバー"},{"map_id":"MAP0001","ID":"E000141","難易度":"狂気","進捗":"1","内容":"海賊サメ４体出現"},{"map_id":"MAP0001","ID":"E000142","難易度":"狂気","進捗":"3","内容":"ガオー出現"},{"map_id":"MAP0001","ID":"E000143","難易度":"狂気","進捗":"5","内容":"ガオー起動"},{"map_id":"MAP0001","ID":"E000144","難易度":"狂気","進捗":"5","内容":"全モンスターにA+1"},{"map_id":"MAP0001","ID":"E000145","難易度":"狂気","進捗":"9","内容":"海賊精鋭２体出現"},{"map_id":"MAP0001","ID":"E000146","難易度":"狂気","進捗":"9","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0001","ID":"E000147","難易度":"狂気","進捗":"12","内容":"海賊サメ４体、サメタラシ出現"},{"map_id":"MAP0001","ID":"E000148","難易度":"狂気","進捗":"12","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0001","ID":"E000149","難易度":"狂気","進捗":"18","内容":"ゲームオーバー"},{"map_id":"MAP0001","ID":"E000151","難易度":"極限","進捗":"1","内容":"海賊サメ４体出現"},{"map_id":"MAP0001","ID":"E000152","難易度":"極限","進捗":"3","内容":"ガオー出現"},{"map_id":"MAP0001","ID":"E000153","難易度":"極限","進捗":"5","内容":"ガオー起動"},{"map_id":"MAP0001","ID":"E000154","難易度":"極限","進捗":"5","内容":"全モンスターにA+1"},{"map_id":"MAP0001","ID":"E000155","難易度":"極限","進捗":"9","内容":"海賊精鋭２体出現"},{"map_id":"MAP0001","ID":"E000156","難易度":"極限","進捗":"9","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0001","ID":"E000157","難易度":"極限","進捗":"12","内容":"海賊サメ４体、サメタラシ出現"},{"map_id":"MAP0001","ID":"E000158","難易度":"極限","進捗":"12","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0001","ID":"E000159","難易度":"極限","進捗":"18","内容":"ゲームオーバー"},{"map_id":"MAP0104","ID":"E010411","難易度":"普通","進捗":"1","内容":"ゴクチョー、看守、ティーポット3体出現"},{"map_id":"MAP0104","ID":"E010412","難易度":"普通","進捗":"4","内容":"グリーンティーポット3体、大怪盗登場"},{"map_id":"MAP0104","ID":"E010413","難易度":"普通","進捗":"4","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0104","ID":"E010414","難易度":"普通","進捗":"7","内容":"看守、大怪盗、ウィザード2体出現"},{"map_id":"MAP0104","ID":"E010415","難易度":"普通","進捗":"10","内容":"看守、ウィザード2体出現"},{"map_id":"MAP0104","ID":"E010416","難易度":"普通","進捗":"10","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0104","ID":"E010417","難易度":"普通","進捗":"18","内容":"ゲームオーバー"},{"map_id":"MAP0104","ID":"E010421","難易度":"困難","進捗":"1","内容":"ゴクチョー、看守、ティーポット3体出現"},{"map_id":"MAP0104","ID":"E010422","難易度":"困難","進捗":"4","内容":"グリーンティーポット3体、大怪盗登場"},{"map_id":"MAP0104","ID":"E010423","難易度":"困難","進捗":"4","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0104","ID":"E010424","難易度":"困難","進捗":"7","内容":"看守、大怪盗、ウィザード2体出現"},{"map_id":"MAP0104","ID":"E010425","難易度":"困難","進捗":"10","内容":"看守、ウィザード2体出現"},{"map_id":"MAP0104","ID":"E010426","難易度":"困難","進捗":"10","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0104","ID":"E010427","難易度":"困難","進捗":"18","内容":"ゲームオーバー"},{"map_id":"MAP0104","ID":"E010431","難易度":"悪夢","進捗":"1","内容":"ゴクチョー、看守、ティーポット3体出現"},{"map_id":"MAP0104","ID":"E010432","難易度":"悪夢","進捗":"4","内容":"グリーンティーポット3体、大怪盗登場"},{"map_id":"MAP0104","ID":"E010433","難易度":"悪夢","進捗":"4","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0104","ID":"E010434","難易度":"悪夢","進捗":"7","内容":"看守、大怪盗、ウィザード2体出現"},{"map_id":"MAP0104","ID":"E010435","難易度":"悪夢","進捗":"10","内容":"看守、ウィザード2体出現"},{"map_id":"MAP0104","ID":"E010436","難易度":"悪夢","進捗":"10","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0104","ID":"E010437","難易度":"悪夢","進捗":"17","内容":"ゲームオーバー"},{"map_id":"MAP0104","ID":"E010441","難易度":"狂気","進捗":"1","内容":"ゴクチョー、看守、ティーポット3体出現"},{"map_id":"MAP0104","ID":"E010442","難易度":"狂気","進捗":"4","内容":"グリーンティーポット3体、大怪盗登場"},{"map_id":"MAP0104","ID":"E010443","難易度":"狂気","進捗":"4","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0104","ID":"E010444","難易度":"狂気","進捗":"7","内容":"看守、大怪盗、ウィザード2体出現"},{"map_id":"MAP0104","ID":"E010445","難易度":"狂気","進捗":"10","内容":"看守、ウィザード2体出現"},{"map_id":"MAP0104","ID":"E010446","難易度":"狂気","進捗":"10","内容":"全モンスターにA+1/D+1"},{"map_id":"MAP0104","ID":"E010447","難易度":"狂気","進捗":"17","内容":"ゲームオーバー"}],"relations":[{"map_id":"MAP0001","monster_id":"M0001"},{"map_id":"MAP0001","monster_id":"M0002"},{"map_id":"MAP0001","monster_id":"M0003"},{"map_id":"MAP0001","monster_id":"M0004"},{"map_id":"MAP0001","monster_id":"M0005"},{"map_id":"MAP0002","monster_id":"M0006"},{"map_id":"MAP0002","monster_id":"M0007"},{"map_id":"MAP0002","monster_id":"M0008"},{"map_id":"MAP0002","monster_id":"M0009"},{"map_id":"MAP0002","monster_id":"M0010"},{"map_id":"MAP0002","monster_id":"M0011"},{"map_id":"MAP0002","monster_id":"M0012"},{"map_id":"MAP0002","monster_id":"M0005"},{"map_id":"MAP0003","monster_id":"M0013"},{"map_id":"MAP0003","monster_id":"M0014"},{"map_id":"MAP0003","monster_id":"M0015"},{"map_id":"MAP0003","monster_id":"M0016"},{"map_id":"MAP0003","monster_id":"M0017"},{"map_id":"MAP0003","monster_id":"M0018"},{"map_id":"MAP0003","monster_id":"M0019"},{"map_id":"MAP0004","monster_id":"M0020"},{"map_id":"MAP0004","monster_id":"M0021"},{"map_id":"MAP0004","monster_id":"M0022"},{"map_id":"MAP0004","monster_id":"M0023"},{"map_id":"MAP0004","monster_id":"M0024"},{"map_id":"MAP0004","monster_id":"M0025"},{"map_id":"MAP0004","monster_id":"M0026"},{"map_id":"MAP0004","monster_id":"M0005"},{"map_id":"MAP0005","monster_id":"M0027"},{"map_id":"MAP0005","monster_id":"M0028"},{"map_id":"MAP0005","monster_id":"M0029"},{"map_id":"MAP0005","monster_id":"M0030"},{"map_id":"MAP0005","monster_id":"M0031"},{"map_id":"MAP0005","monster_id":"M0032"},{"map_id":"MAP0005","monster_id":"M0033"},{"map_id":"MAP0005","monster_id":"M0034"},{"map_id":"MAP0005","monster_id":"M0035"},{"map_id":"MAP0005","monster_id":"M0004"},{"map_id":"MAP0005","monster_id":"M0005"},{"map_id":"MAP0006","monster_id":"M0036"},{"map_id":"MAP0006","monster_id":"M0037"},{"map_id":"MAP0006","monster_id":"M0038"},{"map_id":"MAP0006","monster_id":"M0039"},{"map_id":"MAP0006","monster_id":"M0040"},{"map_id":"MAP0006","monster_id":"M0041"},{"map_id":"MAP0006","monster_id":"M0042"},{"map_id":"MAP0006","monster_id":"M0043"},{"map_id":"MAP0006","monster_id":"M0005"},{"map_id":"MAP0007","monster_id":"M0044"},{"map_id":"MAP0007","monster_id":"M0045"},{"map_id":"MAP0007","monster_id":"M0046"},{"map_id":"MAP0007","monster_id":"M0047"},{"map_id":"MAP0007","monster_id":"M0048"},{"map_id":"MAP0007","monster_id":"M0049"},{"map_id":"MAP0007","monster_id":"M0050"},{"map_id":"MAP0007","monster_id":"M0051"},{"map_id":"MAP0007","monster_id":"M0017"},{"map_id":"MAP0101","monster_id":"M0101"},{"map_id":"MAP0101","monster_id":"M0102"},{"map_id":"MAP0101","monster_id":"M0103"},{"map_id":"MAP0101","monster_id":"M0104"},{"map_id":"MAP0101","monster_id":"M0040"},{"map_id":"MAP0101","monster_id":"M0022"},{"map_id":"MAP0101","monster_id":"M0023"},{"map_id":"MAP0101","monster_id":"M0024"},{"map_id":"MAP0101","monster_id":"M0025"},{"map_id":"MAP0101","monster_id":"M0026"},{"map_id":"MAP0101","monster_id":"M0105"},{"map_id":"MAP0101","monster_id":"M0005"},{"map_id":"MAP0102","monster_id":"M0106"},{"map_id":"MAP0102","monster_id":"M0107"},{"map_id":"MAP0102","monster_id":"M0108"},{"map_id":"MAP0102","monster_id":"M0104"},{"map_id":"MAP0102","monster_id":"M0029"},{"map_id":"MAP0102","monster_id":"M0030"},{"map_id":"MAP0102","monster_id":"M0031"},{"map_id":"MAP0102","monster_id":"M0032"},{"map_id":"MAP0102","monster_id":"M0033"},{"map_id":"MAP0102","monster_id":"M0002"},{"map_id":"MAP0102","monster_id":"M0004"},{"map_id":"MAP0102","monster_id":"M0105"},{"map_id":"MAP0102","monster_id":"M0005"},{"map_id":"MAP0103","monster_id":"M0109"},{"map_id":"MAP0103","monster_id":"M0110"},{"map_id":"MAP0103","monster_id":"M0104"},{"map_id":"MAP0103","monster_id":"M0111"},{"map_id":"MAP0103","monster_id":"M0112"},{"map_id":"MAP0103","monster_id":"M0113"},{"map_id":"MAP0103","monster_id":"M0114"},{"map_id":"MAP0103","monster_id":"M0105"},{"map_id":"MAP0103","monster_id":"M0005"},{"map_id":"MAP0104","monster_id":"M0115"},{"map_id":"MAP0104","monster_id":"M0116"},{"map_id":"MAP0104","monster_id":"M0117"},{"map_id":"MAP0104","monster_id":"M0118"},{"map_id":"MAP0104","monster_id":"M0024"},{"map_id":"MAP0104","monster_id":"M0025"},{"map_id":"MAP0104","monster_id":"M0026"},{"map_id":"MAP0104","monster_id":"M0005"}],"gimmicks":[{"map_id":"MAP0104","gimmick_id":"clue","表示名":"手がかり","monster_id":"M0115","難易度":"","攻撃":"0","防御":"-2","HP":"-20","最大回数":""},{"map_id":"MAP0104","gimmick_id":"warden_defeated","表示名":"ゴクチョー撃破","monster_id":"M0116","難易度":"","攻撃":"1","防御":"0","HP":"0","最大回数":""},{"map_id":"MAP0001","gimmick_id":"elite_defeated","表示名":"海賊精鋭2体撃破","monster_id":"M0001","難易度":"","攻撃":"0","防御":"-6","HP":"0","最大回数":"1"}]};

(()=>{
const root=document.getElementById('map-draft'),data=normalizeMapData(INITIAL_MAP_DATA),pick=document.getElementById('mp-map-select'),difficulty=document.getElementById('mp-difficulty'),list=document.getElementById('mp-monster-list'),status=document.getElementById('mp-action-status');

function populateMaps(){const previous=pick.value;pick.replaceChildren();Object.entries(data.maps).forEach(([id,map])=>{const option=document.createElement('option');option.value=id;option.textContent=map.name;pick.append(option);});if(data.maps[previous])pick.value=previous;pick.disabled=!Object.keys(data.maps).length;}populateMaps();
let selected=null;const buff={attack:0,defense:0};
const gimmickCounts=new Map();
const gimmickArea=document.createElement('div');gimmickArea.className='mp-gimmicks';gimmickArea.setAttribute('aria-label','マップ固有ギミック');
function mapGimmicks(){return (data.gimmicks||[]).filter(r=>r.map_id===pick.value);}
function gimmickKey(row){return row.map_id+':'+row.gimmick_id;}
function gimmickMaximum(row){const raw=row['最大回数'];if(raw===undefined||String(raw).trim()==='')return Infinity;const number=Number(raw);return Number.isFinite(number)?Math.max(0,Math.floor(number)):Infinity;}
function gimmickCount(row){return Math.min(gimmickMaximum(row),gimmickCounts.get(gimmickKey(row))??0);}
function effectiveStat(stats,key){
 if(!stats||stats[key]===''||stats[key]===undefined)return null;
 let value=Number(stats[key])+(key==='攻撃'?buff.attack:key==='防御'?buff.defense:0);

 mapGimmicks().filter(r=>r.monster_id===stats.monster_id&&(!r['難易度']||r['難易度']===difficulty.value)).forEach(r=>{
  value+=Number(r[key]||0)*gimmickCount(r);

 });
 return value;
}
function renderGimmicks(){
 const focused=document.activeElement?.dataset?.gimmick;gimmickArea.replaceChildren();
 const unique=new Map();mapGimmicks().forEach(r=>{if(!unique.has(r.gimmick_id))unique.set(r.gimmick_id,r);});
 unique.forEach(row=>{
  const button=document.createElement('button');button.type='button';button.dataset.gimmick=row.gimmick_id;const max=gimmickMaximum(row);const count=gimmickCount(row);button.textContent=row['表示名']+(max===1?'':' '+count);button.classList.toggle('mp-gimmick-complete',count>=max);button.setAttribute('aria-pressed',String(count>0));button.setAttribute('aria-label',row['表示名']+' '+gimmickCount(row)+'、左クリックで増加、右クリックで減少');
  button.title='左クリック：＋1 ／ 右クリック：−1';
  const change=delta=>{const current=gimmickCount(row),maximum=gimmickMaximum(row);gimmickCounts.set(gimmickKey(row),Math.max(0,Math.min(maximum,current+delta)));render();};
  button.addEventListener('click',()=>change(1));button.addEventListener('contextmenu',event=>{event.preventDefault();change(-1);});button.addEventListener('keydown',event=>{if(event.shiftKey&&event.key==='Enter'){event.preventDefault();change(-1);}});
  gimmickArea.append(button);if(focused===row.gimmick_id)button.focus();
 });
 gimmickArea.hidden=unique.size===0;
}

// Roster buffs and gimmicks are independent of the source list.
const rosterBuff={attack:0,defense:0},rosterCounts=new Map();
function rosterStat(stats,key){
 if(!stats||stats[key]===''||stats[key]===undefined)return null;
 let value=Number(stats[key])+(key==='攻撃'?rosterBuff.attack:key==='防御'?rosterBuff.defense:0);
 mapGimmicks().filter(r=>r.monster_id===stats.monster_id&&(!r['難易度']||r['難易度']===difficulty.value)).forEach(r=>{value+=Number(r[key]||0)*Math.min(gimmickMaximum(r),rosterCounts.get(gimmickKey(r))||0);});return value;
}
const missionCounters=new Map();
const placedMonsters=[];let nextPlacedId=1,selectedPlacedId=null;
const roster=document.getElementById('map-roster-list'),rosterEmpty=document.getElementById('map-roster-empty'),rosterNotice=document.createElement('span');
// Undo snapshots last for this page session, until 全削除.
const rosterHistory=[];
let rosterContext={map:pick.value,difficulty:difficulty.value};
function rememberRoster(){rosterHistory.push(structuredClone({monsters:placedMonsters,buff:rosterBuff,counts:[...rosterCounts],selected:selectedPlacedId,next:nextPlacedId,context:rosterContext,missions:[...missionCounters]}));}
document.getElementById('roster-undo').addEventListener('click',()=>{
 const previous=rosterHistory.pop();if(!previous)return;if(!data.maps[previous.context.map]){rosterHistory.length=0;renderRoster();return;}
 missionCounters.clear();(previous.missions||[]).forEach(([k,v])=>missionCounters.set(k,v));placedMonsters.splice(0,placedMonsters.length,...previous.monsters);Object.assign(rosterBuff,previous.buff);rosterCounts.clear();previous.counts.forEach(([k,v])=>rosterCounts.set(k,v));selectedPlacedId=previous.selected;nextPlacedId=previous.next;pick.value=previous.context.map;difficulty.value=previous.context.difficulty;rosterContext=previous.context;selected=null;render();
});
document.getElementById('roster-clear').addEventListener('click',()=>{clearRoster();rosterHistory.length=0;nextPlacedId=1;renderRoster();});
function registerEnemy(enemy, switchTab=true){
 document.getElementById('defensePower1').value=enemy.defense;
 document.getElementById('hp1').value=enemy.hp;
 document.getElementById('attackPower2').value=enemy.attack;
 calculateDamage(document.querySelector('[data-role="attack"].mode-content'),false);
 calculateDamage(document.querySelector('[data-role="defense"].mode-content'),true);
 // Clicking a roster monster always opens the attack calculator.
 if(switchTab)document.querySelector('.role-tab[data-role="attack"]').click();
}
function clearRoster(){placedMonsters.length=0;selectedPlacedId=null;rosterBuff.attack=0;rosterBuff.defense=0;rosterCounts.clear();rosterNotice.textContent='';}
function updateEnemy(enemy){if(enemy.defeated)return;enemy.attack=rosterStat(enemy.base,'攻撃');enemy.defense=rosterStat(enemy.base,'防御');enemy.hp=rosterStat(enemy.base,'HP')-enemy.damageTaken;}
function removeEnemy(enemy){if(enemy.defeated)return;decrementMonsterMissions(data.missions,missionCounters,enemy.mapId,enemy.monsterId);enemy.defeated=true;enemy.hp=0;if(selectedPlacedId===enemy.instanceId)selectedPlacedId=null;}
const rosterGimmicks=document.getElementById('roster-gimmicks');
document.querySelectorAll('[data-roster-buff]').forEach(button=>button.addEventListener('click',()=>{rememberRoster();const kind=button.dataset.rosterBuff;if(kind==='attack'||kind==='both')rosterBuff.attack++;if(kind==='defense'||kind==='both')rosterBuff.defense++;renderRoster();}));
document.getElementById('roster-reset').addEventListener('click',()=>{if(!rosterBuff.attack&&!rosterBuff.defense&&![...rosterCounts.values()].some(Boolean))return;rememberRoster();rosterBuff.attack=0;rosterBuff.defense=0;rosterCounts.clear();renderRoster();rosterNotice.textContent='下の一覧のバフ・固有ギミックをリセットしました。';});
function renderRoster(){
 rosterContext={map:pick.value,difficulty:difficulty.value};document.getElementById('roster-undo').disabled=rosterHistory.length===0;
 const focused=document.activeElement?.closest('#roster-gimmicks')?document.activeElement.dataset.gimmick:null;
 rosterGimmicks.replaceChildren();
 const unique=new Map();mapGimmicks().forEach(row=>{if(!unique.has(row.gimmick_id))unique.set(row.gimmick_id,row);});
 unique.forEach(row=>{
 const button=document.createElement('button');button.type='button';button.dataset.gimmick=row.gimmick_id;const maximum=gimmickMaximum(row),count=Math.min(maximum,rosterCounts.get(gimmickKey(row))||0);button.textContent=row['表示名']+(maximum===1?'':' '+count);button.classList.toggle('mp-gimmick-complete',count>=maximum);button.setAttribute('aria-pressed',String(count>0));button.title='左クリック：＋1 ／ 右クリック：−1';
 const change=delta=>{const next=Math.max(0,Math.min(maximum,count+delta));if(next===count)return;rememberRoster();rosterCounts.set(gimmickKey(row),next);renderRoster();};button.addEventListener('click',()=>change(1));button.addEventListener('contextmenu',e=>{e.preventDefault();change(-1);});button.addEventListener('keydown',e=>{if(e.shiftKey&&e.key==='Enter'){e.preventDefault();change(-1);}});rosterGimmicks.append(button);if(focused===row.gimmick_id)button.focus();
 });
 for(const enemy of [...placedMonsters]){updateEnemy(enemy);if(enemy.hp<=0)removeEnemy(enemy);}
 document.querySelectorAll('#mp-mission-body tr').forEach(updateMissionRow);
 const active=placedMonsters.find(e=>e.instanceId===selectedPlacedId);if(active)registerEnemy(active,false);
 roster.replaceChildren();rosterEmpty.hidden=placedMonsters.length>0;
 const order=data.maps[pick.value]?.ids||[];
 document.getElementById('roster-counts').textContent='累計 '+placedMonsters.length+'体 ／ 出現中 '+placedMonsters.filter(e=>!e.defeated).length+'体 ／ 撃破 '+placedMonsters.filter(e=>e.defeated).length+'体';
 [...placedMonsters].sort((a,b)=>order.indexOf(a.monsterId)-order.indexOf(b.monsterId)||a.instanceId-b.instanceId).forEach(enemy=>{
  const card=document.createElement('article');card.className='roster-card';card.classList.toggle('defeated',!!enemy.defeated);card.classList.toggle('selected',enemy.instanceId===selectedPlacedId);
  const select=document.createElement('button');select.type='button';select.disabled=!!enemy.defeated;select.className='roster-select';select.setAttribute('aria-pressed',String(enemy.instanceId===selectedPlacedId));select.setAttribute('aria-label',enemy.name+' #'+enemy.instanceId+'を計算機に登録');
  const heading=document.createElement('span');heading.className='roster-name';const portrait=document.createElement('img');portrait.className='roster-portrait';portrait.alt='';assignMapImage(portrait,enemy.image);const nameText=document.createElement('span');nameText.className='monster-name-text';nameText.textContent=enemy.name;heading.append(portrait,nameText);
  if(enemy.boss){const icon=document.createElement('img');icon.className='roster-icon';icon.alt='マップボス';assignMapImage(icon,'../images/icon/Boss.png');nameText.append(icon);}
  if(enemy.reflect){const icon=document.createElement('img');icon.className='roster-icon';icon.alt='反撃可能';assignMapImage(icon,data.icons.reflect);nameText.append(icon);}
  const stats=document.createElement('span');stats.className='roster-stats';
  [['攻撃',enemy.attack],['防御',enemy.defense],['HP',enemy.hp],['コイン',enemy.coin]].forEach(([key,value])=>{const cell=document.createElement('span');cell.className='roster-stat';if(value!==null){const icon=document.createElement('img');icon.className='roster-icon';icon.alt=key;assignMapImage(icon,data.icons[key]);let amount;
   if(key==='HP'){
    amount=document.createElement('input');amount.type='number';amount.disabled=!!enemy.defeated;amount.min='0';amount.step='1';amount.value=value;amount.className='roster-hp';amount.setAttribute('aria-label',enemy.name+' #'+enemy.instanceId+'の残りHP');amount.title='残りHPを入力（0で撃破）';amount.addEventListener('focus',()=>amount.select());
    let committed=false;const commit=()=>{if(committed)return;const hp=Number(amount.value);if(amount.value.trim()===''||!Number.isFinite(hp)||hp<0||!Number.isInteger(hp)){amount.value=enemy.hp;return;}committed=true;if(hp===enemy.hp)return;rememberRoster();if(hp===0){removeEnemy(enemy);rosterNotice.textContent=enemy.name+'を撃破しました。';}else{enemy.damageTaken=rosterStat(enemy.base,'HP')-hp;}renderRoster();};
    amount.addEventListener('change',commit);amount.addEventListener('blur',commit);amount.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit();}if(event.key==='Escape'){amount.value=enemy.hp;amount.blur();}});icon.style.cursor='text';icon.addEventListener('click',()=>amount.focus());
   }else{amount=document.createElement('strong');amount.textContent=value;}
   cell.append(icon,amount);}stats.append(cell);});
  select.append(heading);select.addEventListener('click',()=>{selectedPlacedId=enemy.instanceId;registerEnemy(enemy);renderRoster();rosterNotice.textContent=enemy.name+' #'+enemy.instanceId+'を計算機に登録しました。';});
  const remove=document.createElement('button');remove.type='button';remove.className='roster-remove';remove.textContent=enemy.defeated?'撃破済':'撃破';remove.disabled=!!enemy.defeated;remove.setAttribute('aria-label',enemy.name+' #'+enemy.instanceId+'を撃破');remove.addEventListener('click',()=>{rememberRoster();removeEnemy(enemy);renderRoster();rosterNotice.textContent=enemy.name+' #'+enemy.instanceId+'を撃破しました。';});
  const deleteButton=document.createElement('button');deleteButton.type='button';deleteButton.className='roster-delete';deleteButton.textContent='削除';deleteButton.setAttribute('aria-label',enemy.name+' #'+enemy.instanceId+'を削除');deleteButton.addEventListener('click',()=>{rememberRoster();const i=placedMonsters.indexOf(enemy);if(i>=0)placedMonsters.splice(i,1);if(selectedPlacedId===enemy.instanceId)selectedPlacedId=null;renderRoster();});
  const actions=document.createElement('div');actions.className='roster-card-actions';actions.append(remove,deleteButton);
  const top=document.createElement('div');top.className='roster-card-top';top.append(select,actions);card.append(top,stats);roster.append(card);
 });
}
function spawnSelectedMonster(){
 if(!selected)return;
 const stats=data.stats.find(s=>s.monster_id===selected&&s['難易度']===difficulty.value);
 if(!stats){status.textContent='この難易度の能力値は未登録です。';return;}
 const attack=rosterStat(stats,'攻撃'),defense=rosterStat(stats,'防御'),hp=rosterStat(stats,'HP');
 if([attack,defense,hp].some(n=>n===null||!Number.isFinite(n))){status.textContent='能力値が不足しているため追加できません。';return;}
 rememberRoster();
 const enemy={instanceId:nextPlacedId++,monsterId:selected,name:stats['モンスター名'],mapName:data.maps[pick.value].name,mapId:pick.value,difficulty:difficulty.value,image:data.images[stats.image],attack,defense,hp,coin:stats['コイン']===''?null:Number(stats['コイン']),boss:String(stats['ボス']).trim()==='1',reflect:String(stats['反撃']).trim()==='1'};
 enemy.base={...stats};enemy.damageTaken=0;placedMonsters.push(enemy);renderRoster();status.textContent=enemy.name+'をマップ上のモンスターに追加しました。';rosterNotice.textContent=placedMonsters.length+'体を登録中';
}
renderRoster();

function selectMonster(id){selected=id;list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));status.textContent='';}

function updateMissionRow(tr){
 const key=tr.dataset.counterKey,maximum=Number(tr.dataset.maximum);
 const count=missionCounters.has(key)?missionCounters.get(key):maximum;
 tr.children[0].textContent=count;
 tr.classList.toggle('mp-mission-done',count===0);
 const control=tr.querySelector('button');
 control.setAttribute('aria-label',tr.dataset.description+'、残り'+count+'。クリックで1減らす、右クリックまたはShiftキーを押しながらEnterで1増やす');
}
function attachMissionCounter(tr,row){
 const key=row.map_id+':'+row.ID;
 tr.dataset.counterKey=key;tr.dataset.maximum=String(Number(row['カウンタ']));tr.dataset.description=row['内容'];
 const button=document.createElement('button');button.type='button';button.className='mp-mission-counter-button';button.textContent=row['内容'];
 tr.children[1].replaceChildren(button);
 tr.children[0].setAttribute('aria-live','polite');
 function change(delta){
  const maximum=Number(tr.dataset.maximum),current=missionCounters.has(key)?missionCounters.get(key):maximum;
  const next=Math.max(0,Math.min(maximum,current+delta));if(next===current)return;rememberRoster();missionCounters.set(key,next);updateMissionRow(tr);document.getElementById('roster-undo').disabled=false;
 }
 tr.addEventListener('click',()=>change(-1));
 tr.addEventListener('contextmenu',event=>{event.preventDefault();change(1);});
 button.addEventListener('keydown',event=>{if(event.shiftKey&&event.key==='Enter'){event.preventDefault();change(1);}});
 updateMissionRow(tr);
}

document.getElementById('mp-mission-reset').addEventListener('click',()=>{
 if(!data.missions.some(row=>row.map_id===pick.value&&missionCounters.has(row.map_id+':'+row.ID)&&missionCounters.get(row.map_id+':'+row.ID)!==Number(row['カウンタ'])))return;rememberRoster();document.getElementById('roster-undo').disabled=false;
 data.missions.filter(row=>row.map_id===pick.value).forEach(row=>missionCounters.delete(row.map_id+':'+row.ID));
 document.querySelectorAll('#mp-mission-body tr').forEach(updateMissionRow);
});
function renderMapInformation(){
 const byId=(a,b)=>a.ID.localeCompare(b.ID,undefined,{numeric:true});
 const missions=data.missions.filter(row=>row.map_id===pick.value).sort(byId);
 const events=data.events.filter(row=>row.map_id===pick.value&&row['難易度']===difficulty.value).sort((a,b)=>Number(a['進捗'])-Number(b['進捗'])||byId(a,b));
 function fill(id,emptyId,rows,columns){
  const body=document.getElementById(id);body.replaceChildren();
  rows.forEach(row=>{const tr=document.createElement('tr');tr.dataset.id=row.ID;columns.forEach(key=>{const td=document.createElement('td');td.textContent=row[key];tr.append(td);});if(id==='mp-mission-body')attachMissionCounter(tr,row);body.append(tr);});
  body.closest('table').hidden=rows.length===0;document.getElementById(emptyId).hidden=rows.length!==0;
 }
 fill('mp-mission-body','mp-mission-empty',missions,['カウンタ','内容','報酬']);
 const groups=new Map();
 events.forEach(row=>{const key=String(Number(row['進捗']));if(!groups.has(key))groups.set(key,{'進捗':row['進捗'],ID:row.ID,'内容':[]});groups.get(key)['内容'].push(row['内容']);});
 const groupedEvents=Array.from(groups.values()).map(row=>({...row,'内容':row['内容'].join('\n')}));
 fill('mp-event-body','mp-event-empty',groupedEvents,['進捗','内容']);
}

function render(){
 if(!data.maps[pick.value]){selected=null;list.replaceChildren();difficulty.replaceChildren();difficulty.disabled=true;const img=document.getElementById('mp-map-image');img.hidden=true;img.removeAttribute('src');img.alt='';renderMapInformation();status.textContent='表示対象のマップがありません。CSVの「表示」列を確認してください。';renderRoster();return;}
 difficulty.disabled=false;

 // Show Extreme only when an associated map boss has an Extreme row.
 const hasExtreme=data.stats.some(s=>data.maps[pick.value].ids.includes(s.monster_id)&&s['難易度']==='極限'&&String(s['ボス']).trim()==='1');
 const previousDifficulty=difficulty.value;
 const allowed=['普通','困難','悪夢','狂気',...(hasExtreme?['極限']:[])];
 difficulty.replaceChildren(...allowed.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;return option;}));
 difficulty.value=allowed.includes(previousDifficulty)?previousDifficulty:'普通';
 const map=data.maps[pick.value],level=difficulty.value,scroll=list.scrollTop;
 renderMapInformation();

 const img=document.getElementById('mp-map-image');assignMapImage(img,map.image);img.alt=map.name+'のマップ';list.replaceChildren();
 const visibleRows=visibleMonsterRows(data,pick.value,level);
 visibleRows.forEach(stats=>{const id=stats.monster_id;
  const base=stats,tile=document.createElement('button');
  tile.type='button';tile.className='mp-monster';tile.dataset.id=id;tile.setAttribute('aria-pressed','false');tile.setAttribute('aria-label',base['モンスター名']+'をマップに追加');tile.addEventListener('mouseenter',()=>showMonsterTip(tile));tile.addEventListener('mouseleave',hideMonsterTip);tile.addEventListener('focus',()=>showMonsterTip(tile));tile.addEventListener('blur',hideMonsterTip);
  const name=document.createElement('div');name.className='mp-name';const pic=document.createElement('img');assignMapImage(pic,data.images[base.image]||'');pic.alt='';const nameText=document.createElement('span');nameText.className='monster-name-text';nameText.textContent=base['モンスター名'];name.append(pic,nameText);if(String((stats||base)['ボス']).trim()==='1'){const boss=document.createElement('img');boss.className='mp-boss-icon';boss.alt='マップボス';boss.title='マップボス';assignMapImage(boss,'../images/icon/Boss.png');nameText.append(boss);}if(String((stats||base)['反撃'])==='1'){const reflect=document.createElement('img');assignMapImage(reflect,data.icons.reflect);reflect.alt='反撃可能';reflect.className='mp-reflect';nameText.append(reflect);}
  const values=document.createElement('div');values.className='mp-stats';
  ['攻撃','防御','HP','コイン'].forEach(key=>{
   if(key==='コイン'&&(!stats||stats[key]==='')){const blank=document.createElement('div');blank.className='mp-stat';blank.setAttribute('aria-hidden','true');values.append(blank);return;}
   const cell=document.createElement('div'),icon=document.createElement('img'),number=document.createElement('strong');cell.className='mp-stat';cell.dataset.kind=key;
   const adjusted=effectiveStat(stats,key);
   const value=adjusted===null?'—':adjusted;
   const extra=adjusted===null?0:adjusted-Number(stats[key]);
   cell.setAttribute('aria-label',key+' '+(value==='—'?'未登録':value));assignMapImage(icon,data.icons[key]);icon.alt=key;number.textContent=value;
   if(extra&&value!=='—')number.className='mp-boosted';cell.append(icon,number);values.append(cell);
  });
  tile.append(name,values);tile.addEventListener('click',()=>{selectMonster(id);spawnSelectedMonster();});list.append(tile);
 });
 selectMonster(visibleRows.some(row=>row.monster_id===selected)?selected:null);list.scrollTop=scroll;
 document.getElementById('mp-buff-status').textContent=[buff.attack?'攻撃 ＋'+buff.attack:'',buff.defense?'防御 ＋'+buff.defense:''].filter(Boolean).join(' ／ ');
 renderRoster();
}
root.querySelectorAll('[data-buff]').forEach(button=>button.addEventListener('click',()=>{const kind=button.dataset.buff;if(kind==='attack'||kind==='both')buff.attack++;if(kind==='defense'||kind==='both')buff.defense++;render();}));
pick.addEventListener('change',()=>{rememberRoster();clearRoster();selected=null;render();list.scrollTop=0;});difficulty.addEventListener('change',()=>{rememberRoster();clearRoster();render();});
const tabs=[document.getElementById('mp-tab-monsters'),document.getElementById('mp-tab-map')];tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>tabs.forEach(other=>{const active=other===tab;other.setAttribute('aria-selected',String(active));document.getElementById(other.getAttribute('aria-controls')).hidden=!active;}));tab.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:1-index;tabs[next].click();tabs[next].focus();}});});
render();

function hideMonsterTip(){const tip=document.getElementById('monster-tooltip');if(tip)tip.hidden=true;}
function showMonsterTip(tile){const tip=document.getElementById('monster-tooltip'),box=tile.getBoundingClientRect();tip.hidden=false;tip.style.left=Math.min(Math.max(8,box.left+box.width/2-40),window.innerWidth-95)+'px';tip.style.top=Math.max(8,box.top-34)+'px';}
list.addEventListener('scroll',hideMonsterTip);root.addEventListener('keydown',e=>{if(e.key==='Escape')hideMonsterTip();});document.querySelectorAll('.role-tab').forEach(b=>b.addEventListener('click',hideMonsterTip));
async function refreshCSV(){if(location.protocol==='file:')return;const files={maps:'maps_renumbered.csv',relations:'map_monsters_renumbered.csv',stats:'monster_stats.csv',missions:'map_mission.csv',events:'map_event.csv',gimmicks:'map_gimmick.csv'};const result=await Promise.allSettled(Object.entries(files).map(async([key,file])=>{const response=await fetch('../csv/'+file,{cache:'no-cache'});if(!response.ok)throw Error(file);const rows=parseMapCSV(await response.text());if(rows.length&&!Object.hasOwn(rows[0],key==='stats'?'monster_id':'map_id'))throw Error(file);return [key,rows];}));const raw={...INITIAL_MAP_DATA};result.forEach(item=>{if(item.status==='fulfilled')raw[item.value[0]]=item.value[1];});const next=normalizeMapData(raw);const previousMap=pick.value;Object.assign(data,next);populateMaps();if(pick.value!==previousMap){clearRoster();rosterHistory.length=0;}render();if(result.some(item=>item.status==='rejected'))status.textContent='一部のCSVを取得できないため同梱データを表示しています。';}refreshCSV();

})();
document.querySelectorAll('.parameter-icon').forEach(img=>assignMapImage(img,img.getAttribute('src').replace('/icon/','/Icon/')));
