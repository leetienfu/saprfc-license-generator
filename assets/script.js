// ========== 安全防护与使用限制 ==========

// API配置
const API_CONFIG = {
    // Cloudflare Workers API URL地址（推荐）
    // 格式：'https://your-worker.your-subdomain.workers.dev'
    BASE_URL: '', // 如果留空，则使用纯前端模式
    
    // Vercel备用API（可选）
    // BASE_URL: 'https://your-app.vercel.app/api',
    
    VERSION: '1.0.0',
    
    // 部署模式：'offline' = 纯前端模式，'api' = API模式
    MODE: 'offline' // 纯前端模式 - 无需后端API
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

// 验证注册码（纯前端模式）
function verifyLicenseOffline(licenseCode, machineCode) {
    try {
        // Base64解码
        const decodedData = Base64Decode(licenseCode);
        
        // XOR解密
        const decryptedData = XOREncrypt(decodedData, 'YourSecretKey2024');
        
        // 解析数据格式：machineCode|expiryDate
        const parts = decryptedData.split('|');
        
        if (parts.length !== 2) {
            return { success: false, error: '许可证格式无效' };
        }
        
        const licenseMachineCode = parts[0];
        const expiryDateStr = parts[1];
        
        // 如果提供了机器码，验证是否匹配
        if (machineCode && licenseMachineCode !== machineCode) {
            return { success: false, error: '机器码不匹配' };
        }
        
        // 验证到期日期
        const expiryDate = new Date(expiryDateStr + 'T23:59:59');
        const currentDate = new Date();
        
        if (expiryDate < currentDate) {
            return {
                success: false,
                error: '许可证已过期',
                expiryDate: expiryDateStr,
                currentDate: formatDate(currentDate)
            };
        }
        
        // 检查是否是当年最后一天或之前
        const currentYear = currentDate.getFullYear();
        const yearEnd = new Date(currentYear, 11, 31);
        const validExpiryDate = expiryDate > yearEnd ? yearEnd : expiryDate;
        
        return {
            success: true,
            valid: true,
            expiryDate: formatDate(validExpiryDate),
            daysRemaining: Math.ceil((validExpiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)),
            machineCode: licenseMachineCode,
            version: API_CONFIG.VERSION,
            verifiedAt: new Date().toISOString()
        };
        
    } catch (error) {
        return { success: false, error: '许可证解密失败，格式可能已被篡改' };
    }
}

// 生成注册码（纯前端模式）
function generateLicenseOffline(machineCode) {
    try {
        // 机器码验证
        const validation = validateMachineCode(machineCode);
        if (!validation.valid) {
            return { success: false, error: validation.message };
        }
        
        // 生成到期日期（当年最后一天）
        const currentYear = new Date().getFullYear();
        const expiryDate = new Date(currentYear, 11, 31); // 12月31日
        
        // 组合数据：机器码|到期日期
        const licenseData = `${machineCode}|${formatDate(expiryDate)}`;
        
        // 使用加密
        const encryptedData = XOREncrypt(licenseData, 'YourSecretKey2024');
        const licenseCode = Base64Encode(encryptedData);
        
        return {
            success: true,
            licenseCode: licenseCode,
            expiryDate: formatDate(expiryDate),
            machineCode: machineCode,
            version: API_CONFIG.VERSION,
            generatedAt: new Date().toISOString()
        };
        
    } catch (error) {
        return { success: false, error: '生成注册码时发生错误' };
    }
}

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

// 禁用F12开发者工具和打印快捷键
document.onkeydown = function(e) {
    if (e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || // Ctrl+Shift+I/J
        (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
        (e.ctrlKey && e.keyCode === 80) || // Ctrl+P (打印)
        (e.ctrlKey && e.keyCode === 83)) { // Ctrl+S (保存)
        e.preventDefault();
        return false;
    }
};

// 禁用右键菜单
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

// 禁用选择和拖拽
document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
});

document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
});

// 监听开发者工具（增强版）
let devtools = {open: false, orientation: null};
let devtoolsDetected = false;
const threshold = 160;
const widthThreshold = window.outerWidth - window.innerWidth > threshold;
const heightThreshold = window.outerHeight - window.innerHeight > threshold;

if (!(heightThreshold && widthThreshold) && 
    ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)) {
    devtools.open = true;
    devtools.orientation = widthThreshold ? 'vertical' : 'horizontal';
    devtoolsDetected = true;
}

// 增强的反调试检测
function detectDevTools() {
    const start = Date.now();
    debugger; // 这会暂停执行
    const end = Date.now();
    
    if (end - start > 100) {
        return true; // 检测到调试器
    }
    return false;
}

// 检查控制台API
function checkConsoleAPI() {
    let devtools = false;
    if (window.console) {
        const symbols = ['_commandLineAPI', '__commandLineAPI', '_console', 'console'];
        symbols.forEach(symbol => {
            if (window.console[symbol] !== undefined) {
                devtools = true;
            }
        });
    }
    return devtools;
}

