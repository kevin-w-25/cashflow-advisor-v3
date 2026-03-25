// ══════════════════════════════════════════════
// app.js — 共享核心逻辑（无状态版本）
// ══════════════════════════════════════════════

// ── 工具函数 ──────────────────────────────────
const sym = { USD: '$', HKD: 'HK$', CNY: '¥', SGD: 'S$' };

function fmt(n, c = 'USD') {
  if (!n && n !== 0) return '--';
  const s = sym[c] || '$';
  if (Math.abs(n) >= 1e6) return s + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1000) return s + (n / 1000).toFixed(1) + 'K';
  return s + Math.round(n).toLocaleString();
}
function pct(a, b) {
  if (!b || b === 0 || isNaN(a) || isNaN(b)) return '0%';
  const r = (a / b) * 100;
  if (isNaN(r) || !isFinite(r)) return '0%';
  return r.toFixed(1) + '%';
}
// 安全百分比（固定2位小数，用于关键指标显示）
function safePct(n) {
  if (isNaN(n) || !isFinite(n)) return '0%';
  const r = Math.min(100, Math.max(0, n));
  return r.toFixed(1) + '%';
}
function cl(n, a, b) { return Math.min(b, Math.max(a, n)); }
function g(id) { return parseFloat(document.getElementById(id)?.value) || 0; }
function v(id) { return document.getElementById(id)?.value || ''; }
function el(id) { return document.getElementById(id); }

function timeAgo(iso) {
  if (!iso) return '--';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + '分钟前';
  const h = Math.floor(m / 60);
  if (h < 24) return h + '小时前';
  const d = Math.floor(h / 24);
  if (d < 30) return d + '天前';
  return new Date(iso).toLocaleDateString('zh-CN');
}

