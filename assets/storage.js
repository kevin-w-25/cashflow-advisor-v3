// ══════════════════════════════════════════════
// storage.js — 客户数据本地存储管理
// ══════════════════════════════════════════════

const STORAGE_KEY = 'cashflow_advisor_data';
const STORAGE_KEY_HISTORY = 'cashflow_advisor_history';

// ── 生成唯一ID ───────────────────────────────
function generateId() {
  return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ── 根据姓名查找客户 ─────────────────────────
function findClientByName(name) {
  try {
    const clients = loadAllClients();
    // 返回匹配姓名的客户（完全匹配）
    return clients.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase()) || null;
  } catch (error) {
    console.error('查找客户失败:', error);
    return null;
  }
}

// ── 保存客户数据 ─────────────────────────────
function saveClientData(rawData, derivedData, mergeByName = false) {
  try {
    const existingData = loadAllClients();

    // 如果启用了姓名合并，且没有提供 ID，则尝试查找同名客户
    let clientId = rawData.id;
    if (mergeByName && !clientId) {
      const existingClient = findClientByName(rawData.name);
      if (existingClient) {
        clientId = existingClient.id;
        console.log(`找到同名客户「${rawData.name}」，将更新现有档案`);
      }
    }

    // 如果仍然没有 ID，则生成新 ID
    if (!clientId) {
      clientId = generateId();
    }

    // 获取现有客户记录（保留 analyses 等字段）
    const existingRecord = existingData.find(c => c.id === clientId) || {};

    const clientRecord = {
      id: clientId,
      name: rawData.name || '未命名',
      age: rawData.age || 0,
      raw: rawData,           // 原始输入数据
      derived: derivedData,  // 计算后的衍生数据
      createdAt: rawData.createdAt || existingRecord.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // 保留分析结果
      analyses: existingRecord.analyses || {},
    };

    // 更新或添加客户记录
    const index = existingData.findIndex(c => c.id === clientId);
    if (index >= 0) {
      existingData[index] = clientRecord;
    } else {
      existingData.push(clientRecord);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));

    // 保存历史记录
    saveHistoryRecord(clientId, rawData, derivedData);

    return clientId;
  } catch (error) {
    console.error('保存数据失败:', error);
    toast('保存数据失败', 'error');
    return null;
  }
}

// ── 保存分析结果 ─────────────────────────────
function saveAnalysisResult(clientId, analysisType, analysisData) {
  try {
    const clients = loadAllClients();
    const index = clients.findIndex(c => c.id === clientId);
    
    if (index < 0) {
      console.error('未找到客户:', clientId);
      return false;
    }

    // 初始化 analyses 字段
    if (!clients[index].analyses) {
      clients[index].analyses = {};
    }

    // 保存分析结果
    clients[index].analyses[analysisType] = {
      data: analysisData,
      updatedAt: new Date().toISOString()
    };

    clients[index].updatedAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    console.log(`分析结果已保存: ${analysisType} -> ${clientId}`);
    return true;
  } catch (error) {
    console.error('保存分析结果失败:', error);
    return false;
  }
}

// ── 加载分析结果 ─────────────────────────────
function loadAnalysisResult(clientId, analysisType) {
  try {
    const client = loadClientData(clientId);
    if (!client || !client.analyses) return null;
    return client.analyses[analysisType] || null;
  } catch (error) {
    console.error('加载分析结果失败:', error);
    return null;
  }
}

// ── 删除分析结果 ─────────────────────────────
function deleteAnalysisResult(clientId, analysisType) {
  try {
    const clients = loadAllClients();
    const index = clients.findIndex(c => c.id === clientId);
    
    if (index < 0) return false;

    if (clients[index].analyses && clients[index].analyses[analysisType]) {
      delete clients[index].analyses[analysisType];
      clients[index].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    }
    return true;
  } catch (error) {
    console.error('删除分析结果失败:', error);
    return false;
  }
}

// ── 加载所有客户 ─────────────────────────────
function loadAllClients() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('加载数据失败:', error);
    return [];
  }
}

// 别名
const getClients = loadAllClients;

// ── 加载单个客户数据 ─────────────────────────
function loadClientData(clientId) {
  try {
    const clients = loadAllClients();
    return clients.find(c => c.id === clientId) || null;
  } catch (error) {
    console.error('加载客户数据失败:', error);
    return null;
  }
}

