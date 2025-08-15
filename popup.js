// Script del popup para la extensión de aceleración de videos
let currentSpeed = 2.0;
let currentSlowSpeed = 0.5;
let isSpeedActive = false;
let isSlowActive = false;
let currentVolume = 1.0;
let isVolumeControlActive = false;
let floatingPanelEnabled = false;
let speedLockEnabled = false;
let platform = 'unknown';
let universalSpeed = 2.0;
let universalSpeedActive = false;

// Inicializar popup
document.addEventListener('DOMContentLoaded', function() {
            // Obtener pestaña actual para determinar plataforma
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const tab = tabs[0];
        const url = tab.url;
        
        if (url.includes('tiktok.com')) {
            platform = 'tiktok';
        } else if (url.includes('youtube.com')) {
            platform = 'youtube';
        } else if (url.includes('vimeo.com')) {
            platform = 'vimeo';
        } else if (url.includes('twitch.tv')) {
            platform = 'twitch';
        } else if (url.includes('instagram.com')) {
            platform = 'instagram';
        } else if (url.includes('twitter.com') || url.includes('x.com')) {
            platform = 'x';
        } else {
            platform = 'universal';
        }
        
        updatePlatformDisplay();
        loadSettings();
    });
    
            // Configurar listeners de eventos
    setupEventListeners();
});

function updatePlatformDisplay() {
    const platformInfo = document.getElementById('platform-info');
    if (platformInfo) {
        let platformText = '';
        let platformColor = '';
        
        switch(platform) {
            case 'tiktok':
                platformText = 'TikTok';
                platformColor = '#ff0050';
                break;
            case 'youtube':
                platformText = 'YouTube';
                platformColor = '#ff0000';
                break;
            case 'vimeo':
                platformText = 'Vimeo';
                platformColor = '#1ab7ea';
                break;
            case 'twitch':
                platformText = 'Twitch';
                platformColor = '#9146ff';
                break;
            case 'instagram':
                platformText = 'Instagram';
                platformColor = '#e4405f';
                break;
            case 'x':
                platformText = 'X.com / Twitter';
                platformColor = '#000000';
                break;
            case 'universal':
                platformText = 'Universal (Any Website)';
                platformColor = '#00ffff';
                break;
            default:
                platformText = 'Unknown Platform';
                platformColor = '#666666';
        }
        
        platformInfo.textContent = platformText;
        platformInfo.style.color = platformColor;
    }
    
            // Mostrar/ocultar controles específicos de plataforma
    const xControls = document.getElementById('x-controls');
    const universalControls = document.getElementById('universal-controls');
    const standardControls = document.getElementById('standard-controls');
    
    if (xControls) xControls.style.display = platform === 'x' ? 'block' : 'none';
    if (universalControls) universalControls.style.display = platform === 'universal' ? 'block' : 'none';
    if (standardControls) standardControls.style.display = (platform !== 'x' && platform !== 'universal') ? 'block' : 'none';
}

function setupEventListeners() {
    // Controles de velocidad
    document.getElementById('speed-up').addEventListener('click', increaseSpeed);
    document.getElementById('speed-down').addEventListener('click', decreaseSpeed);
    document.getElementById('speed-reset').addEventListener('click', resetSpeed);
    
    // Controles de velocidad lenta
    document.getElementById('slow-speed-up').addEventListener('click', increaseSlowSpeed);
    document.getElementById('slow-speed-down').addEventListener('click', decreaseSlowSpeed);
    document.getElementById('slow-speed-reset').addEventListener('click', resetSlowSpeed);
    
    // Controles de volumen
    document.getElementById('volume-up').addEventListener('click', increaseVolume);
    document.getElementById('volume-down').addEventListener('click', decreaseVolume);
    document.getElementById('volume-reset').addEventListener('click', resetVolume);
    
    // Controles de alternancia
    document.getElementById('toggle-speed').addEventListener('click', toggleSpeed);
    document.getElementById('toggle-slow-speed').addEventListener('click', toggleSlowSpeed);
    document.getElementById('toggle-volume').addEventListener('click', toggleVolume);
    
    // Controles universales
    document.getElementById('universal-speed-up').addEventListener('click', increaseUniversalSpeed);
    document.getElementById('universal-speed-down').addEventListener('click', decreaseUniversalSpeed);
    document.getElementById('universal-speed-reset').addEventListener('click', resetUniversalSpeed);
    document.getElementById('toggle-universal-speed').addEventListener('click', toggleUniversalSpeed);
    
    // Alternancia de panel flotante
    const floatingPanelToggle = document.getElementById('floating-panel-toggle');
    if (floatingPanelToggle) {
        floatingPanelToggle.addEventListener('click', toggleFloatingPanel);
    }
    
    // Alternancia de bloqueo de velocidad
    const speedLockToggle = document.getElementById('speed-lock-toggle');
    if (speedLockToggle) {
        speedLockToggle.addEventListener('click', toggleSpeedLock);
    }
}

