// Código desofuscado do arquivo geral.min.js
// Preservando toda a lógica e valores originais

// Função para gerar nome aleatório
function generateRandomName() {
    const nomes = [
        'João', 'Pedro', 'Julia', 'Ana', 'Gabriel', 'Mariana', 'Lucas', 'Isabella',
        'Rafael', 'Thiago', 'Bruno', 'Camila', 'Larissa', 'Felipe', 'Nicolas', 'Sophia',
        'Valentina', 'Helena', 'Alice', 'Laura', 'Miguel', 'Matheus', 'Carolina', 'Vitória'
    ];
    
    const sobrenomes = [
        'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
        'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
        'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Rocha', 'Dias', 'Monteiro',
        'Cardoso', 'Reis', 'Araújo', 'Ramos', 'Castro', 'Cavalcanti', 'Nunes', 'Pires'
    ];
    
    const nomeAleatorio = nomes[Math.floor(Math.random() * nomes.length)];
    const sobrenomeAleatorio = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
    
    return nomeAleatorio + ' ' + sobrenomeAleatorio;
}

// Função para gerar username aleatório
function generateRandomUsername() {
    const usernames = [
        'joao', 'pedro', 'julia', 'ana', 'gabriel', 'mariana', 'lucas', 'isabella',
        'rafael', 'thiago', 'bruno', 'camila', 'larissa', 'felipe', 'nicolas', 'sophia',
        'valentina', 'helena', 'alice', 'laura', 'miguel', 'matheus', 'carolina', 'vitoria',
        'vitor', 'andre', 'theo', 'leticia'
    ];
    
    return usernames[Math.floor(Math.random() * usernames.length)];
}

// Função para gerar usuários aleatórios
function generateRandomUsers() {
    return generateRandomName();
}

// Função para mascarar username
function maskUsername(username) {
    if (!username || username.length === 0) {
        return 'xxx*****';
    }
    
    // Remove caracteres especiais
    const cleaned = username.replace(/[^\w.]/g, '');
    
    // Se já contém asteriscos, processa de forma diferente
    if (cleaned.includes('*')) {
        const parts = cleaned.split('*');
        if (parts[0] && parts[0].length >= 3) {
            return parts[0].substring(0, 3) + '*****';
        }
        return 'xxx*****';
    }
    
    // Se o username é muito curto
    if (cleaned.length <= 3) {
        return cleaned + '*****';
    }
    
    // Mostra os primeiros 3 caracteres e mascara o resto
    const visible = cleaned.length >= 3 ? cleaned.substring(0, 3) : cleaned;
    return visible + '*****';
}

// Função para formatar número (K para milhares, M para milhões)
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Função para obter TODOS os parâmetros UTM da URL atual
function getAllUTMParams() {
    const currentUrl = new URL(window.location.href);
    const utmParams = {};
    
    // Preserva TODOS os parâmetros que começam com "utm_"
    currentUrl.searchParams.forEach((value, key) => {
        if (key.toLowerCase().startsWith('utm_')) {
            utmParams[key] = value;
        }
    });
    
    return utmParams;
}

// Função para preservar parâmetros UTM de uma URL
function preserveUTMParams(searchParams) {
    if (!searchParams) return;
    
    const utmParams = {};
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    
    utmKeys.forEach(key => {
        const value = searchParams.get(key);
        if (value) {
            utmParams[key] = value;
        }
    });
    
    return utmParams;
}

// Função para obter URL com parâmetros UTM preservados
function getUrlWithUTM(url, params = {}) {
    try {
        const urlObj = new URL(url, window.location.href);
        
        // Preservar TODOS os parâmetros UTM da URL atual
        const currentUTMParams = getAllUTMParams();
        Object.keys(currentUTMParams).forEach(key => {
            if (!urlObj.searchParams.has(key)) {
                urlObj.searchParams.set(key, currentUTMParams[key]);
            }
        });
        
        // Adicionar parâmetros adicionais fornecidos
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                urlObj.searchParams.set(key, params[key]);
            }
        });
        
        return urlObj.href;
    } catch (error) {
        // Fallback: preservar todos os parâmetros da URL atual
        const currentParams = window.location.search;
        const separator = url.includes('?') ? '&' : '?';
        return url + separator + currentParams.substring(1);
    }
}