// ── 删除客户 ─────────────────────────────────
function deleteClient(clientId) {
  try {
    const clients = loadAllClients();
    const filtered = clients.filter(c => c.id !== clientId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    // 删除历史记录
    const history = loadAllHistory();
    const filteredHistory = history.filter(h => h.clientId !== clientId);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filteredHistory));

    toast('客户档案已删除');
    return true;
  } catch (error) {
    console.error('删除客户失败:', error);
    toast('删除失败', 'error');
    return false;
  }
}

// ── 导出所有数据 ─────────────────────────────
function exportAllData() {
  try {
    const clients = loadAllClients();
    const history = loadAllHistory();
    const exportData = {
      clients,
      history,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow_advisor_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast('数据导出成功');
  } catch (error) {
    console.error('导出数据失败:', error);
    toast('导出失败', 'error');
  }
}

// ── 导入数据 ─────────────────────────────────
function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    if (!data.clients || !Array.isArray(data.clients)) {
      throw new Error('无效的数据格式');
    }

    // 合并导入的数据
    const existingClients = loadAllClients();
    const newClients = data.clients.filter(nc =>
      !existingClients.some(ec => ec.id === nc.id)
    );

    const mergedClients = [...existingClients, ...newClients];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedClients));

    // 合并历史记录
    if (data.history && Array.isArray(data.history)) {
      const existingHistory = loadAllHistory();
      const mergedHistory = [...existingHistory, ...data.history];
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(mergedHistory));
    }

    toast(`成功导入 ${newClients.length} 个客户档案`);
    return newClients.length;
  } catch (error) {
    console.error('导入数据失败:', error);
    toast('导入失败，请检查文件格式', 'error');
    return 0;
  }
}

// ── 历史记录管理 ─────────────────────────────

function saveHistoryRecord(clientId, rawData, derivedData) {
  try {
    const history = loadAllHistory();
    const record = {
      id: 'history_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      clientId: clientId,
      name: rawData.name || '未命名',
      raw: rawData,
      derived: derivedData,
      createdAt: new Date().toISOString()
    };

    // 只保留最近50条历史记录
    history.push(record);
    if (history.length > 50) {
      history.shift();
    }

    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
}

function loadAllHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('加载历史记录失败:', error);
    return [];
  }
}

function loadClientHistory(clientId) {
  try {
    const history = loadAllHistory();
    return history.filter(h => h.clientId === clientId);
  } catch (error) {
    console.error('加载客户历史失败:', error);
    return [];
  }
}

// ── 避免命名冲突的别名函数 ───────────────────
function loadClientHistoryRecords(clientId) {
  return loadClientHistory(clientId);
}

// ── 自动保存定时器 ───────────────────────────
let autoSaveTimer = null;

function startAutoSave(saveCallback, intervalMs = 30000) {
  stopAutoSave();
  autoSaveTimer = setInterval(() => {
    if (saveCallback && typeof saveCallback === 'function') {
      try {
        saveCallback();
        toast('已自动保存', 'success');
      } catch (error) {
        console.error('自动保存失败:', error);
      }
    }
  }, intervalMs);
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// ── 清空所有数据 ─────────────────────────────
function clearAllData() {
  if (confirm('确定要清空所有客户数据吗？此操作不可恢复！')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    toast('所有数据已清空');
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// 对账记录管理
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY_RECON = 'cashflow_advisor_reconciliation';

function getReconciliationRecords(clientId) {
  try {
    const data = localStorage.getItem(STORAGE_KEY_RECON);
    const records = data ? JSON.parse(data) : [];
    return records.filter(r => r.clientId === clientId);
  } catch (error) {
    console.error('加载对账记录失败:', error);
    return [];
  }
}

function saveReconciliationRecord(record) {
  try {
    const data = localStorage.getItem(STORAGE_KEY_RECON);
    const records = data ? JSON.parse(data) : [];
    
    // 查找并更新现有记录，或添加新记录
    const index = records.findIndex(r => r.clientId === record.clientId && r.month === record.month);
    if (index >= 0) {
      records[index] = record;
    } else {
      records.push(record);
    }
    
    localStorage.setItem(STORAGE_KEY_RECON, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error('保存对账记录失败:', error);
    return false;
  }
}
