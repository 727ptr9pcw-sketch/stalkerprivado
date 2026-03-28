(function () {
    'use strict';

    function isMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|iphone|ipad|ipod|mobile|phone/i.test(userAgent);
        return isMobile;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const adminKey = window._0xGetAdminKey ? window._0xGetAdminKey() : '_adminMode';
    const adminParam = urlParams.get('admin');

    if (adminParam === adminKey) {
        const adminModeKey = window._0xGetAdminModeKey ? window._0xGetAdminModeKey() : '_adminMode';
        localStorage.setItem('espionado_profileData', 'true');
        localStorage.removeItem('espionado_profileData');
        localStorage.setItem('espionado_profileData', 'true');
        sessionStorage.setItem(adminModeKey, 'true');
    }

    const adminModeKey = window._0xGetAdminModeKey ? window._0xGetAdminModeKey() : '_adminMode';
    const isAdminMode = (localStorage.getItem(adminModeKey) === 'true') ||
        (sessionStorage.getItem(adminModeKey) === 'true');

    // Ambos localhost E ambientes de preview/desenvolvimento para evitar tela branca no desktop
    const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('192.168.') ||
        window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('stalkea.site') ||
        window.location.hostname.includes('stalkeia.com') ||
        window.location.protocol === 'file:' ||
        isAdminMode;

    // DESKTOP PERMITIDO – Não descomentar o bloco abaixo senão desktop verá tela em branco/redirect
    // if (!isMobileDevice() && !isLocalhost) {
    //     window.location.replace('https://www.facebook.com');
    //     return;
    // }

    // Permitir apenas domínios e subdomínios de stalkeia.com (produção)
    const allowedDomain = 'stalkeia.com';
    const currentHost = window.location.hostname;

    const isAllowedDomain = currentHost === allowedDomain ||
        currentHost === 'www.' + allowedDomain ||
        currentHost.endsWith('.' + allowedDomain);

    const redirectUrl = 'https://www.facebook.com';

    window.handleConfirmModalClick = function () {
        if (isLocalhost || isAllowedDomain) {
            return redirectUrl;
        }
        return redirectUrl;
    };

    if (isLocalhost) {
        if (isAdminMode) {
            document.addEventListener('DOMContentLoaded', function () {
                const adminBanner = document.createElement('div');
                adminBanner.style.cssText = 'position:fixed;bottom:10px;background:rgba(255,0,0,0.8);color:white;padding:10px;border-radius:5px;font-size:11px;z-index:9999;right:10px;';
                adminBanner.textContent = 'ADMIN MODE';
                document.body.appendChild(adminBanner);
            });
        }
        return;
    }

    if (!isAllowedDomain) {
        window.location.href = redirectUrl;
        return;
    }

    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'C') ||
            (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
        }
    });

    document.addEventListener('DOMContentLoaded', function () {
        if (document.body) {
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
        }
    });
})();
