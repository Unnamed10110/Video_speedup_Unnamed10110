// Script del popup para la Extensión de Velocidad de Videos

document.addEventListener('DOMContentLoaded', function() {
    const currentSpeedElement = document.getElementById('currentSpeed');
    const currentSlowSpeedElement = document.getElementById('currentSlowSpeed');
    const resetBtn = document.getElementById('resetBtn');
    const cycleBtn = document.getElementById('cycleBtn');
    const resetSlowBtn = document.getElementById('resetSlowBtn');
    const cycleSlowBtn = document.getElementById('cycleSlowBtn');
    const statusElement = document.getElementById('status');
    
    // Nuevos elementos
    const speedSlider = document.getElementById('speedSlider');
    const slowSpeedSlider = document.getElementById('slowSpeedSlider');
    const floatingPanelToggle = document.getElementById('floatingPanelToggle');
    const speedLockToggle = document.getElementById('speedLockToggle');

    // Función para actualizar la visualización de velocidad actual
    function updateSpeedDisplay(speed) {
        currentSpeedElement.textContent = `${speed}x`;
        speedSlider.value = speed;
    }

    // Función para actualizar la visualización de velocidad lenta actual
    function updateSlowSpeedDisplay(speed) {
        currentSlowSpeedElement.textContent = `${speed}x`;
        slowSpeedSlider.value = speed;
    }

    // Función para detectar plataforma soportada
    function getSupportedPlatform(url) {
        if (url.includes('tiktok.com')) return 'TikTok';
        if (url.includes('youtube.com')) return 'YouTube';
        if (url.includes('vimeo.com')) return 'Vimeo';
        if (url.includes('twitch.tv')) return 'Twitch';
        if (url.includes('instagram.com')) return 'Instagram';
        return null;
    }

    // Función para verificar si la plataforma está soportada
    function isPlatformSupported(url) {
        return getSupportedPlatform(url) !== null;
    }

    // Función para enviar mensaje al script de contenido
    function sendMessageToContentScript(action, data = {}) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url && isPlatformSupported(tabs[0].url)) {
                chrome.tabs.sendMessage(tabs[0].id, {action: action, ...data}, function(response) {
                    if (response) {
                        if (response.speed) {
                            updateSpeedDisplay(response.speed);
                        }
                        if (response.slowSpeed) {
                            updateSlowSpeedDisplay(response.slowSpeed);
                        }
                        if (response.floatingPanelEnabled !== undefined) {
                            floatingPanelToggle.checked = response.floatingPanelEnabled;
                        }
                        if (response.speedLockEnabled !== undefined) {
                            speedLockToggle.checked = response.speedLockEnabled;
                        }
                    }
                });
            } else {
                const platform = getSupportedPlatform(tabs[0]?.url);
                statusElement.textContent = platform ? `Extensión activa en ${platform}` : 'No estás en una plataforma soportada';
                statusElement.style.color = platform ? '#51cf66' : '#ff6b6b';
            }
        });
    }

    // Función para obtener velocidades actuales del script de contenido
    function getCurrentSpeeds() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url && isPlatformSupported(tabs[0].url)) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'getSpeed'}, function(response) {
                    if (response) {
                        if (response.speed) {
                            updateSpeedDisplay(response.speed);
                        }
                        if (response.slowSpeed) {
                            updateSlowSpeedDisplay(response.slowSpeed);
                        }
                        if (response.floatingPanelEnabled !== undefined) {
                            floatingPanelToggle.checked = response.floatingPanelEnabled;
                        }
                        if (response.speedLockEnabled !== undefined) {
                            speedLockToggle.checked = response.speedLockEnabled;
                        }
                        const platform = getSupportedPlatform(tabs[0].url);
                        statusElement.textContent = `Extensión activa en ${platform}`;
                        statusElement.style.color = '#51cf66';
                    } else {
                        statusElement.textContent = 'No hay video reproduciéndose';
                        statusElement.style.color = '#ffd43b';
                    }
                });
            } else {
                const platform = getSupportedPlatform(tabs[0]?.url);
                statusElement.textContent = platform ? `Extensión activa en ${platform}` : 'No estás en una plataforma soportada';
                statusElement.style.color = platform ? '#51cf66' : '#ff6b6b';
            }
        });
    }

    // Event listeners para botones de velocidad
    resetBtn.addEventListener('click', function() {
        sendMessageToContentScript('reset');
    });

    cycleBtn.addEventListener('click', function() {
        sendMessageToContentScript('cycle');
    });

    // Event listeners para botones de velocidad lenta
    resetSlowBtn.addEventListener('click', function() {
        sendMessageToContentScript('resetSlow');
    });

    cycleSlowBtn.addEventListener('click', function() {
        sendMessageToContentScript('cycleSlow');
    });

    // Event listeners para sliders
    speedSlider.addEventListener('input', function() {
        const speed = parseFloat(this.value);
        updateSpeedDisplay(speed);
        sendMessageToContentScript('setSpeed', {speed: speed});
    });

    slowSpeedSlider.addEventListener('input', function() {
        const speed = parseFloat(this.value);
        updateSlowSpeedDisplay(speed);
        sendMessageToContentScript('setSlowSpeed', {speed: speed});
    });

    // Event listeners para toggles
    floatingPanelToggle.addEventListener('change', function() {
        sendMessageToContentScript('toggleFloatingPanel', {enabled: this.checked});
    });

    speedLockToggle.addEventListener('change', function() {
        sendMessageToContentScript('toggleSpeedLock', {enabled: this.checked});
    });

    // Inicializar popup
    getCurrentSpeeds();

    // Actualizar visualización de velocidad cada segundo cuando el popup está abierto
    const updateInterval = setInterval(getCurrentSpeeds, 1000);

    // Limpiar intervalo cuando el popup se cierra
    window.addEventListener('beforeunload', function() {
        clearInterval(updateInterval);
    });
}); 