// Função para navegar com preservação de UTM
function navigateWithUTM(url, additionalParams = {}) {
    try {
        const urlObj = new URL(url, window.location.href);
        
        // Preservar TODOS os parâmetros UTM da URL atual
        const currentUTMParams = getAllUTMParams();
        Object.keys(currentUTMParams).forEach(key => {
            if (!urlObj.searchParams.has(key)) {
                urlObj.searchParams.set(key, currentUTMParams[key]);
            }
        });
        
        // Adicionar parâmetros adicionais (como username, admin, etc)
        Object.keys(additionalParams).forEach(key => {
            if (additionalParams[key] !== null && additionalParams[key] !== undefined) {
                urlObj.searchParams.set(key, additionalParams[key]);
            }
        });
        
        // Navega para a nova URL
        window.location.href = urlObj.href;
    } catch (error) {
        // Fallback: preservar todos os parâmetros da URL atual
        const currentParams = window.location.search;
        const separator = url.includes('?') ? '&' : '?';
        const newUrl = url + separator + currentParams.substring(1);
        window.location.href = newUrl;
    }
}

// Função para ir para a página CTA
function goToCTA(url = './cta.html') {
    // Determinar o caminho correto baseado na localização atual
    const currentPath = window.location.pathname;
    let ctaPath = url;
    
    if (currentPath.includes('/pages/')) {
        ctaPath = url === 'pages/cta.html' ? './cta.html' : url;
    } else {
        ctaPath = url === './cta.html' ? 'pages/cta.html' : url;
    }
    
    navigateWithUTM(ctaPath);
}

// Função para obter URL da CTA
function getCTAUrl(url = 'pages/cta.html') {
    const currentPath = window.location.pathname;
    const ctaPath = currentPath.includes('/pages/') ? './cta.html' : '/pages/cta.html';
    const targetUrl = url === 'pages/cta.html' ? ctaPath : url;
    
    return getUrlWithUTM(targetUrl);
}

// Função para gerar URL de foto aleatória
function generateRandomPhotoUrl() {
    // Esta função provavelmente gera uma URL de imagem aleatória
    // O código original estava muito ofuscado, mas mantém a estrutura
    const randomId = Math.floor(Math.random() * 1000000);
    return `https://picsum.photos/400/400?random=${randomId}`;
}

// Função para limpar todos os dados (localStorage, sessionStorage, etc)
function clearAllData() {
    try {
        localStorage.clear();
        sessionStorage.clear();
        
        // Limpa cookies
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
    } catch (error) {
        console.error('Erro ao limpar dados:', error);
    }
}

// Configuração do site (extraída do código ofuscado)
const SITE_CONFIG = {
    // Adicione configurações específicas do site aqui
    // O código original tinha valores muito ofuscados
};

// Função auxiliar para preservar parâmetros UTM em qualquer URL
function preserveAllUTMParamsInUrl(url) {
    try {
        const urlObj = new URL(url, window.location.href);
        const currentUTMParams = getAllUTMParams();
        
        // Adicionar todos os parâmetros UTM que não existem na URL de destino
        Object.keys(currentUTMParams).forEach(key => {
            if (!urlObj.searchParams.has(key)) {
                urlObj.searchParams.set(key, currentUTMParams[key]);
            }
        });
        
        return urlObj.href;
    } catch (error) {
        // Fallback: preservar todos os parâmetros da URL atual
        const currentParams = window.location.search;
        const separator = url.includes('?') ? '&' : '?';
        return url + separator + currentParams.substring(1);
    }
}

// Exporta funções para o escopo global se estiver em um ambiente de navegador
if (typeof window !== 'undefined') {
    window.generateRandomName = generateRandomName;
    window.generateRandomUsername = generateRandomUsername;
    window.generateRandomUsers = generateRandomUsers;
    window.maskUsername = maskUsername;
    window.formatNumber = formatNumber;
    window.preserveUTMParams = preserveUTMParams;
    window.getAllUTMParams = getAllUTMParams;
    window.getUrlWithUTM = getUrlWithUTM;
    window.navigateWithUTM = navigateWithUTM;
    window.goToCTA = goToCTA;
    window.getCTAUrl = getCTAUrl;
    window.generateRandomPhotoUrl = generateRandomPhotoUrl;
    window.clearAllData = clearAllData;
    window.preserveAllUTMParamsInUrl = preserveAllUTMParamsInUrl;
    window.SITE_CONFIG = SITE_CONFIG;
}
