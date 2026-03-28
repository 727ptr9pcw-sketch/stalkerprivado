const IP_GEOLOCATION_APIS = [{
    'name': 'ipapi',
    'url': 'https://ipapi.co/json/',
    'parse': data => ({
        'cidade': data.city,
        'estado': data.region,
        'lat': parseFloat(data.latitude),
        'lon': parseFloat(data.longitude)
    })
}, {
    'name': 'ip-api',
    'url': 'https://ip-api.com/json/',
    'parse': data => ({
        'cidade': data.city,
        'estado': data.region_code || data.regionName,
        'lat': parseFloat(data.lat),
        'lon': parseFloat(data.lon)
    })
}];

async function detectCityByIP() {
    const cacheKey = 'user_location';
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (parsed.cidade && parsed.lat && parsed.lon) {
                return parsed;
            }
        } catch (error) {
            console.warn('⚠️ [API] Erro ao parsear localização do cache:', error);
        }
    }
    
    for (const api of IP_GEOLOCATION_APIS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const headers = {};
            headers['Accept'] = 'application/json';
            
            const response = await fetch(api.url, {
                'signal': controller.signal,
                'headers': headers,
                'mode': 'cors',
                'cache': 'no-cache'
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                console.warn('❌ [API] Erro na API ' + response.status + ' para ' + api.name);
                continue;
            }
            
            const data = await response.json();
            const parsed = api.parse(data);
            
            if (parsed.cidade && parsed.lat && parsed.lon) {
                localStorage.setItem(cacheKey, JSON.stringify(parsed));
                return parsed;
            }
        } catch (error) {
            console.warn('⚠️ [API] Erro na API ' + api.name + ':', error.message || error);
            continue;
        }
    }
    
    return console.error('❌ [API] Não foi possível obter localização de nenhuma API'),
    null;
}

async function getNeighborCity(lat, lon, visited = []) {
    if (!lat || !lon) return null;
    
    const cacheKey = 'neighbor_cities';
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const visitedLower = visited.map(c => c.toLowerCase());
                const filtered = parsed.filter(c => !visitedLower.includes(c.toLowerCase()));
                if (filtered.length > 0) {
                    return filtered[0];
                }
                if (parsed.length > 0) {
                    return parsed[0];
                }
            }
        } catch (error) {
            console.warn('⚠️ [API] Erro ao parsear cidades vizinhas do cache:', error);
        }
    }
    
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const radius = 0.3;
        const bbox = (lon - radius) + ',' + (lat - radius) + ',' + (lon + radius) + ',' + (lat + radius);
        const url = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=20&bounded=1&viewbox=' + bbox + '&q=' + encodeURIComponent('city');
        
        const response = await fetch(url, {
            'headers': {
                'User-Agent': 'Stalkea.ai/1.0 (contact@stalkea.ai)'
            },
            'mode': 'cors'
        });
        
        if (!response.ok) {
            return console.warn('⚠️ [API] Erro ao buscar cidade vizinha:', response.status),
            null;
        }
        
        const data = await response.json();
        if (data.length === 0) return null;
        
        const currentCity = await detectCityByIP();
        const currentCityName = currentCity?.cidade?.toLowerCase();
        const visitedLower = visited.map(c => c.toLowerCase());
        
        const filtered = data.filter(place => {
            const cityName = place.display_name.split(',')[0].toLowerCase();
            return (place.type === 'administrative' || place.type === 'city' || place.type === 'town') 
                && cityName !== currentCityName 
                && !visitedLower.includes(cityName);
        });
        
        if (filtered.length > 0) {
            const cityName = filtered[0].display_name.split(',')[0];
            const cachedCities = JSON.parse(localStorage.getItem(cacheKey) || '[]');
            if (!cachedCities.includes(cityName)) {
                cachedCities.push(cityName);
                localStorage.setItem(cacheKey, JSON.stringify(cachedCities));
            }
            return cityName;
        }
    } catch (error) {
        console.warn('⚠️ [API] Erro ao buscar cidade vizinha:', error);
    }
    
    return null;
}

async function getFamousPlace(lat, lon, fallback = null) {
    if (!lat || !lon) return fallback?.cidade || null;
    
    const cacheKey = 'user_famous_place';
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
    
    try {
        const radius = 15000;
        const query = 'around:' + radius + ',' + lat + ',' + lon;
        const url = 'https://overpass-api.de/api/interpreter?data=[out:json];(' + 
            'node["shop"="mall"][' + query + '];' +
            'node["amenity"="restaurant"][' + query + '];' +
            'node["amenity"="cafe"][' + query + '];' +
            'node["leisure"="park"][' + query + '];' +
            'node["tourism"="attraction"][' + query + '];' +
            ');out;';
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const options = {};
        options['signal'] = controller.signal;
        options['method'] = 'GET';
        
        const response = await fetch(url, options);
        clearTimeout(timeout);
        
        if (!response.ok) {
            return fallback?.cidade || null;
        }
        
        const data = await response.json();
        if (data.elements && data.elements.length > 0) {
            const place = data.elements.find(e => e.tags?.name && (
                e.tags?.shop === 'mall' || 
                e.tags?.amenity === 'restaurant' || 
                e.tags?.amenity === 'cafe' || 
                e.tags?.leisure === 'park' || 
                e.tags?.tourism === 'attraction'
            )) || data.elements.find(e => e.tags?.name);
            
            if (place && place.tags?.name) {
                localStorage.setItem(cacheKey, place.tags.name);
                return place.tags.name;
            }
        }
    } catch (error) {
        console.warn('⚠️ [API] Erro ao buscar local famoso:', error);
    }
    
    return fallback?.cidade || null;
}

