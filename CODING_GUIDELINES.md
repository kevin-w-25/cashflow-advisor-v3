# 💡 编程经验教训总结

> 基于 2026-03-24 的开发复盘

---

## 一、变量命名冲突

### 问题
多个文件定义了相同的全局变量或函数，导致 `Identifier has already been declared` 错误。

### 典型案例
| 冲突项 | 冲突文件 | 解决方案 |
|--------|----------|----------|
| `v` 函数 | app.js + planner.html | 只在 app.js 定义 |
| `el` 函数 | app.js + planner.html | 只在 app.js 定义 |
| `sym` 对象 | app.js + monthly.html | 只在 app.js 定义 |
| `fmt` 函数 | app.js + monthly.html | 只在 app.js 定义 |
| `STORAGE_KEY` | storage.js + retirement.html | 重命名为 `RETIREMENT_STORAGE_KEY` |
| `getClients` | storage.js + monthly.html | 在 storage.js 添加别名 |
| `wisdomData` | app.js 中有重复定义 | 删除重复部分 |

### 经验
```
✅ 公共函数/变量只在一个地方定义（shared/ 或 assets/）
✅ 页面级脚本不重复定义公共函数
✅ 全局常量使用统一前缀（如 RETIREMENT_ 前缀区分）
```

---

## 二、数据结构不匹配

### 问题
读取数据时假设的数据结构与实际存储结构不一致。

### 典型案例

**客户数据结构规范：**
```javascript
// ✅ 正确的数据结构
{
  id: "xxx",
  name: "张三",
  age: 35,
  raw: {
    activeIncome: 50000,
    housing: 8000,
    daily: 5000,
    // ...其他原始数据
  },
  derived: {
    totalIncome: 60000,
    totalExpense: 20000,
    // ...派生计算数据
  }
}

// ❌ 错误：直接访问 client.activeIncome
// ✅ 正确：const raw = client.raw || client; raw.activeIncome
```

**问题表现：**
- monthly.html 加载客户数据为空 → 因为访问 `client.activeIncome` 而不是 `client.raw.activeIncome`
- retirement.html 支出数据为0 → 同理

### 经验
```
✅ 读写数据前，先确认数据结构
✅ 使用 const raw = client.raw || client; 兼容两种结构
✅ 定义明确的数据模型文档
```

---

## 三、函数参数名不匹配

### 问题
调用函数时传入的参数名与函数期望的参数名不一致。

### 典型案例
```javascript
// 函数定义
function renderTimeline({ age, retireAge, lifeExp, depletion }) { ... }

// 调用时错误
renderTimeline({ age, retireAge, lifeExp, depletionMedium }); // ❌

// 调用时正确
renderTimeline({ age, retireAge, lifeExp, depletion: depletionMedium }); // ✅
```

### 经验
```
✅ 调用函数时参数名必须与定义完全一致
✅ 或使用对象解构赋值时指定别名
```

---

## 四、字段名映射错误

### 问题
planner.html 存储的字段名与其他页面期望的字段名不一致。

### 典型案例

**月度对账 (monthly.html) vs 规划器 (planner.html)：**

| monthly 分类 | planner 细项 |
|-------------|-------------|
| 刚性支出 | housing + propertyFee + daily + transport + medical + education + premiumExp |
| 弹性支出 | flexExp + otherExp |
| 债务还款 | debtExp |

**退休规划 (retirement.html) vs 规划器 (planner.html)：**

| retirement 字段 | planner 字段 |
|----------------|-------------|
| 当前总资产 | cash + moneyFund + savingsPlan + bonds + stocks + trust + property + gold + alternatives + otherInvest |
| 退休后基础支出 | housing + propertyFee + daily + transport + medical + premiumExp |

### 经验
```
✅ 定义统一的字段映射表（类似本项目的 FIELD_MAPPING）
✅ 页面间数据传输使用映射函数转换
✅ 文档中明确记录每个页面的数据依赖
```

---

## 五、JavaScript 语法错误

### 问题
代码中存在语法错误导致脚本加载失败。

### 典型案例

**1. 重复定义块：**
```javascript
// app.js 中存在重复的 wisdomData 结尾
wisdomData = { ... };  // 第一次定义
// ... 中间代码 ...
wisdomData = { ... };  // 重复定义开始
  },
  allWeather: { ... }
};                      // 这部分变成孤立代码
// ... 其他代码 ...
// };                     // 多余的闭合括号
```

**2. 函数定义遗漏：**
```javascript
// ❌ 错误：函数体内定义了函数（语法问题）
function test() {
  function inner() { ... }
}

// ✅ 正确：直接定义内部逻辑
function test() {
  const inner = () => { ... };
}
```

### 经验
```
✅ 每次修改后使用 read_lints 工具检查语法
✅ Ctrl+F5 强制刷新清除缓存
✅ 检查是否有重复的代码块
```

---

