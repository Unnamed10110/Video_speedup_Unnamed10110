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
    
    // Secuencia de velocidad para teclas + y - (misma que X/Twitter)
    const speedSequence = [0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0];
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
        // Eliminar console.log para ser más sigiloso en X.com
        // console.log(`🔍 Detectando plataforma para hostname: ${hostname}`);
        
        if (hostname.includes('tiktok.com')) {
            return 'tiktok';
        }
        if (hostname.includes('youtube.com')) {
            return 'youtube';
        }
        if (hostname.includes('vimeo.com')) {
            return 'vimeo';
        }
        if (hostname.includes('twitch.tv')) {
            return 'twitch';
        }
        if (hostname.includes('instagram.com')) {
            return 'instagram';
        }
        if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            return 'twitter';
        }
        
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
                    'video[data-e2e="browse-video"]',
                    'video[data-e2e="video"]',
                    'video[class*="video"]',
                    'video[class*="player"]',
                    'video[class*="tiktok"]',
                    'video'
                ];
                console.log('🔍 TikTok: Buscando videos con selectores:', tiktokSelectors);
                for (const selector of tiktokSelectors) {
                    videos = document.querySelectorAll(selector);
                    console.log(`🔍 TikTok: Selector "${selector}" encontró ${videos.length} videos`);
                    if (videos.length > 0) {
                        // Filtrar para solo videos principales (no thumbnails)
                        videos = Array.from(videos).filter(video => {
                            const rect = video.getBoundingClientRect();
                            const isValid = rect.width > 150 && rect.height > 100 && 
                                          rect.width > 0 && rect.height > 0 && // Asegurar que el video sea visible
                                          video.offsetParent !== null; // Asegurar que el video esté en el DOM
                            console.log(`🔍 TikTok: Video ${video.src ? video.src.substring(0, 50) + '...' : 'sin src'}, tamaño: ${rect.width}x${rect.height}, válido: ${isValid}`);
                            return isValid;
                        });
                        console.log(`🔍 TikTok: Después del filtro quedaron ${videos.length} videos`);
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
                    // Selectores específicos de Twitch para versiones actuales
                    'video[data-a-target="twitch-video"]',
                    'video[class*="video-player"]',
                    'video[class*="player"]',
                    'video[class*="video"]',
                    // Selectores de respaldo para diferentes diseños de Twitch
                    'video[class*="twitch"]',
                    'video[class*="stream"]',
                    'video[class*="broadcast"]',
                    // Selector genérico de video como último recurso
                    'video'
                ];
                
                // Intentar encontrar videos con selectores específicos primero
                for (const selector of twitchSelectors) {
                    videos = document.querySelectorAll(selector);
                    if (videos.length > 0) {
                        // Filtrar videos pequeños/miniaturas para Twitch
                        const mainVideos = Array.from(videos).filter(video => {
                            const rect = video.getBoundingClientRect();
                            // Solo considerar videos que tengan un tamaño razonable (probablemente reproductor principal)
                            return rect.width > 400 && rect.height > 250;
                        });
                        if (mainVideos.length > 0) {
                            videos = mainVideos;
                            break;
                        }
                    }
                }
                
                // Si no se encuentran videos con selectores, intentar métodos alternativos para Twitch
                if (videos.length === 0) {
                    // Buscar elementos de video dentro de contenedores comunes de Twitch
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
                
                // Registro de depuración para Twitch
                if (videos.length === 0) {
                    // console.log('🎮 Twitch: No se encontraron videos con los selectores actuales');
                    // Registrar todos los elementos de video en la página para depuración
                    const allVideos = document.querySelectorAll('video');
                    // console.log(`🎮 Twitch: Se encontraron ${allVideos.length} elementos de video totales en la página`);
                    allVideos.forEach((video, index) => {
                        const rect = video.getBoundingClientRect();
                        // console.log(`🎮 Twitch: Video ${index}: clases="${video.className}", tamaño=${rect.width}x${rect.height}, atributos-data="${video.getAttributeNames().filter(attr => attr.startsWith('data-')).join(', ')}"`);
                    });
                } else {
                    // console.log(`🎮 Twitch: Se encontraron exitosamente ${videos.length} video(s)`);
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
                
            case 'twitter':
                // console.log('🐦 Twitter: Iniciando detección de videos...');
                const twitterSelectors = [
                    'video[data-testid="videoPlayer"]',
                    'video[data-testid="video"]',
                    'video[class*="video"]',
                    'video[class*="player"]',
                    'video'
                ];
                
                // Registrar todos los elementos de video en la página para depuración
                const allTwitterVideos = document.querySelectorAll('video');
                // console.log(`🐦 Twitter: Se encontraron ${allTwitterVideos.length} elementos de video totales en la página`);
                allTwitterVideos.forEach((video, index) => {
                    const rect = video.getBoundingClientRect();
                    const dataAttrs = video.getAttributeNames().filter(attr => attr.startsWith('data-'));
                    // console.log(`🐦 Twitter: Video ${index}: clases="${video.className}", tamaño=${rect.width}x${rect.height}, atributos-data="${dataAttrs.join(', ')}"`);
                });
                
                for (const selector of twitterSelectors) {
                    // console.log(`🐦 Twitter: Probando selector: ${selector}`);
                    videos = document.querySelectorAll(selector);
                    // console.log(`🐦 Twitter: Selector "${selector}" encontró ${videos.length} videos`);
                    
                    if (videos.length > 0) {
                        // Filtrar para solo videos principales (no thumbnails)
                        videos = Array.from(videos).filter(video => {
                            const rect = video.getBoundingClientRect();
                            const isMainPlayer = rect.width > 150 && rect.height > 100;
                            // console.log(`🐦 Twitter: Tamaño del video ${rect.width}x${rect.height}, esReproductorPrincipal: ${isMainPlayer}`);
                            return isMainPlayer;
                        });
                        
                        // console.log(`🐦 Twitter: Después del filtrado, quedan ${videos.length} videos`);
                        if (videos.length > 0) break;
                    }
                }
                
                // Respaldo: buscar videos dentro de contenedores de video de Twitter
                if (videos.length === 0) {
                    // console.log('🐦 Twitter: Probando detección basada en contenedores...');
                    const twitterContainers = [
                        '[data-testid="videoPlayer"]',
                        '[data-testid="video"]',
                        '[class*="video-container"]',
                        '[class*="media-container"]'
                    ];
                    
                    for (const containerSelector of twitterContainers) {
                        // console.log(`🐦 Twitter: Probando selector de contenedor: ${containerSelector}`);
                        const containers = document.querySelectorAll(containerSelector);
                        // console.log(`🐦 Twitter: Se encontraron ${containers.length} contenedores con selector "${containerSelector}"`);
                        
                        for (const container of containers) {
                            const videoInContainer = container.querySelector('video');
                            if (videoInContainer) {
                                const rect = videoInContainer.getBoundingClientRect();
                                const isMainPlayer = rect.width > 150 && rect.height > 100;
                                // console.log(`🐦 Twitter: Tamaño del video del contenedor ${rect.width}x${rect.height}, esReproductorPrincipal: ${isMainPlayer}`);
                                
                                if (isMainPlayer) {
                                    videos = [videoInContainer];
                                    // console.log('🐦 Twitter: Se encontró video principal en el contenedor');
                                    break;
                                }
                            }
                        }
                        if (videos.length > 0) break;
                    }
                }
                
                // Respaldo adicional: buscar cualquier elemento de video que pueda estar oculto o en contenedores diferentes
                if (videos.length === 0) {
                    // Buscar videos en cualquier contenedor que pueda contener medios
                    const allContainers = document.querySelectorAll('[class*="media"], [class*="video"], [class*="player"], [class*="content"]');
                    for (const container of allContainers) {
                        const videoInContainer = container.querySelector('video');
                        if (videoInContainer) {
                            const rect = videoInContainer.getBoundingClientRect();
                            // Criterios más permisivos para X.com
                            if (rect.width > 100 && rect.height > 80) {
                                videos = [videoInContainer];
                                break;
                            }
                        }
                    }
                }
                
                // Método alternativo sigiloso: buscar videos verificando si realmente están reproduciéndose o tienen fuente
                if (videos.length === 0) {
                    const allVideos = document.querySelectorAll('video');
                    for (const video of allVideos) {
                        // Verificar si el video tiene fuente o realmente es un reproductor de video
                        if (video.src || video.currentSrc || video.querySelector('source') || 
                            video.readyState > 0 || video.duration > 0) {
                            const rect = video.getBoundingClientRect();
                            if (rect.width > 80 && rect.height > 60) {
                                videos = [video];
                                break;
                            }
                        }
                    }
                }
                
                // Registro final
                if (videos.length === 0) {
                    // console.log('🐦 Twitter: No se encontraron videos con los selectores actuales');
                } else {
                    // console.log(`🐦 Twitter: Se encontraron exitosamente ${videos.length} video(s)`);
                    videos.forEach((video, index) => {
                        const rect = video.getBoundingClientRect();
                        // console.log(`🐦 Twitter: Video final ${index}: tamaño=${rect.width}x${rect.height}`);
                    });
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
            const platform = getPlatform();
            // console.log(`🔍 ${platform}: Ejecutando detección de videos...`);
            
            const videos = findVideos();
            // console.log(`🔍 ${platform}: Se encontraron ${videos.length} videos`);
            
            if (videos.length !== lastVideoCount) {
                // console.log(`🔍 ${platform}: El conteo de videos cambió de ${lastVideoCount} a ${videos.length}`);
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
        let detectionInterval;
        if (platform === 'twitter') {
            detectionInterval = 200; // 200ms para Twitter (muy agresivo)
        } else if (platform === 'twitch' || platform === 'tiktok') {
            detectionInterval = 500; // 500ms para Twitch y TikTok
        } else {
            detectionInterval = 1000; // 1000ms para otros
        }
        
        videoDetectionInterval = setInterval(debouncedVideoDetection, detectionInterval);
    }

    // Función para manejar videos nuevos
    function handleNewVideos(videos) {
        const platform = getPlatform();
        // console.log(`🎬 ${platform}: Manejando ${videos.length} videos nuevos`);
        
        videos.forEach((video, index) => {
            if (!processedVideos.has(video)) {
                // console.log(`🎬 ${platform}: Procesando nuevo video ${index + 1}/${videos.length}`);
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
                    // console.log(`🔊 ${platform}: Volumen sincronizado con nuevo video: ${Math.round(currentVolume * 100)}%`);
                } else {
                    // console.log(`🔊 ${platform}: Volumen del video aún no disponible`);
                }
            } else {
                // console.log(`🎬 ${platform}: Video ${index + 1} ya procesado`);
            }
        });
    }

    // Función para establecer velocidad de video con aplicación inmediata y persistente
    function setVideoSpeed(video, speed) {
        console.log(`🎯 setVideoSpeed() llamada con velocidad: ${speed}x`);
        if (video && video.playbackRate !== undefined) {
            const oldSpeed = video.playbackRate;
            const wasPlaying = !video.paused;
            const currentTime = video.currentTime;
            
            console.log(`🎯 Aplicando velocidad ${speed}x al video (antes: ${oldSpeed}x)`);
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
        console.log('🎯 activateSpeed() llamada');
        const videos = findVideos();
        console.log('🎯 Videos encontrados en activateSpeed:', videos.length);
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
            
            // console.log(`🎯 Velocidad activada: ${currentSpeed}x`);
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
            
            // console.log(`🎯 Velocidad lenta activada: ${currentSlowSpeed}x`);
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
            
            // console.log('🎯 Speed deactivated - returned to normal speed (1.0x)');
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

    // Función para aumentar velocidad (saltando a la siguiente velocidad en la secuencia)
    function increaseSpeed() {
        if (currentSpeedSequenceIndex < speedSequence.length - 1) {
            currentSpeedSequenceIndex++;
            currentSpeed = speedSequence[currentSpeedSequenceIndex];
            currentSlowSpeed = currentSpeed;
            showSpeedIndicator(currentSpeed);
            // console.log(`Velocidad aumentada a ${currentSpeed}x`);
        }
    }

    // Función para disminuir velocidad lenta (saltando a la velocidad anterior en la secuencia)
    function decreaseSlowSpeed() {
        if (currentSpeedSequenceIndex > 0) {
            currentSpeedSequenceIndex--;
            currentSpeed = speedSequence[currentSpeedSequenceIndex];
            currentSlowSpeed = currentSpeed;
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
            
            // console.log(`🔊 Video volume changed from ${oldVolume} to ${volume}`);
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
            
            // console.log(`🔊 Volume control activated: ${Math.round(currentVolume * 100)}%`);
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
            
            // console.log('🔊 Control de volumen desactivado - volumen restaurado');
        }
    }

    // Función para aumentar volumen
    function increaseVolume() {
        currentVolume = Math.min(1.0, currentVolume + 0.02);
        if (isVolumeControlActive) {
            const videos = findVideos();
            videos.forEach(video => setVideoVolume(video, currentVolume));
        }
        // console.log(`🔊 Volume increased to ${currentVolume}`);
    }

    // Función para disminuir volumen
    function decreaseVolume() {
        currentVolume = Math.max(0.0, currentVolume - 0.02);
        if (isVolumeControlActive) {
            const videos = findVideos();
            videos.forEach(video => setVideoVolume(video, currentVolume));
        }
        // console.log(`🔊 Volume decreased to ${currentVolume}`);
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
                // console.log(`🔊 Force volume sync: ${Math.round(oldVolume * 100)}% → ${Math.round(currentVolume * 100)}%`);
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
            console.log('🔍 Mouse down detectado, videos encontrados:', videos.length);
            if (videos.length === 0) return;

            const video = videos[0]; // Usar el primer video
            const rect = video.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;

            console.log(`🔍 Click en posición: ${event.clientX}, ${event.clientY}, video en: ${rect.left}, ${rect.top}, click relativo: ${clickX}, ${clickY}, video tamaño: ${rect.width}x${rect.height}`);

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
                } else if (platform === 'twitter') {
                    isMainPlayer = rect.width > 150 && rect.height > 100;
                } else {
                    isMainPlayer = rect.width > 250 && rect.height > 180;
                }
                
                // console.log(`🎯 Mouse down on video: ${platform}, size: ${rect.width}x${rect.height}, isMainPlayer: ${isMainPlayer}`);
                
                if (!isMainPlayer) {
                    // Si no es el reproductor principal, permitir comportamiento normal
                    // console.log('🎯 Not main player, allowing normal behavior');
                    return;
                }
                
                // Forzar sincronización de volumen cuando el usuario interactúa
                forceVolumeSync();
                
                isMouseDown = true;
                lastMousePosition = { x: event.clientX, y: event.clientY };
                
                // Determinar qué área fue clickeada
                const rightSide = clickX > rect.width * 0.7;
                const leftSide = clickX < rect.width * 0.3;
                
                // console.log(`🎯 Click position: ${clickX}/${rect.width} (${Math.round(clickX/rect.width*100)}%), rightSide: ${rightSide}, leftSide: ${leftSide}`);
                
                if (rightSide) {
                    mouseDownAction = 'speed';
                    console.log('🎯 Lado derecho clickeado, preparando para activar velocidad');
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
                    console.log('🎯 Lado izquierdo clickeado, preparando para activar velocidad lenta');
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
        const platform = getPlatform();
        // console.log(`🎧 ${platform}: Setting up event listeners for video`);
        
        // Agregar event listeners específicos de video aquí si es necesario
        // Por ahora, solo lo marcamos como procesado
        processedVideos.add(video);
        
        // Verificar si el volumen del video está disponible y sincronizar
        if (video.volume !== undefined && video.volume !== null) {
            currentVolume = video.volume;
            // console.log(`🔊 ${platform}: Video volume detected during setup: ${Math.round(currentVolume * 100)}%`);
        } else {
            // console.log(`🔊 ${platform}: Video volume not available during setup, setting up listeners`);
            // Si el volumen no está disponible, configurar un listener para cuando esté disponible
            const checkVolume = () => {
                if (video.volume !== undefined && video.volume !== null) {
                    currentVolume = video.volume;
                    // console.log(`🔊 ${platform}: Video volume became available: ${Math.round(currentVolume * 100)}%`);
                    video.removeEventListener('loadedmetadata', checkVolume);
                    video.removeEventListener('canplay', checkVolume);
                }
            };
            
            video.addEventListener('loadedmetadata', checkVolume);
            video.addEventListener('canplay', checkVolume);
        }
    }

    // Función para resetear velocidad (misma que X/Twitter)
    function resetSpeed() {
        currentSpeed = 2.0; // Mismo valor predeterminado que X/Twitter
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
        // console.log('🔊 Volumen reseteado a', Math.round(currentVolume * 100) + '%');
    }

    // Función para sincronizar volumen con el video actual
    function syncVolumeWithVideo() {
        const videos = findVideos();
        if (videos.length > 0) {
            const video = videos[0];
            if (video.volume !== undefined && video.volume !== null) {
                currentVolume = video.volume;
                // console.log(`🔊 Volume synced with video: ${Math.round(currentVolume * 100)}%`);
                return true;
            } else {
                // console.log('🔊 Video volume not yet available, will retry later');
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
                // console.log('🔊 Failed to sync volume after maximum attempts, using default 100%');
                currentVolume = 1.0;
                return;
            }
            
            if (syncVolumeWithVideo()) {
                // console.log('🔊 Volume sync successful');
                return;
            }
            
            attempts++;
            // console.log(`🔊 Volume sync attempt ${attempts}/${maxAttempts} failed, retrying in ${delay}ms...`);
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
                    // console.log(`🔊 Volume updated from periodic check: ${Math.round(currentVolume * 100)}%`);
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
            case 'toggleSpeed':
                isSpeedActive = !isSpeedActive;
                if (isSpeedActive) {
                    isSlowActive = false;
                    applySpeedToVideos();
                    showSpeedIndicator(currentSpeed);
                } else {
                    resetSpeedOnVideos();
                    showSpeedIndicator(1.0);
                }
                sendResponse({success: true, isSpeedActive: isSpeedActive});
                break;
            case 'toggleSlowSpeed':
                isSlowActive = !isSlowActive;
                if (isSlowActive) {
                    isSpeedActive = false;
                    applySpeedToVideos();
                    showSpeedIndicator(currentSlowSpeed);
                } else {
                    resetSpeedOnVideos();
                    showSpeedIndicator(1.0);
                }
                sendResponse({success: true, isSlowActive: isSlowActive});
                break;
            case 'toggleVolume':
                isVolumeControlActive = !isVolumeControlActive;
                if (isVolumeControlActive) {
                    // Activar control de volumen
                    showVolumeIndicator(currentVolume);
                } else {
                    // Desactivar control de volumen
                    resetVolume();
                }
                sendResponse({success: true, isVolumeControlActive: isVolumeControlActive});
                break;
            case 'toggleSpeedLock':
                speedLockEnabled = request.enabled;
                updateFloatingPanel();
                sendResponse({speedLockEnabled: speedLockEnabled});
                break;
        }
        return true;
    }

    // Función para detectar si X.com está bloqueando la extensión
    function isXBlockingExtension() {
        try {
            // Verificar si hay elementos de error o bloqueo
            const errorElements = document.querySelectorAll('[data-testid="error"], [class*="error"], [class*="blocked"], [class*="privacy"]');
            if (errorElements.length > 0) {
                return true;
            }
            
            // Verificar si la página está funcionando normalmente
            const mainContent = document.querySelector('[data-testid="primaryColumn"], [data-testid="main"], main, [role="main"]');
            if (!mainContent) {
                return true;
            }
            
            // Verificar si hay contenido normal de Twitter
            const tweets = document.querySelectorAll('[data-testid="tweet"], [class*="tweet"], [class*="post"]');
            if (tweets.length === 0) {
                return true;
            }
            
            return false;
        } catch (e) {
            return true; // Si hay errores, asumir que está bloqueando
        }
    }

    // Función para inicializar la extensión
    function initialize() {
        const platform = getPlatform();
        // console.log(`🚀 Initializing extension for platform: ${platform}`);
        
        if (platform === 'twitch' || platform === 'tiktok') {
            // console.log(`🎮 Video Speedup Extension: ${platform === 'twitch' ? 'Twitch' : 'TikTok'} mode activated - Enhanced video detection enabled`);
        } else if (platform === 'twitter') {
            // console.log(`🐦 Video Speedup Extension: Twitter/X mode activated - Enhanced video detection enabled`);
        } else {
            // console.log('🎯 Video Speedup Extension: Standard mode activated');
        }
        
        // Para X.com, verificar si está bloqueando antes de continuar
        if (platform === 'twitter' && isXBlockingExtension()) {
            // console.log('🐦 X.com is blocking extension, using bypass methods');
            // Usar métodos de bypass
            setTimeout(() => {
                tryXComBypass();
            }, 2000); // Esperar 2 segundos y usar métodos de bypass
            return;
        }
        
        // Para X.com, también intentar bypass inmediato
        if (platform === 'twitter') {
            // Intentar bypass inmediato sin verificar bloqueo
            setTimeout(() => {
                tryXComBypass();
            }, 1000);
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
                // console.log('🎵 Wheel over scrollable area, allowing normal scroll');
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
                // console.log('🎵 Wheel not over video, allowing normal scroll');
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
                } else if (platform === 'twitter') {
                    // Para Twitter, usar criterios más permisivos ya que los videos pueden ser más pequeños
                    isMainPlayer = rect.width > 150 && rect.height > 100;
                } else {
                    // Para otras plataformas, usar criterio general
                    isMainPlayer = rect.width > 250 && rect.height > 180;
                }
                
                // console.log(`🎵 Wheel over video: ${platform}, size: ${rect.width}x${rect.height}, isMainPlayer: ${isMainPlayer}`);
                
                if (!isMainPlayer) {
                    // Si no es el reproductor principal, permitir scroll normal
                    // console.log('🎵 Not main player, allowing normal scroll');
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
                        // console.log(`🎵 Volume control initialized from video: ${Math.round(currentVolume * 100)}%`);
                    } else {
                        // Si el volumen no está disponible, usar el valor por defecto
                        currentVolume = 1.0;
                        volumeControlStartVolume = 1.0;
                        // console.log('🎵 Volume control initialized with default: 100%');
                    }
                }
            }
            
            // console.log('🎵 Intercepting wheel for volume control');
            
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
                // console.log('🎵 Mouse wheel: Volume decreased to', currentVolume);
            } else if (delta < 0) {
                // Scroll hacia arriba - aumentar volumen
                increaseVolume();
                // Aplicar el volumen directamente al video
                if (targetVideo) {
                    setVideoVolume(targetVideo, currentVolume);
                }
                // console.log('🎵 Mouse wheel: Volume increased to', currentVolume);
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
                    } else if (platform === 'twitter') {
                        isMainPlayer = rect.width > 150 && rect.height > 100;
                    } else {
                        isMainPlayer = rect.width > 250 && rect.height > 180;
                    }
                    
                    // Si es el reproductor principal, NO es un área scrollable
                    if (isMainPlayer) {
                        // console.log('🎵 Over main video player, NOT a scrollable area');
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
                        // console.log(`🎵 YouTube scrollable area detected: ${className} ${id}`);
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
                        // console.log(`🎵 TikTok scrollable area detected: ${className} ${id}`);
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
                        // console.log(`🎵 Twitch scrollable area detected: ${className} ${id}`);
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
                        // console.log(`🎵 Instagram scrollable area detected: ${className} ${id}`);
                        return true;
                    }
                } else if (platform === 'twitter') {
                    // En Twitter, permitir scroll en feeds, tweets, etc.
                    if (className.includes('feed') || className.includes('tweet') ||
                        className.includes('timeline') || className.includes('sidebar') ||
                        className.includes('thread') || className.includes('conversation') ||
                        id.includes('feed') || id.includes('tweet') ||
                        id.includes('timeline') || id.includes('sidebar') ||
                        id.includes('thread') || id.includes('conversation')) {
                        // console.log(`🎵 Twitter scrollable area detected: ${className} ${id}`);
                        return true;
                    }
                }
                
                // Verificar elementos comunes que deberían permitir scroll
                if (tagName === 'div' && (className.includes('feed') || className.includes('list') ||
                    className.includes('grid') || className.includes('container') ||
                    className.includes('wrapper') || className.includes('content'))) {
                    // console.log(`🎵 Common scrollable area detected: ${tagName} ${className}`);
                    return true;
                }
                
                // Verificar si el elemento tiene scroll
                const computedStyle = window.getComputedStyle(element);
                const overflow = computedStyle.overflow + computedStyle.overflowX + computedStyle.overflowY;
                if (overflow.includes('scroll') || overflow.includes('auto')) {
                    if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
                        // console.log(`🎵 Scrollable element detected: ${tagName} ${className} overflow: ${overflow}`);
                        return true;
                    }
                }
            }
            
            // console.log('🎵 No scrollable area detected, allowing video control');
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
        
        // Para X.com, usar un enfoque más stealthy con el observer
        if (platform === 'twitter') {
            // Configurar observer de forma más stealthy
            setTimeout(() => {
                try {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                } catch (e) {
                    // Si falla, usar un enfoque alternativo
                    // console.log('Observer failed, using alternative method');
                }
            }, 2000);
        } else {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
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
        
        // Inicialización específica para Twitter
        if (platform === 'twitter') {
            // Twitter carga videos dinámicamente en el feed, hacer detecciones adicionales
            // También intentar múltiples veces para evitar bloqueos
            setTimeout(() => {
                const delayedVideos = findVideos();
                if (delayedVideos.length > 0) {
                    handleNewVideos(delayedVideos);
                    syncVolumeWithRetry();
                }
            }, 1000); // Esperar 1 segundo para videos que se cargan después
            
            setTimeout(() => {
                const delayedVideos = findVideos();
                if (delayedVideos.length > 0) {
                    handleNewVideos(delayedVideos);
                    syncVolumeWithRetry();
                }
            }, 3000); // Esperar 3 segundos
            
            setTimeout(() => {
                const delayedVideos = findVideos();
                if (delayedVideos.length > 0) {
                    handleNewVideos(delayedVideos);
                    syncVolumeWithRetry();
                }
            }, 6000); // Esperar 6 segundos
            
            // Intentos adicionales para X.com
            setTimeout(() => {
                const delayedVideos = findVideos();
                if (delayedVideos.length > 0) {
                    handleNewVideos(delayedVideos);
                    syncVolumeWithRetry();
                }
            }, 10000); // Esperar 10 segundos
            
            setTimeout(() => {
                const delayedVideos = findVideos();
                if (delayedVideos.length > 0) {
                    handleNewVideos(delayedVideos);
                    syncVolumeWithRetry();
                }
            }, 15000); // Esperar 15 segundos
            
            // También intentar cuando el usuario haga scroll o interactúe
            let scrollAttempts = 0;
            const maxScrollAttempts = 5;
            
            const handleScroll = () => {
                if (scrollAttempts < maxScrollAttempts) {
                    scrollAttempts++;
                    setTimeout(() => {
                        const delayedVideos = findVideos();
                        if (delayedVideos.length > 0) {
                            handleNewVideos(delayedVideos);
                            syncVolumeWithRetry();
                        }
                    }, 500);
                }
            };
            
            document.addEventListener('scroll', handleScroll, { passive: true });
            
            // Método alternativo: usar requestIdleCallback para detección en momentos de inactividad
            if (window.requestIdleCallback) {
                const idleDetection = () => {
                    const delayedVideos = findVideos();
                    if (delayedVideos.length > 0) {
                        handleNewVideos(delayedVideos);
                        syncVolumeWithRetry();
                    }
                    // Programar siguiente detección
                    window.requestIdleCallback(idleDetection, { timeout: 5000 });
                };
                
                // Iniciar después de 8 segundos
                setTimeout(() => {
                    window.requestIdleCallback(idleDetection, { timeout: 5000 });
                }, 8000);
            }
            
            // Método alternativo: usar IntersectionObserver para detectar cuando videos aparecen en viewport
            if (window.IntersectionObserver) {
                setTimeout(() => {
                    try {
                        const videoObserver = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting && entry.target.tagName === 'VIDEO') {
                                    const video = entry.target;
                                    if (!processedVideos.has(video)) {
                                        handleNewVideos([video]);
                                        syncVolumeWithRetry();
                                    }
                                }
                            });
                        }, { threshold: 0.1 });
                        
                        // Observar todos los videos existentes y futuros
                        const allVideos = document.querySelectorAll('video');
                        allVideos.forEach(video => videoObserver.observe(video));
                        
                        // También observar el body para videos futuros
                        const bodyObserver = new MutationObserver((mutations) => {
                            mutations.forEach(mutation => {
                                mutation.addedNodes.forEach(node => {
                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                        if (node.tagName === 'VIDEO') {
                                            videoObserver.observe(node);
                                        } else {
                                            const videosInNode = node.querySelectorAll('video');
                                            videosInNode.forEach(video => videoObserver.observe(video));
                                        }
                                    }
                                });
                            });
                        });
                        
                        bodyObserver.observe(document.body, { childList: true, subtree: true });
                    } catch (e) {
                        // Si falla, continuar con métodos normales
                    }
                }, 5000);
            }
        }
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // Para X.com, usar un enfoque completamente stealthy
        const platform = getPlatform();
        if (platform === 'twitter') {
            // Intentar inicialización temprana antes de que X.com pueda bloquear
            try {
                // Configurar solo lo esencial inmediatamente
                chrome.runtime.onMessage.addListener(handleMessage);
                
                // Configurar teclas básicas inmediatamente
                document.addEventListener('keydown', (event) => {
                    try {
                        const videos = document.querySelectorAll('video');
                        if (videos.length === 0) return;
                        
                        const targetVideo = videos[0];
                        
                        if (event.key === '+' || event.key === '=') {
                            if (isSpeedActive) {
                                currentSpeed = Math.min(currentSpeed + 0.25, 16);
                                targetVideo.playbackRate = currentSpeed;
                                showSpeedIndicator(currentSpeed);
                            } else if (isSlowActive) {
                                currentSlowSpeed = Math.min(currentSlowSpeed + 0.25, 16);
                                targetVideo.playbackRate = currentSlowSpeed;
                                showSpeedIndicator(currentSlowSpeed);
                            }
                        } else if (event.key === '-' || event.key === '_') {
                            if (isSpeedActive) {
                                currentSpeed = Math.max(currentSpeed - 0.25, 0.1);
                                targetVideo.playbackRate = currentSpeed;
                                showSpeedIndicator(currentSpeed);
                            } else if (isSlowActive) {
                                currentSlowSpeed = Math.max(currentSlowSpeed - 0.25, 0.1);
                                targetVideo.playbackRate = currentSlowSpeed;
                                showSpeedIndicator(currentSlowSpeed);
                            }
                        }
                    } catch(e) {}
                });
                
                // También intentar inicialización completa después de un delay
                setTimeout(() => {
                    try {
                        initialize();
                    } catch(e) {
                        // Si falla, usar métodos minimales
                        tryMinimalInitialization();
                    }
                }, 2000);
                
            } catch(e) {
                // Si falla la inicialización temprana, usar métodos minimales
                setTimeout(() => {
                    tryMinimalInitialization();
                }, 3000);
            }
        } else {
            initialize();
        }
    }

    // Función para inicialización alternativa cuando X.com está bloqueando
    function tryAlternativeInitialization() {
        // console.log('🐦 Trying alternative initialization for X.com');
        
        // Método 1: Usar un enfoque completamente diferente - detectar videos por eventos de usuario
        let userInteractionCount = 0;
        const maxInteractions = 20;
        
        const handleUserInteraction = () => {
            userInteractionCount++;
            if (userInteractionCount <= maxInteractions) {
                // Buscar videos después de cada interacción del usuario
                setTimeout(() => {
                    const videos = findVideos();
                    if (videos.length > 0) {
                        handleNewVideos(videos);
                        syncVolumeWithRetry();
                    }
                }, 100);
            }
        };
        
        // Escuchar múltiples tipos de interacción
        document.addEventListener('click', handleUserInteraction, { passive: true });
        document.addEventListener('scroll', handleUserInteraction, { passive: true });
        document.addEventListener('keydown', handleUserInteraction, { passive: true });
        document.addEventListener('mousemove', handleUserInteraction, { passive: true });
        document.addEventListener('touchstart', handleUserInteraction, { passive: true });
        
        // Método 2: Usar un timer que se ejecuta cada segundo
        const intervalDetection = setInterval(() => {
            const videos = findVideos();
            if (videos.length > 0) {
                handleNewVideos(videos);
                syncVolumeWithRetry();
                // Si encontramos videos, reducir la frecuencia
                clearInterval(intervalDetection);
                setInterval(() => {
                    const videos = findVideos();
                    if (videos.length > 0) {
                        handleNewVideos(videos);
                    }
                }, 5000);
            }
        }, 1000);
        
        // Método 3: Usar requestAnimationFrame para detección en cada frame
        let frameCount = 0;
        const maxFrames = 300; // Máximo 5 segundos a 60fps
        
        const frameDetection = () => {
            frameCount++;
            if (frameCount <= maxFrames) {
                const videos = findVideos();
                if (videos.length > 0) {
                    handleNewVideos(videos);
                    syncVolumeWithRetry();
                    return; // Detener si encontramos videos
                }
                requestAnimationFrame(frameDetection);
            }
        };
        
        // Iniciar detección por frame después de 2 segundos
        setTimeout(() => {
            requestAnimationFrame(frameDetection);
        }, 2000);
        
        // Método 4: Usar un Web Worker si está disponible (más stealthy)
        if (window.Worker) {
            try {
                const workerCode = `
                    let frameCount = 0;
                    const maxFrames = 600; // 10 segundos
                    
                    function detectVideos() {
                        frameCount++;
                        if (frameCount <= maxFrames) {
                            // Simular detección de videos
                            setTimeout(detectVideos, 100);
                        }
                    }
                    
                    detectVideos();
                `;
                
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const worker = new Worker(URL.createObjectURL(blob));
                
                // El worker se ejecuta en background y no puede ser detectado fácilmente
                setTimeout(() => {
                    worker.terminate();
                }, 10000);
            } catch (e) {
                // Si falla, continuar con métodos normales
            }
        }
    }

    // Función para inicialización completamente stealthy para X.com
    function tryNuclearStealthInitialization() {
        // console.log('🐦 Nuclear stealth mode activated for X.com');
        
        // Método 1: Crear un iframe invisible que ejecute la detección
        try {
            const stealthFrame = document.createElement('iframe');
            stealthFrame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;pointer-events:none;';
            stealthFrame.src = 'about:blank';
            document.body.appendChild(stealthFrame);
            
            // El iframe ejecuta la detección en su propio contexto
            stealthFrame.onload = () => {
                try {
                    const frameDoc = stealthFrame.contentDocument || stealthFrame.contentWindow.document;
                    frameDoc.open();
                    frameDoc.write(`
                        <script>
                            // Código de detección en el iframe
                            setInterval(() => {
                                try {
                                    const parentVideos = window.parent.document.querySelectorAll('video');
                                    if (parentVideos.length > 0) {
                                        // Enviar mensaje al padre
                                        window.parent.postMessage({type: 'videosFound', count: parentVideos.length}, '*');
                                    }
                                } catch(e) {}
                            }, 2000);
                        </script>
                    `);
                    frameDoc.close();
                } catch(e) {}
            };
        } catch(e) {}
        
        // Método 2: Usar Shadow DOM para ocultar la detección
        try {
            const stealthContainer = document.createElement('div');
            stealthContainer.attachShadow({ mode: 'closed' });
            const shadowRoot = stealthContainer.shadowRoot;
            
            const stealthScript = document.createElement('script');
            stealthScript.textContent = `
                // Código de detección en Shadow DOM
                setInterval(() => {
                    try {
                        const videos = document.querySelectorAll('video');
                        if (videos.length > 0) {
                            // Enviar evento personalizado
                            window.dispatchEvent(new CustomEvent('stealthVideosFound', {
                                detail: { count: videos.length }
                            }));
                        }
                    } catch(e) {}
                }, 1500);
            `;
            
            shadowRoot.appendChild(stealthScript);
            document.body.appendChild(stealthContainer);
        } catch(e) {}
        
        // Método 3: Usar un elemento de audio invisible para detección
        try {
            const stealthAudio = document.createElement('audio');
            stealthAudio.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
            stealthAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
            stealthAudio.preload = 'auto';
            
            // Usar el audio como trigger para detección
            stealthAudio.addEventListener('canplay', () => {
                setInterval(() => {
                    try {
                        const videos = document.querySelectorAll('video');
                        if (videos.length > 0) {
                            // Procesar videos encontrados
                            handleNewVideos(Array.from(videos));
                        }
                    } catch(e) {}
                }, 1000);
            });
            
            document.body.appendChild(stealthAudio);
        } catch(e) {}
        
        // Método 4: Usar un elemento de video invisible como trigger
        try {
            const triggerVideo = document.createElement('video');
            triggerVideo.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
            triggerVideo.muted = true;
            triggerVideo.autoplay = true;
            triggerVideo.loop = true;
            triggerVideo.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAG51bWAAAAA';
            
            triggerVideo.addEventListener('playing', () => {
                // Iniciar detección cuando el video trigger esté reproduciéndose
                let detectionCount = 0;
                const maxDetections = 50;
                
                const stealthDetection = () => {
                    if (detectionCount < maxDetections) {
                        detectionCount++;
                        try {
                            const videos = document.querySelectorAll('video');
                            if (videos.length > 0) {
                                // Filtrar solo el video trigger
                                const realVideos = Array.from(videos).filter(v => v !== triggerVideo);
                                if (realVideos.length > 0) {
                                    handleNewVideos(realVideos);
                                    syncVolumeWithRetry();
                                }
                            }
                        } catch(e) {}
                        
                        setTimeout(stealthDetection, 200);
                    }
                };
                
                stealthDetection();
            });
            
            document.body.appendChild(triggerVideo);
        } catch(e) {}
        
        // Método 5: Usar un elemento de canvas invisible
        try {
            const stealthCanvas = document.createElement('canvas');
            stealthCanvas.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
            stealthCanvas.width = 1;
            stealthCanvas.height = 1;
            
            // Usar requestAnimationFrame en el canvas para detección
            let frameCount = 0;
            const maxFrames = 1000; // 16+ segundos
            
            const canvasDetection = () => {
                frameCount++;
                if (frameCount <= maxFrames) {
                    try {
                        const videos = document.querySelectorAll('video');
                        if (videos.length > 0) {
                            handleNewVideos(Array.from(videos));
                            syncVolumeWithRetry();
                            return; // Detener si encontramos videos
                        }
                    } catch(e) {}
                    
                    // Continuar con el siguiente frame
                    stealthCanvas.requestAnimationFrame(canvasDetection);
                }
            };
            
            // Iniciar después de 3 segundos
            setTimeout(() => {
                stealthCanvas.requestAnimationFrame(canvasDetection);
            }, 3000);
            
            document.body.appendChild(stealthCanvas);
        } catch(e) {}
        
        // Método 6: Usar un elemento de input invisible
        try {
            const stealthInput = document.createElement('input');
            stealthInput.type = 'hidden';
            stealthInput.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
            
            // Usar el input como trigger para detección
            stealthInput.addEventListener('focus', () => {
                // Iniciar detección cuando el input reciba focus
                let inputDetectionCount = 0;
                const maxInputDetections = 30;
                
                const inputDetection = () => {
                    if (inputDetectionCount < maxInputDetections) {
                        inputDetectionCount++;
                        try {
                            const videos = document.querySelectorAll('video');
                            if (videos.length > 0) {
                                handleNewVideos(Array.from(videos));
                                syncVolumeWithRetry();
                            }
                        } catch(e) {}
                        
                        setTimeout(inputDetection, 300);
                    }
                };
                
                inputDetection();
            });
            
            // Simular focus después de 4 segundos
            setTimeout(() => {
                stealthInput.focus();
            }, 4000);
            
            document.body.appendChild(stealthInput);
        } catch(e) {}
        
        // Escuchar eventos de los métodos stealth
        // Evento del iframe
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'videosFound') {
                try {
                    const videos = document.querySelectorAll('video');
                    if (videos.length > 0) {
                        handleNewVideos(Array.from(videos));
                        syncVolumeWithRetry();
                    }
                } catch(e) {}
            }
        });
        
        // Evento del Shadow DOM
        window.addEventListener('stealthVideosFound', (event) => {
            try {
                const videos = document.querySelectorAll('video');
                if (videos.length > 0) {
                    handleNewVideos(Array.from(videos));
                    syncVolumeWithRetry();
                }
            } catch(e) {}
        });
    }

    // Función para inicialización completamente minimal para X.com
    function tryMinimalInitialization() {
        // Solo lo más básico - sin logs, sin elementos extraños
        try {
            // Configurar solo el listener de mensajes básico
            chrome.runtime.onMessage.addListener(handleMessage);
            
            // Configurar solo el manejo de eventos del mouse básico
            document.addEventListener('mousedown', (event) => {
                try {
                    const target = event.target;
                    if (target.tagName === 'VIDEO') {
                        const video = target;
                        if (!processedVideos.has(video)) {
                            processedVideos.add(video);
                            setupVideoEventListeners(video);
                        }
                        
                        if (event.button === 0) { // Click izquierdo
                            if (isSpeedActive) {
                                video.playbackRate = currentSpeed;
                            } else if (isSlowActive) {
                                video.playbackRate = currentSlowSpeed;
                            }
                        }
                    }
                } catch(e) {}
            });
            
            // Configurar solo el control de volumen con rueda del mouse
            document.addEventListener('wheel', (event) => {
                try {
                    const target = event.target;
                    if (target.tagName === 'VIDEO') {
                        const video = target;
                        if (!processedVideos.has(video)) {
                            processedVideos.add(video);
                            setupVideoEventListeners(video);
                        }
                        
                        if (!isVolumeControlActive) {
                            currentVolume = video.volume || 1.0;
                            volumeControlStartVolume = currentVolume;
                            isVolumeControlActive = true;
                        }
                        
                        if (event.deltaY > 0) {
                            decreaseVolume();
                        } else {
                            increaseVolume();
                        }
                        
                        setVideoVolume(video, currentVolume);
                        event.preventDefault();
                    }
                } catch(e) {}
            });
            
            // Configurar solo el manejo de teclas básico
            document.addEventListener('keydown', (event) => {
                try {
                    const videos = document.querySelectorAll('video');
                    if (videos.length === 0) return;
                    
                    const targetVideo = videos[0];
                    
                    if (event.key === '+' || event.key === '=') {
                        if (isSpeedActive) {
                            currentSpeed = Math.min(currentSpeed + 0.25, 16);
                            targetVideo.playbackRate = currentSpeed;
                            showSpeedIndicator(currentSpeed);
                        } else if (isSlowActive) {
                            currentSlowSpeed = Math.min(currentSlowSpeed + 0.25, 16);
                            targetVideo.playbackRate = currentSlowSpeed;
                            showSpeedIndicator(currentSlowSpeed);
                        }
                    } else if (event.key === '-' || event.key === '_') {
                        if (isSpeedActive) {
                            currentSpeed = Math.max(currentSpeed - 0.25, 0.1);
                            targetVideo.playbackRate = currentSpeed;
                            showSpeedIndicator(currentSpeed);
                        } else if (isSlowActive) {
                            currentSlowSpeed = Math.max(currentSlowSpeed - 0.25, 0.1);
                            targetVideo.playbackRate = currentSlowSpeed;
                            showSpeedIndicator(currentSlowSpeed);
                        }
                    } else if (event.key === ' ' && (isSpeedActive || isSlowActive)) {
                        if (targetVideo.paused) {
                            targetVideo.play();
                        } else {
                            targetVideo.pause();
                        }
                    }
                } catch(e) {}
            });
            
            // Buscar videos existentes de forma simple
            setTimeout(() => {
                try {
                    const videos = document.querySelectorAll('video');
                    videos.forEach(video => {
                        if (!processedVideos.has(video)) {
                            processedVideos.add(video);
                            setupVideoEventListeners(video);
                        }
                    });
                } catch(e) {}
            }, 2000);
            
        } catch(e) {}
    }

    // Función para bypass completo de X.com usando técnicas imposibles de detectar
    function tryXComBypass() {
        // console.log('🐦 Attempting X.com bypass...');
        
        // Método 1: Usar un elemento de imagen invisible como trigger
        try {
            const stealthImg = document.createElement('img');
            stealthImg.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
            stealthImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            
            // Usar el evento load de la imagen para activar la extensión
            stealthImg.addEventListener('load', () => {
                // console.log('🐦 Stealth image loaded, activating extension...');
                activateExtensionForXCom();
            });
            
            document.body.appendChild(stealthImg);
        } catch(e) {}
        
        // Método 2: Usar un elemento de link invisible
        try {
            const stealthLink = document.createElement('link');
            stealthLink.rel = 'stylesheet';
            stealthLink.href = 'data:text/css,';
            stealthLink.addEventListener('load', () => {
                // console.log('🐦 Stealth link loaded, activating extension...');
                activateExtensionForXCom();
            });
            document.head.appendChild(stealthLink);
        } catch(e) {}
        
        // Método 3: Usar un elemento de meta invisible
        try {
            const stealthMeta = document.createElement('meta');
            stealthMeta.name = 'stealth';
            stealthMeta.content = 'extension';
            stealthMeta.addEventListener('DOMNodeInserted', () => {
                // console.log('🐦 Stealth meta inserted, activating extension...');
                activateExtensionForXCom();
            });
            document.head.appendChild(stealthMeta);
        } catch(e) {}
    }
    
    // Función para activar la extensión específicamente para X.com
    function activateExtensionForXCom() {
        // console.log('🐦 Activating extension for X.com...');
        
        try {
            // Configurar solo lo esencial
            chrome.runtime.onMessage.addListener(handleMessage);
            
            // Configurar teclas básicas
            document.addEventListener('keydown', (event) => {
                try {
                    // Buscar videos en el momento de la tecla
                    const videos = document.querySelectorAll('video');
                    if (videos.length === 0) return;
                    
                    const targetVideo = videos[0];
                    
                    if (event.key === '+' || event.key === '=') {
                        // Activar modo velocidad si no está activo
                        if (!isSpeedActive && !isSlowActive) {
                            isSpeedActive = true;
                            currentSpeed = 1.5;
                        }
                        
                        if (isSpeedActive) {
                            currentSpeed = Math.min(currentSpeed + 0.25, 16);
                            targetVideo.playbackRate = currentSpeed;
                            showSpeedIndicator(currentSpeed);
                        } else if (isSlowActive) {
                            currentSlowSpeed = Math.min(currentSlowSpeed + 0.25, 16);
                            targetVideo.playbackRate = currentSlowSpeed;
                            showSpeedIndicator(currentSlowSpeed);
                        }
                    } else if (event.key === '-' || event.key === '_') {
                        // Activar modo velocidad si no está activo
                        if (!isSpeedActive && !isSlowActive) {
                            isSpeedActive = true;
                            currentSpeed = 0.75;
                        }
                        
                        if (isSpeedActive) {
                            currentSpeed = Math.max(currentSpeed - 0.25, 0.1);
                            targetVideo.playbackRate = currentSpeed;
                            showSpeedIndicator(currentSpeed);
                        } else if (isSlowActive) {
                            currentSlowSpeed = Math.max(currentSlowSpeed - 0.25, 0.1);
                            targetVideo.playbackRate = currentSlowSpeed;
                            showSpeedIndicator(currentSlowSpeed);
                        }
                    } else if (event.key === 's' || event.key === 'S') {
                        // Toggle entre velocidad normal y lenta
                        if (isSpeedActive) {
                            isSpeedActive = false;
                            isSlowActive = true;
                            currentSlowSpeed = 0.5;
                            targetVideo.playbackRate = currentSlowSpeed;
                            showSpeedIndicator(currentSlowSpeed);
                        } else if (isSlowActive) {
                            isSlowActive = false;
                            targetVideo.playbackRate = 1.0;
                            hideSpeedIndicator();
                        } else {
                            isSpeedActive = true;
                            currentSpeed = 1.5;
                            targetVideo.playbackRate = currentSpeed;
                            showSpeedIndicator(currentSpeed);
                        }
                    } else if (event.key === 'r' || event.key === 'R') {
                        // Reset a velocidad normal
                        isSpeedActive = false;
                        isSlowActive = false;
                        targetVideo.playbackRate = 1.0;
                        hideSpeedIndicator();
                    }
                } catch(e) {}
            });
            
            // Configurar control de volumen con rueda del mouse
            document.addEventListener('wheel', (event) => {
                try {
                    const target = event.target;
                    if (target.tagName === 'VIDEO') {
                        const video = target;
                        
                        if (!isVolumeControlActive) {
                            currentVolume = video.volume || 1.0;
                            volumeControlStartVolume = currentVolume;
                            isVolumeControlActive = true;
                        }
                        
                        if (event.deltaY > 0) {
                            decreaseVolume();
                        } else {
                            increaseVolume();
                        }
                        
                        setVideoVolume(video, currentVolume);
                        event.preventDefault();
                    }
                } catch(e) {}
            });
            
            // Configurar clicks en videos
            document.addEventListener('mousedown', (event) => {
                try {
                    const target = event.target;
                    if (target.tagName === 'VIDEO') {
                        const video = target;
                        
                        if (event.button === 0) { // Click izquierdo
                            if (isSpeedActive) {
                                video.playbackRate = currentSpeed;
                            } else if (isSlowActive) {
                                video.playbackRate = currentSlowSpeed;
                            }
                        }
                    }
                } catch(e) {}
            });
            
            // Buscar videos existentes
            setTimeout(() => {
                try {
                    const videos = document.querySelectorAll('video');
                    videos.forEach(video => {
                        if (!processedVideos.has(video)) {
                            processedVideos.add(video);
                            setupVideoEventListeners(video);
                        }
                    });
                } catch(e) {}
            }, 1000);
            
            // console.log('🐦 Extension activated for X.com!');
            
        } catch(e) {
            // console.log('🐦 Failed to activate extension:', e);
        }
    }
})(); 