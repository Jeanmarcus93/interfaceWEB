document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO ---
    // Define a URL base do seu servidor de backend (API).
    const API_BASE_URL = 'https://servidor-bot-60dr.onrender.com';

    // --- SELETORES DE ELEMENTOS DOM ---
    const deviceSelector = document.getElementById('device-selector');
    const deviceSelectionArea = document.getElementById('device-selection-area');
    const rulesContainer = document.getElementById('rules-container');
    const permitidoList = document.getElementById('permitido-list');
    const proibidoList = document.getElementById('proibido-list');
    const permitidoForm = document.getElementById('permitido-form');
    const proibidoForm = document.getElementById('proibido-form');
    const pageTitleElement = document.getElementById('page-title'); // Novo seletor para o título

    // --- VARIÁVEIS DE ESTADO ---
    let currentDevice = null;
    let jwtToken = null; // O token JWT será lido da URL.
    let currentUserId = null; // O user_id será obtido após a validação do token

    // --- FUNÇÕES AUXILIARES ---

    /**
     * Obtém parâmetros da query string da URL atual.
     * @param {string} name - O nome do parâmetro a ser obtido.
     * @returns {string|null} O valor do parâmetro ou nulo se não for encontrado.
     */
    function getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    /**
     * Realiza uma requisição fetch autenticada.
     * @param {string} url - O endpoint da API (ex: '/api/devices').
     * @param {object} options - Opções para a requisição fetch.
     * @returns {Promise<Response>} A promessa da requisição fetch.
     */
    async function fetchWithAuth(url, options = {}) {
        if (!jwtToken) {
            console.error('Erro fatal: JWT Token não encontrado.');
            alert('Erro de autenticação: Token de acesso não fornecido.');
            return Promise.reject(new Error('Token de acesso não fornecido.'));
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${jwtToken}`
        };
        
        const fullUrl = `${API_BASE_URL}${url}`;
        console.log('Requisição para:', fullUrl);
        return fetch(fullUrl, { ...options, headers });
    }

    // --- FUNÇÕES PRINCIPAIS ---

    /**
     * Busca os detalhes de um dispositivo e atualiza o título da página.
     * @param {string} deviceName - O nome do dispositivo a ser buscado.
     */
    async function fetchDeviceDetailsAndUpdateTitle(deviceName) {
        try {
            const response = await fetchWithAuth(`/api/device/${deviceName}`);
            if (response.ok) {
                const details = await response.json();
                // Usa o 'displayName', que é o nome customizado ou o original.
                pageTitleElement.textContent = `Cerca Virtual - ${details.displayName}`;
            } else {
                // Se falhar, usa o nome original da URL como fallback.
                console.warn(`Não foi possível buscar o nome do dispositivo. Usando fallback: ${deviceName}`);
                pageTitleElement.textContent = `Cerca Virtual - ${deviceName}`;
            }
        } catch (error) {
            console.error('Erro ao buscar detalhes do dispositivo:', error);
            // Em caso de erro de rede, também usa o fallback.
            pageTitleElement.textContent = `Cerca Virtual - ${deviceName}`;
        }
    }

    /**
     * Carrega a lista de dispositivos da API e preenche o seletor.
     */
    async function loadDevices() {
        try {
            const response = await fetchWithAuth('/api/locations/my_devices'); // Endpoint ajustado
            if (!response.ok) {
                console.error('Falha ao buscar dispositivos:', response.status, response.statusText);
                return;
            }
            const devices = await response.json();
            deviceSelector.innerHTML = '<option value="">-- Selecione --</option>';
            // A API agora retorna uma lista de objetos { deviceName, displayName, ... }
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceName;
                option.textContent = device.displayName; // Mostra o nome de exibição
                deviceSelector.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar dispositivos:', error);
            deviceSelector.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    /**
     * Carrega as regras de cerca virtual para um dispositivo específico.
     * @param {string} deviceName - O nome do dispositivo.
     */
    async function loadRules(deviceName) {
        if (!deviceName) {
            rulesContainer.style.display = 'none';
            return;
        }
        rulesContainer.style.display = 'grid';
        currentDevice = deviceName;

        try {
            const response = await fetchWithAuth(`/api/geofences/${deviceName}`);
            if (!response.ok) {
                console.error('Falha ao buscar regras:', response.status, response.statusText);
                return;
            }
            const rules = await response.json();

            permitidoList.innerHTML = '';
            proibidoList.innerHTML = '';

            rules.forEach(rule => {
                const list = rule.regra === 'permitido' ? permitidoList : proibidoList;
                const listItem = document.createElement('li');
                listItem.textContent = rule.municipio.toUpperCase();

                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remover';
                removeBtn.className = 'delete-btn';
                removeBtn.onclick = () => removeRule(rule.municipio);

                listItem.appendChild(removeBtn);
                list.appendChild(listItem);
            });
        } catch (error) {
            console.error('Erro ao carregar regras:', error);
        }
    }

    /**
     * Adiciona uma nova regra de cerca virtual.
     * @param {string} municipio - O nome do município.
     * @param {string} regra - O tipo de regra ('permitido' ou 'proibido').
     */
    async function addRule(municipio, regra) {
        if (!currentDevice || !municipio) return;

        try {
            const response = await fetchWithAuth('/api/geofences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceName: currentDevice,
                    municipio: municipio.toLowerCase(),
                    regra: regra
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Falha ao adicionar regra:', response.status, errorData.message);
                alert(`Erro ao adicionar regra: ${errorData.message || 'Erro desconhecido'}`);
                return;
            }
            loadRules(currentDevice);
        } catch (error) {
            console.error('Erro ao adicionar regra:', error);
            alert(`Erro de comunicação ao adicionar regra: ${error.message}`);
        }
    }

    /**
     * Remove uma regra de cerca virtual existente.
     * @param {string} municipio - O nome do município a ser removido.
     */
    async function removeRule(municipio) {
        if (!currentDevice || !municipio) return;

        try {
            const response = await fetchWithAuth('/api/geofences', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceName: currentDevice,
                    municipio: municipio.toLowerCase()
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Falha ao remover regra:', response.status, errorData.message);
                alert(`Erro ao remover regra: ${errorData.message || 'Erro desconhecido'}`);
                return;
            }
            loadRules(currentDevice);
        } catch (error) {
            console.error('Erro ao remover regra:', error);
            alert(`Erro de comunicação ao remover regra: ${error.message}`);
        }
    }

    /**
     * Inicializa o componente de autocompletar para um campo de input.
     * @param {string} selectorId - O ID do elemento input.
     */
    function inicializarAutocomplete(selectorId) {
        new autoComplete({
            selector: `#${selectorId}`,
            placeHolder: "Digite o nome do município...",
            data: {
                src: async (query) => {
                    try {
                        const source = await fetchWithAuth(`/api/municipios?q=${query}`);
                        if (!source.ok) return [];
                        const data = await source.json();
                        return data.map(m => m.toUpperCase());
                    } catch (error) {
                        console.error('Erro na fonte de dados do autocompletar:', error);
                        return [];
                    }
                },
                cache: false,
            },
            resultsList: {
                element: (list, data) => {
                    if (!data.results.length) {
                        const message = document.createElement("div");
                        message.setAttribute("class", "no_result");
                        message.innerHTML = `<span>Nenhum resultado para "${data.query}"</span>`;
                        list.prepend(message);
                    }
                },
                noResults: true,
            },
            resultItem: {
                highlight: true
            },
            events: {
                    input: {
                        selection: (event) => {
                            const selection = event.detail.selection.value;
                            document.getElementById(selectorId).value = selection.toUpperCase();
                        }
                    }
                }
            });
        }

    // --- LÓGICA DE INICIALIZAÇÃO DA PÁGINA ---
    
    const deviceNameFromUrl = getQueryParam('device_name');
    jwtToken = getQueryParam('token'); // Pega o token JWT da URL

    if (!jwtToken) {
        document.body.innerHTML = '<h1>Erro: Acesso não autorizado. O token de acesso é necessário.</h1>';
        console.error("Token de acesso não encontrado na URL. A página não pode ser carregada.");
        return;
    }

    // Valida o token JWT com o backend para obter o user_id
    async function validateAndInitialize() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/validate_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: jwtToken })
            });

            const data = await response.json();

            if (!response.ok || data.status === 'error') {
                throw new Error(data.message || 'Token de acesso inválido ou expirado.');
            }
            
            currentUserId = data.user_id; // Armazena o user_id validado

            if (deviceNameFromUrl) {
                currentDevice = deviceNameFromUrl;
                loadRules(currentDevice);
                fetchDeviceDetailsAndUpdateTitle(currentDevice);
                deviceSelectionArea.style.display = 'none';
            } else {
                deviceSelectionArea.style.display = 'block';
                loadDevices();
                deviceSelector.addEventListener('change', () => {
                    loadRules(deviceSelector.value);
                    fetchDeviceDetailsAndUpdateTitle(deviceSelector.value);
                });
            }

            // --- EVENT LISTENERS PARA OS FORMULÁRIOS ---
            permitidoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = permitidoForm.querySelector('input');
                if (input.value) {
                    addRule(input.value.toUpperCase(), 'permitido');
                    input.value = '';
                }
            });

            proibidoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = proibidoForm.querySelector('input');
                if (input.value) {
                    addRule(input.value.toUpperCase(), 'proibido');
                    input.value = '';
                }
            });

            // Inicializa o autocompletar para ambos os campos de input.
            inicializarAutocomplete('permitido-input');
            inicializarAutocomplete('proibido-input');

        } catch (error) {
            document.body.innerHTML = `<h1>Erro de Autenticação</h1><p>${error.message}</p>`;
            console.error('Erro na validação do token:', error);
        }
    }

    validateAndInitialize();
});