function loadSettings() {
    if (platform === 'x') {
        // Cargar configuraciones del script de fondo para X.com
        chrome.runtime.sendMessage({action: 'getSpeed'}, function(response) {
            if (response) {
                currentSpeed = response.speed;
                currentSlowSpeed = response.slowSpeed;
                currentVolume = response.volume;
                isSpeedActive = response.isSpeedActive;
                isSlowActive = response.isSlowActive;
                updateDisplay();
            }
        });
    } else if (platform === 'universal') {
        // Cargar configuraciones del script de fondo para sistema universal
        chrome.runtime.sendMessage({action: 'getSpeed'}, function(response) {
            if (response) {
                universalSpeed = response.universalSpeed;
                universalSpeedActive = response.universalSpeedActive;
                updateDisplay();
            }
        });
    } else {
        // Cargar configuraciones del script de contenido para otras plataformas
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'getSettings'}, function(response) {
                    if (response) {
                    currentSpeed = response.speed;
                    currentSlowSpeed = response.slowSpeed;
                    currentVolume = response.volume;
                    isSpeedActive = response.isSpeedActive;
                    isSlowActive = response.isSlowActive;
                    floatingPanelEnabled = response.floatingPanelEnabled;
                    speedLockEnabled = response.speedLockEnabled;
                    updateDisplay();
                }
            });
        });
    }
}

function updateDisplay() {
    // Actualizar pantallas de velocidad
    document.getElementById('current-speed').textContent = currentSpeed.toFixed(1) + 'x';
    document.getElementById('current-slow-speed').textContent = currentSlowSpeed.toFixed(1) + 'x';
    document.getElementById('current-volume').textContent = Math.round(currentVolume * 100) + '%';
    
    // Actualizar pantalla de velocidad universal
    const universalSpeedDisplay = document.getElementById('universal-current-speed');
    if (universalSpeedDisplay) {
        universalSpeedDisplay.textContent = universalSpeed.toFixed(1) + 'x';
    }
    
    // Actualizar estados de botones de alternancia
    updateToggleStates();
}

function updateToggleStates() {
    // Alternancia de velocidad
    const speedToggle = document.getElementById('toggle-speed');
    if (speedToggle) {
        speedToggle.textContent = isSpeedActive ? 'Disable Speed' : 'Enable Speed';
        speedToggle.className = isSpeedActive ? 'btn btn-danger' : 'btn btn-success';
    }
    
    // Alternancia de velocidad lenta
    const slowSpeedToggle = document.getElementById('toggle-slow-speed');
    if (slowSpeedToggle) {
        slowSpeedToggle.textContent = isSlowActive ? 'Disable Slow Speed' : 'Enable Slow Speed';
        slowSpeedToggle.className = isSlowActive ? 'btn btn-danger' : 'btn btn-success';
    }
    
    // Alternancia de volumen
    const volumeToggle = document.getElementById('toggle-volume');
    if (volumeToggle) {
        volumeToggle.textContent = isVolumeControlActive ? 'Disable Volume Control' : 'Enable Volume Control';
        volumeToggle.className = isVolumeControlActive ? 'btn btn-danger' : 'btn btn-success';
    }
    
    // Alternancia de velocidad universal
    const universalSpeedToggle = document.getElementById('toggle-universal-speed');
    if (universalSpeedToggle) {
        universalSpeedToggle.textContent = universalSpeedActive ? 'Disable Universal Speed' : 'Enable Universal Speed';
        universalSpeedToggle.className = universalSpeedActive ? 'btn btn-danger' : 'btn btn-success';
    }
}

// Funciones de control de velocidad
function increaseSpeed() {
    currentSpeed = Math.min(currentSpeed + 0.5, 16.0);
    sendSpeedUpdate();
}

function decreaseSpeed() {
    currentSpeed = Math.max(currentSpeed - 0.5, 0.25);
    sendSpeedUpdate();
}

function resetSpeed() {
    currentSpeed = 2.0;
    sendSpeedUpdate();
}

