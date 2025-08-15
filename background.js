// Script de fondo para control de velocidad de videos en X.com
// Esto se ejecuta a nivel del navegador y no puede ser bloqueado por X.com

let currentSpeed = 2.0; // Velocidad predeterminada para clic y mantener
let currentSlowSpeed = 0.5;
let isSpeedActive = false;
let isSlowActive = false;
let currentVolume = 1.0;
let isVolumeControlActive = false;

// Sistema universal de aceleración de videos para cualquier sitio web
let universalSpeedActive = false;
let universalSpeed = 2.0; // Velocidad universal predeterminada

// Secuencia de velocidades (misma que content.js)
const speedSequence = [0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0];
let currentSpeedIndex = 8; // Empezar en índice 8 (2.0x)
let universalSpeedIndex = 8; // Empezar en índice 8 (2.0x)

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ACTIVATE_SPEED_MODE') {
        isSpeedActive = true;
        applySpeedToXComVideos();
        showSpeedOverlay(currentSpeed, true);
    } else if (message.action === 'DEACTIVATE_SPEED_MODE') {
        isSpeedActive = false;
        resetSpeedOnXComVideos();
        hideSpeedOverlay();
    } else if (message.action === 'INCREASE_VOLUME') {
        currentVolume = Math.min(currentVolume + 0.1, 1.0);
        isVolumeControlActive = true;
        applyVolumeToXComVideos();
    } else if (message.action === 'DECREASE_VOLUME') {
        currentVolume = Math.max(currentVolume - 0.1, 0.0);
        isVolumeControlActive = true;
        applyVolumeToXComVideos();
    } else if (message.action === 'getSpeed') {
        sendResponse({ speed: currentSpeed });
    } else if (message.action === 'setSpeed') {
        currentSpeed = message.speed;
        if (isSpeedActive) {
            applySpeedToXComVideos();
        }
        sendResponse({ success: true });
    } else if (message.action === 'setSlowSpeed') {
        currentSlowSpeed = message.speed;
        if (isSlowActive) {
            applySpeedToXComVideos();
        }
        sendResponse({ success: true });
    } else if (message.action === 'resetSpeed') {
        isSpeedActive = false;
        isSlowActive = false;
        resetSpeedOnXComVideos();
        hideSpeedOverlay();
        sendResponse({ success: true });
    } else if (message.action === 'setUniversalSpeed') {
        universalSpeed = message.speed;
        if (universalSpeedActive) {
            applyUniversalSpeed();
            showUniversalSpeedOverlay(universalSpeed, false); // Solo mostrar velocidad, no "ACTIVE"
        }
        sendResponse({ success: true });
    } else if (message.action === 'toggleUniversalSpeed') {
        universalSpeedActive = !universalSpeedActive;
        if (universalSpeedActive) {
            applyUniversalSpeed();
            showUniversalSpeedOverlay(universalSpeed, false); // Solo mostrar velocidad, no "ACTIVE"
        } else {
            resetUniversalSpeed();
            hideUniversalSpeedOverlay();
        }
        sendResponse({ success: true, active: universalSpeedActive });
    } else if (message.action === 'resetUniversalSpeed') {
        universalSpeedActive = false;
        resetUniversalSpeed();
        hideUniversalSpeedOverlay();
        sendResponse({ success: true });
    } else if (message.action === 'ACTIVATE_UNIVERSAL_SPEED_MODE') {
        universalSpeedActive = true;
        applyUniversalSpeed();
        showUniversalSpeedOverlay(universalSpeed, true); // Mostrar superposición con "ACTIVE" mientras se mantiene clic
    } else if (message.action === 'DEACTIVATE_UNIVERSAL_SPEED_MODE') {
        universalSpeedActive = false;
        resetUniversalSpeed();
        showUniversalSpeedOverlay(universalSpeed, false); // Solo mostrar velocidad, no "ACTIVE"
    }
});

// Función helper para verificar si una URL es de una plataforma específica
function isSpecificPlatform(url) {
    if (!url) return false;
    
    const specificPlatforms = [
        'twitter.com',
        'x.com',
        'tiktok.com',
        'twitch.tv',
        'youtube.com',
        'youtu.be',
        'instagram.com'
    ];
    
    return specificPlatforms.some(platform => url.includes(platform));
}

// Función para aplicar velocidad universal a todos los videos en cualquier sitio web
function applyUniversalSpeed() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            // Omitir plataformas específicas (manejadas por separado)
            if (isSpecificPlatform(tab.url)) {
                return;
            }
            
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (universalSpeed) => {
                    try {
                        const videos = document.querySelectorAll('video');
                        videos.forEach(video => {
                            video.playbackRate = universalSpeed;
                        });
                    } catch(e) {}
                },
                args: [universalSpeed]
            });
        });
    });
}

// Función para restablecer la velocidad universal en todos los videos
function resetUniversalSpeed() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            // Omitir plataformas específicas (manejadas por separado)
            if (isSpecificPlatform(tab.url)) {
                return;
            }
            
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        const videos = document.querySelectorAll('video');
                        videos.forEach(video => {
                            video.playbackRate = 1.0;
                        });
                    } catch(e) {}
                }
            });
        });
    });
}

