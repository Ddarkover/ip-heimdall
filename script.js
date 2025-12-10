const elements = {
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
    continent: document.getElementById('continent'),
    continentCode: document.getElementById('continentCode'),
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

function isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function showError(msg) {
    elements.errorMsg.textContent = msg;
    elements.errorMsg.classList.add('show');
    elements.results.classList.remove('show');
}

function hideError() {
    elements.errorMsg.classList.remove('show');
}

function showLoading() {
    elements.spinner.classList.add('show');
    elements.searchBtn.disabled = true;
}

function hideLoading() {
    elements.spinner.classList.remove('show');
    elements.searchBtn.disabled = false;
}

async function fetchIP(ip) {
    hideError();
    showLoading();

    try {
        const [resp1, resp2] = await Promise.all([
            fetch(`https://ipwho.is/${ip}`),
            fetch(`https://api.ipapi.is/?q=${ip}`)
        ]);

        if (!resp1.ok || !resp2.ok) {
            throw new Error('API error');
        }

        const data1 = await resp1.json();
        const data2 = await resp2.json();

        if (!data1.success) {
            showError('Невалидный IP-адрес');
            hideLoading();
            return;
        }

        displayResults(data1, data2);
        hideLoading();
    } catch (error) {
        showError('Ошибка при получении данных. Проверьте IP-адрес.');
        hideLoading();
    }
}

function displayResults(data1, data2) {
    // Main info
    elements.mainIp.textContent = data1.ip;
    elements.countryFlag.textContent = data1.flag?.emoji || '🌐';
    elements.countryName.textContent = data1.country;
    elements.cityInfo.textContent = `${data1.city}, ${data1.region}`;
    elements.countryCode.textContent = data1.country_code;

    // Geography
    elements.continent.textContent = data1.continent;
    elements.continentCode.textContent = data1.continent_code;
    elements.timezone.textContent = data1.timezone?.utc || '—';
    elements.currentTime.textContent = data1.timezone?.current_time?.split('T')[1]?.slice(0, 5) || '—';
    elements.postal.textContent = data1.postal || 'N/A';

    // Coordinates
    const lat = data1.latitude?.toFixed(4) || '—';
    const lon = data1.longitude?.toFixed(4) || '—';
    elements.coords.textContent = `${lat}°, ${lon}°`;

    // IP Type
    elements.ipType.textContent = data1.type;
    elements.typeStatus.textContent = data1.success ? 'Валидный' : 'Невалидный';

    // Calling code
    elements.callingCode.textContent = `+${data1.calling_code}`;

    // Network
    elements.asn.textContent = data1.connection?.asn || data2.asn?.asn || '—';
    elements.org.textContent = data1.connection?.org || data2.company?.name || '—';
    elements.domain.textContent = data1.connection?.domain || data2.company?.domain || '—';
    elements.isp.textContent = data1.connection?.isp || 'N/A';

    // Security badges
    displaySecurityInfo(data2);

    // Show results
    elements.results.classList.add('show');
}

function displaySecurityInfo(data) {
    const badges = [
        { label: 'VPN', value: data.is_vpn, type: data.is_vpn ? 'danger' : 'no' },
        { label: 'Proxy', value: data.is_proxy, type: data.is_proxy ? 'danger' : 'no' },
        { label: 'Tor', value: data.is_tor, type: data.is_tor ? 'danger' : 'no' },
        { label: 'Datacenter', value: data.is_datacenter, type: data.is_datacenter ? 'warn' : 'no' },
        { label: 'Bot/Crawler', value: data.is_crawler, type: data.is_crawler ? 'warn' : 'no' },
        { label: 'Mobile', value: data.is_mobile, type: data.is_mobile ? 'yes' : 'no' },
        { label: 'Satellite', value: data.is_satellite, type: data.is_satellite ? 'warn' : 'no' },
        { label: 'Abuser', value: data.is_abuser, type: data.is_abuser ? 'danger' : 'yes' }
    ];

    elements.securityBadges.innerHTML = badges
        .map(b => `<span class="badge badge-${b.value ? (b.type === 'yes' ? 'yes' : b.type) : 'no'}">
            ${b.label}: ${b.value ? 'Yes' : 'No'}
        </span>`)
        .join('');
}

// Event listeners
elements.searchBtn.addEventListener('click', () => {
    const ip = elements.ipInput.value.trim();
    if (!ip) {
        showError('Пожалуйста, введите IP-адрес');
        return;
    }
    if (!isValidIP(ip)) {
        showError('Неверный формат IP-адреса');
        return;
    }
    fetchIP(ip);
});

elements.myIpBtn.addEventListener('click', () => {
    showLoading();
    fetch('https://ipwho.is/')
        .then(r => r.json())
        .then(data => {
            elements.ipInput.value = data.ip;
            fetchIP(data.ip);
        })
        .catch(() => {
            showError('Ошибка при определении вашего IP');
            hideLoading();
        });
});

elements.ipInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.searchBtn.click();
    }
});

// Load user's IP on page load
window.addEventListener('load', () => {
    elements.myIpBtn.click();
});
