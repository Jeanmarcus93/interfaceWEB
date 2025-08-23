//
// ---> EDITAR AQUI <---
// Cole a URL do seu backend que já está no Render.
const API_URL = 'https://servidor-bot-60dr.onrender.com/api/locations/all';

// Seu token já está configurado abaixo.
const API_TOKEN = 'um_token_unico_e_diferente_do_bot'; 
//

// --- NÃO PRECISA EDITAR DAQUI PARA BAIXO ---

// 1. INICIALIZAÇÃO DO MAPA E CAMADAS
const map = L.map('map').setView([-14.235, -5.925], 4);

// Camada do OpenStreetMap (padrão)
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Camada do Google Maps (Híbrido)
const googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: 'Map data &copy; <a href="https://www.google.com/maps">Google Maps</a>'
});

// Adiciona a camada do Google Híbrido como padrão inicial ao mapa
googleHybrid.addTo(map);

// Objeto para controle de camadas
const baseMaps = {
    "Google Maps (Híbrido)": googleHybrid,
    "OpenStreetMap": osmLayer
};

// Adiciona o controle de seleção de camadas ao mapa
L.control.layers(baseMaps).addTo(map);


// 2. ELEMENTOS DA INTERFACE
const deviceSelector = document.getElementById('device-selector');
const deviceMarkers = {}; // Objeto para guardar os marcadores e poder atualizá-los
let isFirstLoad = true; // Flag para controlar a primeira carga

// 3. ÍCONE PERSONALIZADO (ALFINETE DE CELULAR)
const cellphoneIcon = L.divIcon({
    html: `
        <div class="phone-body">
            <div class="phone-screen"></div>
            <div class="phone-button"></div>
        </div>
    `,
    className: 'cellphone-marker-icon',
    iconSize: [18, 40], // Tamanho do ícone
    iconAnchor: [9, 40], // Ponto do ícone que corresponde à coordenada do mapa
    popupAnchor: [0, -41] // Ponto a partir do qual o popup deve abrir
});


// 4. FUNÇÃO PRINCIPAL PARA ATUALIZAR O MAPA
async function updateMapMarkers() {
    console.log("Buscando localizações...");
    try {
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        });

        if (!response.ok) {
            console.error('Falha na resposta da API:', response.status, response.statusText);
            if (response.status === 401) {
                alert('ERRO 401: TOKEN INVÁLIDO! Verifique se o token no frontend é o mesmo esperado pelo backend.');
            }
            return;
        }
        
        const devices = await response.json();
        
        // Guarda o valor selecionado para não perdê-lo após a atualização
        const selectedDevice = deviceSelector.value;
        deviceSelector.innerHTML = '<option value="">-- Selecione um dispositivo --</option>';

        devices.forEach(device => {
            const { deviceName, latitude, longitude, timestamp, displayName } = device;

            if (!latitude || !longitude) return;

            const date = new Date(timestamp);
            const formattedTime = date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            // Adiciona a opção ao seletor flutuante
            const option = document.createElement('option');
            option.value = deviceName;
            option.textContent = `${displayName} (${formattedTime})`;
            deviceSelector.appendChild(option);

            // Cria o conteúdo do popup
            const popupContent = `
                <b>Dispositivo:</b> ${displayName}<br>
                <b>Última vez visto:</b> ${formattedTime}
            `;

            // Atualiza ou cria o marcador no mapa
            if (deviceMarkers[deviceName]) {
                deviceMarkers[deviceName].setLatLng([latitude, longitude]).setPopupContent(popupContent);
            } else {
                deviceMarkers[deviceName] = L.marker([latitude, longitude], { icon: cellphoneIcon })
                    .addTo(map)
                    .bindPopup(popupContent);
            }
        });

        // Restaura a seleção anterior, se ainda existir
        deviceSelector.value = selectedDevice;
        
        // Na primeira carga bem-sucedida, exibe o seletor
        if (isFirstLoad && devices.length > 0) {
            deviceSelector.classList.remove('hidden');
            isFirstLoad = false;
        }

    } catch (error) {
        console.error('Erro na requisição da API:', error);
    }
}

// 5. EVENTOS E INICIALIZAÇÃO
// Event listener para o seletor de dispositivo
deviceSelector.addEventListener('change', function() {
    const selectedDeviceName = this.value;
    if (selectedDeviceName && deviceMarkers[selectedDeviceName]) {
        const marker = deviceMarkers[selectedDeviceName];
        map.setView(marker.getLatLng(), 16); // Centraliza e dá zoom no marcador
        marker.openPopup();
    }
});

// Roda a função pela primeira vez e depois a cada 15 segundos
updateMapMarkers();
setInterval(updateMapMarkers, 15000);