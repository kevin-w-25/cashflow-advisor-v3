# 现金流规划助手 · 开发日志

> 每一次迭代都是一次进步，记录是为了更好地前行。

---

## 2026-03-24 改进总结

### 一、数据层修复

#### 1. planner.html 表单数据保存与加载

**问题描述**：
- `loadClientToForm()` 函数之前只加载部分字段，导致以下数据重新打开时丢失
- `collectData()` 函数保存了全部字段，但加载时遗漏

**修复内容**：
```javascript
// 修复前：遗漏的字段
el('s-cash').value = data.cash;
el('s-savings-plan').value = data.savingsPlan;
el('s-stocks').value = data.stocks;
el('s-gold').value = data.gold;
// ❌ 遗漏：moneyFund, bonds, alternatives, otherInvest, housing, propertyFee, daily, transport, education, otherExp

// 修复后：完整加载
el('s-cash').value = data.cash || '';
el('s-money-fund').value = data.moneyFund || '';
el('s-savings-plan').value = data.savingsPlan || '';
el('s-bonds').value = data.bonds || '';
el('s-stocks').value = data.stocks || '';
el('s-trust').value = data.trust || '';
el('s-property').value = data.property || '';
el('s-gold').value = data.gold || '';
el('s-alternatives').value = data.alternatives || '';
el('s-other-invest').value = data.otherInvest || '';
// 支出字段同样完整加载...
```

**经验教训**：
- 数据保存和加载必须对称更新
- 建议使用数据验证脚本检查 `collectData()` 和 `loadClientToForm()` 的字段一致性

---

#### 2. 客户数据结构规范

**数据结构**（storage.js）：
```javascript
{
  id: "client_xxx",
  name: "客户姓名",
  age: 45,
  raw: {           // ⭐ 原始输入数据
    activeIncome: 50000,
    passiveIncome: 10000,
    housing: 8000,
    medical: 2000,
    // ... 其他字段
  },
  derived: {        // ⭐ 计算后的衍生数据
    totalIncome: 60000,
    savingsRate: 0.35,
    // ...
  },
  analyses: {},    // 分析结果
  createdAt: "2026-03-24T...",
  updatedAt: "2026-03-24T..."
}
```

**⚠️ 重要规范**：
- 客户档案中的数据存储在 `raw` 字段内
- 其他页面（如 monthly.html, retirement.html）加载时必须访问 `client.raw.xxx`
- 不要直接访问 `client.activeIncome`，而要访问 `client.raw.activeIncome`

---

### 二、资产配置体系重构

#### 1. 双层资产配置框架

**第一层：四大账户**
| 账户 | 比例范围 | 资产组成 |
|------|---------|---------|
| 要花的钱 | 5-12% | 现金 + 货币基金 |
| 保命的钱 | 15-22% | 储蓄保险 |
| 生钱的钱 | 18-48% | 股票基金 |
| 保值的钱 | 32-48% | 债券基金 + 黄金 + 储蓄险(20%) |

**第二层：风险偏好对应大师**
| 风险偏好 | 大师 | 核心理念 |
|---------|------|---------|
| 保守型 | Harry Browne 永久组合 | 四季皆宜、简单被动 |
| 稳健型 | Ray Dalio 全天候策略 | 风险平价、经济对冲 |
| 成长型 | Benjamin Graham 价值投资 | 安全边际、精选标的 |
| 激进型 | John Bogle 指数基金 | 低成本、长期持有 |

**详细配置表**
| 风险偏好 | 现金 | 货币基金 | 储蓄险 | 股票 | 债券 | 黄金 |
|---------|------|---------|--------|------|------|------|
| 保守型 | 8% | 4% | 32% | 18% | 27% | 11% |
| 稳健型 | 6% | 4% | 28% | 28% | 22% | 12% |
| 成长型 | 5% | 3% | 25% | 35% | 20% | 12% |
| 激进型 | 3% | 2% | 25% | 45% | 18% | 7% |

**年龄微调规则**：
- < 40岁：生钱的钱 +5%，保值的钱 -5%
- 40-50岁：维持标准
- 50-60岁：生钱的钱 -5%，保值的钱 +5%
- > 60岁：生钱的钱 -10%，保值的钱 +10%

**代码实现位置**：`assets/app.js` - `wisdomData` 和 `getTargetAllocation()`

---

#### 2. 资产配置分析显示逻辑

**有目标配置的资产**（根据风险偏好模型）：
- 现金、货币基金、储蓄险、债券、股票、黄金
- ✅ 显示目标线 + 偏差值 + 调仓建议

**无目标配置的资产**（仅显示）：
- 信托、房产、私募基金、其他投资
- ⚠️ 只在已有时显示，标记"在模型外"，不生成调仓建议

```javascript
const hasTargetKeys = ['cash', 'moneyFund', 'savingsPlan', 'bonds', 'stocks', 'gold'];
const noTargetAssets = ['trust', 'property', 'alternatives', 'otherInvest'];
```

---

### 三、JavaScript 错误修复记录

#### 1. 变量名冲突

| 错误 | 原因 | 解决 |
|------|------|------|
| `Identifier 'v' has already been declared` | app.js 和 planner.html 都定义了 v | app.js 已定义，移除重复 |
| `Identifier 'sym' has already been declared` | app.js 和 monthly.html 都定义了 sym | app.js 已定义，移除重复 |
| `Identifier 'STORAGE_KEY' has already been declared` | storage.js 和 retirement.html 都定义了 | 重命名为 `RETIREMENT_STORAGE_KEY` |