function formatDate(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ── Toast 通知 ────────────────────────────────
function toast(msg, type = 'success') {
  let wrap = el('toast');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toast'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'toast-item ' + type;
  t.innerHTML = (type === 'success' ? '✓' : '✕') + ' ' + msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── 财务评分引擎 ──────────────────────────────
function calcScores(d) {
  const sc = {};
  sc.emergency = cl(d.emergencyCoverage * 20, 0, 20);
  sc.savings = cl(d.savingsRate * 100 > 20 ? 20 : d.savingsRate * 100, 0, 20);
  sc.debt = cl(d.debtRatio < 0.15 ? 20 : d.debtRatio < 0.3 ? 15 : d.debtRatio < 0.5 ? 8 : 2, 0, 20);
  // 被动收入评分：被动收入占总收入的比例 → 20分满分
  // 20%被动收入=4分，40%=8分，60%=12分，80%=16分，100%=20分
  sc.passive = cl(d.passiveRatio * 20, 0, 20);
  const nz = [d.cash, d.savingsPlan, d.trust, d.property, d.stocks, d.gold].filter(x => x > 0).length;
  sc.diversify = cl(nz * 3.5, 0, 20);
  sc.total = Math.round(Object.values(sc).reduce((a, b) => a + b, 0));
  sc.label = sc.total >= 80 ? '优秀' : sc.total >= 60 ? '良好' : sc.total >= 40 ? '需改善' : '需紧急优化';
  sc.color = sc.total >= 80 ? 'var(--green)' : sc.total >= 60 ? 'var(--gold)' : 'var(--red)';
  return sc;
}

// 评分标准说明
const SCORE_CRITERIA = {
  emergency: { max: 20, criteria: '紧急预备金覆盖月数 × 20分（6个月=满分）' },
  savings: { max: 20, criteria: '储蓄率% 直接计分（20%=满分）' },
  debt: { max: 20, criteria: '负债率 <15%=20分，<30%=15分，<50%=8分' },
  passive: { max: 20, criteria: '被动收入占比 × 20分（50%=满分）' },
  diversify: { max: 20, criteria: '资产种类数 × 3.5分（6类=满分）' }
};


// ── 衍生数据计算 ──────────────────────────────
function deriveData(raw) {
  const d = { ...raw };
  
  // 计算总资产（包含所有资产类别）
  d.totalAssets = 
    (d.cash || 0) + 
    (d.moneyFund || 0) + 
    (d.savingsPlan || 0) + 
    (d.bonds || 0) + 
    (d.trust || 0) + 
    (d.property || 0) + 
    (d.stocks || 0) + 
    (d.gold || 0) + 
    (d.alternatives || 0) + 
    (d.otherInvest || 0);
  
  // 计算总收入
  d.totalIncome = (d.activeIncome || 0) + (d.passiveIncome || 0);
  
  // 计算总支出（包含所有支出类别）
  d.totalExp = 
    (d.housing || 0) + 
    (d.propertyFee || 0) + 
    (d.daily || 0) + 
    (d.transport || 0) + 
    (d.medical || 0) + 
    (d.education || 0) + 
    (d.premiumExp || 0) + 
    (d.debtExp || 0) + 
    (d.flexExp || 0) + 
    (d.otherExp || 0);
  
  // 保持向后兼容
  d.essentialExp = d.housing + d.propertyFee + d.daily + d.transport + d.medical + d.education;
  
  d.monthlySurplus = d.totalIncome - d.totalExp;
  d.annualSurplus = d.monthlySurplus * 12;
  d.debtRatio = d.totalIncome > 0 ? (d.debtExp || 0) / d.totalIncome : 0;
  d.savingsRate = d.totalIncome > 0 ? (d.monthlySurplus + (d.premiumExp || 0)) / d.totalIncome : 0;
  d.emergencyTarget = (d.essentialExp || 0) * (d.emergencyMonths || 6);
  d.emergencyCoverage = d.emergencyTarget > 0 ? ((d.cash || 0) + (d.moneyFund || 0)) / d.emergencyTarget : 2;
  d.yearsToRetire = Math.max(0, (d.retireAge || 60) - (d.age || 45));
  // 被动收入占比 — 强制限制在 0-1 之间，防止异常数据显示
  d.passiveRatio = (d.totalIncome > 0 && d.totalIncome !== 0 && !isNaN(d.totalIncome))
    ? Math.min(1, Math.max(0, (d.passiveIncome || 0) / d.totalIncome))
    : 0;
  d.retireGap = Math.max(0, (d.retireNeed || 0) - (d.passiveIncome || 0));
  d.retireCapNeeded = d.retireGap * 12 / 0.04;
  d.eduMonthly = (d.eduYears || 0) > 0 ? (d.eduGoal || 0) / ((d.eduYears || 8) * 12) : 0;
  // 退休资产预估
  const yr = d.yearsToRetire;
  d.retireEst = {
    savingsPlan: (d.savingsPlan || 0) * Math.pow(1.05, yr),
    stocks: (d.stocks || 0) * Math.pow(1.07, yr),
    gold: (d.gold || 0) * Math.pow(1.04, yr),
    newSavings: (d.monthlySurplus * 0.5 + (d.premiumExp || 0)) * 12 * yr,
    trust: d.trust || 0,
  };
  d.retireEst.total = Object.values(d.retireEst).reduce((a, b) => a + b, 0);
  d.retireEst.monthly4pct = d.retireEst.total * 0.04 / 12;
  d.scores = calcScores(d);
  return d;
}

// ── 对标数据（同龄人对比）────────────────────
function getBenchmarks(age, income) {
  const bucket = age < 30 ? 'u30' : age < 40 ? 'u40' : age < 50 ? 'u50' : age < 60 ? 'u60' : 'o60';
  const benchmarks = {
    u30: { savingsRate: 0.20, passiveRatio: 0.05, emergencyCoverage: 1.5, debtRatio: 0.25 },
    u40: { savingsRate: 0.25, passiveRatio: 0.10, emergencyCoverage: 2.0, debtRatio: 0.30 },
    u50: { savingsRate: 0.30, passiveRatio: 0.20, emergencyCoverage: 2.5, debtRatio: 0.35 },
    u60: { savingsRate: 0.35, passiveRatio: 0.35, emergencyCoverage: 3.0, debtRatio: 0.30 },
    o60: { savingsRate: 0.30, passiveRatio: 0.50, emergencyCoverage: 3.0, debtRatio: 0.20 },
  };
  const b = benchmarks[bucket];
  return {
    savingsRate: (b.savingsRate * 100).toFixed(0),
    passiveRatio: (b.passiveRatio * 100).toFixed(0),
    emergencyMonths: b.emergencyCoverage.toFixed(0),
    debtRatio: (b.debtRatio * 100).toFixed(0),
  };
}
function benchmarkTag(val, bench, type) {
  // type: 'higher-better' | 'lower-better' | 'range'
  const diff = val - bench;
  if (type === 'higher-better') {
    if (diff > 0.1) return { label: '高于同龄人', cls: 'tag-green' };
    if (diff > -0.1) return { label: '接近同龄人', cls: 'tag-gold' };
    return { label: '低于同龄人', cls: 'tag-red' };
  }
  if (type === 'lower-better') {
    if (diff < -0.05) return { label: '低于同龄人', cls: 'tag-green' };
    if (diff < 0.05) return { label: '接近同龄人', cls: 'tag-gold' };
    return { label: '高于同龄人', cls: 'tag-red' };
  }
  return { label: '正常', cls: 'tag-gold' };
}

// ── 增强建议生成器（带优先级和行动方案）────────
function genEnhancedAdvices(d) {
  const c = d.currency || 'USD';
  const advs = [];

  // ── 紧急预备金 ──
  if (d.emergencyCoverage < 0.5) {
    advs.push({
      priority: 'critical',
      icon: '🚨',
      title: '紧急预备金严重不足',
      problem: '流动现金仅 ' + fmt(d.cash, c) + '，仅覆盖 ' + (d.emergencyCoverage * (d.emergencyMonths || 6)).toFixed(1) + ' 个月生活费',
      target: '补充至 ' + fmt(d.emergencyTarget, c) + '（' + d.emergencyMonths + ' 个月）',
      actions: [
        { step: '1', text: '盘点现有流动资金，确认可用额度' },
        { step: '2', text: '每月从结余拨出 ' + fmt(Math.max(d.monthlySurplus * 0.5, d.emergencyTarget / 12), c) + ' 存入独立账户' },
        { step: '3', text: '选择高流动性产品（货币基金/定期存款）' },
      ],
      timeline: '立即（1个月内）',
      solutions: [
        { name: '货币基金', yield: '约2%/年', risk: '极低', note: 'T+1取出，灵活度高' },
        { name: '定期存款', yield: '约1.5-2%/年', risk: '极低', note: '锁定期限，提前支取按活期' },
      ]
    });
  } else if (d.emergencyCoverage < 1) {
    advs.push({
      priority: 'high',
      icon: '⚡',
      title: '紧急预备金略显不足',
      problem: '当前覆盖率 ' + (d.emergencyCoverage * 100).toFixed(0) + '%，建议达到 ' + d.emergencyMonths + ' 个月',
      target: '补充至 ' + fmt(d.emergencyTarget, c),
      actions: [
        { step: '1', text: '计算距目标缺口：' + fmt(Math.max(0, d.emergencyTarget - d.cash), c) },
        { step: '2', text: '每月定投 ' + fmt(Math.max(d.monthlySurplus * 0.3, (d.emergencyTarget - d.cash) / 12), c) },
        { step: '3', text: '6个月内完成目标' },
      ],
      timeline: '3-6个月',
      solutions: [
        { name: '阶梯存款法', yield: '约1.8%/年', risk: '极低', note: '分3笔定期，兼顾流动性' },
      ]
    });
  } else {
    advs.push({
      priority: 'good',
      icon: '✅',
      title: '紧急预备金充足',
      problem: '覆盖率 ' + (d.emergencyCoverage * 100).toFixed(0) + '%，超过 ' + d.emergencyMonths + ' 个月目标',
      actions: [{ step: '✓', text: '维持现状，每年检视一次目标是否需调整' }],
      timeline: '良好状态',
      solutions: []
    });
  }

  // ── 储蓄率 ──
  if (d.savingsRate < 0.15) {
    advs.push({
      priority: 'high',
      icon: '💰',
      title: '储蓄率偏低',
      problem: '综合储蓄率约 ' + (d.savingsRate * 100).toFixed(1) + '%，低于健康水平 20%',
      target: '提升至 20%-30%',
      actions: [
        { step: '1', text: '「先储蓄后消费」：工资到账立即转出10-20%至独立账户' },
        { step: '2', text: '审查弹性支出，找出可削减项目' },
        { step: '3', text: '设定每月强制储蓄金额并执行' },
      ],
      timeline: '1-3个月建立习惯',
      solutions: [
        { name: '银行定期转账', yield: '自动执行', risk: '无', note: '设置发薪日自动转账' },
      ]
    });
  }

  // ── 被动收入 ──
  if (d.passiveRatio < 0.2 && d.totalIncome > 0) {
    const gap = d.totalIncome * 0.4 - d.passiveIncome;
    advs.push({
      priority: d.age > 45 ? 'high' : 'medium',
      icon: '📈',
      title: '被动收入占比偏低',
      problem: '被动收入仅占 ' + safePct(d.passiveRatio) + '，低于健康水平 40%',
      target: '达到 40%，每月增加被动收入约 ' + fmt(gap, c),
      actions: [
        { step: '1', text: '评估风险承受能力，确认可投入金额' },
        { step: '2', text: '每月额外投入 ' + fmt(Math.min(gap, d.monthlySurplus * 0.6 > 0 ? d.monthlySurplus * 0.6 : 0), c) + ' 用于被动收入配置' },
        { step: '3', text: '选择适合的被动收入产品（见下方方案）' },
      ],
      timeline: '12-24个月见效',
      solutions: [
        { name: '储蓄分红险（美元/港币）', yield: '3.5-4.5%/年', risk: '低', note: '长期复利，适合稳健型' },
        { name: '股息ETF（如标普500）', yield: '4-5%/年', risk: '中', note: '高流动性，分散投资' },
        { name: '债券基金', yield: '3-4%/年', risk: '中低', note: '收益稳定，适合保守型' },
        { name: '离岸信托分配', yield: '5-6%/年', risk: '中', note: '适合资产量较大者' },
      ]
    });
  } else if (d.passiveRatio >= 0.5) {
    advs.push({
      priority: 'good',
      icon: '✅',
      title: '被动收入结构良好',
      problem: '被动收入占比 ' + safePct(d.passiveRatio) + '，接近财务自由状态',
      actions: [{ step: '✓', text: '维持并适度增加被动收入，提升财务韧性' }],
      timeline: '良好状态',
      solutions: []
    });
  }

  // ── 债务 ──
  if (d.debtRatio > 0.4) {
    advs.push({
      priority: 'critical',
      icon: '💳',
      title: '债务负担过重',
      problem: '债务占收入 ' + safePct(d.debtRatio) + '，超过警戒线 40%',
      target: '降至 25% 以内',
      actions: [
        { step: '1', text: '列出所有债务的本金、利率、每月还款额' },
        { step: '2', text: '优先偿还高息债务（信用卡/消费贷）' },
        { step: '3', text: '如有条件，考虑低息贷款置换高息债务' },
      ],
      timeline: '立即开始，12-24个月',
      solutions: [
        { name: '雪球法', yield: '节省利息', risk: '无', note: '先还小额高息债务，建立信心' },
        { name: '雪崩法', yield: '最优利率', risk: '无', note: '先还高息债务，减少总利息' },
      ]
    });
  } else if (d.debtRatio > 0.25) {
    advs.push({
      priority: 'medium',
      icon: '⚡',
      title: '债务比率偏高',
      problem: '当前 ' + safePct(d.debtRatio) + '，建议12-24个月内降至 25% 以内',
      target: '25% 以内',
      actions: [
        { step: '1', text: '评估是否有低息融资置换机会' },
        { step: '2', text: '制定还款计划并严格执行' },
      ],
      timeline: '12-24个月',
      solutions: []
    });
  }

  // ── 退休规划 ──
  if (d.retireGap > 0 && d.yearsToRetire > 0) {
    const monthlyNeed = d.yearsToRetire > 0 ? d.retireCapNeeded / (d.yearsToRetire * 12) : 0;
    advs.push({
      priority: d.yearsToRetire <= 10 ? 'high' : 'medium',
      icon: '🏝️',
      title: '退休收入存在缺口',
      problem: '退休后每月缺口约 ' + fmt(d.retireGap, c) + '，距退休还有 ' + d.yearsToRetire + ' 年',
      target: '积累 ' + fmt(d.retireCapNeeded, c) + '，每月需额外投入 ' + fmt(monthlyNeed, c),
      actions: [
        { step: '1', text: '评估当前退休储备增速' },
        { step: '2', text: '每月增投 ' + fmt(monthlyNeed, c) + '，可通过储蓄险+指数基金组合实现' },
        { step: '3', text: '考虑延迟退休1-2年，减少资金压力' },
      ],
      timeline: '长期规划',
      solutions: [
        { name: '增额终身寿险', yield: '约3.5%/年复利', risk: '低', note: '保额递增，兼顾保障和储蓄' },
        { name: '指数基金定投', yield: '约7%/年', risk: '中', note: '低成本，分散风险' },
      ]
    });
  }

  // ── 资产集中度 ──
  if (d.property > d.totalAssets * 0.6) {
    advs.push({
      priority: 'medium',
      icon: '🏠',
      title: '资产过度集中于房产',
      problem: '房产占总资产 ' + pct(d.property, d.totalAssets) + '，流动性偏低',
      target: '房产占比降至 50% 以下',
      actions: [
        { step: '1', text: '盘点房产实际市值和租金收益率' },
        { step: '2', text: '新增储蓄险、ETF、黄金等流动资产配置' },
      ],
      timeline: '3-5年逐步调整',
      solutions: [
        { name: '储蓄分红险', yield: '3.5-4.5%/年', risk: '低', note: '锁定长期复利，增加被动收入' },
        { name: '黄金ETF', yield: '视市场', risk: '中', note: '对冲风险，配置5-10%' },
      ]
    });
  }

  // ── 信托规划 ──
  if ((d.legacyWish === 'trust' || d.legacyWish === 'full') && d.trust === 0 && d.totalAssets > 500000) {
    advs.push({
      priority: 'medium',
      icon: '🏛️',
      title: '信托规划时机已成熟',
      problem: '总资产 ' + fmt(d.totalAssets, c) + '，尚未设立信托',
      target: '建立离岸信托架构',
      actions: [
        { step: '1', text: '咨询专业信托顾问，了解BVI/开曼/新加坡架构' },
        { step: '2', text: '确定信托目的（资产保护/传承/税务优化）' },
        { step: '3', text: '尽早完成架构设计，资产越早进入保护效果越好' },
      ],
      timeline: '3-6个月完成',
      solutions: [
        { name: 'BVI信托', yield: '-', risk: '低', note: '注册便捷，隐私保护好' },
        { name: '新加坡信托', yield: '-', risk: '低', note: '金融体系成熟，法律完善' },
      ]
    });
  }

  // 按优先级排序：critical > high > medium > good
  const order = { critical: 0, high: 1, medium: 2, good: 3, warn: 2, urgent: 0 };
  advs.sort((a, b) => (order[a.priority] || 99) - (order[b.priority] || 99));
  return advs;
}

// ── Score Canvas ──────────────────────────────
function drawScoreCanvas(canvasId, score) {
  const cv = el(canvasId);
  if (!cv) return;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, 110, 110);
  ctx.beginPath(); ctx.arc(55, 55, 46, -Math.PI / 2, 3 * Math.PI / 2);
  ctx.strokeStyle = '#232a3a'; ctx.lineWidth = 9; ctx.stroke();
  const ang = (score / 100) * 2 * Math.PI - Math.PI / 2;
  const gr = ctx.createLinearGradient(0, 0, 110, 110);
  gr.addColorStop(0, score > 70 ? '#c9a84c' : '#e05555');
  gr.addColorStop(1, score > 70 ? '#f0d080' : '#ff8080');
  ctx.beginPath(); ctx.arc(55, 55, 46, -Math.PI / 2, ang);
  ctx.strokeStyle = gr; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
}

// ── 目标资产配置模型 ─────────────────────────────────────────────
// 基于双层框架：四大账户 + 风险偏好微调 + 年龄调整
function getTargetAllocation(riskPref, age, yearsToRetire) {
  // 获取对应风险偏好的大师配置
  const wisdom = wisdomData[riskPref] || wisdomData.moderate;
  
  // 从大师配置获取基础比例
  let target = { ...wisdom.allocation };
  
  // 年龄微调规则
  if (age < 40) {
    // 年轻人：可承受更多风险，生钱的钱 +5%，保值的钱 -5%
    target.stocks += 5;
    target.bonds -= 3;
    target.gold -= 2;
  } else if (age > 60) {
    // 临近退休：降低风险，保值的钱 +10%，生钱的钱 -10%
    target.stocks -= 10;
    target.bonds += 6;
    target.gold += 4;
  } else if (age > 50) {
    // 中年后期：逐步降低风险，保值的钱 +5%，生钱的钱 -5%
    const adjust = Math.min(10, (age - 50) * 0.5);
    target.stocks = Math.max(15, target.stocks - adjust);
    target.bonds += adjust * 0.6;
    target.gold += adjust * 0.4;
  }
  
  // 确保总和为100%（四舍五入微调）
  const total = Object.values(target).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.1) {
    const diff = 100 - total;
    // 将差额调整到现金
    target.cash = Math.max(1, target.cash + diff);
  }
  
  return target;
}

