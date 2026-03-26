// ══════════════════════════════════════════════
// AI解读引擎 - 本地规则引擎
// ══════════════════════════════════════════════:

// ── AI解读主函数 ──────────────────────────────
function generateAIInterpret(data) {
  const d = data;
  const c = d.currency || 'USD';
  const sc = d.scores;
  
  let messages = [];
  
  // 1. 总体评价
  messages.push(generateOverallEvaluation(d));
  
  // 2. 重点问题（挑1-2个最差的维度）
  const issues = getCriticalIssues(d);
  if (issues.length > 0) {
    messages.push('\n📌 **最需要关注的问题**：');
    issues.forEach(issue => {
      messages.push('\n' + generateDimensionInterpret(issue, d));
    });
  }
  
  // 3. 立即行动
  const immediate = genActionPlan(d).immediate.slice(0, 2);
  if (immediate.length > 0) {
    messages.push('\n🚀 **今天就可以做的**：');
    immediate.forEach((a, i) => {
      messages.push(`\n${i + 1}. ${a.icon} ${a.title} - ${a.desc}`);
    });
  }
  
  // 4. 专属建议（结合具体场景）
  const exclusive = generateExclusiveAdvice(d);
  if (exclusive) {
    messages.push('\n💡 **给你的专属建议**：\n' + exclusive);
  }
  
  return messages.join('\n');
}

// ── 总体评价 ──────────────────────────────────
function generateOverallEvaluation(d) {
  const sc = d.scores;
  const name = d.name || '朋友';
  const total = sc.total;
  const age = d.age || 45;
  
  let text = '';
  
  if (total >= 80) {
    text = `🎉 ${name}，你的财务健康状况非常好！

综合得分${total}分，在${age}岁这个年龄，你的财务结构已经相当健康。

${getHighlightText(d)}

继续保持这个节奏，你离财务自由的目标越来越近了！💪`;
  } else if (total >= 60) {
    text = `👍 ${name}，你的财务健康状况良好。

综合得分${total}分。整体框架有了，但在一些关键维度上还有优化空间。

${getProblemSummary(d)}

别担心，按照下面的建议，3-6个月就能提升到80分以上！`;
  } else {
    text = `⚠️ ${name}，你的财务健康得分${total}分。

说明目前财务结构存在一些需要注意的地方。

但别担心，从现在开始调整还来得及！很多人都是从40-50分开始，经过1年的系统规划，提升到70-80分的。

最重要的是：你现在已经意识到问题，并且准备行动了。这比什么都重要！💪`;
  }
  
  return text;
}

// ── 亮点描述（高分段用） ─────────────────────
function getHighlightText(d) {
  const sc = d.scores;
  
  if (sc.savings >= 16 && sc.passive >= 16) {
    return '你的储蓄能力和被动收入都很出色，已经建立了良好的财务基础。';
  }
  if (sc.emergency >= 16 && sc.debt >= 16) {
    return '你的应急准备和债务管理都做得很到位，风险控制意识强。';
  }
  if (sc.diversify >= 16) {
    return '你的资产配置很均衡，分散化策略有效降低了整体风险。';
  }
  return '各项指标都很优秀，财务体系非常稳健。';
}

// ── 问题总结（中分段用） ─────────────────────
function getProblemSummary(d) {
  const sc = d.scores;
  const issues = [];
  
  if (sc.emergency < 12) issues.push('应急准备需要加强');
  if (sc.passive < 12) issues.push('被动收入比例偏低');
  if (sc.debt < 12) issues.push('债务管理需要改善');
  if (sc.savings < 12) issues.push('储蓄能力需要提升');
  
  if (issues.length > 0) {
    return issues.join('，') + '，但这些都是可以优化的。';
  }
  return '但在一些细节上还有提升空间。';
}

