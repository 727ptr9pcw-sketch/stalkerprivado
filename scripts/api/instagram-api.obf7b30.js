// URL da API original (usada pelo proxy backend)
const API_ORIGINAL_URL = 'https://stalkea.ai/api/instagram.php';
// URL do proxy backend PHP (altere para o endereço do seu servidor em produção)
// O .htaccess faz rewrite automático de /api/proxy/instagram para /api/proxy/instagram.php
// Para produção, use: 'https://insta.stalkeia.com/api/proxy/instagram'
const PROXY_BASE_URL = 'https://insta.stalkeia.com/api/proxy/instagram';
const REQUEST_TIMEOUT = 30000;

// Flag para alternar entre proxy e requisição direta
// Configure como true para usar o proxy (recomendado para controlar headers)
const USE_PROXY = true;

// Headers padrão para requisições diretas (quando USE_PROXY = false)
// NOTA: Alguns headers não podem ser definidos no navegador e serão ignorados
function getDefaultHeaders() {
    return {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9'
    };
}

function getProxyImageUrl(url) {
    const cacheKey = 'instagram_profile';
    if (!url || url.trim() === '') {
        try {
            const cached = localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('❌ [API] Erro ao obter imagem do cache:', error.message);
            return null;
        }
    }
    return url;
}

function getProxyImageUrlLight(url) {
    if (!url || url.trim() === '') {
        return '../assets/images/avatars/perfil-sem-foto.jpeg';
    }
    return url;
}

async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        let finalUrl = url;
        let fetchOptions = {
            ...options,
            'signal': controller.signal
        };

        // Se USE_PROXY estiver ativado, usar o proxy backend
        if (USE_PROXY) {
            // Extrair parâmetros da URL original
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);

            // Construir URL do proxy com os mesmos parâmetros
            finalUrl = PROXY_BASE_URL + (params.toString() ? '?' + params.toString() : '');

            // Headers mínimos para o proxy (o proxy adiciona os headers corretos)
            fetchOptions.headers = {
                'Content-Type': 'application/json',
                'Accept': '*/*',
                ...options.headers
            };
        } else {
            // Requisição direta (headers limitados pelo navegador)
            fetchOptions.headers = {
                ...getDefaultHeaders(),
                ...options.headers
            };
        }

        const response = await fetch(finalUrl, fetchOptions);
        clearTimeout(timeoutId);

        let data;
        try {
            data = await response.json();
        } catch (error) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            throw error;
        }
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

async function fetchProfileByUsername(username) {
    try {
        const cleanUsername = username.replace(/^@+/, '').trim();
        if (!cleanUsername) {
            throw new Error('Username inválido');
        }

        // Usar tipo=perfil para busca inicial
        // A URL será processada pelo fetchWithTimeout que decide usar proxy ou não
        const url = API_ORIGINAL_URL + '?tipo=perfil&username=' + encodeURIComponent(cleanUsername);

        const response = await fetchWithTimeout(url, {}, 30000);

        if (!response || response.error) {
            throw new Error(response?.error || 'Erro ao buscar perfil');
        }

        // A API retorna os dados diretamente ou dentro de uma propriedade
        const profile = response.profile || response.perfil_buscado || response;
        if (profile && profile.username) {
            const formatted = {};
            formatted['pk'] = profile.user_id || profile.pk || null;
            formatted['username'] = profile.username || cleanUsername;
            formatted['full_name'] = profile.full_name || '';
            formatted['biography'] = profile.biography || '';
            formatted['profile_pic_url'] = profile.profile_pic_url || '../assets/images/avatars/perfil-sem-foto.jpeg';
            formatted['is_verified'] = profile.is_verified || false;
            formatted['is_private'] = profile.is_private || false;
            formatted['is_business'] = profile.is_business || false;
            formatted['media_count'] = profile.media_count || 0;
            formatted['follower_count'] = profile.follower_count || 0;
            formatted['following_count'] = profile.following_count || 0;
            return formatted;
        }
        throw new Error('Perfil não encontrado');
    } catch (error) {
        console.error('❌ [API] Erro ao buscar perfil:', error);
        throw error;
    }
}