// Funciones de control de velocidad lenta
function increaseSlowSpeed() {
    currentSlowSpeed = Math.min(currentSlowSpeed + 0.1, 1.0);
    sendSpeedUpdate();
}

function decreaseSlowSpeed() {
    currentSlowSpeed = Math.max(currentSlowSpeed - 0.1, 0.1);
    sendSpeedUpdate();
}

function resetSlowSpeed() {
    currentSlowSpeed = 0.5;
    sendSpeedUpdate();
}

// Funciones de control de velocidad universal
function increaseUniversalSpeed() {
    universalSpeed = Math.min(universalSpeed + 0.5, 16.0);
    sendUniversalSpeedUpdate();
}

function decreaseUniversalSpeed() {
    universalSpeed = Math.max(universalSpeed - 0.5, 0.25);
    sendUniversalSpeedUpdate();
}

function resetUniversalSpeed() {
    universalSpeed = 2.0;
    sendUniversalSpeedUpdate();
}

function toggleUniversalSpeed() {
    if (platform === 'universal') {
        chrome.runtime.sendMessage({action: 'toggleUniversalSpeed'}, function(response) {
            if (response && response.success) {
                universalSpeedActive = response.universalSpeedActive;
                updateDisplay();
            }
        });
    }
}

// Funciones de control de volumen
function increaseVolume() {
    currentVolume = Math.min(currentVolume + 0.1, 1.0);
    sendVolumeUpdate();
}

function decreaseVolume() {
    currentVolume = Math.max(currentVolume - 0.1, 0.0);
    sendVolumeUpdate();
}

function resetVolume() {
    currentVolume = 1.0;
    sendVolumeUpdate();
}

// Funciones de alternancia
function toggleSpeed() {
    if (platform === 'x') {
        chrome.runtime.sendMessage({action: 'toggleSpeed'}, function(response) {
            if (response && response.success) {
                isSpeedActive = response.isSpeedActive;
                updateDisplay();
            }
        });
    } else {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleSpeed'}, function(response) {
                if (response && response.success) {
                    isSpeedActive = response.isSpeedActive;
                    updateDisplay();
                }
            });
        });
    }
}

function toggleSlowSpeed() {
    if (platform === 'x') {
        chrome.runtime.sendMessage({action: 'toggleSlowSpeed'}, function(response) {
            if (response && response.success) {
                isSlowActive = response.isSlowActive;
                updateDisplay();
                    }
                });
            } else {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleSlowSpeed'}, function(response) {
                if (response && response.success) {
                    isSlowActive = response.isSlowActive;
                    updateDisplay();
                }
            });
        });
    }
}

function toggleVolume() {
    if (platform === 'x') {
        chrome.runtime.sendMessage({action: 'toggleVolume'}, function(response) {
            if (response && response.success) {
                isVolumeControlActive = response.isVolumeControlActive;
                updateDisplay();
            }
        });
    } else {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleVolume'}, function(response) {
                if (response && response.success) {
                    isVolumeControlActive = response.isVolumeControlActive;
                    updateDisplay();
                }
            });
        });
    }
}

function toggleFloatingPanel() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleFloatingPanel'}, function(response) {
            if (response && response.success) {
                floatingPanelEnabled = response.floatingPanelEnabled;
                updateDisplay();
            }
        });
    });
}

function toggleSpeedLock() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleSpeedLock'}, function(response) {
            if (response && response.success) {
                speedLockEnabled = response.speedLockEnabled;
                updateDisplay();
            }
        });
    });
}

// Funciones de envío
function sendSpeedUpdate() {
    if (platform === 'x') {
        chrome.runtime.sendMessage({action: 'setSpeed', speed: currentSpeed}, function(response) {
            if (response && response.success) {
                updateDisplay();
            }
        });
    } else {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'setSpeed', speed: currentSpeed}, function(response) {
                if (response && response.success) {
                    updateDisplay();
                }
            });
        });
    }
}

function sendUniversalSpeedUpdate() {
    if (platform === 'universal') {
        chrome.runtime.sendMessage({action: 'setUniversalSpeed', speed: universalSpeed}, function(response) {
            if (response && response.success) {
                updateDisplay();
            }
        });
    }
}

function sendVolumeUpdate() {
    if (platform === 'x') {
        chrome.runtime.sendMessage({action: 'setVolume', volume: currentVolume}, function(response) {
            if (response && response.success) {
                updateDisplay();
            }
        });
    } else {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'setVolume', volume: currentVolume}, function(response) {
                if (response && response.success) {
                    updateDisplay();
                }
    });
}); 
    }
} 