async function reverseGeocode(lat, lon) {
    if (!lat || !lon) return null;
    
    try {
        const url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon + '&addressdetails=1';
        const response = await fetch(url, {
            'headers': {
                'User-Agent': 'Stalkea.ai/1.0 (contact@stalkea.ai)',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.warn('⚠️ [API] Erro ao fazer reverse geocode:', error);
        return null;
    }
}

async function getAddressFromCoords(lat, lon, radius = 18) {
    if (!lat || !lon) return null;
    
    try {
        const url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon + '&zoom=' + radius + '&addressdetails=1';
        const headers = {};
        headers['User-Agent'] = 'Stalkea.ai/1.0 (contact@stalkea.ai)';
        headers['Accept-Language'] = 'pt-BR,pt;q=0.9';
        
        const options = {};
        options['headers'] = headers;
        
        const response = await fetch(url, options);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (!data || !data.address) return null;
        
        return {
            'place_id': data.place_id,
            'lat': parseFloat(data.lat),
            'lon': parseFloat(data.lon),
            'display_name': data.display_name,
            'address': {
                'road': data.address.road || '',
                'suburb': data.address.suburb || '',
                'city': data.address.city || data.address.town || data.address.village || '',
                'state': data.address.state || '',
                'country': data.address.country || 'Brasil'
            }
        };
    } catch (error) {
        console.warn('⚠️ [API] Erro ao obter endereço das coordenadas:', error);
        return null;
    }
}

async function searchPlaces(query, limit = 5) {
    if (!query) return [];
    
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=' + limit + '&q=' + encodeURIComponent(query);
        const response = await fetch(url, {
            'headers': {
                'User-Agent': 'Stalkea.ai/1.0 (contact@stalkea.ai)',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });
        
        if (!response.ok) return [];
        
        const data = await response.json();
        return data.map(place => ({
            'place_id': place.place_id,
            'lat': parseFloat(place.lat),
            'lon': parseFloat(place.lon),
            'name': place.display_name,
            'address': place.address || {},
            'type': place.type
        }));
    } catch (error) {
        console.warn('⚠️ [API] Erro ao buscar lugares:', error);
        return [];
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function getNearbyCities(lat, lon, radius = 50000, limit = 20) {
    if (!lat || !lon) return [];
    
    try {
        const bbox = radius + ',' + lat + ',' + lon + ';' + radius + ',' + lat + ',' + lon + ';' + limit + ';';
        const url = 'https://overpass-api.de/api/interpreter?data=[out:json];node["place"="city"]["name"](' + encodeURIComponent(bbox);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const response = await fetch(url, {
            'signal': controller.signal,
            'method': 'GET'
        });
        
        clearTimeout(timeout);
        if (!response.ok) return [];
        
        const data = await response.json();
        if (!data.elements || data.elements.length === 0) return [];
        
        const cities = data.elements
            .filter(e => e.tags && e.tags.name)
            .map(city => {
                const cityLat = parseFloat(city.lat);
                const cityLon = parseFloat(city.lon);
                const distance = calculateDistance(lat, lon, cityLat, cityLon);
                return {
                    'name': city.tags.name,
                    'lat': cityLat,
                    'lon': cityLon,
                    'distance': distance,
                    'type': city.tags.place || 'city'
                };
            })
            .sort((a, b) => a.distance - b.distance);
        
        return cities;
    } catch (error) {
        return console.warn('⚠️ [API] Erro ao buscar cidades próximas:', error),
        [];
    }
}

async function getNearbyMotels(lat, lon, radius = 50000, limit = 20) {
    if (!lat || !lon) return [];
    
    try {
        const bbox = radius + ',' + lat + ',' + lon + ';' + radius + ',' + lat + ',' + lon + ';' + limit + ';';
        const url = 'https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="motel"]["name"](' + encodeURIComponent(bbox);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        const options = {};
        options['signal'] = controller.signal;
        options['method'] = 'GET';
        
        const response = await fetch(url, options);
        clearTimeout(timeout);
        if (!response.ok) return [];
        
        const data = await response.json();
        if (!data.elements || data.elements.length === 0) return [];
        
        const motels = data.elements
            .filter(e => e.tags && e.tags.name)
            .map(motel => {
                const motelLat = parseFloat(motel.lat);
                const motelLon = parseFloat(motel.lon);
                const distance = calculateDistance(lat, lon, motelLat, motelLon);
                return {
                    'name': motel.tags.name,
                    'lat': motelLat,
                    'lon': motelLon,
                    'distance': distance,
                    'address': motel.tags['addr:city'] || motel.tags.address || '',
                    'amenity': motel.tags.amenity
                };
            })
            .sort((a, b) => a.distance - b.distance);
        
        return motels;
    } catch (error) {
        return console.warn('⚠️ [API] Erro ao buscar motéis:', error),
        [];
    }
}

async function getFamousPlaces(lat, lon, radius = 20000, limit = 30) {
    if (!lat || !lon) return [];
    
    try {
        const query = 'around:' + radius + ',' + lat + ',' + lon;
        const overpassQuery = '[out:json];(' +
            'node["shop"="mall"]["name"](' + query + ');' +
            'node["amenity"="restaurant"]["name"](' + query + ');' +
            'node["amenity"="cafe"]["name"](' + query + ');' +
            'node["leisure"="park"]["name"](' + query + ');' +
            'node["tourism"="attraction"]["name"](' + query + ');' +
            'node["amenity"="bar"]["name"](' + query + ');' +
            'node["amenity"="gym"]["name"](' + query + ');' +
            'node["amenity"="cinema"]["name"](' + query + ');' +
            'node["amenity"="theatre"]["name"](' + query + ');' +
            ');out;';
        
        const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(overpassQuery);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const response = await fetch(url, {
            'signal': controller.signal,
            'method': 'GET'
        });
        
        clearTimeout(timeout);
        if (!response.ok) return [];
        
        const data = await response.json();
        if (!data.elements || data.elements.length === 0) return [];
        
        const typePriority = {
            'shop=mall': 1,
            'amenity=restaurant': 2,
            'amenity=cafe': 3,
            'leisure=park': 4,
            'tourism=attraction': 5,
            'amenity=bar': 6,
            'amenity=gym': 7,
            'amenity=cinema': 8,
            'amenity=theatre': 9
        };
        
        const places = data.elements
            .filter(e => e.tags && e.tags.name)
            .map(place => {
                const placeLat = parseFloat(place.lat);
                const placeLon = parseFloat(place.lon);
                const distance = calculateDistance(lat, lon, placeLat, placeLon);
                let type = 'other';
                let priority = 999;
                
                if (place.tags.shop === 'mall') {
                    type = 'shop=mall';
                    priority = typePriority['shop=mall'];
                } else if (place.tags.amenity === 'restaurant') {
                    type = 'amenity=restaurant';
                    priority = typePriority['amenity=restaurant'];
                } else if (place.tags.amenity === 'cafe') {
                    type = 'amenity=cafe';
                    priority = typePriority['amenity=cafe'];
                } else if (place.tags.leisure === 'park') {
                    type = 'leisure=park';
                    priority = typePriority['leisure=park'];
                } else if (place.tags.tourism === 'attraction') {
                    type = 'tourism=attraction';
                    priority = typePriority['tourism=attraction'];
                }
                
                return {
                    'name': place.tags.name,
                    'lat': placeLat,
                    'lon': placeLon,
                    'distance': distance,
                    'type': type,
                    'amenity': place.tags.amenity,
                    'shop': place.tags.shop,
                    'priority': priority
                };
            })
            .sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return a.distance - b.distance;
            });
        
        return places;
    } catch (error) {
        return console.warn('⚠️ [API] Erro ao buscar lugares famosos:', error),
        [];
    }
}

if (typeof window !== 'undefined') {
    const exports = 'getNearbyCities|getAddressFromCoords|getNearbyMotels|reverseGeocode|getFamousPlaces|getNeighborCity|detectCityByIP|calculateDistance|searchPlaces|getFamousPlace';
    const exportList = exports.split('|');
    let index = 0;
    while (true) {
        switch (exportList[index++]) {
        case 'getNearbyCities':
            window['getNearbyCities'] = getNearbyCities;
            continue;
        case 'getAddressFromCoords':
            window['getAddressFromCoords'] = getAddressFromCoords;
            continue;
        case 'getNearbyMotels':
            window['getNearbyMotels'] = getNearbyMotels;
            continue;
        case 'reverseGeocode':
            window['reverseGeocode'] = reverseGeocode;
            continue;
        case 'getFamousPlaces':
            window['getFamousPlaces'] = getFamousPlaces;
            continue;
        case 'getNeighborCity':
            window['getNeighborCity'] = getNeighborCity;
            continue;
        case 'detectCityByIP':
            window['detectCityByIP'] = detectCityByIP;
            continue;
        case 'calculateDistance':
            window['calculateDistance'] = calculateDistance;
            continue;
        case 'searchPlaces':
            window['searchPlaces'] = searchPlaces;
            continue;
        case 'getFamousPlace':
            window['getFamousPlace'] = getFamousPlace;
            continue;
        }
        break;
    }
}