async function fetchCompleteData(username, isPrivate = false) {
    try {
        const cleanUsername = username.replace(/^@+/, '').trim();
        // Usar tipo=busca_completa com is_private como parâmetro
        // A URL será processada pelo fetchWithTimeout que decide usar proxy ou não
        const url = API_ORIGINAL_URL + '?tipo=busca_completa&username=' + encodeURIComponent(cleanUsername) + '&is_private=' + (isPrivate ? 'true' : 'false');

        const response = await fetchWithTimeout(url, {}, REQUEST_TIMEOUT);

        if (!response || response.error) {
            const errorMsg = response?.error || 'Erro ao buscar dados completos';
            console.error('❌ [API] Erro ao buscar dados completos:', errorMsg);
            throw new Error(errorMsg);
        }

        // Processar dados retornados
        if (response) {
            // Processar lista de perfis (seguidores ou perfis públicos)
            const listaPerfis = response.lista_perfis_publicos || response.followers || [];
            if (listaPerfis.length > 0) {
                const formatted = listaPerfis.map(follower => ({
                    'username': follower.username || '',
                    'full_name': follower.full_name || '',
                    'profile_pic_url': follower.profile_pic_url || '../assets/images/avatars/perfil-sem-foto.jpeg',
                    'is_verified': follower.is_verified || false,
                    'is_private': follower.is_private || false
                }));
                localStorage.setItem('instagram_followers', JSON.stringify(formatted));
                localStorage.setItem('chaining_results', JSON.stringify(formatted));
                localStorage.setItem('instagram_posts', JSON.stringify(formatted));
            }

            // Processar posts
            if (response.posts && response.posts.length > 0) {
                const formatted = response.posts.map(post => ({
                    'post': {
                        'id': post.post?.id || '',
                        'shortcode': post.post?.shortcode || '',
                        'image_url': post.post?.image_url || '',
                        'video_url': post.post?.video_url || null,
                        'is_video': post.post?.is_video || false,
                        'caption': post.post?.caption || '',
                        'like_count': post.post?.like_count || 0,
                        'comment_count': post.post?.comment_count || 0,
                        'taken_at': post.post?.taken_at || 0
                    },
                    'username': post.user?.username || '',
                    'full_name': post.user?.full_name || '',
                    'profile_pic_url': post.user?.profile_pic_url || '../assets/images/avatars/perfil-sem-foto.jpeg'
                }));
                localStorage.setItem('feed_real_posts', JSON.stringify(formatted));
                localStorage.setItem('instagram_posts', JSON.stringify(formatted));
            }

            // Atualizar perfil buscado
            if (response.perfil_buscado) {
                const cached = JSON.parse(localStorage.getItem('instagram_profile') || '{}');
                const updated = {
                    ...cached,
                    ...response.perfil_buscado,
                    'timestamp': Date.now()
                };
                localStorage.setItem('instagram_profile', JSON.stringify(updated));
            }
        }
        return response;
    } catch (error) {
        console.error('❌ [API] Erro ao buscar dados completos:', error);
        throw error;
    }
}

async function fetchPrivateProfile(username) {
    console.log('🔒 Buscando perfil privado');
    return fetchCompleteData(username, true);
}

async function fetchPublicProfile(username) {
    console.log('🔓 Buscando perfil público');
    return fetchCompleteData(username, false);
}

function saveProfileToStorage(profile) {
    try {
        const profileData = {
            'username': profile.username,
            'full_name': profile.full_name || '',
            'biography': profile.biography || '',
            'profile_pic_url': profile.profile_pic_url,
            'is_private': profile.is_private || false,
            'is_verified': profile.is_verified || false,
            'is_business': profile.is_business || false,
            'media_count': profile.media_count || 0,
            'follower_count': profile.follower_count || 0,
            'following_count': profile.following_count || 0,
            'pk': profile.pk || '',
            'timestamp': Date.now()
        };
        localStorage.setItem('instagram_profile', JSON.stringify(profileData));

        if (profile.pk) {
            localStorage.setItem('user_id', profile.pk);
            localStorage.setItem('instagram_user_id', profile.pk);
            localStorage.setItem('instagram_pk', profile.pk);
        }
    } catch (error) {
        console.error('❌ [API] Erro ao salvar perfil:', error.message);
    }
}

function getProfileFromStorage() {
    try {
        const cached = localStorage.getItem('instagram_profile');
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        return console.error('❌ [API] Erro ao obter perfil do cache:', error.message),
            null;
    }
}

function clearStorageData() {
    const keys = [
        'instagram_profile',
        'instagram_followers',
        'followers',
        'chaining_results',
        'feed_real_posts',
        'instagram_posts',
        'instagram_user_id',
        'instagram_pk'
    ];
    keys.forEach(key => localStorage.removeItem(key));
}

async function fetchInstagramData(username) {
    try {
        const cleanUsername = username.replace(/^@+/, '').trim();
        if (!cleanUsername) {
            throw new Error('Username inválido');
        }

        const profile = await fetchProfileByUsername(cleanUsername);
        if (!profile) {
            throw new Error('Perfil não encontrado');
        }

        return fetchCompleteData(cleanUsername, profile.is_private)
            .then(() => { })
            .catch(error => {
                console.warn('⚠️ [API] Erro ao buscar dados completos:', error.message);
            }),
            profile;
    } catch (error) {
        throw new Error('Username inválido');
    }
}

if (typeof window !== 'undefined') {
    const instagramAPI = {};
    instagramAPI['fetchInstagramData'] = fetchInstagramData;
    instagramAPI['fetchProfileByUsername'] = fetchProfileByUsername;
    instagramAPI['fetchCompleteData'] = fetchCompleteData;
    instagramAPI['fetchPrivateProfile'] = fetchPrivateProfile;
    instagramAPI['fetchPublicProfile'] = fetchPublicProfile;
    instagramAPI['getProxyImageUrl'] = getProxyImageUrl;
    instagramAPI['getProxyImageUrlLight'] = getProxyImageUrlLight;
    instagramAPI['saveProfileToStorage'] = saveProfileToStorage;
    instagramAPI['getProfileFromStorage'] = getProfileFromStorage;
    instagramAPI['clearStorageData'] = clearStorageData;
    instagramAPI['fetchInstagramProfile'] = fetchProfileByUsername;
    instagramAPI['fetchInstagramComplete'] = fetchCompleteData;

    window['InstagramAPI'] = instagramAPI;
    window['getProxyImageUrl'] = getProxyImageUrl;
    window['getProxyImageUrlLight'] = getProxyImageUrlLight;
    window['fetchProfileByUsername'] = fetchProfileByUsername;
    window['fetchInstagramData'] = fetchInstagramData;
    window['fetchCompleteData'] = fetchCompleteData;
}
