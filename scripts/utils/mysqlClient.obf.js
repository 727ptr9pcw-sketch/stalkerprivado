'use strict';

/**
 * MySQL Client - Cliente para comunicação com API MySQL
 * Gerencia leads, fingerprints e pesquisas de usuários
 */

const API_BASE_URL = "https://insta.stalkeia.com/api";

/**
 * Gera uma impressão digital única do navegador
 * Combina várias características do navegador para criar um identificador único
 * @returns {Promise<string>} Hash SHA-256 da impressão digital
 */
async function generateBrowserFingerprint() {
    const fingerprint = [];

    // Informações básicas do navegador
    fingerprint.push(navigator.userAgent || '');
    fingerprint.push(navigator.language || '');
    fingerprint.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    fingerprint.push(screen.width + 'x' + screen.height + 'x' + screen.colorDepth);

    // Plugins instalados
    const plugins = Array.from(navigator.plugins || []).map(p => p.name).join(',');
    fingerprint.push(plugins);

    // Canvas fingerprinting
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Stalkea.ai', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Stalkea.ai', 4, 17);
        const canvasHash = canvas.toDataURL();
        fingerprint.push(canvasHash);
    } catch (error) {
        fingerprint.push('unknown');
    }

    // WebGL fingerprinting
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                fingerprint.push(vendor + '~' + renderer);
            }
        }
    } catch (error) {
        fingerprint.push('unknown');
    }

    // Informações adicionais
    fingerprint.push(navigator.platform || '');
    fingerprint.push(navigator.hardwareConcurrency || '');
    fingerprint.push(navigator.deviceMemory || '');

    const fingerprintString = fingerprint.join('|||');
    return await hashString(fingerprintString);
}

/**
 * Obtém o endereço IP do usuário
 * Tenta múltiplas APIs como fallback
 * @returns {Promise<string>} Endereço IP ou 'unknown' se falhar
 */
async function getIPAddress() {
    const apis = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/'
    ];

    for (const apiUrl of apis) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(apiUrl, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.ok) {
                const data = await response.json();
                if (data.ip) {
                    return data.ip;
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('⚠️ [API] Erro ao obter IP de', apiUrl, ':', error.message);
            }
            continue;
        }
    }

    return 'unknown';
}

/**
 * Gera hash SHA-256 de uma string
 * @param {string} str - String para fazer hash
 * @returns {Promise<string>} Hash hexadecimal
 */
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Gera um ID único para o lead
 * Combina fingerprint do navegador e IP
 * @returns {Promise<Object>} Objeto com leadId, fingerprint e ip
 */
async function generateLeadId() {
    try {
        const fingerprint = await generateBrowserFingerprint();
        let ip = 'unknown';

        try {
            ip = await Promise.race([
                getIPAddress(),
                new Promise(resolve => setTimeout(() => resolve('unknown'), 3000))
            ]);
        } catch (error) {
            console.warn('⚠️ [API] Erro ao obter IP:', error);
            ip = 'unknown';
        }

        const leadIdString = ip !== 'unknown' ? ip + '_' + fingerprint : fingerprint + '_' + Date.now();
        const leadId = await hashString(leadIdString);

        return {
            leadId: leadId,
            fingerprint: fingerprint,
            ip: ip
        };
    } catch (error) {
        console.error('❌ [API] Erro geral ao obter IP:', error);
        const fallbackId = 'error_' + Date.now();
        return {
            leadId: await hashString(fallbackId + '_' + Math.random().toString(36).substring(7)),
            fingerprint: fallbackId,
            ip: 'unknown'
        };
    }
}

/**
 * Verifica se um lead existe e seu status
 * @param {string} leadId - ID do lead
 * @returns {Promise<Object>} Objeto com exists, searchCount, canSearch e leadData
 */
async function checkLeadExists(leadId) {
    try {
        const url = API_BASE_URL + '/leads.php?action=check_status&lead_id=' + encodeURIComponent(leadId);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }

        const data = await response.json();
        if (!data.success) {
            console.error('❌ [API] Erro ao verificar lead:', data.message);
            return {
                exists: false,
                searchCount: 0,
                canSearch: true
            };
        }

        return {
            exists: data.exists || false,
            searchCount: data.searchCount || 0,
            canSearch: data.canSearch !== false,
            leadData: data.leadData || null
        };
    } catch (error) {
        console.error('❌ [API] Erro ao verificar lead:', error);
        return {
            exists: false,
            searchCount: 0,
            canSearch: true
        };
    }
}

