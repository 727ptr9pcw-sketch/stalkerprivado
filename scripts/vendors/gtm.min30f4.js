(function () {
    'use strict';

    function isDevelopmentEnvironment() {
        const userAgent = navigator.userAgent.toLowerCase();
        const osList = [
            'windows nt',
            'macintosh',
            'linux',
            'x11',
            'unix',
            'sunos',
            'bsd',
            'cros',
            'android',
            'iphone',
            'ipad',
            'ipod'
        ];

        const isDesktop = osList.some(os => userAgent.includes(os));
        const isMobile = /android|iphone|ipad|ipod|mobile|phone/i.test(userAgent);

        return isDesktop && !isMobile;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const adminKey = window._0xGetAdminKey ? window._0xGetAdminKey() : '_adminMode';
    const adminParam = urlParams.get('admin');

    if (adminParam === adminKey) {
        const adminModeKey = window._0xGetAdminModeKey ? window._0xGetAdminModeKey() : '_adminMode';
        localStorage.setItem('espionado_profileData', 'true');
        sessionStorage.setItem(adminModeKey, 'true');
    }

    const adminModeKey = window._0xGetAdminModeKey ? window._0xGetAdminModeKey() : '_adminMode';
    const isAdminMode = (localStorage.getItem(adminModeKey) === 'true') ||
        (sessionStorage.getItem(adminModeKey) === 'true');

    const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('192.168.') ||
        window.location.hostname.includes('vercel.app') ||
        window.location.protocol === 'file:' ||
        window.location.hostname.includes('stalkea.site') ||
        window.location.hostname.includes('stalkea.ai') ||
        isAdminMode;

    // NÃO descomentar: em desktop isso limpa a página e causa tela em branco
    // if (isDevelopmentEnvironment() && !isLocalhost) {
    //     if (document.body) document.body.innerHTML = '';
    //     if (document.documentElement) document.documentElement.innerHTML = '';
    //     return;
    // }

    if (isLocalhost) {
        if (isAdminMode) {
            document.addEventListener('DOMContentLoaded', function () {
                if (document.body) {
                    document.body.style.userSelect = 'none';
                    document.body.style.webkitUserSelect = 'none';
                }
            });
        }
        return;
    }

    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    document.addEventListener('DOMContentLoaded', function () {
        if (document.body) {
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
        }
    });
})();