// 定期检查开发者工具状态
setInterval(function() {
    const consoleAPI = checkConsoleAPI();
    const debug = detectDevTools();
    
    if ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || 
        widthThreshold || heightThreshold || consoleAPI || debug) {
        
        if (devtools.open) {
            // 如果检测到开发者工具打开，清除控制台并显示警告
            console.clear();
            console.warn('%c检测到开发者工具！', 'color: red; font-size: 20px; font-weight: bold;');
            console.warn('%c请关闭开发者工具以继续使用此软件', 'color: red; font-size: 16px;');
            
            // 可以进一步限制功能
            if (++devtoolsDetected > 5) {
                alert('检测到多次使用开发者工具，软件功能将受限。');
            }
        }
        devtools.open = true;
    } else {
        devtools.open = false;
        devtoolsDetected = Math.max(0, devtoolsDetected - 1);
    }
}, 1000);

// 防止页面被修改
function protectPage() {
    // 防止iframe嵌套
    if (window.top !== window.self) {
        window.top.location = window.self.location;
    }
    
    // 防止页面离开
    window.addEventListener('beforeunload', function(e) {
        e.preventDefault();
        e.returnValue = '确定要离开此页面吗？';
    });
    
    // 定期检查页面完整性
    setInterval(function() {
        const title = document.title;
        const hasExpectedTitle = title.includes('VBA注册码生成器');
        const hasExpectedElement = document.querySelector('.container') !== null;
        
        if (!hasExpectedTitle || !hasExpectedElement) {
            console.clear();
            console.warn('页面可能被修改！');
            location.reload();
        }
    }, 5000);
}

// 增强的机器码验证
function validateMachineCode(machineCode) {
    // 基本格式检查
    if (!machineCode || machineCode.length < 8 || machineCode.length > 64) {
        return { valid: false, message: '机器码长度应为8-64位字符' };
    }
    
    // 检查是否包含非法字符
    const illegalChars = /[<>:"|?*\\]/;
    if (illegalChars.test(machineCode)) {
        return { valid: false, message: '机器码包含非法字符' };
    }
    
    // 检查是否是常见的测试码
    const testCodes = ['test', '123456', '000000', 'admin', 'demo'];
    if (testCodes.includes(machineCode.toLowerCase())) {
        return { valid: false, message: '不允许使用测试机器码' };
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

    // 尝试在线模式
    try {
        let result;
        
        if (API_CONFIG.MODE === 'api' && API_CONFIG.BASE_URL) {
            result = await generateLicenseOnline(machineCode);
        } else {
            result = generateLicenseOffline(machineCode);
        }
        
        if (result.success) {
            showLicenseResult(result, machineCode);
            return;
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

    // 尝试在线验证
    try {
        let result;
        
        if (API_CONFIG.MODE === 'api' && API_CONFIG.BASE_URL) {
            result = await verifyLicenseOnline(licenseCode, machineCode);
        } else {
            result = verifyLicenseOffline(licenseCode, machineCode);
        }
        
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
// 与VBA端完全一致的加密算法
// ============================================================================

// XOR加密函数（与VBA端完全一致）
function XOREncrypt(plainText, key) {
    let result = '';
    const keyLength = key.length;
    
    // VBA中的循环从1开始，这里调整为0开始但逻辑相同
    for (let i = 0; i < plainText.length; i++) {
        const charCode = plainText.charCodeAt(i);
        const keyCharCode = key.charCodeAt((i) % keyLength);
        result += String.fromCharCode(charCode ^ keyCharCode);
    }
    
    return result;
}

// Base64编码函数（与VBA端完全一致）
function Base64Encode(binaryData) {
    // 使用与VBA相同的编码方式
    // VBA使用MSXML2.DOMDocument进行Base64编码
    // 这里使用标准的Base64编码，确保一致性
    try {
        // 将字符串转换为字节数组
        const encoder = new TextEncoder();
        const data = encoder.encode(binaryData);
        
        // 手动Base64编码，确保与VBA的MSXML2.DOMDocument结果一致
        let binaryString = '';
        for (let i = 0; i < data.length; i++) {
            binaryString += String.fromCharCode(data[i]);
        }
        
        return btoa(binaryString);
    } catch (error) {
        console.error('Base64编码错误:', error);
        throw new Error('Base64编码失败');
    }
}

// Base64解码函数（与VBA端完全一致）
function Base64Decode(base64String) {
    try {
        // 与VBA的MSXML2.DOMDocument解码保持一致
        const binaryString = atob(base64String);
        const data = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
            data[i] = binaryString.charCodeAt(i);
        }
        
        const decoder = new TextDecoder();
        return decoder.decode(data);
    } catch (error) {
        console.error('Base64解码错误:', error);
        throw new Error('Base64解码失败');
    }
}

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
    // 启用页面保护
    protectPage();
    
    // 检查服务器连接
    setTimeout(() => {
        checkServerConnection();
    }, 1000);
    
    console.log('SAPRFC License System 启动成功');
    console.log('部署模式:', API_CONFIG.MODE === 'api' ? 'API模式' : '离线模式');
    if (API_CONFIG.BASE_URL) {
        console.log('API地址:', API_CONFIG.BASE_URL);
    }
});