// Función para aplicar velocidad a videos de X.com
function applySpeedToXComVideos() {
    chrome.tabs.query({ url: "*://*.twitter.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (currentSpeed, slowSpeed, isSpeedActive, isSlowActive) => {
                    try {
                        const videos = document.querySelectorAll('video');
                        videos.forEach(video => {
                            if (isSpeedActive) {
                                video.playbackRate = currentSpeed;
                            } else if (isSlowActive) {
                                video.playbackRate = slowSpeed;
                            }
                        });
                    } catch(e) {}
                },
                args: [currentSpeed, currentSlowSpeed, isSpeedActive, isSlowActive]
            });
        });
    });
    
    chrome.tabs.query({ url: "*://*.x.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (currentSpeed, slowSpeed, isSpeedActive, isSlowActive) => {
                    try {
                        const videos = document.querySelectorAll('video');
                        videos.forEach(video => {
                            if (isSpeedActive) {
                                video.playbackRate = currentSpeed;
                            } else if (isSlowActive) {
                                video.playbackRate = slowSpeed;
                            }
                        });
                    } catch(e) {}
                },
                args: [currentSpeed, currentSlowSpeed, isSpeedActive, isSlowActive]
            });
        });
    });
}

// Función para aplicar volumen a videos de X.com
function applyVolumeToXComVideos() {
    chrome.tabs.query({ url: "*://*.twitter.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (currentVolume) => {
                    try {
                        const videos = document.querySelectorAll('video');
                        videos.forEach(video => {
                            video.volume = currentVolume;
                        });
                    } catch(e) {}
                },
                args: [currentVolume]
            });
        });
    });
    
    chrome.tabs.query({ url: "*://*.x.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (currentVolume) => {
                    try {
                        const videos = document.querySelectorAll('video');
                        videos.forEach(video => {
                            video.volume = currentVolume;
                        });
                    } catch(e) {}
                },
                args: [currentVolume]
            });
        });
    });
}

// Función para restablecer velocidad en videos de X.com
function resetSpeedOnXComVideos() {
    chrome.tabs.query({ url: "*://*.twitter.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        const videos = document.querySelectorAll('video');
                        videos.forEach(video => {
                            video.playbackRate = 1.0;
                        });
                    } catch(e) {}
                }
            });
        });
    });
    
    chrome.tabs.query({ url: "*://*.x.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        const videos = document.querySelectorAll('video');
                        videos.forEach(video => {
                            video.playbackRate = 1.0;
                        });
                    } catch(e) {}
                }
            });
        });
    });
}

// Función para forzar el restablecimiento de todas las velocidades de video a 1.0x
function forceResetAllVideoSpeeds() {
    // No restablecer si el modo de velocidad está activo
    if (isSpeedActive || isSlowActive) {
        return;
    }
    
    chrome.tabs.query({ url: "*://*.twitter.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        const videos = document.querySelectorAll('video');
                        videos.forEach((video, index) => {
                            if (video.playbackRate !== 1.0) {
                                video.playbackRate = 1.0;
                            }
                        });
                    } catch(e) {}
                }
            });
        });
    });
    
    chrome.tabs.query({ url: "*://*.x.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        const videos = document.querySelectorAll('video');
                        videos.forEach((video, index) => {
                            if (video.playbackRate !== 1.0) {
                                video.playbackRate = 1.0;
                            }
                        });
                    } catch(e) {}
                }
            });
        });
    });
}

// Configurar un intervalo de restablecimiento continuo para detectar cualquier cambio de velocidad
setInterval(() => {
    forceResetAllVideoSpeeds();
}, 100); // Verificar cada 100ms (más agresivo)

// Función para ocultar la superposición de velocidad
function hideSpeedOverlay() {
    chrome.tabs.query({ url: "*://*.twitter.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        const existingOverlay = document.getElementById('speed-overlay');
                        if (existingOverlay) {
                            existingOverlay.remove();
                        }
                    } catch(e) {}
                }
            });
        });
    });
    
    chrome.tabs.query({ url: "*://*.x.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        const existingOverlay = document.getElementById('speed-overlay');
                        if (existingOverlay) {
                            existingOverlay.remove();
                        }
                    } catch(e) {}
                }
            });
        });
    });
}