// ── 获取关键问题（按分数排序） ─────────────────
function getCriticalIssues(d) {
  const sc = d.scores;
  const items = [
    { name: '紧急预备金', score: sc.emergency, key: 'emergency' },
    { name: '储蓄能力', score: sc.savings, key: 'savings' },
    { name: '负债管理', score: sc.debt, key: 'debt' },
    { name: '被动收入', score: sc.passive, key: 'passive' },
    { name: '资产分散度', score: sc.diversify, key: 'diversify' }
  ];
  
  // 筛选低分项并排序
  return items
    .filter(item => item.score < 12)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
}

// ── 单维度解读 ──────────────────────────────
function generateDimensionInterpret(issue, d) {
  const c = d.currency || 'USD';
  const sc = d.scores;
  
  switch(issue.key) {
    case 'emergency':
      return generateEmergencyInterpret(d, issue.score);
    case 'savings':
      return generateSavingsInterpret(d, issue.score);
    case 'debt':
      return generateDebtInterpret(d, issue.score);
    case 'passive':
      return generatePassiveInterpret(d, issue.score);
    case 'diversify':
      return generateDiversifyInterpret(d, issue.score);
    default:
      return '';
  }
}

// ── 紧急预备金解读 ───────────────────────────
function generateEmergencyInterpret(d, score) {
  const c = d.currency || 'USD';
  const months = (d.emergencyCoverage * (d.emergencyMonths || 6)).toFixed(1);
  const target = d.emergencyMonths || 6;
  const gap = (target - d.emergencyCoverage * target).toFixed(1);
  const gapAmount = fmt(gap * d.essentialExp, c);
  
  let text = '';
  
  if (score >= 16) {
    text = `- **紧急预备金**：${score}分（满分20）

你的应急准备非常充足，覆盖${months}个月支出。

${getEmergencyHighText(d.emergencyMonths, months)}`;
  } else if (score >= 12) {
    const monthlyAmount = fmt(Math.max(gap * d.essentialExp / 6, d.essentialExp), c);
    text = `- **紧急预备金**：${score}分（满分20）

当前覆盖${months}个月支出，距离${target}个月目标还差${gap}个月（约${gapAmount}）。

💡 建议：每月从结余中划拨${monthlyAmount}，${gap <= 3 ? '3-4个月' : '6个月左右'}就能达标。

这笔钱放在货币基金里，既能随时取出，又有2-3%的收益。`;
  } else {
    const immediateAmount = fmt(Math.max(d.essentialExp, d.monthlySurplus * 0.5), c);
    const monthlyAmount = fmt(Math.max(d.monthlySurplus * 0.5, gap * d.essentialExp / 6), c);
    text = `- **紧急预备金**：${score}分（满分20）

当前只覆盖${months}个月支出，距离${target}个月目标还差${gap}个月（约${gapAmount}）。

这是**最需要优先解决**的问题！没有应急金，任何突发情况（失业、生病）都会让家庭财务瞬间崩塌。

💡 立即行动：

1. 今天就把${immediateAmount}转入货币基金账户（从活期存款中挪）
2. 每月从结余中固定划拨${monthlyAmount}
3. 坚持${gap <= 2 ? '2-3个月' : '4-6个月'}，就能达到安全标准

**记住：应急金是所有财务规划的基础，先完成它，再谈其他投资。**`;
  }
  
  return text;
}

function getEmergencyHighText(target, current) {
  if (current >= 12) return '超过12个月的应急金，安全边际很高，就算发生失业或重大变故，也足够支撑很长时间。';
  if (current >= 9) return '超过9个月的应急金，安全边际很足，大部分突发情况都能从容应对。';
  return '刚好达到建议的6个月标准，能够应对大多数突发状况。';
}