## 六、脚本加载顺序

### 问题
脚本加载顺序不正确，导致依赖的函数未定义。

### 典型案例
```html
<!-- ❌ 错误顺序 -->
<script src="storage.js"></script>    <!-- 后加载 -->
<script src="app.js"></script>       <!-- 先加载，依赖 storage.js -->

<!-- ✅ 正确顺序：被依赖的先加载 -->
<script src="app.js"></script>       <!-- 依赖 storage.js，后加载会覆盖 -->
<script src="storage.js"></script>   <!-- 被依赖，先加载 -->
```

### 经验
```
✅ 被依赖的文件先加载
✅ HTML 内联脚本放在所有外部脚本之后
✅ 使用 IIFE 或 DOMContentLoaded 确保 DOM 加载完成
```

---

## 七、计算逻辑硬编码

### 问题
使用硬编码的假设值，而不是客户实际数据。

### 典型案例

**医疗费用：**
```javascript
// ❌ 硬编码
const preRetireMedical = 8000;

// ✅ 使用客户实际数据
const clientMonthlyMedical = clientData?.medical || 0;
const preRetireMedical = clientMonthlyMedical > 0 
  ? clientMonthlyMedical * 12 
  : 8000; // 无数据时使用默认值
```

### 经验
```
✅ 优先使用客户输入的实际数据
✅ 只有在没有数据时才使用统计平均值作为默认值
✅ 计算公式要清晰标注数据来源
```

---

## 八、localStorage 存储格式不一致

### 问题
同一功能的数据存储格式在不同函数中不一致。

### 典型案例
```javascript
// ❌ 不一致
function save(record) { localStorage.setItem(key, record); }
function load(id) { 
  const data = JSON.parse(localStorage.getItem(key)); // 需要 JSON.parse
  return data; 
}

// ✅ 一致
function save(record) { localStorage.setItem(key, JSON.stringify(record)); }
function load(id) { 
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}
```

### 经验
```
✅ 统一存储格式（全部 JSON.stringify）
✅ 统一读取格式（全部 JSON.parse + 空值检查）
✅ 使用工具函数封装 localStorage 操作
```

---

## 九、开发调试清单

每次修改代码后，**按顺序执行**：

1. **语法检查**
   ```
   使用 read_lints 工具检查当前文件
   ```

2. **强制刷新**
   ```
   Ctrl + F5 清除浏览器缓存
   ```

3. **控制台检查**
   ```
   打开开发者工具 → Console 标签
   查看是否有 Error
   ```

4. **功能验证**
   ```
   核心操作走一遍（保存→重新打开→验证数据）
   ```

5. **回归测试**
   ```
   检查修改是否影响其他页面
   ```

---

## 十、代码规范建议

### 文件组织
```
├── index.html          # 首页
├── planner.html        # 财务规划器
├── monthly.html        # 月度对账
├── scenarios.html      # 场景模拟
├── portfolio.html      # 投资组合
├── insurance.html      # 保险分析
├── retirement.html      # 退休规划
├── assets/
│   ├── app.js          # 公共函数（el, v, fmt, sym 等）
│   └── storage.js      # 数据存储 API
└── css/
    └── style.css       # 全局样式
```

### 函数命名规范
```
✅ loadClientData()     # 加载客户数据
✅ saveClientData()     # 保存客户数据  
✅ loadClientProfile()   # 加载客户到表单
✅ calcXxx()            # 计算 Xxx
✅ renderXxx()          # 渲染 Xxx
✅ formatXxx()          # 格式化 Xxx
```

### 常量命名规范
```
✅ STORAGE_KEY          # 存储键（storage.js）
✅ RETIREMENT_STORAGE_KEY  # 带前缀区分
✅ CURRENCY_SYMBOLS      # 复数表示集合
```

---

## 十一、快速参考

### 客户数据访问
```javascript
// 获取客户列表
const clients = loadAllClients();

// 查找单个客户
const client = clients.find(c => c.id === clientId);

// 访问原始数据（兼容写法）
const raw = client.raw || client;
```

### 常用函数
```javascript
// DOM 操作
el(id)           // 获取元素
v(id)            // 获取输入值
g(id)            // 获取数字值
fmt(n, currency) // 格式化金额
sym[currency]    // 获取货币符号

// 数据存储
loadAllClients()           // 获取所有客户
loadClientData(id)         // 获取客户详细数据
saveClient(clientData)     // 保存客户数据
```

### 常见错误排查
| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| `has already been declared` | 重复定义 | 删除重复的声明 |
| `is not defined` | 函数未定义 | 检查脚本加载顺序 |
| `Cannot read properties of undefined` | 数据结构不匹配 | 检查数据结构 |
| `Unexpected token '}'` | 语法错误 | 检查代码块 |
| 数据为空 | 字段名不匹配 | 检查字段映射 |

---

*最后更新：2026-03-24*