// Función para configurar la funcionalidad de clic y mantener para videos de X.com
function setupClickAndHoldForXCom() {
    chrome.tabs.query({ url: "*://*.twitter.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        // Eliminar listeners de eventos existentes
                        const existingScript = document.getElementById('click-hold-script');
                        if (existingScript) {
                            existingScript.remove();
                        }
                        
                        // Enfoque directo de listener de eventos para evitar problemas de CSP
                        let holdTimer = null;
                        let isHolding = false;
                        let isInCooldown = false;
                        let cooldownTimer = null;
                        
                        function setupVideoHoldEvents() {
                            // Buscar elementos de video reales
                            const videos = document.querySelectorAll('video');
                            
                            // RESTABLECER INMEDIATAMENTE cualquier video que tenga velocidad incorrecta (solo si no está en modo velocidad)
                            videos.forEach((video, index) => {
                                if (video.playbackRate !== 1.0) {
                                    // Verificar si estamos en modo velocidad buscando la superposición
                                    const overlay = document.getElementById('speed-overlay');
                                    const isInSpeedMode = overlay && overlay.textContent.includes('ACTIVE');
                                    
                                    if (!isInSpeedMode) {
                                        video.playbackRate = 1.0;
                                    }
                                }
                            });
                            
                            // También buscar miniaturas de video y contenedores
                            const videoThumbnails = document.querySelectorAll('img[alt*="video"], img[alt*="Embedded video"], img[draggable="true"]');
                            
                            // Buscar contenedores de video
                            const videoContainers = document.querySelectorAll('[data-testid*="video"], [data-testid*="Video"], .css-9pa8cd, [class*="video"], [class*="Video"]');
                            
                            // Configurar eventos para videos reales
                            videos.forEach(video => {
                                if (!video.hasAttribute('data-hold-setup')) {
                                    video.setAttribute('data-hold-setup', 'true');
                                    setupVideoEventListeners(video);
                                }
                            });
                            
                            // Configurar eventos para miniaturas de video
                            videoThumbnails.forEach(thumbnail => {
                                if (!thumbnail.hasAttribute('data-hold-setup')) {
                                    thumbnail.setAttribute('data-hold-setup', 'true');
                                    setupVideoEventListeners(thumbnail);
                                }
                            });
                            
                            // Configurar eventos para contenedores de video
                            videoContainers.forEach(container => {
                                if (!container.hasAttribute('data-hold-setup')) {
                                    container.setAttribute('data-hold-setup', 'true');
                                    setupVideoEventListeners(container);
                                }
                            });
                        }
                        
                        function setupVideoEventListeners(element) {
                            // Estrategia 1: Enlace directo de eventos con captura
                            element.addEventListener('mousedown', function(e) {
                                if (e.button === 0 && !isInCooldown && !isHolding) { // Solo clic izquierdo, no en cooldown y no manteniendo ya
                                    holdTimer = setTimeout(() => {
                                        if (!isInCooldown && !isHolding) {
                                            isHolding = true;
                                            // Enviar mensaje al script de fondo para activar modo velocidad
                                            chrome.runtime.sendMessage({ action: 'ACTIVATE_SPEED_MODE' });
                                        }
                                    }, 500);
                                }
                            }, true); // Usar fase de captura
                            
                            // Estrategia 2: También enlazar a elementos padre
                            let parent = element.parentElement;
                            let level = 0;
                            while (parent && level < 3) {
                                parent.addEventListener('mousedown', function(e) {
                                    if ((e.target === element || element.contains(e.target)) && !isInCooldown && !isHolding) {
                                        if (e.button === 0) {
                                            holdTimer = setTimeout(() => {
                                                if (!isInCooldown && !isHolding) {
                                                    isHolding = true;
                                                    // Enviar mensaje al script de fondo para activar modo velocidad
                                                    chrome.runtime.sendMessage({ action: 'ACTIVATE_SPEED_MODE' });
                                                }
                                            }, 500);
                                        }
                                    }
                                }, true);
                                parent = parent.parentElement;
                                level++;
                            }
                            
                            element.addEventListener('mouseup', function(e) {
                                if (holdTimer) {
                                    clearTimeout(holdTimer);
                                    holdTimer = null;
                                }
                                if (isHolding) {
                                    isHolding = false;
                                    // Enviar mensaje al script de fondo para desactivar modo velocidad
                                    chrome.runtime.sendMessage({ action: 'DEACTIVATE_SPEED_MODE' });
                                    
                                    // Iniciar período de cooldown
                                    isInCooldown = true;
                                    if (cooldownTimer) clearTimeout(cooldownTimer);
                                    cooldownTimer = setTimeout(() => {
                                        isInCooldown = false;
                                    }, 1000); // 1 second cooldown
                                    
                                    // Forzar restablecimiento de cualquier estado de velocidad restante
                                    setTimeout(() => {
                                        if (!isHolding) {
                                            chrome.runtime.sendMessage({ action: 'DEACTIVATE_SPEED_MODE' });
                                        }
                                    }, 100);
                                }
                            }, true); // Usar fase de captura
                            
                            element.addEventListener('mouseleave', function(e) {
                                if (holdTimer) {
                                    clearTimeout(holdTimer);
                                    holdTimer = null;
                                }
                                if (isHolding) {
                                    isHolding = false;
                                    // Enviar mensaje al script de fondo para desactivar modo velocidad
                                    chrome.runtime.sendMessage({ action: 'DEACTIVATE_SPEED_MODE' });
                                    
                                    // Iniciar período de cooldown
                                    isInCooldown = true;
                                    if (cooldownTimer) clearTimeout(cooldownTimer);
                                    cooldownTimer = setTimeout(() => {
                                        isInCooldown = false;
                                    }, 1000); // 1 second cooldown
                                }
                            }, true); // Usar fase de captura
                        }
                        
                        // Configurar listeners de eventos globales
                        document.addEventListener('mousedown', function(e) {
                            // Verificar si el clic está en un elemento de video o sus hijos
                            const videoElement = e.target.closest('video') || e.target.closest('[data-hold-setup="true"]');
                            if (videoElement && !isInCooldown && !isHolding) {
                                if (e.button === 0) {
                                    holdTimer = setTimeout(() => {
                                        if (!isInCooldown && !isHolding) {
                                            isHolding = true;
                                            chrome.runtime.sendMessage({ action: 'ACTIVATE_SPEED_MODE' });
                                        }
                                    }, 500);
                                }
                            }
                        }, true);
                        
                        document.addEventListener('mouseup', function(e) {
                            if (isHolding) {
                                isHolding = false;
                                chrome.runtime.sendMessage({ action: 'DEACTIVATE_SPEED_MODE' });
                                
                                // Iniciar período de cooldown
                                isInCooldown = true;
                                if (cooldownTimer) clearTimeout(cooldownTimer);
                                cooldownTimer = setTimeout(() => {
                                    isInCooldown = false;
                                }, 1000); // 1 second cooldown
                            }
                        }, true);
                        
                        // Configuración inicial
                        setupVideoHoldEvents();
                        
                        // Configurar detección periódica de videos
                        setInterval(() => {
                            setupVideoHoldEvents();
                        }, 2000);
                    } catch(e) {}
                }
            });
        });
    });
    
    chrome.tabs.query({ url: "*://*.x.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        // Eliminar listeners de eventos existentes
                        const existingScript = document.getElementById('click-hold-script');
                        if (existingScript) {
                            existingScript.remove();
                        }
                        
                        // Enfoque directo de listener de eventos para evitar problemas de CSP
                        let holdTimer = null;
                        let isHolding = false;
                        let isInCooldown = false;
                        let cooldownTimer = null;
                        
                        function setupVideoHoldEvents() {
                            // Buscar elementos de video reales
                            const videos = document.querySelectorAll('video');
                            
                            // RESTABLECER INMEDIATAMENTE cualquier video que tenga velocidad incorrecta (solo si no está en modo velocidad)
                            videos.forEach((video, index) => {
                                if (video.playbackRate !== 1.0) {
                                    // Verificar si estamos en modo velocidad buscando la superposición
                                    const overlay = document.getElementById('speed-overlay');
                                    const isInSpeedMode = overlay && overlay.textContent.includes('ACTIVE');
                                    
                                    if (!isInSpeedMode) {
                                        video.playbackRate = 1.0;
                                    }
                                }
                            });
                            
                            // También buscar miniaturas de video y contenedores
                            const videoThumbnails = document.querySelectorAll('img[alt*="video"], img[alt*="Embedded video"], img[draggable="true"]');
                            
                            // Buscar contenedores de video
                            const videoContainers = document.querySelectorAll('[data-testid*="video"], [data-testid*="Video"], .css-9pa8cd, [class*="video"], [class*="Video"]');
                            
                            // Configurar eventos para videos reales
                            videos.forEach(video => {
                                if (!video.hasAttribute('data-hold-setup')) {
                                    video.setAttribute('data-hold-setup', 'true');
                                    setupVideoEventListeners(video);
                                }
                            });
                            
                            // Configurar eventos para miniaturas de video
                            videoThumbnails.forEach(thumbnail => {
                                if (!thumbnail.hasAttribute('data-hold-setup')) {
                                    thumbnail.setAttribute('data-hold-setup', 'true');
                                    setupVideoEventListeners(thumbnail);
                                }
                            });
                            
                            // Configurar eventos para contenedores de video
                            videoContainers.forEach(container => {
                                if (!container.hasAttribute('data-hold-setup')) {
                                    container.setAttribute('data-hold-setup', 'true');
                                    setupVideoEventListeners(container);
                                }
                            });
                        }
                        
                        function setupVideoEventListeners(element) {
                            // Estrategia 1: Enlace directo de eventos con captura
                            element.addEventListener('mousedown', function(e) {
                                if (e.button === 0 && !isInCooldown && !isHolding) { // Solo clic izquierdo, no en cooldown y no manteniendo ya
                                    holdTimer = setTimeout(() => {
                                        if (!isInCooldown && !isHolding) {
                                            isHolding = true;
                                            // Enviar mensaje al script de fondo para activar modo velocidad
                                            chrome.runtime.sendMessage({ action: 'ACTIVATE_SPEED_MODE' });
                                        }
                                    }, 500);
                                }
                            }, true); // Usar fase de captura
                            
                            // Estrategia 2: También enlazar a elementos padre
                            let parent = element.parentElement;
                            let level = 0;
                            while (parent && level < 3) {
                                parent.addEventListener('mousedown', function(e) {
                                    if ((e.target === element || element.contains(e.target)) && !isInCooldown && !isHolding) {
                                        if (e.button === 0) {
                                            holdTimer = setTimeout(() => {
                                                if (!isInCooldown && !isHolding) {
                                                    isHolding = true;
                                                    // Enviar mensaje al script de fondo para activar modo velocidad
                                                    chrome.runtime.sendMessage({ action: 'ACTIVATE_SPEED_MODE' });
                                                }
                                            }, 500);
                                        }
                                    }
                                }, true);
                                parent = parent.parentElement;
                                level++;
                            }
                            
                            element.addEventListener('mouseup', function(e) {
                                if (holdTimer) {
                                    clearTimeout(holdTimer);
                                    holdTimer = null;
                                }
                                if (isHolding) {
                                    isHolding = false;
                                    // Enviar mensaje al script de fondo para desactivar modo velocidad
                                    chrome.runtime.sendMessage({ action: 'DEACTIVATE_SPEED_MODE' });
                                    
                                    // Iniciar período de cooldown
                                    isInCooldown = true;
                                    if (cooldownTimer) clearTimeout(cooldownTimer);
                                    cooldownTimer = setTimeout(() => {
                                        isInCooldown = false;
                                    }, 1000); // 1 second cooldown
                                    
                                    // Forzar restablecimiento de cualquier estado de velocidad restante
                                    setTimeout(() => {
                                        if (!isHolding) {
                                            chrome.runtime.sendMessage({ action: 'DEACTIVATE_SPEED_MODE' });
                                        }
                                    }, 100);
                                }
                            }, true); // Usar fase de captura
                            
                            element.addEventListener('mouseleave', function(e) {
                                if (holdTimer) {
                                    clearTimeout(holdTimer);
                                    holdTimer = null;
                                }
                                if (isHolding) {
                                    isHolding = false;
                                    // Enviar mensaje al script de fondo para desactivar modo velocidad
                                    chrome.runtime.sendMessage({ action: 'DEACTIVATE_SPEED_MODE' });
                                    
                                    // Iniciar período de cooldown
                                    isInCooldown = true;
                                    if (cooldownTimer) clearTimeout(cooldownTimer);
                                    cooldownTimer = setTimeout(() => {
                                        isInCooldown = false;
                                    }, 1000); // 1 second cooldown
                                }
                            }, true); // Usar fase de captura
                        }
                        
                        // Configurar listeners de eventos globales
                        document.addEventListener('mousedown', function(e) {
                            // Verificar si el clic está en un elemento de video o sus hijos
                            const videoElement = e.target.closest('video') || e.target.closest('[data-hold-setup="true"]');
                            if (videoElement && !isInCooldown && !isHolding) {
                                if (e.button === 0) {
                                    holdTimer = setTimeout(() => {
                                        if (!isInCooldown && !isHolding) {
                                            isHolding = true;
                                            chrome.runtime.sendMessage({ action: 'ACTIVATE_SPEED_MODE' });
                                        }
                                    }, 500);
                                }
                            }
                        }, true);
                        
                        document.addEventListener('mouseup', function(e) {
                            if (isHolding) {
                                isHolding = false;
                                chrome.runtime.sendMessage({ action: 'DEACTIVATE_SPEED_MODE' });
                                
                                // Iniciar período de cooldown
                                isInCooldown = true;
                                if (cooldownTimer) clearTimeout(cooldownTimer);
                                cooldownTimer = setTimeout(() => {
                                    isInCooldown = false;
                                }, 1000); // 1 second cooldown
                            }
                        }, true);
                        
                        // Configuración inicial
                        setupVideoHoldEvents();
                        
                        // Configurar detección periódica de videos
                        setInterval(() => {
                            setupVideoHoldEvents();
                        }, 2000);
                    } catch(e) {}
                }
            });
        });
    });
}

