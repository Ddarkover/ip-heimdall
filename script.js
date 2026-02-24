const elements = {
    searchForm: document.getElementById('searchForm'),
    ipInput: document.getElementById('ipInput'),
    searchBtn: document.getElementById('searchBtn'),
    myIpBtn: document.getElementById('myIpBtn'),
    errorMsg: document.getElementById('errorMsg'),
    spinner: document.getElementById('spinner'),
    results: document.getElementById('results'),
    mainIp: document.getElementById('mainIp'),
    countryFlag: document.getElementById('countryFlag'),
    countryName: document.getElementById('countryName'),
    cityInfo: document.getElementById('cityInfo'),
    countryCode: document.getElementById('countryCode'),
    region: document.getElementById('region'),
    regionCountry: document.getElementById('regionCountry'),
    timezone: document.getElementById('timezone'),
    currentTime: document.getElementById('currentTime'),
    postal: document.getElementById('postal'),
    coords: document.getElementById('coords'),
    ipType: document.getElementById('ipType'),
    typeStatus: document.getElementById('typeStatus'),
    callingCode: document.getElementById('callingCode'),
    asn: document.getElementById('asn'),
    org: document.getElementById('org'),
    domain: document.getElementById('domain'),
    isp: document.getElementById('isp'),
    securityBadges: document.getElementById('securityBadges')
};

const continentNames = {
    AF: 'Africa',
    AN: 'Antarctica',
    AS: 'Asia',
    EU: 'Europe',
    NA: 'North America',
    OC: 'Oceania',
    SA: 'South America'
};

let activeRequestId = 0;

function isValidIPv4(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) {
        return false;
    }

    return parts.every((part) => {
        if (!/^\d{1,3}$/.test(part)) {
            return false;
        }

        const value = Number(part);
        return value >= 0 && value <= 255;
    });
}

function isValidIPv6(ip) {
    const ipv6Regex = /^(?:[\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$|^(?:[\da-fA-F]{1,4}:){1,7}:$|^:(?::[\da-fA-F]{1,4}){1,7}$|^(?:[\da-fA-F]{1,4}:){1,6}:[\da-fA-F]{1,4}$|^(?:[\da-fA-F]{1,4}:){1,5}(?::[\da-fA-F]{1,4}){1,2}$|^(?:[\da-fA-F]{1,4}:){1,4}(?::[\da-fA-F]{1,4}){1,3}$|^(?:[\da-fA-F]{1,4}:){1,3}(?::[\da-fA-F]{1,4}){1,4}$|^(?:[\da-fA-F]{1,4}:){1,2}(?::[\da-fA-F]{1,4}){1,5}$|^[\da-fA-F]{1,4}:(?:(?::[\da-fA-F]{1,4}){1,6})$|^(?:[\da-fA-F]{1,4}:){1,4}:(?:\d{1,3}\.){3}\d{1,3}$/;
    return ipv6Regex.test(ip);
}

function isValidIP(ip) {
    return isValidIPv4(ip) || isValidIPv6(ip);
}

function showError(msg) {
    elements.errorMsg.textContent = msg;
    elements.errorMsg.classList.add('show');
    elements.results.classList.remove('show');
}

function hideError() {
    elements.errorMsg.classList.remove('show');
}

function setLoading(isLoading) {
    elements.spinner.classList.toggle('show', isLoading);
    elements.searchBtn.disabled = isLoading;
    elements.myIpBtn.disabled = isLoading;
    elements.ipInput.disabled = isLoading;
}

function getCountryFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) {
        return '🌐';
    }

    return countryCode
        .toUpperCase()
        .split('')
        .map((char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
        .join('');
}

function getTimeForTimezone(timezone) {
    if (!timezone) {
        return '—';
    }

    try {
        return new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timezone
        }).format(new Date());
    } catch {
        return '—';
    }
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        const error = new Error(`Request failed: ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return response.json();
}

function normalizeIpapiIs(data) {
    const countryCode = data.location?.country_code;
    return {
        ip: data.ip,
        flag: { emoji: getCountryFlag(countryCode) },
        country: data.location?.country,
        city: data.location?.city,
        region: data.location?.state,
        country_code: countryCode,
        continent: continentNames[data.location?.continent_code] || '—',
        continent_code: data.location?.continent_code,
        timezone: { utc: data.location?.timezone, current_time: getTimeForTimezone(data.location?.timezone) },
        postal: data.location?.zip,
        latitude: data.location?.latitude,
        longitude: data.location?.longitude,
        type: data.is_ipv6 ? 'IPv6' : 'IPv4',
        calling_code: data.location?.calling_code,
        connection: { asn: data.asn?.asn, org: data.company?.name, isp: data.company?.name }
    };
}

function normalizeIpwhoIs(data) {
    return {
        ip: data.ip,
        flag: { emoji: getCountryFlag(data.country_code) },
        country: data.country,
        city: data.city,
        region: data.region,
        country_code: data.country_code,
        continent: data.continent,
        continent_code: data.continent_code,
        timezone: { utc: data.timezone?.id, current_time: data.timezone?.current_time || getTimeForTimezone(data.timezone?.id) },
        postal: data.postal,
        latitude: data.latitude,
        longitude: data.longitude,
        type: data.type,
        calling_code: data.calling_code,
        connection: {
            asn: data.connection?.asn,
            org: data.connection?.org,
            isp: data.connection?.isp
        }
    };
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchIpapiIs(ip) {
    const query = ip ? `?q=${encodeURIComponent(ip)}` : '';

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            return await fetchJson(`https://api.ipapi.is/${query}`);
        } catch (error) {
            const isLastAttempt = attempt === 3;
            if (error?.status === 429 && !isLastAttempt) {
                await wait(250 * attempt);
                continue;
            }

            throw error;
        }
    }
}