// ── 获取四大账户配置 ─────────────────────────────────────────────
function getFourAccounts(riskPref, age) {
  const wisdom = wisdomData[riskPref] || wisdomData.moderate;
  const accounts = { ...wisdom.accounts };
  
  // 年龄微调
  if (age < 40) {
    accounts.spending = Math.max(5, accounts.spending - 2);
    accounts.growth = Math.min(50, accounts.growth + 5);
    accounts.preservation = Math.max(30, accounts.preservation - 3);
  } else if (age > 60) {
    accounts.spending = Math.max(3, accounts.spending - 2);
    accounts.growth = Math.max(20, accounts.growth - 10);
    accounts.preservation = Math.min(55, accounts.preservation + 12);
  } else if (age > 50) {
    const adjust = Math.min(5, (age - 50) * 0.5);
    accounts.growth = Math.max(20, accounts.growth - adjust);
    accounts.preservation = Math.min(50, accounts.preservation + adjust);
  }
  
  return accounts;
}

// ── 计算资产配置偏差 ───────────────────────────
function calcAllocationDrift(d) {
  const target = getTargetAllocation(d.riskPref, d.age, d.yearsToRetire);
  const total = d.totalAssets || 1;
  
  // 计算所有资产类型的当前占比
  const current = {
    cash: ((d.cash || 0) / total) * 100,
    moneyFund: ((d.moneyFund || 0) / total) * 100,
    savingsPlan: ((d.savingsPlan || 0) / total) * 100,
    bonds: ((d.bonds || 0) / total) * 100,
    stocks: ((d.stocks || 0) / total) * 100,
    trust: ((d.trust || 0) / total) * 100,
    property: ((d.property || 0) / total) * 100,
    gold: ((d.gold || 0) / total) * 100,
    alternatives: ((d.alternatives || 0) / total) * 100,
    otherInvest: ((d.otherInvest || 0) / total) * 100,
  };
  
  // 计算所有资产的总和（应为100%）
  const displayedTotal = Object.values(current).reduce((a, b) => a + b, 0);
  
  const drift = {};
  Object.keys(target).forEach(k => {
    drift[k] = {
      current: current[k] || 0,
      target: target[k],
      diff: (current[k] || 0) - target[k],
    };
  });
  
  return { target, current, drift, displayedTotal };
}