// Función para configurar funcionalidad universal de clic y mantener para cualquier sitio web
function setupUniversalClickAndHold() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            // Omitir plataformas específicas (manejadas por separado)
            if (isSpecificPlatform(tab.url)) {
                return;
            }
            
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        // Eliminar listeners de eventos existentes
                        const existingScript = document.getElementById('universal-click-hold-script');
                        if (existingScript) {
                            existingScript.remove();
                        }
                        
                        // Enfoque directo de listener de eventos para evitar problemas de CSP
                        let holdTimer = null;
                        let isHolding = false;
                        let isInCooldown = false;
                        let cooldownTimer = null;
                        
                        function setupVideoHoldEvents() {
                            // Buscar elementos de video reales
                            const videos = document.querySelectorAll('video');
                            
                            // Configurar eventos para videos reales
                            videos.forEach(video => {
                                if (!video.hasAttribute('data-universal-hold-setup')) {
                                    video.setAttribute('data-universal-hold-setup', 'true');
                                    setupVideoEventListeners(video);
                                }
                            });
                        }
                        
                        function setupVideoEventListeners(element) {
                            // Estrategia 1: Enlace directo de eventos con captura
                            element.addEventListener('mousedown', function(e) {
                                if (e.button === 0 && !isInCooldown && !isHolding) { // Solo clic izquierdo, no en cooldown y no manteniendo ya
                                    holdTimer = setTimeout(() => {
                                        if (!isInCooldown && !isHolding) {
                                            isHolding = true;
                                            // Enviar mensaje al script de fondo para activar modo velocidad universal
                                            chrome.runtime.sendMessage({ action: 'ACTIVATE_UNIVERSAL_SPEED_MODE' });
                                        }
                                    }, 500);
                                }
                            }, true); // Usar fase de captura
                            
                            // Estrategia 2: También enlazar a elementos padre
                            let parent = element.parentElement;
                            let level = 0;
                            while (parent && level < 3) {
                                parent.addEventListener('mousedown', function(e) {
                                    if ((e.target === element || element.contains(e.target)) && !isInCooldown && !isHolding) {
                                        if (e.button === 0) {
                                            holdTimer = setTimeout(() => {
                                                if (!isInCooldown && !isHolding) {
                                                    isHolding = true;
                                                    // Enviar mensaje al script de fondo para activar modo velocidad universal
                                                    chrome.runtime.sendMessage({ action: 'ACTIVATE_UNIVERSAL_SPEED_MODE' });
                                                }
                                            }, 500);
                                        }
                                    }
                                }, true);
                                parent = parent.parentElement;
                                level++;
                            }
                            
                            element.addEventListener('mouseup', function(e) {
                                if (holdTimer) {
                                    clearTimeout(holdTimer);
                                    holdTimer = null;
                                }
                                if (isHolding) {
                                    isHolding = false;
                                    // Enviar mensaje al script de fondo para desactivar modo velocidad universal
                                    chrome.runtime.sendMessage({ action: 'DEACTIVATE_UNIVERSAL_SPEED_MODE' });
                                    
                                    // Iniciar período de cooldown
                                    isInCooldown = true;
                                    if (cooldownTimer) clearTimeout(cooldownTimer);
                                    cooldownTimer = setTimeout(() => {
                                        isInCooldown = false;
                                    }, 1000); // 1 second cooldown
                                }
                            }, true); // Usar fase de captura
                            
                            element.addEventListener('mouseleave', function(e) {
                                if (holdTimer) {
                                    clearTimeout(holdTimer);
                                    holdTimer = null;
                                }
                                if (isHolding) {
                                    isHolding = false;
                                    // Enviar mensaje al script de fondo para desactivar modo velocidad universal
                                    chrome.runtime.sendMessage({ action: 'DEACTIVATE_UNIVERSAL_SPEED_MODE' });
                                    
                                    // Iniciar período de cooldown
                                    isInCooldown = true;
                                    if (cooldownTimer) clearTimeout(cooldownTimer);
                                    cooldownTimer = setTimeout(() => {
                                        isInCooldown = false;
                                    }, 1000); // 1 second cooldown
                                }
                            }, true); // Usar fase de captura
                        }
                        
                        // Configurar listeners de eventos globales
                        document.addEventListener('mousedown', function(e) {
                            // Verificar si el clic está en un elemento de video o sus hijos
                            const videoElement = e.target.closest('video');
                            if (videoElement && !isInCooldown && !isHolding) {
                                if (e.button === 0) {
                                    holdTimer = setTimeout(() => {
                                        if (!isInCooldown && !isHolding) {
                                            isHolding = true;
                                            chrome.runtime.sendMessage({ action: 'ACTIVATE_UNIVERSAL_SPEED_MODE' });
                                        }
                                    }, 500);
                                }
                            }
                        }, true);
                        
                        document.addEventListener('mouseup', function(e) {
                            if (isHolding) {
                                isHolding = false;
                                chrome.runtime.sendMessage({ action: 'DEACTIVATE_UNIVERSAL_SPEED_MODE' });
                                
                                // Iniciar período de cooldown
                                isInCooldown = true;
                                if (cooldownTimer) clearTimeout(cooldownTimer);
                                cooldownTimer = setTimeout(() => {
                                    isInCooldown = false;
                                }, 1000); // 1 second cooldown
                            }
                        }, true);
                        
                        // Configuración inicial
                        setupVideoHoldEvents();
                        
                        // Configurar detección periódica de videos
                        setInterval(() => {
                            setupVideoHoldEvents();
                        }, 2000);
                    } catch(e) {}
                }
            });
        });
    });
}

