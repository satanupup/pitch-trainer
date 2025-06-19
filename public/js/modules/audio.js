import { state } from './state.js';
import { ErrorHandler } from './errorHandler.js';

async function initializeAudioAndLoadSong(songData) {
    if (!state.isAudioInitialized) {
        try {
            await Tone.start();
            state.audioContext = Tone.getContext().rawContext;
            state.pitchShift = new Tone.PitchShift().toDestination();
            state.isAudioInitialized = true;
        } catch (err) {
            ErrorHandler.showError('音訊功能初始化失敗，請點擊頁面再試。');
            return;
        }
    }
    await loadSong(songData);
}

async function loadSong(songData) {
    // ... 這裡可根據原本 script.js 的 loadSong 實作 ...
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
        ErrorHandler.showError('無法取得麥克風權限，請確認瀏覽器設定。');
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
}; 