**经验教训**：
- 公共函数和常量应在 `app.js` 或 `storage.js` 中统一定义
- 页面脚本只调用公共函数，不重复定义

#### 2. 函数未定义

| 错误 | 原因 | 解决 |
|------|------|------|
| `getClients is not defined` | monthly.html 使用了未导出的函数 | 在 storage.js 添加 `const getClients = loadAllClients;` |
| `getReconciliationRecords is not defined` | monthly.html 使用了未定义的函数 | 在 storage.js 添加 `getReconciliationRecords()` 函数 |

#### 3. 参数传递错误

| 错误 | 原因 | 解决 |
|------|------|------|
| `Cannot read properties of undefined (reading 'depleted')` | `renderTimeline` 参数名不匹配 | 传入 `{ depletion: depletionMedium }` 而非 `{ depletionMedium }` |

---

### 四、跨页面数据对接

#### 1. 支出字段映射

| planner.html 字段 | 含义 | → monthly.html | → retirement.html |
|-----------------|------|----------------|-----------------|
| `housing` | 房贷还款 | 刚性支出 | 退休基础支出 ✓ |
| `propertyFee` | 物业费 | 刚性支出 | 退休基础支出 ✓ |
| `daily` | 餐饮日用 | 刚性支出 | 退休基础支出 ✓ |
| `transport` | 交通 | 刚性支出 | 退休基础支出 ✓ |
| `medical` | 医疗 | 刚性支出 | 退休基础支出 ✓ |
| `education` | 子女教育 | 刚性支出 | ❌ 退休后不计入 |
| `premiumExp` | 保费 | 刚性支出 | 退休基础支出 ✓ |
| `debtExp` | 债务还款 | 刚性支出 | ❌ 退休后不计入 |
| `flexExp` | 弹性消费 | 弹性支出 | ❌ 退休后不计入 |
| `otherExp` | 其他支出 | 弹性支出 | ❌ 退休后不计入 |

**月度对账支出汇总公式**：
```javascript
// 刚性支出
essentialExp = housing + propertyFee + daily + transport + medical + education + premiumExp;

// 弹性支出
flexExp = flexExp + otherExp;
```

**退休规划支出汇总公式**：
```javascript
// 当前年度总支出
annualExpense = housing + propertyFee + daily + transport + medical + education + 
                premiumExp + debtExp + flexExp + otherExp;

// 退休后年度基础支出（不含教育、债务、弹性消费）
retireExpense = housing + propertyFee + daily + transport + medical + premiumExp;
```

---

#### 2. 资产字段映射

**retirement.html 资产汇总**（包含全部10种资产）：
```javascript
totalAssets = cash + moneyFund + savingsPlan + bonds + stocks + 
              trust + property + gold + alternatives + otherInvest;
```

---

### 五、医疗费用计算逻辑

**退休规划中医疗费用的计算**：

```javascript
// 优先使用客户实际的月医疗费用
const clientMonthlyMedical = clientData?.medical || 0;
const preRetireMedical = clientMonthlyMedical > 0 
  ? clientMonthlyMedical * 12  // 使用客户实际数据
  : 8000; // 无数据时使用国家统计平均值

// 退休后年均医疗费（乘以系数）
const postRetireMedical = preRetireMedical * medicalFactor;

// 医疗费用系数（按年龄）
// < 35岁：1.0 | 35-45岁：1.5 | 45-55岁：2.0 | 55岁以上：3.0
```

---

### 六、公共 API 参考

#### storage.js

```javascript
// 加载所有客户
loadAllClients() → Array<Client>

// 加载单个客户
loadClientData(clientId) → Client | null

// 保存客户数据
saveClientData(rawData, derivedData) → clientId

// 根据姓名查找客户
findClientByName(name) → Client | null

// 删除客户
deleteClient(clientId) → boolean

// 别名（兼容旧代码）
const getClients = loadAllClients;
```

#### app.js

```javascript
// 获取 DOM 元素
el(id) → HTMLElement

// 获取输入值
v(id) → string

// 获取数字值
g(id) → number

// 格式化货币
fmt(amount, currency) → string

// 目标资产配置
getTargetAllocation(riskPref, age, yearsToRetire) → { cash, moneyFund, savingsPlan, bonds, stocks, gold }

// 四大账户配置
getFourAccounts(riskPref, age) → { spending, protection, growth, preservation }

// 计算资产配置偏差
calcAllocationDrift(data) → { current, target, drift, total }

// 生成调仓建议
genRebalanceAdvice(drift, total, currency, currentAssets) → Array<Advice>
```

---

### 七、开发规范建议

1. **数据访问规范**
   - 客户档案数据访问：`client.raw.xxx`
   - 衍生数据访问：`client.derived.xxx`

2. **函数定义规范**
   - 公共函数放在 `app.js` 或 `storage.js`
   - 页面脚本只调用，不重复定义
   - 使用 `const xxx = yyy;` 作为别名时放在文件末尾

3. **参数传递规范**
   - 使用对象参数时，确保属性名匹配
   - `{ depletionMedium }` ≠ `{ depletion: depletionMedium }`

4. **字段命名一致性**
   - planner.html 作为数据源
   - 其他页面按需映射字段
   - 更新时同步维护字段映射表

---

### 八、待优化项

1. [ ] 建立字段映射表配置文件
2. [ ] 添加数据验证脚本检查保存/加载对称性
3. [ ] retirement.html 其他字段（如退休后收入）也需要从 `raw` 访问
4. [ ] 考虑将 `loadClientProfile()` 函数统一化，供所有页面使用
5. [ ] scenarios.html 的数据加载也需要检查

---

*文档更新时间：2026-03-24 22:07*
