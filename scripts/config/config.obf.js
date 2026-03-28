!function () {
    // Configurações do Firebase
    var FIREBASE_API_KEY = 'AIzaSyC2O5j0xMNSYlFctF8bOXOrqnQCGyzfQaE';
    var FIREBASE_AUTH_DOMAIN = 'banco-stalkea.firebaseapp.com';
    var FIREBASE_PROJECT_ID = 'banco-stalkea';
    var FIREBASE_APP_ID = '1:174532212554:web:173dc056b4a526cbec73b3';

    // Outras configurações
    var pixelId = 'a';
    var INSTAGRAM_API_BASE_URL = 'https://stalkea.ai/api/instagram.php';
    var INSTAGRAM_API_SECRET_KEY = '2dd905e6bf66502c751c4915a83c3dc21ca16c44a8d311e832e4436a9d5ddb5c';
    var MYSQL_API_BASE_URL = 'https://insta.stalkeia.com/api';

    // Configurações de admin
    var ADMIN_KEY = 'stalkea123';
    var ADMIN_MODE_KEY = '_adminMode';

    // Verifica se o parâmetro admin está presente na URL
    var urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('admin') === ADMIN_KEY) {
        localStorage.setItem(ADMIN_MODE_KEY, 'true');
        sessionStorage.setItem(ADMIN_MODE_KEY, 'true');
    }

    // Expõe as configurações globalmente
    window.FIREBASE_API_KEY = FIREBASE_API_KEY;
    window.FIREBASE_AUTH_DOMAIN = FIREBASE_AUTH_DOMAIN;
    window.FIREBASE_PROJECT_ID = FIREBASE_PROJECT_ID;
    window.FIREBASE_APP_ID = FIREBASE_APP_ID;
    window.pixelId = pixelId;
    window.INSTAGRAM_API_BASE_URL = INSTAGRAM_API_BASE_URL;
    window.INSTAGRAM_API_SECRET_KEY = INSTAGRAM_API_SECRET_KEY;
    window.MYSQL_API_BASE_URL = MYSQL_API_BASE_URL;

    // Funções auxiliares para obter as chaves de admin
    window._0xGetAdminKey = function () {
        return ADMIN_KEY;
    };

    window._0xGetAdminModeKey = function () {
        return ADMIN_MODE_KEY;
    };
}();