async function fetchGeoWithFallback(ip) {
    const providers = [
        {
            name: 'api.ipapi.is',
            request: () => fetchIpapiIs(ip),
            isError: (data) => !data?.ip,
            normalize: normalizeIpapiIs,
            includeSecurity: true
        },
        {
            name: 'ipwho.is',
            request: () => fetchJson(`https://ipwho.is/${ip}`),
            isError: (data) => data?.success === false || !data?.ip,
            normalize: normalizeIpwhoIs,
            includeSecurity: false
        }
    ];

    for (const provider of providers) {
        try {
            const rawData = await provider.request();
            if (provider.isError(rawData)) {
                continue;
            }

            return {
                provider: provider.name,
                geoData: provider.normalize(rawData),
                securityData: provider.includeSecurity ? rawData : null
            };
        } catch {
            continue;
        }
    }

    throw new Error('No available geo provider');
}

async function fetchIP(ip) {
    const requestId = ++activeRequestId;
    hideError();
    setLoading(true);

    try {
        const { geoData, securityData } = await fetchGeoWithFallback(ip);

        if (requestId !== activeRequestId) {
            return;
        }

        let resolvedSecurity = securityData;
        if (!resolvedSecurity) {
            const securityResult = await fetchIpapiIs(ip).catch(() => ({}));
            resolvedSecurity = securityResult;
        }

        if (requestId !== activeRequestId) {
            return;
        }

        displayResults(geoData, resolvedSecurity || {});
    } catch {
        if (requestId !== activeRequestId) {
            return;
        }

        showError('Не удалось получить данные по IP. Попробуйте другой адрес.');
    } finally {
        if (requestId === activeRequestId) {
            setLoading(false);
        }
    }
}

function displayResults(data1, data2) {
    elements.mainIp.textContent = data1.ip || '—';
    elements.countryFlag.textContent = data1.flag?.emoji || '🌐';
    elements.countryName.textContent = data1.country || '—';
    elements.cityInfo.textContent = [data1.city, data1.region].filter(Boolean).join(', ') || '—';
    elements.countryCode.textContent = data1.country_code || '—';

    elements.region.textContent = data1.region || data1.city || '—';
    elements.regionCountry.textContent = data1.country || '—';
    elements.timezone.textContent = data1.timezone?.utc || '—';
    elements.currentTime.textContent = data1.timezone?.current_time || '—';
    elements.postal.textContent = data1.postal || 'N/A';

    const lat = typeof data1.latitude === 'number' ? data1.latitude.toFixed(4) : '—';
    const lon = typeof data1.longitude === 'number' ? data1.longitude.toFixed(4) : '—';
    elements.coords.textContent = `${lat}°, ${lon}°`;

    elements.ipType.textContent = data1.type || '—';
    elements.typeStatus.textContent = data1.ip ? 'Валидный' : 'Невалидный';

    elements.callingCode.textContent = data1.calling_code || '—';

    elements.asn.textContent = data1.connection?.asn || data2.asn?.asn || '—';
    elements.org.textContent = data1.connection?.org || data2.company?.name || '—';
    elements.domain.textContent = data2.company?.domain || '—';
    elements.isp.textContent = data1.connection?.isp || data2.company?.name || 'N/A';

    displaySecurityInfo(data2);
    elements.results.classList.add('show');
}

function displaySecurityInfo(data) {
    const badges = [
        { label: 'VPN', value: data?.is_vpn, type: data?.is_vpn ? 'danger' : 'no' },
        { label: 'Proxy', value: data?.is_proxy, type: data?.is_proxy ? 'danger' : 'no' },
        { label: 'Tor', value: data?.is_tor, type: data?.is_tor ? 'danger' : 'no' },
        { label: 'Datacenter', value: data?.is_datacenter, type: data?.is_datacenter ? 'warn' : 'no' },
        { label: 'Bot/Crawler', value: data?.is_crawler, type: data?.is_crawler ? 'warn' : 'no' },
        { label: 'Mobile', value: data?.is_mobile, type: data?.is_mobile ? 'yes' : 'no' },
        { label: 'Satellite', value: data?.is_satellite, type: data?.is_satellite ? 'warn' : 'no' },
        { label: 'Abuser', value: data?.is_abuser, type: data?.is_abuser ? 'danger' : 'yes' }
    ];

    elements.securityBadges.innerHTML = '';

    badges.forEach((badge) => {
        const span = document.createElement('span');
        span.className = `badge badge-${badge.value ? (badge.type === 'yes' ? 'yes' : badge.type) : 'no'}`;
        span.textContent = `${badge.label}: ${badge.value ? 'Yes' : 'No'}`;
        elements.securityBadges.appendChild(span);
    });
}

function handleSearch(ip) {
    if (!ip) {
        showError('Пожалуйста, введите IP-адрес');
        return;
    }

    if (!isValidIP(ip)) {
        showError('Неверный формат IP-адреса');
        return;
    }

    fetchIP(ip);
}

elements.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSearch(elements.ipInput.value.trim());
});

elements.myIpBtn.addEventListener('click', async () => {
    hideError();
    setLoading(true);

    try {
        const data = await fetchGeoWithFallback('');
        if (!data?.geoData?.ip) {
            throw new Error('IP not found');
        }

        elements.ipInput.value = data.geoData.ip;
        await fetchIP(data.geoData.ip);
    } catch {
        showError('Ошибка при определении вашего IP');
    } finally {
        setLoading(false);
    }
});

window.addEventListener('load', () => {
    elements.myIpBtn.click();
});
