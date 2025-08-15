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
    
    // Control de volumen
    let currentVolume = 1.0; // Por defecto 100% de volumen
    let originalVolumes = new Map(); // Guardar volúmenes originales de los videos
    let isVolumeControlActive = false; // Si el control de volumen está activo
    let volumeControlStartVolume = 1.0; // Volumen inicial cuando se empieza a controlar
    
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
                    if (videos.length > 0) {
                        // Filtrar para solo videos principales (no thumbnails)
                        videos = Array.from(videos).filter(video => {
                            const rect = video.getBoundingClientRect();
                            return rect.width > 200 && rect.height > 150;
                        });
                        if (videos.length > 0) break;
                    }
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
                            return rect.width > 300 && rect.height > 200;
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
                        videos = Array.from(videosInPlayer).filter(video => {
                            const rect = video.getBoundingClientRect();
                            return rect.width > 300 && rect.height > 200;
                        });
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
                    if (videos.length > 0) {
                        // Filtrar para solo videos principales
                        videos = Array.from(videos).filter(video => {
                            const rect = video.getBoundingClientRect();
                            return rect.width > 300 && rect.height > 200;
                        });
                        if (videos.length > 0) break;
                    }
                }
                break;
                
            case 'twitch':
                const twitchSelectors = [
                    // Twitch-specific selectors for current versions
                    'video[data-a-target="twitch-video"]',
                    'video[class*="video-player"]',
                    'video[class*="player"]',
                    'video[class*="video"]',
                    // Fallback selectors for different Twitch layouts
                    'video[class*="twitch"]',
                    'video[class*="stream"]',
                    'video[class*="broadcast"]',
                    // Generic video selector as last resort
                    'video'
                ];
                
                // Try to find videos with specific selectors first
                for (const selector of twitchSelectors) {
                    videos = document.querySelectorAll(selector);
                    if (videos.length > 0) {
                        // Filter out small/thumbnail videos for Twitch
                        const mainVideos = Array.from(videos).filter(video => {
                            const rect = video.getBoundingClientRect();
                            // Only consider videos that are reasonably sized (likely main player)
                            return rect.width > 400 && rect.height > 250;
                        });
                        if (mainVideos.length > 0) {
                            videos = mainVideos;
                            break;
                        }
                    }
                }
                
                // If no videos found with selectors, try alternative methods for Twitch
                if (videos.length === 0) {
                    // Look for video elements within common Twitch containers
                    const twitchContainers = [
                        '[data-a-target="video-player"]',
                        '[class*="video-player"]',
                        '[class*="player"]',
                        '[class*="stream"]',
                        '[class*="broadcast"]'
                    ];
                    
                    for (const containerSelector of twitchContainers) {
                        const containers = document.querySelectorAll(containerSelector);
                        for (const container of containers) {
                            const videoInContainer = container.querySelector('video');
                            if (videoInContainer) {
                                const rect = videoInContainer.getBoundingClientRect();
                                if (rect.width > 400 && rect.height > 250) {
                                    videos = [videoInContainer];
                                    break;
                                }
                            }
                        }
                        if (videos.length > 0) break;
                    }
                }
                
                // Debug logging for Twitch
                if (videos.length === 0) {
                    console.log('🎮 Twitch: No videos found with current selectors');
                    // Log all video elements on the page for debugging
                    const allVideos = document.querySelectorAll('video');
                    console.log(`🎮 Twitch: Found ${allVideos.length} total video elements on page`);
                    allVideos.forEach((video, index) => {
                        const rect = video.getBoundingClientRect();
                        console.log(`🎮 Twitch: Video ${index}: classes="${video.className}", size=${rect.width}x${rect.height}, data-attributes="${video.getAttributeNames().filter(attr => attr.startsWith('data-')).join(', ')}"`);
                    });
                } else {
                    console.log(`🎮 Twitch: Successfully found ${videos.length} video(s)`);
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
                    if (videos.length > 0) {
                        // Filtrar para solo videos principales
                        videos = Array.from(videos).filter(video => {
                            const rect = video.getBoundingClientRect();
                            return rect.width > 200 && rect.height > 150;
                        });
                        if (videos.length > 0) break;
                    }
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
        
        // Usar detección más agresiva para Twitch y TikTok
        const platform = getPlatform();
        const detectionInterval = (platform === 'twitch' || platform === 'tiktok') ? 500 : 1000; // 500ms para Twitch y TikTok, 1000ms para otros
        
        videoDetectionInterval = setInterval(debouncedVideoDetection, detectionInterval);
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
                
                // Sincronizar volumen con el nuevo video
                if (video.volume !== undefined) {
                    currentVolume = video.volume;
                    console.log(`🔊 Volume synced with new video: ${Math.round(currentVolume * 100)}%`);
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
            
            // Para YouTube, Twitch y TikTok, aplicar velocidad múltiples veces con pequeños retrasos
            const platform = getPlatform();
            if (platform === 'youtube' || platform === 'twitch' || platform === 'tiktok') {
                // Aplicar velocidad múltiples veces con pequeños retrasos para mayor persistencia
                setTimeout(() => { video.playbackRate = speed; }, 10);
                setTimeout(() => { video.playbackRate = speed; }, 50);
                setTimeout(() => { video.playbackRate = speed; }, 100);
                setTimeout(() => { video.playbackRate = speed; }, 200);
                // Para Twitch y TikTok, aplicar adicionalmente con más retrasos
                if (platform === 'twitch' || platform === 'tiktok') {
                    setTimeout(() => { video.playbackRate = speed; }, 300);
                    setTimeout(() => { video.playbackRate = speed; }, 500);
                    setTimeout(() => { video.playbackRate = speed; }, 1000);
                }
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
                // Solo forzar velocidad si el mouse sigue presionado
                if (isSpeedActive) {
                    videos.forEach(video => {
                        enforceSpeed(video, currentSpeed);
                    });
                }
            }, 100);
            
            window.speedEnforcementIntervals.push(interval);
            
            console.log(`🎯 Speed activated: ${currentSpeed}x`);
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
                }
                setVideoSpeed(video, currentSlowSpeed);
            });
            
            // Empezar a forzar velocidad
            if (!window.speedEnforcementIntervals) {
                window.speedEnforcementIntervals = [];
            }
            
            const interval = setInterval(() => {
                // Solo forzar velocidad si el mouse sigue presionado
                if (isSlowActive) {
                    videos.forEach(video => {
                        enforceSpeed(video, currentSlowSpeed);
                    });
                }
            }, 100);
            
            window.speedEnforcementIntervals.push(interval);
            
            console.log(`🎯 Slow speed activated: ${currentSlowSpeed}x`);
        }
    }

    // Función para desactivar velocidad (soltar mouse)
    function deactivateSpeed() {
        const videos = findVideos();
        if (videos.length > 0) {
            isSpeedActive = false;
            isSlowActive = false;
            
            videos.forEach(video => {
                const wasPlaying = !video.paused;
                const currentTime = video.currentTime;
                
                // Siempre restaurar a velocidad normal (1.0x) cuando se suelta
                video.playbackRate = 1.0;
                
                // Para YouTube, Twitch y TikTok, aplicar múltiples veces para asegurar que se mantenga
                const platform = getPlatform();
                if (platform === 'youtube' || platform === 'twitch' || platform === 'tiktok') {
                    setTimeout(() => { video.playbackRate = 1.0; }, 10);
                    setTimeout(() => { video.playbackRate = 1.0; }, 50);
                    setTimeout(() => { video.playbackRate = 1.0; }, 100);
                    setTimeout(() => { video.playbackRate = 1.0; }, 200);
                    if (platform === 'twitch' || platform === 'tiktok') {
                        setTimeout(() => { video.playbackRate = 1.0; }, 300);
                        setTimeout(() => { video.playbackRate = 1.0; }, 500);
                    }
                }
                
                // Asegurar que el video continúe reproduciéndose
                if (wasPlaying && video.paused) {
                    video.currentTime = currentTime;
                    video.play().catch(e => console.log('No se pudo mantener el estado de reproducción:', e));
                }
                
                // Limpiar velocidad original guardada
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
            
            console.log('🎯 Speed deactivated - returned to normal speed (1.0x)');
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
    function showSpeedIndicator(speed, type = 'Speed') {
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
        
        // Handle special case for "Hold 500ms..." text
        if (speed === 'Hold 500ms...') {
            indicator.textContent = speed;
            indicator.style.color = '#ffa500'; // Orange color for hold indicator
        } else {
            indicator.textContent = `${type}: ${speed}x`;
            indicator.style.color = '#51cf66'; // Reset to normal green color
        }
    }

    // Función para mostrar indicador de volumen
    function showVolumeIndicator(volume) {
        let indicator = document.getElementById('volumeIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'volumeIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 60px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: #ff6b6b;
                padding: 10px 15px;
                border-radius: 8px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 16px;
                font-weight: bold;
                z-index: 10000;
                border: 2px solid #ff6b6b;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                pointer-events: none;
                user-select: none;
                opacity: 1;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        const volumePercent = Math.round(volume * 100);
        indicator.textContent = `🔊 Volume: ${volumePercent}%`;
        
        // Make indicator visible
        indicator.style.opacity = '1';
        
        // Clear any existing timeout
        if (indicator.hideTimeout) {
            clearTimeout(indicator.hideTimeout);
        }
        
        // Auto-hide after 2 seconds
        indicator.hideTimeout = setTimeout(() => {
            if (indicator) {
                indicator.style.opacity = '0';
                // Remove from DOM after fade out
                setTimeout(() => {
                    if (indicator && indicator.parentNode) {
                        indicator.remove();
                    }
                }, 300);
            }
        }, 2000);
    }

    // Función para establecer volumen de video
    function setVideoVolume(video, volume) {
        if (video && video.volume !== undefined) {
            const oldVolume = video.volume;
            const wasPlaying = !video.paused;
            const currentTime = video.currentTime;
            
            // Aplicar volumen inmediatamente
            video.volume = Math.max(0, Math.min(1, volume)); // Clamp entre 0 y 1
            
            // Para YouTube y Twitch, aplicar volumen múltiples veces con pequeños retrasos
            const platform = getPlatform();
            if (platform === 'youtube' || platform === 'twitch') {
                setTimeout(() => { video.volume = Math.max(0, Math.min(1, volume)); }, 10);
                setTimeout(() => { video.volume = Math.max(0, Math.min(1, volume)); }, 50);
                setTimeout(() => { video.volume = Math.max(0, Math.min(1, volume)); }, 100);
                if (platform === 'twitch') {
                    setTimeout(() => { video.volume = Math.max(0, Math.min(1, volume)); }, 300);
                }
            }
            
            showVolumeIndicator(volume);
            
            // Asegurar que el video no se pause al cambiar volumen
            if (wasPlaying && video.paused) {
                video.currentTime = currentTime;
                video.play().catch(e => console.log('No se pudo mantener el estado de reproducción:', e));
            }
            
            console.log(`🔊 Video volume changed from ${oldVolume} to ${volume}`);
        }
    }

    // Función para activar control de volumen (mantener clic en el centro)
    function activateVolumeControl() {
        const videos = findVideos();
        if (videos.length > 0) {
            isVolumeControlActive = true;
            
            videos.forEach(video => {
                if (!originalVolumes.has(video)) {
                    originalVolumes.set(video, video.volume);
                }
                // Usar el volumen actual del video como punto de partida
                currentVolume = video.volume;
                volumeControlStartVolume = video.volume;
                setVideoVolume(video, currentVolume);
            });
            
            console.log(`🔊 Volume control activated: ${Math.round(currentVolume * 100)}%`);
        }
    }

    // Función para desactivar control de volumen
    function deactivateVolumeControl() {
        const videos = findVideos();
        if (videos.length > 0) {
            isVolumeControlActive = false;
            
            videos.forEach(video => {
                const wasPlaying = !video.paused;
                const currentTime = video.currentTime;
                
                // Restaurar volumen original
                const originalVolume = originalVolumes.get(video) || 1.0;
                video.volume = originalVolume;
                
                // Para YouTube y Twitch, aplicar múltiples veces
                const platform = getPlatform();
                if (platform === 'youtube' || platform === 'twitch') {
                    setTimeout(() => { video.volume = originalVolume; }, 10);
                    setTimeout(() => { video.volume = originalVolume; }, 50);
                    setTimeout(() => { video.volume = originalVolume; }, 100);
                }
                
                // Asegurar que el video continúe reproduciéndose
                if (wasPlaying && video.paused) {
                    video.currentTime = currentTime;
                    video.play().catch(e => console.log('No se pudo mantener el estado de reproducción:', e));
                }
                
                originalVolumes.delete(video);
            });
            
            // Ocultar indicador de volumen
            const indicator = document.getElementById('volumeIndicator');
            if (indicator) {
                indicator.remove();
            }
            
            console.log('🔊 Control de volumen desactivado - volumen restaurado');
        }
    }

    // Función para aumentar volumen
    function increaseVolume() {
        currentVolume = Math.min(1.0, currentVolume + 0.02);
        if (isVolumeControlActive) {
            const videos = findVideos();
            videos.forEach(video => setVideoVolume(video, currentVolume));
        }
        console.log(`🔊 Volume increased to ${currentVolume}`);
    }

    // Función para disminuir volumen
    function decreaseVolume() {
        currentVolume = Math.max(0.0, currentVolume - 0.02);
        if (isVolumeControlActive) {
            const videos = findVideos();
            videos.forEach(video => setVideoVolume(video, currentVolume));
        }
        console.log(`🔊 Volume decreased to ${currentVolume}`);
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

    // Función para forzar sincronización de volumen
    function forceVolumeSync() {
        const videos = findVideos();
        if (videos.length > 0) {
            const video = videos[0];
            if (video.volume !== undefined && video.volume !== null) {
                const oldVolume = currentVolume;
                currentVolume = video.volume;
                volumeControlStartVolume = video.volume;
                console.log(`🔊 Force volume sync: ${Math.round(oldVolume * 100)}% → ${Math.round(currentVolume * 100)}%`);
                return true;
            }
        }
        return false;
    }

    // Función para manejar eventos del mouse
    function handleMouseEvents() {
        let isMouseDown = false;
        let mouseDownTimeout = null;
        let mouseDownAction = null;
        let lastMousePosition = { x: 0, y: 0 };

        document.addEventListener('mousedown', (event) => {
            const videos = findVideos();
            if (videos.length === 0) return;

            const video = videos[0]; // Usar el primer video
            const rect = video.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;

            // Verificar si el clic está dentro de los límites del video
            if (clickX >= 0 && clickX <= rect.width && clickY >= 0 && clickY <= rect.height) {
                // Verificar que sea un video principal (no thumbnail)
                const platform = getPlatform();
                let isMainPlayer = false;
                
                if (platform === 'youtube') {
                    isMainPlayer = rect.width > 300 && rect.height > 200;
                } else if (platform === 'twitch') {
                    isMainPlayer = rect.width > 400 && rect.height > 250;
                } else if (platform === 'vimeo') {
                    isMainPlayer = rect.width > 300 && rect.height > 200;
                } else if (platform === 'instagram') {
                    isMainPlayer = rect.width > 200 && rect.height > 150;
                } else if (platform === 'tiktok') {
                    isMainPlayer = rect.width > 200 && rect.height > 150;
                } else {
                    isMainPlayer = rect.width > 250 && rect.height > 180;
                }
                
                console.log(`🎯 Mouse down on video: ${platform}, size: ${rect.width}x${rect.height}, isMainPlayer: ${isMainPlayer}`);
                
                if (!isMainPlayer) {
                    // Si no es el reproductor principal, permitir comportamiento normal
                    console.log('🎯 Not main player, allowing normal behavior');
                    return;
                }
                
                // Forzar sincronización de volumen cuando el usuario interactúa
                forceVolumeSync();
                
                isMouseDown = true;
                lastMousePosition = { x: event.clientX, y: event.clientY };
                
                // Determinar qué área fue clickeada
                const rightSide = clickX > rect.width * 0.7;
                const leftSide = clickX < rect.width * 0.3;
                
                console.log(`🎯 Click position: ${clickX}/${rect.width} (${Math.round(clickX/rect.width*100)}%), rightSide: ${rightSide}, leftSide: ${leftSide}`);
                
                if (rightSide) {
                    mouseDownAction = 'speed';
                    // Mostrar indicador de "mantener presionado"
                    showSpeedIndicator('Hold 500ms...', 'Preparing');
                    mouseDownTimeout = setTimeout(() => {
                        if (isMouseDown) {
                            console.log('🎯 Activating speed control');
                            activateSpeed();
                        }
                    }, 500);
                } else if (leftSide) {
                    mouseDownAction = 'slow';
                    // Mostrar indicador de "mantener presionado"
                    showSpeedIndicator('Hold 500ms...', 'Preparing');
                    mouseDownTimeout = setTimeout(() => {
                        if (isMouseDown) {
                            console.log('🎯 Activating slow speed control');
                            activateSlowSpeed();
                        }
                    }, 500);
                }
                
                // Solo prevenir comportamiento por defecto si estamos en un área activa del video
                if (rightSide || leftSide) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        });

        document.addEventListener('mousemove', (event) => {
            if (isMouseDown) {
                // Verificar si el mouse se movió significativamente (para detectar arrastre)
                const deltaX = Math.abs(event.clientX - lastMousePosition.x);
                const deltaY = Math.abs(event.clientY - lastMousePosition.y);
                
                // Si el mouse se movió más de 10px, probablemente es un arrastre, no un clic
                if (deltaX > 10 || deltaY > 10) {
                    isMouseDown = false;
                    if (mouseDownTimeout) {
                        clearTimeout(mouseDownTimeout);
                        mouseDownTimeout = null;
                    }
                    
                    // Limpiar indicador de "mantener presionado"
                    const indicator = document.getElementById('speedIndicator');
                    if (indicator && indicator.textContent.includes('Hold 500ms...')) {
                        indicator.remove();
                    }
                    
                    // Desactivar velocidad
                    deactivateSpeed();
                }
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (isMouseDown) {
                isMouseDown = false;
                if (mouseDownTimeout) {
                    clearTimeout(mouseDownTimeout);
                    mouseDownTimeout = null;
                }
                
                // Limpiar indicador de "mantener presionado" si se soltó antes de 500ms
                const indicator = document.getElementById('speedIndicator');
                if (indicator && indicator.textContent.includes('Hold 500ms...')) {
                    indicator.remove();
                }
                
                // Desactivar velocidad
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
                
                // Limpiar indicador de "mantener presionado" si se soltó antes de 500ms
                const indicator = document.getElementById('speedIndicator');
                if (indicator && indicator.textContent.includes('Hold 500ms...')) {
                    indicator.remove();
                }
                
                // Desactivar velocidad
                deactivateSpeed();
            }
        });
    }

    // Función para configurar event listeners de video
    function setupVideoEventListeners(video) {
        // Agregar event listeners específicos de video aquí si es necesario
        // Por ahora, solo lo marcamos como procesado
        processedVideos.add(video);
        
        // Verificar si el volumen del video está disponible y sincronizar
        if (video.volume !== undefined && video.volume !== null) {
            currentVolume = video.volume;
            console.log(`🔊 Video volume detected during setup: ${Math.round(currentVolume * 100)}%`);
        } else {
            // Si el volumen no está disponible, configurar un listener para cuando esté disponible
            const checkVolume = () => {
                if (video.volume !== undefined && video.volume !== null) {
                    currentVolume = video.volume;
                    console.log(`🔊 Video volume became available: ${Math.round(currentVolume * 100)}%`);
                    video.removeEventListener('loadedmetadata', checkVolume);
                    video.removeEventListener('canplay', checkVolume);
                }
            };
            
            video.addEventListener('loadedmetadata', checkVolume);
            video.addEventListener('canplay', checkVolume);
        }
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

    // Función para resetear volumen
    function resetVolume() {
        const videos = findVideos();
        if (videos.length > 0) {
            // Restaurar al volumen original del video
            videos.forEach(video => {
                const originalVolume = originalVolumes.get(video) || 1.0;
                currentVolume = originalVolume;
                setVideoVolume(video, currentVolume);
            });
        } else {
            // Si no hay videos, resetear a 100%
            currentVolume = 1.0;
        }
        console.log('🔊 Volumen reseteado a', Math.round(currentVolume * 100) + '%');
    }

    // Función para sincronizar volumen con el video actual
    function syncVolumeWithVideo() {
        const videos = findVideos();
        if (videos.length > 0) {
            const video = videos[0];
            if (video.volume !== undefined && video.volume !== null) {
                currentVolume = video.volume;
                console.log(`🔊 Volume synced with video: ${Math.round(currentVolume * 100)}%`);
                return true;
            } else {
                console.log('🔊 Video volume not yet available, will retry later');
                return false;
            }
        }
        return false;
    }
    
    // Función para sincronizar volumen con retry
    function syncVolumeWithRetry(maxAttempts = 10, delay = 500) {
        let attempts = 0;
        
        function attemptSync() {
            if (attempts >= maxAttempts) {
                console.log('🔊 Failed to sync volume after maximum attempts, using default 100%');
                currentVolume = 1.0;
                return;
            }
            
            if (syncVolumeWithVideo()) {
                console.log('🔊 Volume sync successful');
                return;
            }
            
            attempts++;
            console.log(`🔊 Volume sync attempt ${attempts}/${maxAttempts} failed, retrying in ${delay}ms...`);
            setTimeout(attemptSync, delay);
        }
        
        attemptSync();
    }

    // Función para verificar volumen periódicamente
    function startVolumeMonitoring() {
        // Verificar volumen cada 2 segundos para videos que se cargan dinámicamente
        setInterval(() => {
            const videos = findVideos();
            if (videos.length > 0) {
                const video = videos[0];
                if (video.volume !== undefined && video.volume !== null && 
                    Math.abs(video.volume - currentVolume) > 0.01) {
                    // Solo actualizar si hay una diferencia significativa
                    currentVolume = video.volume;
                    console.log(`🔊 Volume updated from periodic check: ${Math.round(currentVolume * 100)}%`);
                }
            }
        }, 2000);
    }

    // Función para manejar mensajes del popup
    function handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'getSpeed':
                // Sincronizar volumen con el video actual antes de responder
                syncVolumeWithVideo();
                sendResponse({
                    speed: currentSpeed,
                    slowSpeed: currentSlowSpeed,
                    volume: currentVolume,
                    floatingPanelEnabled: floatingPanelEnabled,
                    speedLockEnabled: speedLockEnabled
                });
                break;
            case 'reset':
                resetSpeed();
                sendResponse({speed: currentSpeed});
                break;
            case 'setVolume':
                if (request.volume !== undefined) {
                    currentVolume = Math.max(0, Math.min(1, request.volume));
                    if (isVolumeControlActive) {
                        const videos = findVideos();
                        videos.forEach(video => setVideoVolume(video, currentVolume));
                    }
                    sendResponse({volume: currentVolume});
                }
                break;
            case 'increaseVolume':
                increaseVolume();
                sendResponse({volume: currentVolume});
                break;
            case 'decreaseVolume':
                decreaseVolume();
                sendResponse({volume: currentVolume});
                break;
            case 'resetVolume':
                resetVolume();
                sendResponse({volume: currentVolume});
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
        const platform = getPlatform();
        if (platform === 'twitch' || platform === 'tiktok') {
            console.log(`🎮 Video Speedup Extension: ${platform === 'twitch' ? 'Twitch' : 'TikTok'} mode activated - Enhanced video detection enabled`);
        } else {
            // console.log('¡Extensión de Velocidad de Videos cargada! Mantén clic izquierdo en el lado derecho para acelerar, lado izquierdo para desacelerar.');
        }
        
        // Configurar listener de mensajes
        chrome.runtime.onMessage.addListener(handleMessage);
        
        // Configurar manejo de eventos del mouse
        handleMouseEvents();
        
        // Empezar detección perezosa de videos
        startLazyVideoDetection();
        
        // Empezar monitoreo de volumen
        startVolumeMonitoring();
        
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
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                increaseVolume();
                // console.log(`Atajo de teclado (↑): Volumen aumentado a ${currentVolume}`);
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                event.stopPropagation();
                decreaseVolume();
                // console.log(`Atajo de teclado (↓): Volumen disminuido a ${currentVolume}`);
            }
        }, true); // Usar fase de captura para interceptar eventos temprano
        
        // Configurar el event listener para el scroll del mouse (control de volumen)
        document.addEventListener('wheel', function(event) {
            // Deshabilitar control de volumen en TikTok
            if (getPlatform() === 'tiktok') {
                return;
            }
            
            // Verificar si estamos sobre un área que debería permitir scroll normal
            if (isOverScrollableArea(event.clientX, event.clientY)) {
                // Si estamos sobre un área scrollable (feed, comentarios, etc.), permitir scroll normal
                console.log('🎵 Wheel over scrollable area, allowing normal scroll');
                return;
            }
            
            // Verificar si el mouse está sobre un video
            const videos = findVideos();
            let isOverVideo = false;
            let targetVideo = null;
            
            for (const video of videos) {
                const rect = video.getBoundingClientRect();
                if (event.clientX >= rect.left && event.clientX <= rect.right &&
                    event.clientY >= rect.top && event.clientY <= rect.bottom) {
                    isOverVideo = true;
                    targetVideo = video;
                    break;
                }
            }
            
            // Solo activar si el mouse está sobre un video
            if (!isOverVideo) {
                console.log('🎵 Wheel not over video, allowing normal scroll');
                return;
            }
            
            // Verificar que el video sea lo suficientemente grande para ser el reproductor principal
            // (no thumbnails o videos pequeños)
            if (targetVideo) {
                const rect = targetVideo.getBoundingClientRect();
                const platform = getPlatform();
                
                // Criterios más estrictos para considerar un video como reproductor principal
                let isMainPlayer = false;
                
                if (platform === 'youtube') {
                    // Para YouTube, solo considerar videos grandes (reproductor principal)
                    isMainPlayer = rect.width > 300 && rect.height > 200;
                } else if (platform === 'twitch') {
                    // Para Twitch, solo considerar videos grandes (reproductor principal)
                    isMainPlayer = rect.width > 400 && rect.height > 250;
                } else if (platform === 'vimeo') {
                    // Para Vimeo, solo considerar videos grandes
                    isMainPlayer = rect.width > 300 && rect.height > 200;
                } else if (platform === 'instagram') {
                    // Para Instagram, ser más permisivo pero aún selectivo
                    isMainPlayer = rect.width > 200 && rect.height > 150;
                } else {
                    // Para otras plataformas, usar criterio general
                    isMainPlayer = rect.width > 250 && rect.height > 180;
                }
                
                console.log(`🎵 Wheel over video: ${platform}, size: ${rect.width}x${rect.height}, isMainPlayer: ${isMainPlayer}`);
                
                if (!isMainPlayer) {
                    // Si no es el reproductor principal, permitir scroll normal
                    console.log('🎵 Not main player, allowing normal scroll');
                    return;
                }
                
                // Inicializar control de volumen desde el volumen actual del video
                if (!isVolumeControlActive) {
                    isVolumeControlActive = true;
                    // Siempre obtener el volumen actual del video, no usar el valor guardado
                    const videoVolume = targetVideo.volume;
                    if (videoVolume !== undefined && videoVolume !== null) {
                        currentVolume = videoVolume;
                        volumeControlStartVolume = videoVolume;
                        console.log(`🎵 Volume control initialized from video: ${Math.round(currentVolume * 100)}%`);
                    } else {
                        // Si el volumen no está disponible, usar el valor por defecto
                        currentVolume = 1.0;
                        volumeControlStartVolume = 1.0;
                        console.log('🎵 Volume control initialized with default: 100%');
                    }
                }
            }
            
            console.log('🎵 Intercepting wheel for volume control');
            
            // Solo prevenir el scroll normal si estamos definitivamente sobre el reproductor principal
            // y el usuario está activamente intentando controlar el volumen
            event.preventDefault();
            event.stopPropagation();
            
            // Determinar la dirección del scroll
            const delta = event.deltaY;
            
            if (delta > 0) {
                // Scroll hacia abajo - disminuir volumen
                decreaseVolume();
                // Aplicar el volumen directamente al video
                if (targetVideo) {
                    setVideoVolume(targetVideo, currentVolume);
                }
                console.log('🎵 Mouse wheel: Volume decreased to', currentVolume);
            } else if (delta < 0) {
                // Scroll hacia arriba - aumentar volumen
                increaseVolume();
                // Aplicar el volumen directamente al video
                if (targetVideo) {
                    setVideoVolume(targetVideo, currentVolume);
                }
                console.log('🎵 Mouse wheel: Volume increased to', currentVolume);
            }
        }, { passive: false });
        
        // Función para verificar si estamos sobre un área que debería permitir scroll normal
        function isOverScrollableArea(x, y) {
            const platform = getPlatform();
            const elements = document.elementsFromPoint(x, y);
            
            // Primero verificar si estamos sobre un video principal
            const videos = findVideos();
            for (const video of videos) {
                const rect = video.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                    // Si estamos sobre un video, verificar que sea el principal
                    const platform = getPlatform();
                    let isMainPlayer = false;
                    
                    if (platform === 'youtube') {
                        isMainPlayer = rect.width > 300 && rect.height > 200;
                    } else if (platform === 'twitch') {
                        isMainPlayer = rect.width > 400 && rect.height > 250;
                    } else if (platform === 'vimeo') {
                        isMainPlayer = rect.width > 300 && rect.height > 200;
                    } else if (platform === 'instagram') {
                        isMainPlayer = rect.width > 200 && rect.height > 150;
                    } else if (platform === 'tiktok') {
                        isMainPlayer = rect.width > 200 && rect.height > 150;
                    } else {
                        isMainPlayer = rect.width > 250 && rect.height > 180;
                    }
                    
                    // Si es el reproductor principal, NO es un área scrollable
                    if (isMainPlayer) {
                        console.log('🎵 Over main video player, NOT a scrollable area');
                        return false;
                    }
                }
            }
            
            for (const element of elements) {
                const tagName = element.tagName.toLowerCase();
                const className = element.className || '';
                const id = element.id || '';
                
                // Verificar si estamos sobre elementos que deberían permitir scroll normal
                if (platform === 'youtube') {
                    // En YouTube, permitir scroll en feeds, comentarios, sidebar, etc.
                    if (className.includes('feed') || className.includes('comment') || 
                        className.includes('sidebar') || className.includes('related') ||
                        className.includes('playlist') || className.includes('thumbnail') ||
                        id.includes('feed') || id.includes('comment') || 
                        id.includes('sidebar') || id.includes('related') ||
                        id.includes('playlist') || id.includes('thumbnail')) {
                        console.log(`🎵 YouTube scrollable area detected: ${className} ${id}`);
                        return true;
                    }
                } else if (platform === 'tiktok') {
                    // En TikTok, permitir scroll en feeds, comentarios, etc.
                    if (className.includes('feed') || className.includes('comment') ||
                        className.includes('sidebar') || className.includes('related') ||
                        className.includes('thumbnail') || className.includes('suggested') ||
                        id.includes('feed') || id.includes('comment') ||
                        id.includes('sidebar') || id.includes('related') ||
                        id.includes('thumbnail') || id.includes('suggested')) {
                        console.log(`🎵 TikTok scrollable area detected: ${className} ${id}`);
                        return true;
                    }
                } else if (platform === 'twitch') {
                    // En Twitch, permitir scroll en chat, sidebar, etc.
                    if (className.includes('chat') || className.includes('sidebar') ||
                        className.includes('related') || className.includes('thumbnail') ||
                        className.includes('recommendation') || className.includes('category') ||
                        id.includes('chat') || id.includes('sidebar') ||
                        id.includes('related') || id.includes('thumbnail') ||
                        id.includes('recommendation') || id.includes('category')) {
                        console.log(`🎵 Twitch scrollable area detected: ${className} ${id}`);
                        return true;
                    }
                } else if (platform === 'instagram') {
                    // En Instagram, permitir scroll en feeds, stories, etc.
                    if (className.includes('feed') || className.includes('story') ||
                        className.includes('sidebar') || className.includes('related') ||
                        className.includes('thumbnail') || className.includes('suggested') ||
                        id.includes('feed') || id.includes('story') ||
                        id.includes('sidebar') || id.includes('related') ||
                        id.includes('thumbnail') || id.includes('suggested')) {
                        console.log(`🎵 Instagram scrollable area detected: ${className} ${id}`);
                        return true;
                    }
                }
                
                // Verificar elementos comunes que deberían permitir scroll
                if (tagName === 'div' && (className.includes('feed') || className.includes('list') ||
                    className.includes('grid') || className.includes('container') ||
                    className.includes('wrapper') || className.includes('content'))) {
                    console.log(`🎵 Common scrollable area detected: ${tagName} ${className}`);
                    return true;
                }
                
                // Verificar si el elemento tiene scroll
                const computedStyle = window.getComputedStyle(element);
                const overflow = computedStyle.overflow + computedStyle.overflowX + computedStyle.overflowY;
                if (overflow.includes('scroll') || overflow.includes('auto')) {
                    if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
                        console.log(`🎵 Scrollable element detected: ${tagName} ${className} overflow: ${overflow}`);
                        return true;
                    }
                }
            }
            
            console.log('🎵 No scrollable area detected, allowing video control');
            return false;
        }
        
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
        
        // Sincronizar volumen con el video inicial usando retry
        syncVolumeWithRetry();
        
        // Inicialización específica para Twitch y TikTok
        if (platform === 'twitch' || platform === 'tiktok') {
            // Para Twitch y TikTok, hacer una detección adicional después de un retraso
            // ya que cargan videos dinámicamente
            setTimeout(() => {
                const delayedVideos = findVideos();
                if (delayedVideos.length > 0) {
                    handleNewVideos(delayedVideos);
                    syncVolumeWithRetry();
                }
            }, 2000); // Esperar 2 segundos para videos que se cargan después
            
            // También hacer una detección adicional después de 5 segundos
            setTimeout(() => {
                const finalVideos = findVideos();
                if (finalVideos.length > 0) {
                    handleNewVideos(finalVideos);
                    syncVolumeWithRetry();
                }
            }, 5000);
        }
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})(); 