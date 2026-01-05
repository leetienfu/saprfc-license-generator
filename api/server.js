// Cloudflare Workers / Vercel API 许可证验证服务器
// 基于VBA代码重新编写，确保加密算法完全一致

export default async function handler(request, response) {
    const url = new URL(request.url);
    
    // CORS头设置
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    };
    
    // 处理预检请求
    if (request.method === 'OPTIONS') {
        response.status(200).set(corsHeaders).send('');
        return;
    }
    
    try {
        // 路由处理
        if (url.pathname === '/status' && request.method === 'GET') {
            handleStatus(response, corsHeaders);
        } else if (url.pathname === '/generate' && request.method === 'POST') {
            await handleGenerateLicense(request, response, corsHeaders);
        } else if (url.pathname === '/verify' && request.method === 'POST') {
            await handleVerifyLicense(request, response, corsHeaders);
        } else if (url.pathname === '/info' && request.method === 'GET') {
            handleInfo(response, corsHeaders);
        } else {
            response.status(404).set(corsHeaders).json({
                error: 'API接口不存在',
                availableEndpoints: ['/status', '/generate', '/verify', '/info']
            });
        }
    } catch (error) {
        console.error('服务器错误:', error);
        response.status(500).set(corsHeaders).json({
            error: '服务器内部错误',
            message: error.message
        });
    }
}

// 处理状态查询
function handleStatus(response, corsHeaders) {
    response.status(200).set(corsHeaders).json({
        success: true,
        status: 'running',
        timestamp: new Date().toISOString(),
        message: 'SAPRFC许可证验证服务器运行正常',
        platform: 'Vercel/Netlify Functions'
    });
}

// 处理生成许可证
async function handleGenerateLicense(request, response, corsHeaders) {
    try {
        const requestData = await request.json();
        const { machineCode, version } = requestData;
        
        // 验证必要参数
        if (!machineCode) {
            response.status(400).set(corsHeaders).json({
                success: false,
                error: '缺少必要参数: machineCode'
            });
            return;
        }
        
        // 机器码验证
        const validation = validateMachineCode(machineCode);
        if (!validation.valid) {
            response.status(400).set(corsHeaders).json({
                success: false,
                error: validation.message
            });
            return;
        }
        
        // 生成到期日期（当年最后一天）
        const currentYear = new Date().getFullYear();
        const expiryDate = new Date(currentYear, 11, 31); // 12月31日
        
        // 组合数据：机器码|到期日期 (与VBA端完全一致)
        const licenseData = `${machineCode}|${formatDate(expiryDate)}`;
        
        // 使用与VBA端相同的密钥和算法
        const encryptionKey = process.env.ENCRYPTION_KEY || 'YourSecretKey2024';
        const encryptedData = XOREncrypt(licenseData, encryptionKey);
        const licenseCode = Base64Encode(encryptedData);
        
        // 记录日志
        console.log(`生成许可证: 机器码=${machineCode.substring(0, 8)}..., 到期日期=${formatDate(expiryDate)}`);
        
        response.status(200).set(corsHeaders).json({
            success: true,
            licenseCode: licenseCode,
            expiryDate: formatDate(expiryDate),
            machineCode: machineCode,
            version: version || '1.0.0',
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('生成许可证错误:', error);
        response.status(500).set(corsHeaders).json({
            success: false,
            error: '生成许可证时发生错误'
        });
    }
}

// 处理验证许可证
async function handleVerifyLicense(request, response, corsHeaders) {
    try {
        const requestData = await request.json();
        const { licenseCode, machineCode, version } = requestData;
        
        // 验证必要参数
        if (!licenseCode) {
            response.status(400).set(corsHeaders).json({
                success: false,
                error: '缺少必要参数: licenseCode'
            });
            return;
        }
        
        // 使用与VBA端相同的密钥和算法
        const encryptionKey = process.env.ENCRYPTION_KEY || 'YourSecretKey2024';
        
        try {
            // Base64解码 (与VBA端完全一致)
            const decodedData = Base64Decode(licenseCode);
            
            // XOR解密 (与VBA端完全一致)
            const decryptedData = XOREncrypt(decodedData, encryptionKey);
            
            // 解析数据格式：machineCode|expiryDate
            const parts = decryptedData.split('|');
            
            if (parts.length !== 2) {
                response.status(400).set(corsHeaders).json({
                    success: false,
                    error: '许可证格式无效'
                });
                return;
            }
            
            const licenseMachineCode = parts[0];
            const expiryDateStr = parts[1];
            
            // 如果提供了机器码，验证是否匹配
            if (machineCode && licenseMachineCode !== machineCode) {
                response.status(400).set(corsHeaders).json({
                    success: false,
                    error: '机器码不匹配'
                });
                return;
            }
            
            // 验证到期日期
            const expiryDate = new Date(expiryDateStr + 'T23:59:59');
            const currentDate = new Date();
            
            if (expiryDate < currentDate) {
                response.status(400).set(corsHeaders).json({
                    success: false,
                    error: '许可证已过期',
                    expiryDate: expiryDateStr,
                    currentDate: formatDate(currentDate)
                });
                return;
            }
            
            // 检查是否是当年最后一天或之前
            const currentYear = currentDate.getFullYear();
            const yearEnd = new Date(currentYear, 11, 31);
            const validExpiryDate = expiryDate > yearEnd ? yearEnd : expiryDate;
            
            // 记录日志
            console.log(`验证许可证成功: 机器码=${licenseMachineCode.substring(0, 8)}..., 到期日期=${formatDate(validExpiryDate)}`);
            
            response.status(200).set(corsHeaders).json({
                success: true,
                valid: true,
                expiryDate: formatDate(validExpiryDate),
                daysRemaining: Math.ceil((validExpiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)),
                machineCode: licenseMachineCode,
                version: version || '1.0.0',
                verifiedAt: new Date().toISOString()
            });
            
        } catch (decryptError) {
            response.status(400).set(corsHeaders).json({
                success: false,
                error: '许可证解密失败，格式可能已被篡改'
            });
        }
        
    } catch (error) {
        console.error('验证许可证错误:', error);
        response.status(500).set(corsHeaders).json({
            success: false,
            error: '验证许可证时发生错误'
        });
    }
}

// 处理信息查询
function handleInfo(response, corsHeaders) {
    response.status(200).set(corsHeaders).json({
        success: true,
        server: 'SAPRFC License Server',
        version: '2.0.0',
        platform: 'Vercel/Netlify Functions',
        algorithms: ['XOR', 'Base64'],
        keyLength: (process.env.ENCRYPTION_KEY || 'YourSecretKey2024').length,
        endpoints: {
            'GET /status': '获取服务器状态',
            'POST /generate': '生成许可证',
            'POST /verify': '验证许可证',
            'GET /info': '获取服务器信息'
        },
        timestamp: new Date().toISOString()
    });
}

// ============================================================================
// 与VBA端完全一致的加密算法
// ============================================================================

// 机器码验证
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