// Función para mostrar superposición de velocidad
function showSpeedOverlay(speed, isPersistent = false) {
    chrome.tabs.query({ url: "*://*.twitter.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (speed, isPersistent) => {
                    try {
                        // Eliminar superposición existente
                        const existingOverlay = document.getElementById('speed-overlay');
                        if (existingOverlay) {
                            existingOverlay.remove();
                        }
                        
                        // Create new overlay
                        const overlay = document.createElement('div');
                        overlay.id = 'speed-overlay';
                        overlay.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            background: rgba(0, 0, 0, 0.8);
                            color: #00ff00;
                            padding: 10px 15px;
                            border-radius: 5px;
                            font-family: 'Courier New', monospace;
                            font-size: 18px;
                            font-weight: bold;
                            z-index: 10000;
                            pointer-events: none;
                            text-shadow: 0 0 10px #00ff00;
                        `;
                        
                        const speedValue = parseFloat(speed);
                        const persistent = isPersistent;
                        overlay.textContent = `${speedValue.toFixed(1)}x${persistent ? ' ACTIVE' : ''}`;
                        
                        document.body.appendChild(overlay);
                        
                        // Auto-remove if not persistent
                        if (!persistent) {
                            setTimeout(() => {
                                if (overlay && overlay.parentNode) {
                                    overlay.remove();
                                }
                            }, 2000);
                        }
                    } catch(e) {}
                },
                args: [speed, isPersistent]
            });
        });
    });
    
    chrome.tabs.query({ url: "*://*.x.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (speed, isPersistent) => {
                    try {
                        // Remove existing overlay
                        const existingOverlay = document.getElementById('speed-overlay');
                        if (existingOverlay) {
                            existingOverlay.remove();
                        }
                        
                        // Create new overlay
                        const overlay = document.createElement('div');
                        overlay.id = 'speed-overlay';
                        overlay.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            background: rgba(0, 0, 0, 0.8);
                            color: #00ff00;
                            padding: 10px 15px;
                            border-radius: 5px;
                            font-family: 'Courier New', monospace;
                            font-size: 18px;
                            font-weight: bold;
                            z-index: 10000;
                            pointer-events: none;
                            text-shadow: 0 0 10px #00ff00;
                        `;
                        
                        const speedValue = parseFloat(speed);
                        const persistent = isPersistent;
                        overlay.textContent = `${speedValue.toFixed(1)}x${persistent ? ' ACTIVE' : ''}`;
                        
                        document.body.appendChild(overlay);
                        
                        // Auto-remove if not persistent
                        if (!persistent) {
                            setTimeout(() => {
                                if (overlay && overlay.parentNode) {
                                    overlay.remove();
                                }
                            }, 2000);
                        }
                    } catch(e) {}
                },
                args: [speed, isPersistent]
            });
        });
    });
}

