import { state } from './state.js';
import { ErrorHandler } from './errorHandler.js';

async function initializeAudioAndLoadSong(songData) {
    if (!state.isAudioInitialized) {
        try {
            // 確保這個函數是在用戶交互（如點擊按鈕）後調用的
            await Tone.start();
            console.log('[✓] Tone.js 音頻上下文已啟動');
            state.audioContext = Tone.getContext().rawContext;
            state.pitchShift = new Tone.PitchShift().toDestination();
            state.isAudioInitialized = true;
        } catch (err) {
            console.error('音訊初始化失敗:', err);
            ErrorHandler.showError('音訊功能初始化失敗，請點擊頁面再試。');
            throw new Error('音訊初始化失敗: ' + err.message);
        }
    }
    await loadSong(songData);
}

async function loadSong(songData) {
    try {
        // 清除之前的播放器狀態
        if (state.player) {
            state.player.loaded = false;
        }
        
        // 創建新的播放器
        state.player = {
            loaded: false,
            songData: songData
        };
        
        // 加載 MP3 文件
        console.log(`[+] 正在加載歌曲: ${songData.name}`);
        const mp3Url = songData.mp3;
        
        // 使用 Tone.js 的 Player 加載音頻
        const player = new Tone.Player({
            url: mp3Url,
            autostart: false,
            onload: () => {
                console.log(`[✓] 歌曲加載完成: ${songData.name}`);
                state.player.loaded = true;
            },
            onerror: (err) => {
                console.error(`[-] 歌曲加載失敗: ${err}`);
                ErrorHandler.showError(`無法加載歌曲: ${err}`);
            }
        }).connect(state.pitchShift);
        
        // 將播放器保存到狀態中
        state.player.tonePlayer = player;
        
        // 如果有 MIDI 文件，也加載它
        if (songData.midi) {
            try {
                const midiResponse = await fetch(songData.midi);
                const midiArrayBuffer = await midiResponse.arrayBuffer();
                const midi = new Midi(midiArrayBuffer);
                state.currentMidi = midi;
                console.log(`[✓] MIDI 加載完成: ${songData.midi}`);
            } catch (midiErr) {
                console.error(`[-] MIDI 加載失敗: ${midiErr}`);
                // MIDI 加載失敗不應該阻止整個歌曲的加載
            }
        }
        
        // 如果有歌詞文件，也加載它
        if (songData.lrc) {
            try {
                const lrcResponse = await fetch(songData.lrc);
                const lrcText = await lrcResponse.text();
                state.currentLyrics = parseLRC(lrcText);
                console.log(`[✓] 歌詞加載完成: ${songData.lrc}`);
            } catch (lrcErr) {
                console.error(`[-] 歌詞加載失敗: ${lrcErr}`);
                // 歌詞加載失敗不應該阻止整個歌曲的加載
            }
        }
        
        // 設置 Tone.js Transport
        Tone.Transport.cancel(); // 清除之前的所有事件
        Tone.Transport.stop();   // 確保 Transport 是停止的
        
        // 設置 Transport 的回調，用於更新 UI
        Tone.Transport.scheduleRepeat((time) => {
            // 這裡可以添加需要定期執行的代碼，比如更新進度條
            if (state.currentLyrics && state.currentLyrics.length > 0) {
                updateLyrics(Tone.Transport.seconds);
            }
        }, 0.1);
        
        return true;
    } catch (err) {
        console.error(`[-] 加載歌曲時發生錯誤: ${err}`);
        ErrorHandler.showError(`加載歌曲失敗: ${err.message}`);
        return false;
    }
}

async function startPitchDetection() {
    if (!state.isAudioInitialized) {
        ErrorHandler.showError('請先選擇一首歌曲來啟用音訊功能。');
        return;
    }
    if (state.microphoneStream) return;
    try {
        state.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = state.audioContext.createMediaStreamSource(state.microphoneStream);
        state.analyser = state.audioContext.createAnalyser();
        state.analyser.fftSize = 2048;
        source.connect(state.analyser);
    } catch (err) {
        console.error('麥克風權限獲取失敗:', err);
        ErrorHandler.showError('無法取得麥克風權限，請確認瀏覽器設定。');
        throw new Error('麥克風權限獲取失敗: ' + err.message);
    }
}

function stopPitchDetection() {
    if (state.microphoneStream) {
        state.microphoneStream.getTracks().forEach(track => track.stop());
        state.microphoneStream = null;
    }
    state.analyser = null;
}

async function startRecording() {
    // ... 依據優化後的錄音流程搬移 ...
}

function stopRecording() {
    // ... 依據優化後的錄音流程搬移 ...
}

export {
    initializeAudioAndLoadSong,
    loadSong,
    startPitchDetection,
    stopPitchDetection,
    startRecording,
    stopRecording
};  // 輔助函數：解析 LRC 歌詞文件
function parseLRC(lrcText) {
    if (!lrcText) return [];
    
    const lines = lrcText.split('\n');
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/;
    const lyrics = [];
    
    lines.forEach(line => {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const centiseconds = parseInt(match[3]);
            const time = minutes * 60 + seconds + centiseconds / 100;
            const text = line.replace(timeRegex, '').trim();
            
            if (text) {
                lyrics.push({ time, text });
            }
        }
    });
    
    return lyrics.sort((a, b) => a.time - b.time);
}

// 輔助函數：根據當前時間更新歌詞顯示
function updateLyrics(currentTime) {
    if (!state.currentLyrics || state.currentLyrics.length === 0) return;
    
    // 找到當前時間對應的歌詞
    let currentLyric = null;
    for (const lyric of state.currentLyrics) {
        if (lyric.time <= currentTime) {
            currentLyric = lyric;
        } else {
            break;
        }
    }
    
    // 更新 UI
    if (currentLyric && elements.lyricsLine) {
        elements.lyricsLine.textContent = currentLyric.text;
    }
}