// ── 生成调仓建议 ──────────────────────────────
function genRebalanceAdvice(drift, total, currency, currentAssets) {
  const advices = [];
  const c = currency || 'USD';
  const fmtPct = function(n) { return n.toFixed(1) + '%'; };
  
  // 无目标配置的资产类型（不生成调仓建议，只在已有时显示）
  const noTargetAssets = ['trust', 'property', 'alternatives', 'otherInvest'];
  
  // 资产名称映射
  const assetNameMap = {
    cash: '流动现金',
    moneyFund: '货币基金',
    savingsPlan: '储蓄保险',
    bonds: '债券基金',
    stocks: '股票基金',
    gold: '黄金',
    trust: '信托资产',
    property: '房产',
    alternatives: '私募基金',
    otherInvest: '其他投资'
  };
  
  Object.entries(drift).forEach(function(entry) {
    const asset = entry[0];
    const data = entry[1];
    
    // 跳过无目标配置的资产类别
    if (noTargetAssets.includes(asset)) return;
    
    if (Math.abs(data.diff) > 5) {
      const action = data.diff > 0 ? '减持' : '增持';
      const amount = Math.abs(data.diff / 100 * total);
      const assetName = assetNameMap[asset] || asset;
      
      advices.push({
        asset: asset,
        action: action,
        amount: amount,
        priority: Math.abs(data.diff) > 10 ? 'high' : 'medium',
        text: action + ' ' + assetName + ' ' + fmtPct(Math.abs(data.diff)) + '（约 ' + fmt(amount, c) + '）'
      });
    }
  });
  
  return advices.sort(function(a, b) { return Math.abs(b.amount) - Math.abs(a.amount); });
}

