// ============================================
// VERIFICAÇÃO SIMPLES DE AUTENTICAÇÃO
// Verifica se o usuário confirmou o Instagram antes de acessar as páginas
// ============================================

(function() {
    // Verificar se está na página de início (não redirecionar de lá)
    const currentPage = window.location.pathname;
    if (currentPage.includes('inicio1.html') || currentPage.includes('index.html')) {
        return; // Permite acesso à página inicial
    }

    // Verificar se tem nome do Instagram salvo
    const espionadoUsername = localStorage.getItem('espionado_username');
    
    if (!espionadoUsername) {
        // Verificar se está em localhost/rede local (permitir acesso sem username para testes)
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('192.168.') ||
                           window.location.hostname.includes('10.0.');
        
        if (!isLocalhost) {
            // Não tem username salvo e NÃO está em localhost - redirecionar para início
            window.location.href = '../index.html';
            return;
        } else {
        }
    } else {
        // Tem username salvo - permite acesso normal
    }
})();
