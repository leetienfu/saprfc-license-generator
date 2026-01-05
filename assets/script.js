// ========== 安全防护与使用限制 ==========

// API配置
const API_CONFIG = {
    // Cloudflare Workers API URL地址（必填）
    // 格式：'https://your-worker.your-subdomain.workers.dev'
    BASE_URL: 'https://worker-test.leetienfu.top', // 请替换为您的实际API地址
    
    // Vercel备用API（可选）
    // BASE_URL: 'https://your-app.vercel.app/api',
    
    VERSION: '1.0.0',
    
    // 部署模式：'api' = API模式（安全模式）
    MODE: 'api' // API模式 - 所有逻辑在后端处理
};

// 服务器连接状态
let serverAvailable = true;

// 检查服务器连通性
async function checkServerConnection() {
    if (API_CONFIG.MODE === 'offline') {
        serverAvailable = false;
        return false;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/status`, {
            method: 'GET',
            mode: 'no-cors'
        });
        serverAvailable = true;
        return true;
    } catch (error) {
        console.warn('无法连接到验证服务器');
        serverAvailable = false;
        return false;
    }
}

// 注意：离线验证功能已移除，所有验证都在后端API中进行

// 注意：离线生成功能已移除，所有生成都在后端API中进行

// 服务器端验证许可证
async function verifyLicenseOnline(licenseCode, machineCode) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                licenseCode: licenseCode,
                machineCode: machineCode,
                version: API_CONFIG.VERSION,
                timestamp: Date.now()
            })
        });
        
        if (!response.ok) {
            throw new Error('验证服务器错误');
        }
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        throw new Error('无法连接到验证服务器');
    }
}

// 生成注册码（服务器端）
async function generateLicenseOnline(machineCode) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                machineCode: machineCode,
                version: API_CONFIG.VERSION,
                timestamp: Date.now()
            })
        });
        
        if (!response.ok) {
            throw new Error('生成失败');
        }
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        throw new Error('无法连接到验证服务器');
    }
}

// 注意：前端安全防护功能已移除，因为在前端无法提供真正的安全性
// 真正的安全保护应该在后端API中实现

// 注意：页面保护功能已移除，前端无法提供真正的安全性

// 基础机器码检查（完整验证在后端进行）
function validateMachineCode(machineCode) {
    // 只进行基础的空值检查，完整验证在后端API中进行
    if (!machineCode || machineCode.trim() === '') {
        return { valid: false, message: '请输入机器码' };
    }
    
    return { valid: true };
}

// 标签页切换
function showTab(tabName) {
    // 隐藏所有标签页内容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // 移除所有标签的激活状态
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // 显示选中的标签页
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
    
    // 隐藏结果
    hideResult();
}

// 显示结果
function showResult(content, isError = false) {
    const result = document.getElementById('result');
    const resultContent = document.getElementById('resultContent');
    
    result.className = 'result' + (isError ? ' error' : '');
    resultContent.innerHTML = content;
    result.style.display = 'block';
}

// 隐藏结果
function hideResult() {
    document.getElementById('result').style.display = 'none';
}

// 复制到剪贴板
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('✅ 注册码已复制到剪贴板！');
        }).catch(() => {
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('✅ 注册码已复制到剪贴板！');
}

// 生成注册码（主函数）
async function generateLicense() {
    const machineCode = document.getElementById('machineCode').value.trim();

    if (!machineCode) {
        showResult('<div class="status error">❌ 请输入机器码</div>', true);
        return;
    }

    // 机器码验证
    const validation = validateMachineCode(machineCode);
    if (!validation.valid) {
        showResult(`<div class="status error">❌ ${validation.message}</div>`, true);
        return;
    }

    // 使用API模式生成注册码
    try {
        const result = await generateLicenseOnline(machineCode);
        
        if (result.success) {
            showLicenseResult(result, machineCode);
        } else {
            throw new Error(result.error || '生成失败');
        }
    } catch (error) {
        showResult(`<div class="status error">❌ 生成失败：${error.message}</div>`, true);
    }
}

// 显示注册码结果
function showLicenseResult(result, machineCode) {
    const expiryDate = result.expiryDate || '2026-12-31';
    const licenseCode = result.licenseCode;
    
    const content = `
        <div class="status success">✅ 注册码生成成功！</div>
        <div class="license-code">${licenseCode}</div>
        <button class="copy-btn" onclick="copyToClipboard('${licenseCode}')">📋 复制注册码</button>
        <div style="margin-top: 15px; font-size: 14px; color: #666;">
            <strong>机器码：</strong>${machineCode.substring(0, 16)}...<br>
            <strong>到期日期：</strong>${expiryDate}<br>
            <strong>版本：</strong>${result.version || '1.0.0'}<br>
            <strong>生成时间：</strong>${new Date(result.generatedAt || Date.now()).toLocaleString('zh-CN')}
        </div>
        <div class="info-box" style="margin-top: 15px;">
            <strong>使用说明：</strong><br>
            1. 复制上方注册码<br>
            2. 在VBA应用程序中粘贴注册码<br>
            3. 验证注册码是否有效<br>
            <strong>注意：</strong>注册码仅在生成机器码的设备上有效
        </div>
    `;
    
    showResult(content);
}

// 验证注册码（主函数）
async function verifyLicense() {
    const licenseCode = document.getElementById('verifyLicenseCode').value.trim();
    const machineCode = document.getElementById('machineCode').value.trim(); // 可选，用于验证

    if (!licenseCode) {
        showResult('<div class="status error">❌ 请输入注册码</div>', true);
        return;
    }

    // 注册码格式验证
    if (!validateLicenseFormat(licenseCode)) {
        showResult('<div class="status error">❌ 注册码格式无效</div>', true);
        return;
    }

    // 使用API模式验证注册码
    try {
        const result = await verifyLicenseOnline(licenseCode, machineCode);
        
        if (result.success && result.valid) {
            showVerifyResult(result);
        } else {
            throw new Error(result.error || '验证失败');
        }
    } catch (error) {
        showResult(`<div class="status error">❌ 验证失败：${error.message}</div>`, true);
    }
}

// 显示验证结果
function showVerifyResult(result) {
    const daysRemaining = result.daysRemaining || 0;
    const expiryDate = result.expiryDate || '2026-12-31';
    const machineCode = result.machineCode || '';
    
    const statusClass = daysRemaining > 30 ? 'success' : (daysRemaining > 0 ? 'warning' : 'error');
    const statusMessage = daysRemaining > 30 ? '✅ 注册码有效' : (daysRemaining > 0 ? '⚠️ 注册码即将过期' : '❌ 注册码已过期');
    
    const content = `
        <div class="status ${statusClass}">${statusMessage}</div>
        <div class="license-code">${document.getElementById('verifyLicenseCode').value.trim()}</div>
        <div style="margin-top: 15px; font-size: 14px; color: #666;">
            <strong>到期日期：</strong>${expiryDate}<br>
            <strong>剩余天数：</strong>${daysRemaining} 天<br>
            <strong>机器码：</strong>${machineCode.substring(0, 16)}...<br>
            <strong>版本：</strong>${result.version || '1.0.0'}<br>
            <strong>验证时间：</strong>${new Date(result.verifiedAt || Date.now()).toLocaleString('zh-CN')}
        </div>
        ${daysRemaining <= 30 && daysRemaining > 0 ? '<div class="info-box" style="margin-top: 15px; background: #fff3cd; border-color: #ffeaa7; color: #856404;">⚠️ 您的注册码即将过期，请及时更新。</div>' : ''}
        ${daysRemaining <= 0 ? '<div class="info-box" style="margin-top: 15px; background: #f8d7da; border-color: #f5c6cb; color: #721c24;">❌ 您的注册码已过期，请联系管理员获取新的注册码。</div>' : ''}
    `;
    
    showResult(content);
}

// 验证注册码格式
function validateLicenseFormat(licenseCode) {
    // 基本格式检查：Base64编码的字符串
    if (!licenseCode || licenseCode.length < 20) {
        return false;
    }
    
    // 检查是否只包含Base64字符
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Pattern.test(licenseCode);
}

// ============================================================================
// 注意：所有加密解密逻辑已移至后端API处理
// 前端不再包含任何加密解密函数，确保安全性
// ============================================================================

// ============================================================================
// 辅助函数
// ============================================================================

// 格式化日期为 yyyy-mm-dd
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查服务器连接
    setTimeout(() => {
        checkServerConnection();
    }, 1000);
    
    console.log('VBA注册码生成器启动成功');
    console.log('部署模式:', API_CONFIG.MODE === 'api' ? 'API模式（安全）' : '离线模式');
    if (API_CONFIG.BASE_URL) {
        console.log('API地址:', API_CONFIG.BASE_URL);
    }
});