// ═══════════════════════════════════════════════════════════════
// 投资大师智慧配置体系
// 双层框架：四大账户 + 风险偏好微调
// 资产映射：cash=现金, moneyFund=货币基金, savingsPlan=储蓄险, bonds=债券基金, stocks=股票基金, gold=黄金
// ═══════════════════════════════════════════════════════════════

// 四大账户配置（基础比例）
const fourAccounts = {
  // 要花的钱：满足9-12个月日常支出
  spending: {
    name: '要花的钱',
    desc: '满足9-12个月日常支出，流动性第一',
    assets: ['cash', 'moneyFund'],
    baseRatio: 10
  },
  // 保命的钱：风险保障
  protection: {
    name: '保命的钱',
    desc: '风险保障，以小博大',
    assets: ['savingsPlan'],
    baseRatio: 20
  },
  // 生钱的钱：追求收益，风险资产
  growth: {
    name: '生钱的钱',
    desc: '追求收益，承担可控风险',
    assets: ['stocks'],
    baseRatio: 30
  },
  // 保值的钱：稳健增值
  preservation: {
    name: '保值的钱',
    desc: '稳健增值，保本为先',
    assets: ['savingsPlan', 'bonds', 'gold'],
    preservationRatio: 0.2, // 保值账户中20%放储蓄险，80%放债券+黄金
    baseRatio: 40
  }
};

