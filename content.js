// Extensión de Velocidad de Videos
// Este script agrega funcionalidad de clic para acelerar videos en múltiples plataformas

(function() {
    'use strict';

    let currentSpeed = 2.0; // Por defecto 2.0x de velocidad
    let currentSlowSpeed = 2.0; // Por defecto 2.0x de velocidad lenta (se usa para disminución gradual)
    const speedIncrements = [1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]; // Solo para ciclar
    let slowSpeedIncrements = [1.0, 0.75, 0.5, 0.25, 0.1]; // Solo para ciclar
    let currentSpeedIndex = 4; // Empezar en índice 4 (2.0x) - solo para ciclar
    let currentSlowSpeedIndex = 2; // Empezar en índice 2 (0.5x) - solo para ciclar
    
    // Secuencia de velocidad para teclas + y -
    const speedSequence = [0.1, 0.25, 0.5, 0.8, 1.0, 1.5, 1.8, 2.0, 2.1, 2.5, 3.0, 3.5, 4.0];
    let currentSpeedSequenceIndex = 7; // Empezar en índice 7 (2.0x)
    let processedVideos = new WeakSet(); // Rastrear qué videos ya procesamos
    let originalSpeeds = new Map(); // Guardar velocidades originales de los videos
    let isSpeedActive = false; // Si la velocidad está siendo aplicada actualmente
    let isSlowActive = false; // Si la velocidad lenta está siendo aplicada actualmente

    // Nuevas funcionalidades
    let floatingPanelEnabled = false;
    let speedLockEnabled = false;
    let floatingPanel = null;
    let debounceTimer = null;
    let videoDetectionInterval = null;
    let lastVideoCount = 0;

    // Función para detectar plataforma
    function getPlatform() {
        const hostname = window.location.hostname;
        if (hostname.includes('tiktok.com')) return 'tiktok';
        if (hostname.includes('youtube.com')) return 'youtube';
        if (hostname.includes('vimeo.com')) return 'vimeo';
        if (hostname.includes('twitch.tv')) return 'twitch';
        if (hostname.includes('instagram.com')) return 'instagram';
        return 'unknown';
    }

    // Función para encontrar elementos de video (Soporte multi-plataforma)
    function findVideos() {
        const platform = getPlatform();
        let videos = [];
        
        switch (platform) {
            case 'tiktok':
                const tiktokSelectors = [
                    'video[data-e2e="feed-video"]',
                    'video[data-e2e="browse-video"]',
                    'video[data-e2e="video-player"]',
                    'video[class*="video"]',
                    'video'
                ];
                for (const selector of tiktokSelectors) {
                    videos = document.querySelectorAll(selector);
                    if (videos.length > 0) break;
                }
                break;
                
            case 'youtube':
                const youtubeSelectors = [
                    'video[class*="html5-main-video"]',
                    'video[class*="video-stream"]',
                    'video[class*="ytp-video"]',
                    'video[class*="ytp"]',
                    'video[class*="html5"]',
                    'video[class*="video"]',
                    'video'
                ];
                for (const selector of youtubeSelectors) {
                    videos = document.querySelectorAll(selector);
                    if (videos.length > 0) {
                        // Filtrar para devolver solo el reproductor principal
                        const mainVideo = Array.from(videos).find(video => {
                            const rect = video.getBoundingClientRect();
                            return rect.width > 200 && rect.height > 100;
                        });
                        if (mainVideo) return [mainVideo];
                        break;
                    }
                }
                // Fallback adicional para YouTube
                const playerContainer = document.querySelector('#movie_player, [id*="player"], [class*="player"]');
                if (playerContainer) {
                    const videosInPlayer = playerContainer.querySelectorAll('video');
                    if (videosInPlayer.length > 0) {
                        videos = Array.from(videosInPlayer);
                    }
                }
                break;
                
            case 'vimeo':
                const vimeoSelectors = [
                    'video[class*="vp-video"]',
                    'video[class*="vp"]',
                    'video[class*="video"]',
                    'video'
                ];
                for (const selector of vimeoSelectors) {
                    videos = document.querySelectorAll(selector);
                    if (videos.length > 0) break;
                }
                break;
                
            case 'twitch':
                const twitchSelectors = [
                    'video[class*="video-player"]',
                    'video[class*="player"]',
                    'video[class*="video"]',
                    'video'
                ];
                for (const selector of twitchSelectors) {
                    videos = document.querySelectorAll(selector);
                    if (videos.length > 0) break;
                }
                break;
                
            case 'instagram':
                const instagramSelectors = [
                    'video[class*="video-player"]',
                    'video[class*="player"]',
                    'video[class*="video"]',
                    'video'
                ];
                for (const selector of instagramSelectors) {
                    videos = document.querySelectorAll(selector);
                    if (videos.length > 0) break;
                }
                break;
        }
        
        return Array.from(videos);
    }

    // Función con debounce para detección de videos
    function debouncedVideoDetection() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            const videos = findVideos();
            if (videos.length !== lastVideoCount) {
                lastVideoCount = videos.length;
                handleNewVideos(videos);
            }
        }, 100);
    }

    // Carga perezosa para detección de videos
    function startLazyVideoDetection() {
        if (videoDetectionInterval) {
            clearInterval(videoDetectionInterval);
        }
        videoDetectionInterval = setInterval(debouncedVideoDetection, 1000);
    }

    // Función para manejar videos nuevos
    function handleNewVideos(videos) {
        videos.forEach(video => {
            if (!processedVideos.has(video)) {
                processedVideos.add(video);
                setupVideoEventListeners(video);
                
                // Aplicar bloqueo de velocidad si está habilitado
                if (speedLockEnabled && (isSpeedActive || isSlowActive)) {
                    const targetSpeed = isSpeedActive ? currentSpeed : currentSlowSpeed;
                    setVideoSpeed(video, targetSpeed);
                }
            }
        });
    }

    // Función para establecer velocidad de video con aplicación inmediata y persistente
    function setVideoSpeed(video, speed) {
        if (video && video.playbackRate !== undefined) {
            const oldSpeed = video.playbackRate;
            const wasPlaying = !video.paused;
            const currentTime = video.currentTime;
            
            // Aplicar velocidad inmediatamente
            video.playbackRate = speed;
            
            // Para YouTube, aplicar velocidad múltiples veces con pequeños retrasos
            if (getPlatform() === 'youtube') {
                // Aplicar velocidad múltiples veces con pequeños retrasos
                setTimeout(() => { video.playbackRate = speed; }, 10);
                setTimeout(() => { video.playbackRate = speed; }, 50);
                setTimeout(() => { video.playbackRate = speed; }, 100);
                setTimeout(() => { video.playbackRate = speed; }, 200);
            }
            
            showSpeedIndicator(speed);
            
            // Asegurar que el video no se pause al cambiar velocidad
            if (wasPlaying && video.paused) {
                video.currentTime = currentTime;
                video.play().catch(e => console.log('No se pudo mantener el estado de reproducción:', e));
            }
            
            // console.log(`Velocidad del video cambiada de ${oldSpeed}x a ${speed}x`);
        }
    }

    // Función para forzar velocidad (monitoreo continuo)
    function enforceSpeed(video, targetSpeed) {
        if (video && video.playbackRate !== undefined && Math.abs(video.playbackRate - targetSpeed) > 0.01) {
            video.playbackRate = targetSpeed;
            // console.log(`Forzando velocidad: corrigiendo de ${video.playbackRate}x a ${targetSpeed}x`);
        }
    }

    // Función para activar velocidad (mantener lado derecho)
    function activateSpeed() {
        const videos = findVideos();
        if (videos.length > 0) {
            isSpeedActive = true;
            isSlowActive = false;
            
            videos.forEach(video => {
                if (!originalSpeeds.has(video)) {
                    originalSpeeds.set(video, video.playbackRate);
                }
                setVideoSpeed(video, currentSpeed);
            });
            
            // Empezar a forzar velocidad
            if (!window.speedEnforcementIntervals) {
                window.speedEnforcementIntervals = [];
            }
            
            const interval = setInterval(() => {
                videos.forEach(video => {
                    enforceSpeed(video, currentSpeed);
                });
            }, 100);
            
            window.speedEnforcementIntervals.push(interval);
            
            // console.log(`Activando velocidad: currentSpeed = ${currentSpeed}x, videos encontrados: ${videos.length}`);
        }
    }

    // Función para activar velocidad lenta (mantener lado izquierdo)
    function activateSlowSpeed() {
        const videos = findVideos();
        if (videos.length > 0) {
            isSlowActive = true;
            isSpeedActive = false;
            
            videos.forEach(video => {
                if (!originalSpeeds.has(video)) {
                    originalSpeeds.set(video, video.playbackRate);
                    // console.log(`Velocidad original guardada: ${video.playbackRate}x`);
                }
                setVideoSpeed(video, currentSlowSpeed);
            });
            
            // Empezar a forzar velocidad
            if (!window.speedEnforcementIntervals) {
                window.speedEnforcementIntervals = [];
            }
            
            const interval = setInterval(() => {
                videos.forEach(video => {
                    enforceSpeed(video, currentSlowSpeed);
                });
            }, 100);
            
            window.speedEnforcementIntervals.push(interval);
            
            // console.log(`Activando velocidad lenta: currentSlowSpeed = ${currentSlowSpeed}x, videos encontrados: ${videos.length}`);
        }
    }

    // Función para desactivar velocidad (soltar mouse)
    function deactivateSpeed() {
        const videos = findVideos();
        if (videos.length > 0) {
            isSpeedActive = false;
            isSlowActive = false;
            
            videos.forEach(video => {
                const originalSpeed = originalSpeeds.get(video) || 1.0;
                const wasPlaying = !video.paused;
                const currentTime = video.currentTime;
                
                // Restaurar velocidad original
                video.playbackRate = originalSpeed;
                
                // Asegurar que el video continúe reproduciéndose
                if (wasPlaying && video.paused) {
                    video.currentTime = currentTime;
                    video.play().catch(e => console.log('No se pudo mantener el estado de reproducción:', e));
                }
                
                originalSpeeds.delete(video);
            });
            
            // Limpiar intervalos de forzado
            if (window.speedEnforcementIntervals) {
                window.speedEnforcementIntervals.forEach(interval => clearInterval(interval));
                window.speedEnforcementIntervals = [];
            }
            
            // Ocultar indicador de velocidad
            const indicator = document.getElementById('speedIndicator');
            if (indicator) {
                indicator.remove();
            }
            
            // console.log('Velocidad desactivada - vuelta a velocidad normal');
        }
    }

    // Función para ciclar entre velocidades
    function cycleSpeed() {
        currentSpeedIndex = (currentSpeedIndex + 1) % speedIncrements.length;
        currentSpeed = speedIncrements[currentSpeedIndex];
        showSpeedIndicator(currentSpeed);
        // console.log(`Velocidad ciclada a ${currentSpeed}x`);
    }

    // Función para ciclar entre velocidades lentas
    function cycleSlowSpeed() {
        currentSlowSpeedIndex = (currentSlowSpeedIndex + 1) % slowSpeedIncrements.length;
        currentSlowSpeed = slowSpeedIncrements[currentSlowSpeedIndex];
        showSpeedIndicator(currentSlowSpeed);
        // console.log(`Velocidad lenta ciclada a ${currentSlowSpeed}x`);
    }

    // Función para aumentar velocidad (usando secuencia)
    function increaseSpeed() {
        if (currentSpeedSequenceIndex < speedSequence.length - 1) {
            currentSpeedSequenceIndex++;
            currentSpeed = speedSequence[currentSpeedSequenceIndex];
            currentSlowSpeed = speedSequence[currentSpeedSequenceIndex];
            showSpeedIndicator(currentSpeed);
            // console.log(`Velocidad aumentada a ${currentSpeed}x`);
        }
    }

    // Función para disminuir velocidad lenta (usando secuencia)
    function decreaseSlowSpeed() {
        if (currentSpeedSequenceIndex > 0) {
            currentSpeedSequenceIndex--;
            currentSpeed = speedSequence[currentSpeedSequenceIndex];
            currentSlowSpeed = speedSequence[currentSpeedSequenceIndex];
            showSpeedIndicator(currentSlowSpeed);
            // console.log(`Velocidad lenta disminuida a ${currentSlowSpeed}x`);
        }
    }

    // Función para mostrar indicador de velocidad
    function showSpeedIndicator(speed, type = 'Velocidad') {
        let indicator = document.getElementById('speedIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'speedIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: #51cf66;
                padding: 10px 15px;
                border-radius: 8px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 16px;
                font-weight: bold;
                z-index: 10000;
                border: 2px solid #51cf66;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                pointer-events: none;
                user-select: none;
            `;
            document.body.appendChild(indicator);
        }
        indicator.textContent = `${type}: ${speed}x`;
    }

    // Función para crear panel de control flotante
    function createFloatingPanel() {
        if (floatingPanel) {
            floatingPanel.remove();
        }
        
        floatingPanel = document.createElement('div');
        floatingPanel.id = 'floatingSpeedPanel';
        floatingPanel.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: #ffffff;
            padding: 15px;
            border-radius: 10px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            z-index: 10001;
            border: 2px solid #51cf66;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            min-width: 200px;
            backdrop-filter: blur(10px);
        `;
        
        floatingPanel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #51cf66;">⚡ Control de Velocidad</div>
            <div style="margin-bottom: 8px;">
                <span>Acelerar: ${currentSpeed}x</span>
                <button id="floatingSpeedUp" style="margin-left: 10px; padding: 2px 8px; background: #51cf66; border: none; border-radius: 3px; color: white; cursor: pointer;">+</button>
            </div>
            <div style="margin-bottom: 8px;">
                <span>Desacelerar: ${currentSlowSpeed}x</span>
                <button id="floatingSpeedDown" style="margin-left: 10px; padding: 2px 8px; background: #51cf66; border: none; border-radius: 3px; color: white; cursor: pointer;">-</button>
            </div>
            <div style="margin-bottom: 8px;">
                <span>Bloqueo: ${speedLockEnabled ? 'ON' : 'OFF'}</span>
                <button id="floatingSpeedLock" style="margin-left: 10px; padding: 2px 8px; background: ${speedLockEnabled ? '#51cf66' : '#666'}; border: none; border-radius: 3px; color: white; cursor: pointer;">${speedLockEnabled ? 'ON' : 'OFF'}</button>
            </div>
            <button id="floatingClose" style="width: 100%; padding: 5px; background: #666; border: none; border-radius: 3px; color: white; cursor: pointer; margin-top: 5px;">Cerrar</button>
        `;
        
        document.body.appendChild(floatingPanel);
        
        // Agregar event listeners
        document.getElementById('floatingSpeedUp').addEventListener('click', increaseSpeed);
        document.getElementById('floatingSpeedDown').addEventListener('click', decreaseSlowSpeed);
        document.getElementById('floatingSpeedLock').addEventListener('click', () => {
            speedLockEnabled = !speedLockEnabled;
            updateFloatingPanel();
        });
        document.getElementById('floatingClose').addEventListener('click', () => {
            floatingPanelEnabled = false;
            floatingPanel.remove();
            floatingPanel = null;
        });
        
        // Hacer panel arrastrable
        makeDraggable(floatingPanel);
    }

    // Función para hacer elemento arrastrable
    function makeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        element.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            if (e.target.tagName === 'BUTTON') return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            if (e.target === element) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                setTranslate(currentX, currentY, element);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }

        function dragEnd() {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
    }

    // Función para actualizar panel flotante
    function updateFloatingPanel() {
        if (floatingPanel) {
            const speedUpText = floatingPanel.querySelector('div:nth-child(2) span');
            const speedDownText = floatingPanel.querySelector('div:nth-child(3) span');
            const speedLockText = floatingPanel.querySelector('div:nth-child(4) span');
            const speedLockBtn = document.getElementById('floatingSpeedLock');
            
            if (speedUpText) speedUpText.textContent = `Acelerar: ${currentSpeed}x`;
            if (speedDownText) speedDownText.textContent = `Desacelerar: ${currentSlowSpeed}x`;
            if (speedLockText) speedLockText.textContent = `Bloqueo: ${speedLockEnabled ? 'ON' : 'OFF'}`;
            if (speedLockBtn) {
                speedLockBtn.style.background = speedLockEnabled ? '#51cf66' : '#666';
                speedLockBtn.textContent = speedLockEnabled ? 'ON' : 'OFF';
            }
        }
    }

    // Función para manejar eventos del mouse
    function handleMouseEvents() {
        let isMouseDown = false;
        let mouseDownTimeout = null;
        let mouseDownAction = null;

        document.addEventListener('mousedown', (event) => {
            const videos = findVideos();
            if (videos.length === 0) return;

            const video = videos[0]; // Usar el primer video
            const rect = video.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;

            // Verificar si el clic está dentro de los límites del video
            if (clickX >= 0 && clickX <= rect.width && clickY >= 0 && clickY <= rect.height) {
                isMouseDown = true;
                
                // Determinar qué lado fue clickeado
                const rightSide = clickX > rect.width * 0.7;
                const leftSide = clickX < rect.width * 0.3;
                
                if (rightSide) {
                    mouseDownAction = 'speed';
                    mouseDownTimeout = setTimeout(() => {
                        if (isMouseDown) {
                            activateSpeed();
                        }
                    }, 50);
                } else if (leftSide) {
                    mouseDownAction = 'slow';
                    mouseDownTimeout = setTimeout(() => {
                        if (isMouseDown) {
                            activateSlowSpeed();
                        }
                    }, 50);
                }
                
                event.preventDefault();
                event.stopPropagation();
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (isMouseDown) {
                isMouseDown = false;
                if (mouseDownTimeout) {
                    clearTimeout(mouseDownTimeout);
                    mouseDownTimeout = null;
                }
                deactivateSpeed();
            }
        });

        document.addEventListener('mouseleave', (event) => {
            if (isMouseDown) {
                isMouseDown = false;
                if (mouseDownTimeout) {
                    clearTimeout(mouseDownTimeout);
                    mouseDownTimeout = null;
                }
                deactivateSpeed();
            }
        });
    }

    // Función para configurar event listeners de video
    function setupVideoEventListeners(video) {
        // Agregar event listeners específicos de video aquí si es necesario
        // Por ahora, solo lo marcamos como procesado
        processedVideos.add(video);
    }

    // Función para resetear velocidad
    function resetSpeed() {
        currentSpeed = 2.0;
        currentSlowSpeed = 2.0;
        currentSpeedSequenceIndex = 7; // Resetear a 2.0x en secuencia
        processedVideos = new WeakSet();
        showSpeedIndicator(currentSpeed);
        // console.log('Velocidad reseteada a 2.0x');
    }

    // Función para manejar mensajes del popup
    function handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'getSpeed':
                sendResponse({
                    speed: currentSpeed,
                    slowSpeed: currentSlowSpeed,
                    floatingPanelEnabled: floatingPanelEnabled,
                    speedLockEnabled: speedLockEnabled
                });
                break;
            case 'reset':
                resetSpeed();
                sendResponse({speed: currentSpeed});
                break;
            case 'cycle':
                cycleSpeed();
                sendResponse({speed: currentSpeed});
                break;
            case 'resetSlow':
                resetSpeed();
                sendResponse({slowSpeed: currentSlowSpeed});
                break;
            case 'cycleSlow':
                cycleSlowSpeed();
                sendResponse({slowSpeed: currentSlowSpeed});
                break;
            case 'setSpeed':
                currentSpeed = request.speed;
                currentSpeedSequenceIndex = speedSequence.indexOf(currentSpeed);
                if (currentSpeedSequenceIndex === -1) currentSpeedSequenceIndex = 7;
                sendResponse({speed: currentSpeed});
                break;
            case 'setSlowSpeed':
                currentSlowSpeed = request.speed;
                currentSpeedSequenceIndex = speedSequence.indexOf(currentSlowSpeed);
                if (currentSpeedSequenceIndex === -1) currentSpeedSequenceIndex = 7;
                sendResponse({slowSpeed: currentSlowSpeed});
                break;
            case 'toggleFloatingPanel':
                floatingPanelEnabled = request.enabled;
                if (floatingPanelEnabled) {
                    createFloatingPanel();
                } else if (floatingPanel) {
                    floatingPanel.remove();
                    floatingPanel = null;
                }
                sendResponse({floatingPanelEnabled: floatingPanelEnabled});
                break;
            case 'toggleSpeedLock':
                speedLockEnabled = request.enabled;
                updateFloatingPanel();
                sendResponse({speedLockEnabled: speedLockEnabled});
                break;
        }
        return true;
    }

    // Función para inicializar la extensión
    function initialize() {
        // console.log('¡Extensión de Velocidad de Videos cargada! Mantén clic izquierdo en el lado derecho para acelerar, lado izquierdo para desacelerar.');
        
        // Configurar listener de mensajes
        chrome.runtime.onMessage.addListener(handleMessage);
        
        // Configurar manejo de eventos del mouse
        handleMouseEvents();
        
        // Empezar detección perezosa de videos
        startLazyVideoDetection();
        
        // Configurar atajos de teclado
        document.addEventListener('keydown', (event) => {
            // Verificar que no estemos en un campo de entrada
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.contentEditable === 'true') {
                return; // No interferir con entrada de texto
            }
            
            if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                event.stopPropagation();
                increaseSpeed();
                updateFloatingPanel();
                // console.log(`Atajo de teclado (+): Velocidad aumentada a ${currentSpeed}x`);
            } else if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                event.stopPropagation();
                decreaseSlowSpeed();
                updateFloatingPanel();
                // console.log(`Atajo de teclado (-): Velocidad lenta disminuida a ${currentSlowSpeed}x`);
            } else if (event.key === ' ' && (isSpeedActive || isSlowActive)) {
                event.preventDefault();
                event.stopPropagation();
                deactivateSpeed();
                // console.log('Parada de emergencia activada');
            } else if (event.key === 'f' || event.key === 'F') {
                event.preventDefault();
                event.stopPropagation();
                floatingPanelEnabled = !floatingPanelEnabled;
                if (floatingPanelEnabled) {
                    createFloatingPanel();
                } else if (floatingPanel) {
                    floatingPanel.remove();
                    floatingPanel = null;
                }
                // console.log(`Panel flotante ${floatingPanelEnabled ? 'habilitado' : 'deshabilitado'}`);
            }
        }, true); // Usar fase de captura para interceptar eventos temprano
        
        // Configurar MutationObserver para videos nuevos (carga perezosa)
        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheck = true;
                }
            });
            
            if (shouldCheck) {
                debouncedVideoDetection();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Detección inicial de videos
        const initialVideos = findVideos();
        handleNewVideos(initialVideos);
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})(); 