// ── 储蓄能力解读 ─────────────────────────────
function generateSavingsInterpret(d, score) {
  const c = d.currency || 'USD';
  const savingsRate = (d.savingsRate * 100).toFixed(1);
  const age = d.age || 45;
  
  let text = '';
  
  if (score >= 16) {
    text = `- **储蓄能力**：${score}分（满分20）

你的储蓄率${savingsRate}%，月度结余${fmt(d.monthlySurplus, c)}，非常出色！

${getSavingsHighText(age)}`;
  } else if (score >= 12) {
    const suggestionAmount = fmt(d.totalIncome * 0.2 - d.monthlySurplus, c);
    const savingAmount = fmt(d.totalIncome * 0.05, c);
    const futureAmount = fmt(suggestionAmount * 12 * 3, c);
    text = `- **储蓄能力**：${score}分（满分20）

储蓄率${savingsRate}%，月度结余${fmt(d.monthlySurplus, c)}。

你的储蓄能力还可以，但还有提升空间。

💡 建议：

1. **先储蓄后消费**：工资到账后，立即把${suggestionAmount}转入独立储蓄账户，剩下的钱才用来消费
2. **削减弹性支出**：每月在餐饮、娱乐、购物上省${savingAmount}，就能把储蓄率提升到20%
3. **自动化储蓄**：设置银行自动转账，让储蓄变成"忘记的事"

目标是把储蓄率提升到20%以上，这样3年后就会多出${futureAmount}的本金！`;
  } else {
    const cutAmount = fmt(d.totalIncome * 0.08, c);
    const saveAmount = fmt(Math.max(d.totalIncome * 0.1, d.monthlySurplus * 0.5), c);
    text = `- **储蓄能力**：${score}分（满分20）

储蓄率${savingsRate}%，月度结余${fmt(d.monthlySurplus, c)}${d.monthlySurplus < 0 ? '（或赤字）' : ''}。

${savingsRate > 0 ? '这个储蓄率太低了。' : '甚至处于赤字状态。'}

**这是一个危险信号！** 长期储蓄不足，意味着：
- 没有应急能力
- 没有投资本金
- 退休后生活质量大幅下降

💡 立即行动：

1. **记账1周**：搞清楚钱都花在哪里（用Excel或APP都行）
2. **砍掉这3项**：外卖、视频会员、冲动购物（这三项通常能省${cutAmount}/月）
3. **强制储蓄**：工资到账立即存${saveAmount}到独立账户，花完就不再动

${d.monthlySurplus < 0 ? '4. **偿还债务**：先用结余还信用卡，赤字问题必须先解决！' : ''}

坚持3个月，你的储蓄率就能提升到15%以上，试试看！`;
  }
  
  return text;
}

function getSavingsHighText(age) {
  if (age < 30) return `在${age}岁这个年龄，能有这么高的储蓄率，说明你很早就建立了良好的财务习惯，未来可期！`;
  if (age >= 30 && age <= 45) return `在这个上有老下有小的阶段，还能保持这么高的储蓄率，说明你收入能力强且消费理性，非常难得。`;
  return `在${age}岁这个阶段保持高储蓄率，说明你已经建立了成熟的财务管理体系，为退休做了充分准备。`;
}