// 大师智慧配置
const wisdomData = {
  conservative: {
    master: 'Harry Browne',
    name: '永久组合',
    period: '1970s-2000s',
    quote: '在任何经济环境下保护你的财富',
    principle: '无论经济处于繁荣、衰退、通胀或通缩，至少有一个资产表现良好。简单、被动、防御性',
    // 四大账户比例
    accounts: { spending: 12, protection: 22, growth: 18, preservation: 48 },
    // 6资产配置（总计100%）
    allocation: { cash: 8, moneyFund: 4, savingsPlan: 32, bonds: 27, stocks: 18, gold: 11 }
  },
  moderate: {
    master: 'Ray Dalio',
    name: '全天候策略',
    period: '1996-至今',
    quote: '投资的圣杯是找到15个良好的、互不相关的回报流',
    principle: '风险平价，让不同资产对组合风险的贡献相等。基于经济四季理论和债务周期',
    accounts: { spending: 10, protection: 20, growth: 30, preservation: 40 },
    allocation: { cash: 6, moneyFund: 4, savingsPlan: 28, bonds: 22, stocks: 28, gold: 12 }
  },
  growth: {
    master: 'Benjamin Graham',
    name: '价值投资',
    period: '1970s-至今',
    quote: '投资最重要的是不亏钱',
    principle: '安全边际、内在价值、长期持有。只买价格低于内在价值30%以上的标的',
    accounts: { spending: 8, protection: 18, growth: 38, preservation: 36 },
    allocation: { cash: 5, moneyFund: 3, savingsPlan: 25, bonds: 20, stocks: 35, gold: 12 }
  },
  aggressive: {
    master: 'John Bogle',
    name: '指数基金',
    period: '1974-至今',
    quote: '在长期，复利是王者，低费率是大臣',
    principle: '低成本、分散化、长期持有。选择费率最低的指数基金，定期定投，不择时',
    accounts: { spending: 5, protection: 15, growth: 48, preservation: 32 },
    allocation: { cash: 3, moneyFund: 2, savingsPlan: 25, bonds: 18, stocks: 45, gold: 7 }
  }
};