// Función para ocultar la superposición de velocidad universal
function hideUniversalSpeedOverlay() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            // Omitir plataformas específicas (manejadas por separado)
            if (isSpecificPlatform(tab.url)) {
                return;
            }
            
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    try {
                        const existingOverlay = document.getElementById('universal-speed-overlay');
                        if (existingOverlay) {
                            existingOverlay.remove();
                        }
                    } catch(e) {}
                }
            });
        });
    });
}

// Función para mostrar superposición de velocidad universal
function showUniversalSpeedOverlay(speed, isPersistent = false) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            // Omitir plataformas específicas (manejadas por separado)
            if (isSpecificPlatform(tab.url)) {
                return;
            }
            
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (speed, isPersistent) => {
                    try {
                        // Remove existing overlay
                        const existingOverlay = document.getElementById('universal-speed-overlay');
                        if (existingOverlay) {
                            existingOverlay.remove();
                        }
                        
                        // Create new overlay
                        const overlay = document.createElement('div');
                        overlay.id = 'universal-speed-overlay';
                        overlay.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            background: rgba(0, 0, 0, 0.8);
                            color: #00ffff;
                            padding: 10px 15px;
                            border-radius: 5px;
                            font-family: 'Courier New', monospace;
                            font-size: 18px;
                            font-weight: bold;
                            z-index: 10000;
                            pointer-events: none;
                            text-shadow: 0 0 10px #00ffff;
                        `;
                        
                        const speedValue = parseFloat(speed);
                        const persistent = isPersistent;
                        overlay.textContent = `UNIVERSAL ${speedValue.toFixed(1)}x${persistent ? ' ACTIVE' : ''}`;
                        
                        document.body.appendChild(overlay);
                        
                        // Auto-remove if not persistent
                        if (!persistent) {
                            setTimeout(() => {
                                if (overlay && overlay.parentNode) {
                                    overlay.remove();
                                }
                            }, 2000);
                        }
                    } catch(e) {}
                },
                args: [speed, isPersistent]
            });
        });
    });
}

// Manejar atajos de teclado globales
chrome.commands.onCommand.addListener((command) => {
    if (command === 'speed-up') {
        // Para X.com/Twitter: aumentar valor de velocidad (usando secuencia)
        if (isSpeedActive) {
            if (currentSpeedIndex < speedSequence.length - 1) {
                currentSpeedIndex++;
                currentSpeed = speedSequence[currentSpeedIndex];
            }
        } else {
            isSpeedActive = true;
            currentSpeed = 1.5;
            currentSpeedIndex = speedSequence.indexOf(currentSpeed);
            if (currentSpeedIndex === -1) currentSpeedIndex = 8; // Fallback a 2.0x
        }
        // Don't call applySpeedToXComVideos() here
        const displaySpeed = isSpeedActive ? currentSpeed : (isSlowActive ? currentSlowSpeed : 1.0);
        showSpeedOverlay(displaySpeed);
        
        // Para sistema universal: aumentar velocidad universal (usando secuencia)
        if (universalSpeedIndex < speedSequence.length - 1) {
            universalSpeedIndex++;
            universalSpeed = speedSequence[universalSpeedIndex];
        }
        if (universalSpeedActive) {
            applyUniversalSpeed();
            showUniversalSpeedOverlay(universalSpeed, false); // Solo mostrar velocidad, no "ACTIVE"
        }
    } else if (command === 'speed-down') {
        // Para X.com/Twitter: disminuir valor de velocidad (usando secuencia)
        if (isSpeedActive) {
            if (currentSpeedIndex > 0) {
                currentSpeedIndex--;
                currentSpeed = speedSequence[currentSpeedIndex];
            }
        } else {
            isSpeedActive = true;
            currentSpeed = 1.5;
            currentSpeedIndex = speedSequence.indexOf(currentSpeed);
            if (currentSpeedIndex === -1) currentSpeedIndex = 8; // Fallback a 2.0x
        }
        // Don't call applySpeedToXComVideos() here
        const displaySpeed = isSpeedActive ? currentSpeed : (isSlowActive ? currentSlowSpeed : 1.0);
        showSpeedOverlay(displaySpeed);
        
        // Para sistema universal: disminuir velocidad universal (usando secuencia)
        if (universalSpeedIndex > 0) {
            universalSpeedIndex--;
            universalSpeed = speedSequence[universalSpeedIndex];
        }
        if (universalSpeedActive) {
            applyUniversalSpeed();
            showUniversalSpeedOverlay(universalSpeed, false); // Solo mostrar velocidad, no "ACTIVE"
        }
    } else if (command === 'reset-speed') {
        // Para X.com/Twitter: restablecer modo de velocidad
        isSpeedActive = false;
        isSlowActive = false;
        // Don't call resetSpeedOnXComVideos() here
        showSpeedOverlay(1.0);
        
        // Para sistema universal: restablecer velocidad universal
        universalSpeedActive = false;
        resetUniversalSpeed();
        hideUniversalSpeedOverlay();
    } else if (command === 'toggle-speed') {
        // Para X.com/Twitter: alternar modo de velocidad
        isSpeedActive = !isSpeedActive;
        if (isSpeedActive) {
            isSlowActive = false;
            applySpeedToXComVideos();
            showSpeedOverlay(currentSpeed, true);
        } else {
            resetSpeedOnXComVideos();
            showSpeedOverlay(1.0);
        }
        
        // Para sistema universal: alternar modo de velocidad universal
        universalSpeedActive = !universalSpeedActive;
        if (universalSpeedActive) {
            applyUniversalSpeed();
            showUniversalSpeedOverlay(universalSpeed, false); // Solo mostrar velocidad, no "ACTIVE"
        } else {
            resetUniversalSpeed();
            // Ocultar overlay cuando se desactiva
            hideUniversalSpeedOverlay();
        }
    }
});

// Monitorear pestañas de X.com para nuevos videos y aplicar configuraciones actuales
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && 
        (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
        
        // Setup click and hold functionality
        setTimeout(() => {
            setupClickAndHoldForXCom();
        }, 1000);
        
        // Force reset any video speeds that might have been set automatically
        setTimeout(() => {
            forceResetAllVideoSpeeds();
        }, 1500);
        
        // Esperar un poco para que se carguen los videos, pero no aplicar velocidad automáticamente
        // La velocidad solo debe aplicarse cuando el usuario mantiene explícitamente el clic
        setTimeout(() => {
            if (isVolumeControlActive) {
                applyVolumeToXComVideos();
            }
        }, 2000);
    } else if (changeInfo.status === 'complete') {
        // Setup universal click and hold functionality for any other website
        setTimeout(() => {
            setupUniversalClickAndHold();
        }, 1000);
    }
});

// Escuchar activación de pestaña para aplicar configuraciones a pestañas de X.com
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
            // Setup click and hold functionality
            setTimeout(() => {
                setupClickAndHoldForXCom();
            }, 1000);
            
            // Force reset any video speeds that might have been set automatically
            setTimeout(() => {
                forceResetAllVideoSpeeds();
            }, 1500);
            
            // No aplicar velocidad automáticamente al cambiar pestañas
            // La velocidad solo debe aplicarse cuando el usuario mantiene explícitamente el clic
            if (isVolumeControlActive) {
                applyVolumeToXComVideos();
            }
        } else {
            // Setup universal click and hold functionality for any other website
            setTimeout(() => {
                setupUniversalClickAndHold();
            }, 1000);
        }
    });
});

// Escuchar mensajes de scripts de contenido
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ACTIVATE_SPEED_MODE') {
        // Activar modo de velocidad cuando el usuario mantiene clic en video
        isSpeedActive = true;
        isSlowActive = false;
        // Aplicar la velocidad actualmente seleccionada a los videos
        applySpeedToXComVideos();
        showSpeedOverlay(currentSpeed, true); // Mostrar superposición persistente
        sendResponse({ success: true });
    } else if (request.action === 'DEACTIVATE_SPEED_MODE') {
        // Desactivar modo de velocidad cuando el usuario suelta el clic
        isSpeedActive = false;
        isSlowActive = false;
        resetSpeedOnXComVideos();
        hideSpeedOverlay(); // Ocultar la superposición completamente
        sendResponse({ success: true });
    } else if (request.action === 'ACTIVATE_UNIVERSAL_SPEED_MODE') {
        // Activar modo de velocidad universal cuando el usuario mantiene clic en video
        universalSpeedActive = true;
        // Aplicar la velocidad universal a los videos
        applyUniversalSpeed();
        showUniversalSpeedOverlay(universalSpeed, true); // Mostrar superposición con "ACTIVE" mientras se mantiene clic
        sendResponse({ success: true });
    } else if (request.action === 'DEACTIVATE_UNIVERSAL_SPEED_MODE') {
        // Desactivar modo de velocidad universal cuando el usuario suelta el clic
        universalSpeedActive = false;
        // Restablecer la velocidad universal en los videos
        resetUniversalSpeed();
        // Mostrar overlay sin "ACTIVE" cuando se suelta el clic
        showUniversalSpeedOverlay(universalSpeed, false);
        sendResponse({ success: true });
    } else if (request.action === 'INCREASE_VOLUME') {
        // Aumentar volumen con rueda del mouse
        currentVolume = Math.min(currentVolume + 0.1, 1.0);
        applyVolumeToXComVideos();
        sendResponse({ success: true });
    } else if (request.action === 'DECREASE_VOLUME') {
        // Disminuir volumen con rueda del mouse
        currentVolume = Math.max(currentVolume - 0.1, 0.0);
        applyVolumeToXComVideos();
        sendResponse({ success: true });
    }
});