// ── 负债管理解读 ─────────────────────────────
function generateDebtInterpret(d, score) {
  const c = d.currency || 'USD';
  const debtRatio = (d.debtRatio * 100).toFixed(1);
  
  let text = '';
  
  if (score >= 16) {
    text = `- **负债管理**：${score}分（满分20）

债务占收入${debtRatio}%，控制得非常好！

${debtRatio < 15 ? '你的债务负担很轻，财务压力小，有更多空间进行投资和规划。' : '债务控制在健康范围内，既利用了杠杆，又没有过度负担。'}`;
  } else if (score >= 12) {
    text = `- **负债管理**：${score}分（满分20）

债务占收入${debtRatio}%，属于中等水平。

${debtRatio >= 30 && debtRatio < 40 ? '这个比例还在可接受范围内，但要注意：如果收入波动或利率上升，压力会突然增大。' : debtRatio >= 40 && debtRatio <= 50 ? '债务负担已经偏重，建议制定清偿计划，优先还高息债务（信用卡、消费贷）。' : ''}

💡 具体建议：

- 用"雪球法"：先还金额最小的债务，建立成就感
- 或用"雪崩法"：先还利率最高的债务，更省利息
- 每月拿出月收入的10%专门还债，${debtRatio > 40 ? '约12-18个月' : '约18-24个月'}能还清`;
  } else {
    const repayAmount = fmt(d.totalIncome * 0.15, c);
    const repayTime = Math.round((d.debtExp * 12) / (d.totalIncome * 0.15) / 12);
    text = `- **负债管理**：${score}分（满分20）

债务占收入${debtRatio}%，${debtRatio > 50 ? '已经超过50%，这是危险信号！' : '负担较重，需要重视。'}

**高负债意味着：**
- 每月固定支出压力大，抗风险能力弱
- 一旦收入下降或失业，财务危机就会爆发
- 没有余力进行投资和规划

💡 立即行动：

1. **停止新增负债**：今天就把信用卡剪了（或降低额度），不再借钱消费
2. **列出所有债务**：包括金额、利率、每月还款，用表格一目了然
3. **选择清偿策略**：
   - 如果压力大：用"雪球法"，先还金额最小的债务
   - 如果想省利息：用"雪崩法"，先还利率最高的债务
4. **每月还款${repayAmount}**：按这个速度，${repayTime}年就能还清

${debtRatio > 50 ? '⚠️ 严重警告：如果债务超过收入的50%，建议咨询专业的债务重组方案。' : ''}`;
  }
  
  return text;
}

// ── 被动收入解读 ─────────────────────────────
function generatePassiveInterpret(d, score) {
  const c = d.currency || 'USD';
  const passiveRatio = (d.passiveRatio * 100).toFixed(1);
  
  // 计算建议配置金额（确保为正数，最少5000元）
  const monthlyIncome = d.totalIncome || 0;
  const monthlySurplus = d.monthlySurplus || 0;
  const baseSuggestion = Math.max(monthlySurplus * 6, monthlyIncome * 0.1);
  const suggestionAmount = Math.max(baseSuggestion, 5000); // 最少5000元
  const suggestionFmt = fmt(suggestionAmount, c);
  
  // 计算10年和20年后的年现金流（按6%复利+4%提取率）
  const annualAt10 = suggestionAmount * Math.pow(1.06, 10) * 0.04;
  const annualAt20 = suggestionAmount * Math.pow(1.06, 20) * 0.04;
  const year10Fmt = fmt(annualAt10, c);
  const year20Fmt = fmt(annualAt20, c);
  
  let text = '';

  if (score >= 16) {
    text = `- **被动收入**：${score}分（满分20）

被动收入占收入${passiveRatio}%，非常好！

${passiveRatio >= 30 ? '你已经接近或达到"财务自由"的门槛（30-50%）。🎉 祝贺你！' : '被动收入是财务自由的门票，你已经迈出了关键一步。继续保持！'}`;
  } else if (score >= 12) {
    const year5 = fmt(suggestionAmount * Math.pow(1.05, 5) * 0.04, c);
    text = `- **被动收入**：${score}分（满分20）

被动收入占收入${passiveRatio}%，还有很大提升空间。

${passiveRatio >= 10 ? '你已经有被动收入的基础，但还不足以支撑生活。' : '被动收入比例还不错，但距离20%的健康标准还有距离。'}

💡 建议：

配置境外储蓄分红险，每年存入${suggestionFmt}，10年后将形成稳定现金流：

- 第5年：约${year5}的年被动收入
- 第10年：约${year10Fmt}的年被动收入
- 第20年：约${year20Fmt}的年被动收入

这类产品以美元计价，长期复利约5-6%，是建立被动收入的最佳起点。`;
  } else {
    text = `- **被动收入**：${score}分（满分20）

被动收入占收入${passiveRatio}%，几乎是零。

${passiveRatio < 5 ? '这意味着你所有的收入都来自"主动劳动"——一旦停止工作，收入就归零。' : '这个比例太低了，抗风险能力弱。'}

**为什么被动收入如此重要？**
- 你生病了、失业了、退休了，被动收入还在
- 它是财务自由的门票，让你有时间做自己喜欢的事
- 复利效应下，越早开始，越轻松

💡 立即行动：

1. **配置储蓄险**：这是普通人建立被动收入最简单的方式
   - 每年存入${suggestionFmt}
   - 10年后形成约${year10Fmt}的年现金流
   - 20年后形成约${year20Fmt}的年现金流

2. **债券基金**：风险低、收益稳定，每年4-5%，作为被动收入的补充

3. **定投指数基金**：长期持有，年化7-10%，适合有耐心的人

**最重要的事：今天就开始，不要等！复利需要时间。**`;
  }
  
  return text;
}

