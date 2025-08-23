//
// ---> EDITAR AQUI <---
// Cole a URL do seu backend que já está no Render.
const API_URL = 'https://seu-backend.onrender.com/api/locations/all';

// Seu token já está configurado abaixo.
const API_TOKEN = 'um_token_unico_e_diferente_do_bot'; 
//

// --- NÃO PRECISA EDITAR DAQUI PARA BAIXO ---

// Inicializa o mapa
const map = L.map('map').setView([-14.235, -5.925], 4);

// Adiciona a camada de mapa base
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Objeto para guardar os marcadores e poder atualizá-los
const deviceMarkers = {};

async function updateMapMarkers() {
    console.log("Buscando localizações...");
    try {
        // --- Requisição com Cabeçalho de Autenticação ---
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error('ERRO 401: TOKEN INVÁLIDO! O token enviado pelo frontend não foi aceito pelo backend.');
                alert('Erro de Autenticação. Verifique o console para mais detalhes.');
            } else {
                console.error('Falha na resposta da API:', response.statusText);
            }
            return;
        }
        
        const devices = await response.json();

        devices.forEach(device => {
            const { deviceName, latitude, longitude, timestamp, displayName } = device;

            if (!latitude || !longitude) return;

            const date = new Date(timestamp);
            const formattedTime = date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            const popupContent = `
                <b>Dispositivo:</b> ${displayName}<br>
                <b>Última vez visto:</b> ${formattedTime}
            `;

            if (deviceMarkers[deviceName]) {
                deviceMarkers[deviceName].setLatLng([latitude, longitude]).setPopupContent(popupContent);
            } else {
                deviceMarkers[deviceName] = L.marker([latitude, longitude]).addTo(map).bindPopup(popupContent);
            }
        });

    } catch (error) {
        console.error('Erro na requisição da API:', error);
    }
}

// Roda a função pela primeira vez e depois a cada 15 segundos
updateMapMarkers();
setInterval(updateMapMarkers, 15000);