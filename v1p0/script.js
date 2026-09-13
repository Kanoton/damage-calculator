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

modes.forEach(mode => {
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
