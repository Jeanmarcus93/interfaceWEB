//
// ---> NENHUMA CONFIGURAÇÃO MANUAL NECESSÁRIA AQUI <---
// O script agora é dinâmico e vai pegar as informações da URL.
//

// URL do seu backend. O endpoint específico será chamado na função.
const API_BASE_URL = 'https://servidor-bot-60dr.onrender.com'; 

// --- NÃO PRECISA EDITAR DAQUI PARA BAIXO ---

// 1. FUNÇÃO PARA OBTER O TOKEN DA URL
function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
}

// 2. INICIALIZAÇÃO DO MAPA E CAMADAS
const map = L.map('map').setView([-14.235, -5.925], 4);
const googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: 'Map data © Google'
}).addTo(map);
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
});
L.control.layers({ "Google Maps (Híbrido)": googleHybrid, "OpenStreetMap": osmLayer }).addTo(map);


// 3. ELEMENTOS DA INTERFACE E ÍCONE
const deviceSelector = document.getElementById('device-selector');
const deviceMarkers = {};
let isFirstLoad = true;
const cellphoneIcon = L.divIcon({
    html: `<div class="phone-body"><div class="phone-screen"></div><div class="phone-button"></div></div>`,
    className: 'cellphone-marker-icon',
    iconSize: [18, 40],
    iconAnchor: [9, 40],
    popupAnchor: [0, -41]
});


// 4. FUNÇÃO PRINCIPAL MODIFICADA
async function updateMapMarkers(userToken) {
    console.log("Buscando localizações do usuário...");
    
    // ## INÍCIO DA ALTERAÇÃO ##
    // Array para guardar as coordenadas de todos os marcadores para o auto-zoom
    const markerBounds = []; 
    // ## FIM DA ALTERAÇÃO ##

    try {
        const response = await fetch(`${API_BASE_URL}/api/my-locations`, {
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.error('ERRO: Token inválido ou expirado.');
                document.body.innerHTML = `<h1>Acesso Negado</h1><p>Seu link pode ter expirado. Por favor, solicite um novo link ao bot do Telegram.</p>`;
            } else {
                console.error('Falha na resposta da API:', response.statusText);
            }
            return;
        }
        
        const devices = await response.json();
        const selectedDevice = deviceSelector.value;
        deviceSelector.innerHTML = '<option value="">-- Selecione um dispositivo --</option>';

        devices.forEach(device => {
            const { deviceName, latitude, longitude, timestamp, displayName } = device;
            if (!latitude || !longitude) return;

            // ## INÍCIO DA ALTERAÇÃO ##
            // Adiciona as coordenadas ao array para o auto-zoom
            markerBounds.push([latitude, longitude]);
            // ## FIM DA ALTERAÇÃO ##

            const date = new Date(timestamp);
            const formattedTime = date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            const option = document.createElement('option');
            option.value = deviceName;
            option.textContent = `${displayName} (${formattedTime})`;
            deviceSelector.appendChild(option);

            const popupContent = `<b>Dispositivo:</b> ${displayName}<br><b>Última vez visto:</b> ${formattedTime}`;

            if (deviceMarkers[deviceName]) {
                deviceMarkers[deviceName].setLatLng([latitude, longitude]).setPopupContent(popupContent);
            } else {
                deviceMarkers[deviceName] = L.marker([latitude, longitude], { icon: cellphoneIcon }).addTo(map).bindPopup(popupContent);
            }
        });

        deviceSelector.value = selectedDevice;
        
        // ## INÍCIO DA ALTERAÇÃO PRINCIPAL ##
        // Na primeira carga bem-sucedida, ajusta o zoom e exibe o seletor
        if (isFirstLoad && markerBounds.length > 0) {
            if (markerBounds.length === 1) {
                // Se houver apenas um dispositivo, centraliza nele com um zoom fixo
                map.setView(markerBounds[0], 16); 
            } else {
                // Se houver múltiplos dispositivos, ajusta o mapa para mostrar todos
                // O padding garante que os marcadores não fiquem colados nas bordas
                map.fitBounds(markerBounds, { padding: [50, 50] });
            }

            deviceSelector.classList.remove('hidden');
            isFirstLoad = false;
        }
        // ## FIM DA ALTERAÇÃO PRINCIPAL ##

    } catch (error) {
        console.error('Erro na requisição da API:', error);
    }
}


// 5. INICIALIZAÇÃO E LÓGICA DE CONTROLE
document.addEventListener('DOMContentLoaded', () => {
    const userToken = getTokenFromUrl();

    if (!userToken) {
        console.error("Token de acesso não encontrado na URL.");
        document.body.innerHTML = `<h1>Acesso Inválido</h1><p>Este mapa só pode ser acessado através de um link seguro gerado pelo bot do Telegram.</p>`;
        return;
    }

    deviceSelector.addEventListener('change', function() {
        const selectedDeviceName = this.value;
        if (selectedDeviceName && deviceMarkers[selectedDeviceName]) {
            const marker = deviceMarkers[selectedDeviceName];
            map.setView(marker.getLatLng(), 16);
            marker.openPopup();
        }
    });

    updateMapMarkers(userToken);
    setInterval(() => updateMapMarkers(userToken), 15000);
});