// ── 生成行动清单 ──────────────────────────────
function genActionPlan(d) {
  const c = d.currency || 'USD';
  const actions = {
    immediate: [], // 立即（0-1个月）
    short: [],     // 短期（1-6个月）
    medium: [],    // 中期（6-24个月）
    long: [],      // 长期（2年+）
  };
  
  // 立即行动
  if (d.emergencyCoverage < 0.5) {
    actions.immediate.push({
      icon: '🚨',
      title: '建立紧急预备金',
      desc: '当前仅覆盖 ' + (d.emergencyCoverage * (d.emergencyMonths || 6)).toFixed(1) + ' 个月，目标 ' + d.emergencyMonths + ' 个月（' + fmt(d.emergencyTarget, c) + '）',
      priority: 'critical'
    });
  }
  if (d.monthlySurplus < 0) {
    actions.immediate.push({
      icon: '✂️',
      title: '削减弹性支出',
      desc: '月度赤字 ' + fmt(Math.abs(d.monthlySurplus), c) + '，立即审查餐饮/娱乐/购物支出',
      priority: 'critical'
    });
  }
  if (d.debtRatio > 0.4) {
    actions.immediate.push({
      icon: '💳',
      title: '制定债务清偿计划',
      desc: '债务占收入 ' + (d.debtRatio * 100).toFixed(1) + '%，优先偿还信用卡等高息债务',
      priority: 'high'
    });
  }
  
  // 短期行动
  if (d.emergencyCoverage < 1) {
    actions.short.push({
      icon: '🏦',
      title: '补充紧急预备金',
      desc: '每月从结余中划拨 ' + fmt(Math.max(d.monthlySurplus * 0.3, d.emergencyTarget / 12), c) + '，3-6个月达标',
      priority: 'high'
    });
  }
  if (d.savingsRate < 0.2) {
    actions.short.push({
      icon: '💰',
      title: '建立强制储蓄机制',
      desc: '工资到账自动划转20%至独立储蓄账户，先储蓄后消费',
      priority: 'high'
    });
  }
  if (d.passiveRatio < 0.2) {
    actions.short.push({
      icon: '📈',
      title: '配置境外储蓄分红险',
      desc: '利用月结余配置美元/港币储蓄险，锁定长期复利，建立被动收入基础',
      priority: 'medium'
    });
  }
  
  // 中期行动
  if (d.retireGap > 0) {
    const monthlyNeed = d.retireCapNeeded / (d.yearsToRetire * 12);
    actions.medium.push({
      icon: '🏝️',
      title: '加速退休储备',
      desc: '每月需额外投入 ' + fmt(monthlyNeed, c) + '，可通过增额储蓄险+指数基金组合实现',
      priority: 'high'
    });
  }
  if (d.eduGoal > 0 && d.eduMonthly > d.monthlySurplus * 0.3) {
    actions.medium.push({
      icon: '🎓',
      title: '教育金专项规划',
      desc: '当前月供压力较大，建议延长储备期或调整教育目标预期',
      priority: 'medium'
    });
  }
  if (d.trust === 0 && d.totalAssets > 500000) {
    actions.medium.push({
      icon: '🏛️',
      title: '设立信托架构',
      desc: '咨询专业信托顾问，设计适合家庭的离岸信托结构（BVI/开曼/新加坡）',
      priority: 'medium'
    });
  }
  
  // 长期行动
  actions.long.push({
    icon: '🌐',
    title: '多货币资产配置',
    desc: '逐步将资产分散至美元、港币、新加坡元，降低单一货币风险',
    priority: 'medium'
  });
  actions.long.push({
    icon: '🔄',
    title: '年度资产再平衡',
    desc: '每年检视一次资产配置，根据年龄增长逐步降低权益类比例',
    priority: 'low'
  });
  if (d.legacyWish !== 'none') {
    actions.long.push({
      icon: '📜',
      title: '完善财富传承方案',
      desc: '结合信托、保险、遗嘱，设计代际传承的完整架构',
      priority: 'medium'
    });
  }
  
  return actions;
}