/**
 * Alias para checkLeadExists (compatibilidade)
 * @param {string} leadId - ID do lead
 * @returns {Promise<Object>} Status do lead
 */
async function checkLeadStatus(leadId) {
    return await checkLeadExists(leadId);
}

/**
 * Salva uma pesquisa no banco de dados
 * @param {string} leadId - ID do lead
 * @param {string} fingerprint - Fingerprint do navegador
 * @param {string} ip - Endereço IP
 * @param {Object} profileData - Dados do perfil pesquisado
 * @returns {Promise<boolean>} true se salvou com sucesso
 */
async function saveSearch(leadId, fingerprint, ip, profileData) {
    try {
        const url = API_BASE_URL + '/leads.php?action=save_search';
        const searchData = {
            username: profileData.username || '',
            full_name: profileData.full_name || '',
            profile_pic_url: profileData.profile_pic_url || '',
            follower_count: profileData.follower_count || 0,
            following_count: profileData.following_count || 0,
            media_count: profileData.media_count || 0,
            is_private: profileData.is_private || false
        };

        const payload = {
            leadId: leadId,
            fingerprint: fingerprint,
            ip: ip,
            profileData: searchData
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ [API] Erro ao salvar busca:', errorData);
            throw new Error('HTTP ' + response.status + ': ' + response.statusText + '\nDetalhes: ' + (errorData.message || '').substring(0, 100));
        }

        const data = await response.json();
        if (!data.success) {
            console.error('❌ [API] Erro ao salvar busca:', data.message);
            return false;
        }

        localStorage.setItem('stalkea_lead_id', leadId);
        return true;
    } catch (error) {
        console.error('❌ [API] Erro ao salvar busca:', error);
        console.error('❌ Stack trace:', error.stack);
        return false;
    }
}

/**
 * Obtém dados de um lead específico
 * @param {string} leadId - ID do lead
 * @returns {Promise<Object|null>} Dados do lead ou null se não encontrado
 */
async function getLeadData(leadId) {
    try {
        const url = API_BASE_URL + '/leads.php?action=get&lead_id=' + encodeURIComponent(leadId);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }

        const data = await response.json();
        if (!data.success || !data.leadData) {
            return null;
        }
        return data.leadData;
    } catch (error) {
        console.warn('⚠️ [API] Erro ao obter dados do lead:', error);
        return null;
    }
}

/**
 * Obtém ou gera o ID do lead atual
 * Verifica localStorage primeiro, depois gera novo se necessário
 * @returns {Promise<string>} ID do lead atual
 */
async function getCurrentLeadId() {
    let leadId = localStorage.getItem('stalkea_lead_id');
    if (leadId) {
        return leadId;
    }

    const leadData = await generateLeadId();
    leadId = leadData.leadId;
    localStorage.setItem('stalkea_lead_id', leadId);
    localStorage.setItem('stalkea_fingerprint', leadData.fingerprint);
    localStorage.setItem('stalkea_ip', leadData.ip);

    return leadId;
}

// Exportar funções para uso global
if (typeof window !== 'undefined') {
    const MySQLClient = {
        generateBrowserFingerprint: generateBrowserFingerprint,
        getIPAddress: getIPAddress,
        generateLeadId: generateLeadId,
        getCurrentLeadId: getCurrentLeadId,
        checkLeadExists: checkLeadExists,
        checkLeadStatus: checkLeadStatus,
        saveSearch: saveSearch,
        getLeadData: getLeadData,
        hashString: hashString
    };

    window.MySQLClient = MySQLClient;
    window.FirebaseClient = window.FirebaseClient;
    window.generateLeadId = generateLeadId;
    window.getCurrentLeadId = getCurrentLeadId;
    window.checkLeadExists = checkLeadExists;
    window.checkLeadStatus = checkLeadStatus;
    window.saveSearch = saveSearch;
    window.getLeadData = getLeadData;
}
