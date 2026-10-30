// 站点根路径（支持部署在 /xxx/ 子路径下，原版写死绝对路径会 404）
var SL_BASE = (function () {
    try { return location.pathname.replace(/\/u\/[^/]*$/, '/'); } catch (e) { return '/'; }
})();

// 重定向逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 从URL中提取短链接ID
    function getShortLinkId() {
        // 优先从查询参数获取
        const urlParams = new URLSearchParams(window.location.search);
        const idFromQuery = urlParams.get('id');
        if (idFromQuery) {
            return idFromQuery;
        }
        
        // 备用：从路径中获取
        const path = window.location.pathname;
        const parts = path.split('/').filter(Boolean);
        
        // 找到u后面的部分
        const uIndex = parts.indexOf('u');
        if (uIndex !== -1 && uIndex + 1 < parts.length) {
            const shortLinkId = parts[uIndex + 1];
            if (shortLinkId !== 'index.html') return shortLinkId;
        }
        // 路径模式：域名/xxx  →  xxx 就是短链 id
        var RESERVED = ['u','data','js','css','docs','index.html','404.html','assets','img'];
        if (parts.length >= 1) {
            var last = parts[parts.length - 1];
            var seg = last.indexOf('.') > -1 ? last.slice(0, last.lastIndexOf('.')) : last;
            if (seg && RESERVED.indexOf(seg) === -1) return seg;
        }
        return '';
    }

    // Base64解码函数
    function decodeBase64(encoded) {
        try {
            return decodeURIComponent(atob(encoded));
        } catch (error) {
            console.error('Base64解码失败:', error);
            return null;
        }
    }

    // URL安全验证函数
    function isValidUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch {
            return false;
        }
    }

    // 显示错误消息并重定向到错误页面
    function showError(type, message) {
        // 重定向到错误页面，携带错误信息
        const errorUrl = `${SL_BASE}u/error.html?type=${type}&message=${encodeURIComponent(message)}`;
        window.location.href = errorUrl;
    }

    // 执行重定向
    function redirectTo(url) {
        window.location.href = url;
    }

    // 初始化重定向流程
    function initRedirect() {
        const shortLinkId = getShortLinkId();
        
        // 如果没有短链接ID，重定向到404页面
        if (!shortLinkId) {
            redirectTo(SL_BASE + 'u/404.html');
            return;
        }
        
        // 显示当前短链接
        const shortLinkElement = document.getElementById('short-link');
        if (shortLinkElement) {
            shortLinkElement.textContent = window.location.href;
        }

        // 加载重定向配置
        fetch(SL_BASE + 'data/redirects.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('无法加载重定向配置');
                }
                return response.json();
            })
            .then(data => {
                // 查找对应的重定向配置
                const redirectConfig = data.redirects[shortLinkId];
                
                if (!redirectConfig) {
                    // 未找到配置，重定向到404页面
                    redirectTo(SL_BASE + 'u/404.html');
                    return;
                }

                // 解码目标URL
                const targetUrl = decodeBase64(redirectConfig.target);
                
                if (!targetUrl) {
                    showError('decode', '目标URL解码失败');
                    return;
                }
                
                // 验证URL安全性
                if (!isValidUrl(targetUrl)) {
                    showError('url', '无效的目标URL');
                    return;
                }

                // 倒计时功能
                let countdown = 3;
                const countdownElement = document.getElementById('countdown');
                
                const countdownInterval = setInterval(() => {
                    countdown--;
                    if (countdownElement) {
                        countdownElement.textContent = countdown;
                    }
                    
                    if (countdown <= 0) {
                        clearInterval(countdownInterval);
                        redirectTo(targetUrl);
                    }
                }, 1000);

                // 手动跳转按钮
                const redirectBtn = document.getElementById('redirect-btn');
                if (redirectBtn) {
                    redirectBtn.addEventListener('click', function() {
                        clearInterval(countdownInterval);
                        redirectTo(targetUrl);
                    });
                }
            })
            .catch(error => {
                console.error('重定向错误:', error);
                showError('config', '重定向过程中发生错误');
            });
    }

    // 初始化
    initRedirect();
});