// ── 主要建议生成器 ────────────────────────────
function genAdvices(d) {
  const c = d.currency || 'USD';
  const advs = [];
  if (d.emergencyCoverage < 0.5) advs.push({ t: 'urgent', h: '紧急预备金严重不足', b: '当前流动现金 <strong>' + fmt(d.cash, c) + '</strong>，仅覆盖约 <strong>' + (d.emergencyCoverage * (d.emergencyMonths || 6)).toFixed(1) + ' 个月</strong>生活费。建议立即补充至 <strong>' + fmt(d.emergencyTarget, c) + '</strong>，存入高流动性账户。这是一切规划的地基。' });
  else if (d.emergencyCoverage < 1) advs.push({ t: 'warn', h: '紧急预备金略显不足', b: '建议将流动现金提升至 <strong>' + fmt(d.emergencyTarget, c) + '</strong>，当前覆盖 <strong>' + (d.emergencyCoverage * 100).toFixed(0) + '%</strong>，优先从月度结余补仓。' });
  if (d.debtRatio > 0.4) advs.push({ t: 'urgent', h: '债务负担过重', b: '月度债务还款占总收入 <strong>' + (d.debtRatio * 100).toFixed(1) + '%</strong>，超出警戒线（40%）。建议优先偿还高息债务，降低杠杆风险。' });
  else if (d.debtRatio > 0.25) advs.push({ t: 'warn', h: '债务比率偏高', b: '当前债务比率 ' + (d.debtRatio * 100).toFixed(1) + '%，建议12-24个月内有计划降至25%以内。' });
  if (d.monthlySurplus < 0) advs.push({ t: 'urgent', h: '月度现金流为负', b: '每月支出超收入 <strong>' + fmt(Math.abs(d.monthlySurplus), c) + '</strong>，需立即审查弹性支出（' + fmt(d.flexExp, c) + '/月）。' });
  else if (d.savingsRate < 0.15) advs.push({ t: 'warn', h: '储蓄率偏低', b: '综合储蓄率约 <strong>' + (d.savingsRate * 100).toFixed(1) + '%</strong>，低于建议值20%。建议建立强制储蓄习惯，先储蓄再消费。' });
  if (d.retireGap > 0 && d.yearsToRetire > 0) { var mn = d.retireCapNeeded / (d.yearsToRetire * 12); advs.push({ t: 'warn', h: '退休收入存在缺口', b: '退休后被动收入缺口约 <strong>' + fmt(d.retireGap, c) + '/月</strong>，需额外积累 <strong>' + fmt(d.retireCapNeeded, c) + '</strong>。每月至少需额外投入 <strong>' + fmt(mn, c) + '</strong>。' }); }
  if (d.passiveRatio < 0.2 && d.totalIncome > 0) advs.push({ t: 'warn', h: '被动收入占比偏低', b: '被动收入仅占 <strong>' + (d.passiveRatio * 100).toFixed(1) + '%</strong>。建议通过储蓄险红利、股息ETF、信托分配逐步提升至40%+。' });
  else if (d.passiveRatio >= 0.5) advs.push({ t: 'good', h: '被动收入结构良好', b: '被动收入占总收入 <strong>' + (d.passiveRatio * 100).toFixed(1) + '%</strong>，财务韧性强，接近财务自由状态。' });
  if ((d.legacyWish === 'trust' || d.legacyWish === 'full') && d.trust === 0 && d.totalAssets > 500000) advs.push({ t: 'warn', h: '信托规划时机已成熟', b: '总资产 <strong>' + fmt(d.totalAssets, c) + '</strong>，尚未设立信托。建议尽早完成架构设计，资产越早进入信托保护效果越好。' });
  if (d.property > d.totalAssets * 0.6) advs.push({ t: 'warn', h: '资产过度集中于房产', b: '房产占总资产 <strong>' + pct(d.property, d.totalAssets) + '</strong>，建议新增储蓄配置流动资产（保险、ETF、黄金）。' });
  if (advs.length === 0) advs.push({ t: 'good', h: '财务状况整体良好', b: '各项财务指标处于健康区间。维持现有规划节奏，每年做一次资产再平衡。' });
  return advs;
}

function renderAdvices(containerId, advs) {
  el(containerId).innerHTML = advs.map(function(a) {
    var dotClass = a.t === 'urgent' ? 'r' : a.t === 'warn' ? 'y' : 'g';
    return '<div class="ab ' + a.t + '"><div class="ah"><span class="dot ' + dotClass + '"></span>' + a.h + '</div><div class="abody">' + a.b + '</div></div>';
  }).join('');
}

// ── 页面激活导航 ─────────────────────────────
function initNav(page) {
  document.querySelectorAll('.nav-link').forEach(function(l) {
    l.classList.toggle('active', l.dataset.page === page);
  });
}