// ── 资产分散度解读 ───────────────────────────
function generateDiversifyInterpret(d, score) {
  const c = d.currency || 'USD';
  const sc = d.scores;
  
  let text = '';
  
  if (score >= 16) {
    text = `- **资产分散度**：${score}分（满分20）

你的资产配置很均衡，分散化策略有效降低了整体风险。

${sc.diversify >= 16 ? '你的资产分散在不同类别，没有过度集中在某一类资产上，抗风险能力强。' : '你的资产结构符合大师智慧配置，风险收益比非常合理。'}`;
  } else if (score >= 12) {
    text = `- **资产分散度**：${score}分（满分20）

你的资产有一定分散，但${getDiversifyProblemText(d)}。

💡 建议：

以大师配置为参考：
- 要花的钱（10-12%）：现金 + 货币基金
- 保命的钱（18-22%）：储蓄险
- 生钱的钱（30%）：股票/股票基金
- 保值的钱（36-40%）：债券 + 储蓄险 + 黄金

你可以根据自己的风险偏好微调，但不要偏离太多。`;
  } else {
    const majorAsset = getMajorAsset(d);
    const riskType = d.riskPref || 'moderate';
    const masterNames = {
      conservative: 'Harry Browne的永久组合',
      moderate: 'Ray Dalio的全天候策略',
      growth: 'Ben Graham的价值投资',
      aggressive: 'John Bogle的指数基金'
    };
    text = `- **资产分散度**：${score}分（满分20）

${majorAsset ? majorAsset.text : '你的资产过度集中！'}

**过度集中配置的风险：**
- 一类资产下跌，你的整体财富就大幅缩水
- 错过其他资产的上涨机会
- 无法对冲单一市场风险

💡 立即行动：

1. **降低${majorAsset ? majorAsset.name : '主要资产'}比例**：从${majorAsset ? (majorAsset.ratio * 100).toFixed(0) : '过高'}%降到目标比例
2. **增加其他资产配置**：每年拿出${fmt(d.totalAssets * 0.1, c)}调整配置
3. **参考大师配置**：根据你的风险偏好（${riskType}），采用${masterNames[riskType]}的投资策略`;
  }
  
  return text;
}

function getDiversifyProblemText(d) {
  const total = d.totalAssets || 1;
  const items = [
    { name: '现金', ratio: (d.cash + d.moneyFund) / total },
    { name: '储蓄险', ratio: d.savingsPlan / total },
    { name: '股票', ratio: d.stocks / total },
    { name: '债券', ratio: d.bonds / total },
    { name: '黄金', ratio: d.gold / total }
  ];
  
  const highItems = items.filter(i => i.ratio > 0.5);
  const lowItems = items.filter(i => i.ratio < 0.05 && total > 0);
  
  if (highItems.length > 0) {
    return `${highItems[0].name}占比过高（${(highItems[0].ratio * 100).toFixed(0)}%），建议降低到50%以下，增加其他资产配置`;
  }
  if (lowItems.length > 2) {
    return `缺少${lowItems.slice(0, 2).map(i => i.name).join('、')}等资产配置，建议适当增加`;
  }
  return '整体均衡度还可以，但可以进一步优化配置';
}

