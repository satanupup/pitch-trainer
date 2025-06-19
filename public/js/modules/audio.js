import { state } from './state.js';
import { ErrorHandler } from './errorHandler.js';
import { elements } from './ui.js';

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
        clearPreviousPlayer();
        
        // 創建新的播放器
        state.player = {
            loaded: false,
            songData: songData
        };
        
        // 加載 MP3 文件
        await loadAudioFile(songData);
        
        // 加載 MIDI 文件
        if (songData.midi) {
            await loadMidiFile(songData.midi);
        } else {
            state.currentMidi = null;
        }
        
        // 加載歌詞文件
        if (songData.lrc) {
            await loadLyricsFile(songData.lrc);
        } else {
            state.currentLyrics = [];
        }
        
        // 設置 Tone.js Transport
        setupTransport();
        
        return true;
    } catch (err) {
        console.error(`[-] 加載歌曲時發生錯誤: ${err}`);
        ErrorHandler.showError(`加載歌曲失敗: ${err.message}`);
        return false;
    }
}

// 清除之前的播放器狀態
function clearPreviousPlayer() {
    if (state.player) {
        state.player.loaded = false;
        if (state.player.tonePlayer) {
            state.player.tonePlayer.dispose();
        }
    }
}

// 加載音頻文件
async function loadAudioFile(songData) {
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
}

// 加載 MIDI 文件
async function loadMidiFile(midiUrl) {
    try {
        const midiResponse = await fetch(midiUrl);
        if (!midiResponse.ok) {
            throw new Error(`HTTP error! status: ${midiResponse.status}`);
        }
        const midiArrayBuffer = await midiResponse.arrayBuffer();
        if (midiArrayBuffer.byteLength === 0) {
            throw new Error('MIDI file is empty');
        }
        const midi = new Midi(midiArrayBuffer);
        state.currentMidi = midi;
        console.log(`[✓] MIDI 加載完成: ${midiUrl}`);
    } catch (midiErr) {
        console.error(`[-] MIDI 加載失敗: ${midiErr}`);
        // MIDI 加載失敗不應該阻止整個歌曲的加載
        state.currentMidi = null;
    }
}

// 加載歌詞文件
async function loadLyricsFile(lrcUrl) {
    try {
        const lrcResponse = await fetch(lrcUrl);
        if (!lrcResponse.ok) {
            throw new Error(`HTTP error! status: ${lrcResponse.status}`);
        }
        const lrcText = await lrcResponse.text();
        state.currentLyrics = parseLRC(lrcText);
        console.log(`[✓] 歌詞加載完成: ${lrcUrl}`);
    } catch (lrcErr) {
        console.error(`[-] 歌詞加載失敗: ${lrcErr}`);
        // 歌詞加載失敗不應該阻止整個歌曲的加載
        state.currentLyrics = [];
    }
}

// 設置 Tone.js Transport
function setupTransport() {
    Tone.Transport.cancel(); // 清除之前的所有事件
    Tone.Transport.stop();   // 確保 Transport 是停止的
    
    // 設置 Transport 的回調，用於更新 UI
    Tone.Transport.scheduleRepeat((time) => {
        // 這裡可以添加需要定期執行的代碼，比如更新進度條
        if (state.currentLyrics && state.currentLyrics.length > 0) {
            updateLyrics(Tone.Transport.seconds);
        }
    }, 0.1);
}

async function startPitchDetection() {
    if (!state.isAudioInitialized) {
        ErrorHandler.showError('請先選擇一首歌曲來啟用音訊功能。');
        return;
    }
    if (state.microphoneStream) return;
    try {
        console.log('[+] 正在請求麥克風權限...');
        ErrorHandler.showError('正在請求麥克風權限...');
        
        state.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        console.log('[✓] 麥克風權限已獲取');
        ErrorHandler.showError('麥克風權限已獲取');
        
        const source = state.audioContext.createMediaStreamSource(state.microphoneStream);
        state.analyser = state.audioContext.createAnalyser();
        state.analyser.fftSize = 2048;
        source.connect(state.analyser);
        console.log('[✓] 麥克風已連接到分析器');
        ErrorHandler.showError('麥克風已連接到分析器');
        
        // 測試麥克風是否接收到聲音
        const dataArray = new Float32Array(state.analyser.frequencyBinCount);
        state.analyser.getFloatTimeDomainData(dataArray);
        const rms = Math.sqrt(dataArray.reduce((acc, val) => acc + val * val, 0) / dataArray.length);
        console.log(`[i] 麥克風音量檢測: ${rms}`);
        ErrorHandler.showError(`麥克風音量檢測: ${rms}`);
        
        if (rms < 0.01) {
            ErrorHandler.showError('警告: 麥克風音量過低，請確認麥克風是否正常工作');
        }
    } catch (err) {
        console.error('麥克風權限獲取失敗:', err);
        ErrorHandler.showError('無法取得麥克風權限，請確認瀏覽器設定。錯誤: ' + err.message);
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