function getMajorAsset(d) {
  const total = d.totalAssets || 1;
  const items = [
    { name: '现金及货币基金', ratio: (d.cash + d.moneyFund) / total },
    { name: '储蓄险', ratio: d.savingsPlan / total },
    { name: '股票基金', ratio: d.stocks / total },
    { name: '债券基金', ratio: d.bonds / total },
    { name: '黄金', ratio: d.gold / total }
  ];
  
  const highItems = items.filter(i => i.ratio > 0.5);
  return highItems.length > 0 ? highItems[0] : null;
}

// ── 专属建议 ─────────────────────────────────
function generateExclusiveAdvice(d) {
  const c = d.currency || 'USD';
  const sc = d.scores;
  
  // 场景1：储蓄险配置建议
  if (sc.total < 70 && d.passiveRatio < 0.2 && d.monthlySurplus > 5000) {
    const suggestionAmount = fmt(d.monthlySurplus * 6, c);
    let text = `以你现在的储蓄能力（月结余${fmt(d.monthlySurplus, c)}），建议每年配置约${suggestionAmount}的美元储蓄险。

10年后将形成稳定的现金流来源，同时规避人民币汇率风险。

这类产品长期复利约5-6%，是建立被动收入的最佳起点。`;
    if (d.monthlySurplus > 15000) {
      text += `\n\n按照你的储蓄能力，可以同时考虑大额增额寿险，年化收益更高。`;
    }
    return text;
  }
  
  // 场景2：债务+应急金组合建议
  if (d.debtRatio > 0.4 && d.emergencyCoverage < 1) {
    const debtPayment = fmt(d.totalIncome * 0.15, c);
    const emergencySaving = fmt(d.essentialExp * 0.5, c);
    return `你现在的债务比例偏高，应急金也不足。建议采用"双管齐下"策略：

**第1-3个月：**
- 每月${debtPayment}还债（优先还信用卡等高息债务）
- 同时每月${emergencySaving}存入货币基金

**第4-6个月：**
- 应急金达标后，把这部分钱全部用于还债
- 每月${fmt(d.totalIncome * 0.25, c)}还债，约12-18个月能还清

这样做的好处：
- 先建立应急金，避免意外事件让债务问题恶化
- 应急金达标后全力还债，效率更高
- 6个月后，债务大幅减少，应急金也有了`;
  }
  
  // 场景3：退休规划加速建议
  if (d.age > 40 && d.retireGap > 0) {
    const yearsToRetire = d.yearsToRetire || 10;
    const suggestionAmount = fmt(Math.max(d.monthlySurplus * 8, d.totalIncome * 0.15), c);
    const totalAmount = fmt(suggestionAmount * ((Math.pow(1.05, yearsToRetire) - 1) / 0.05), c);
    return `你已经${d.age}岁，但退休储备金${fmt(d.passiveIncome * 12 / 0.04, c)}，距离退休还有${yearsToRetire}年。

按照目前的速度，退休后的生活质量会大幅下降。

💡 立即行动：

1. **增加退休金配置**：每年存入${suggestionAmount}到退休基金（可以是储蓄险或指数基金）
2. **延迟退休**：如果可以，考虑延迟2-3年退休，积累更多本金
3. **优化现有投资**：如果已有退休基金，建议从保守型转为稳健型

如果现在开始每年存${suggestionAmount}，${yearsToRetire}年后退休时，将积累到${totalAmount}（按5%复利计算）。

**最重要的是：今天就开始！** 复利需要时间。`;
  }
  
  return null;
}
