// =================================================================
// 音準練習器 - 版本 5.0 (優化版本)
// =================================================================
console.log("腳本檔案 script.js 已成功載入！");

// --- 音準評分系統 ---
class PitchScoring {
    constructor() {
        this.score = 0;
        this.totalNotes = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.accuracyHistory = [];
    }
    
    evaluatePitch(userPitch, targetPitch) {
        if (!targetPitch) return null;
        
        const deviation = Math.abs(userPitch - targetPitch);
        const accuracy = Math.max(0, 100 - (deviation * 10));
        
        this.score += accuracy;
        this.totalNotes++;
        this.accuracyHistory.push(accuracy);
        
        // 保持歷史記錄在合理範圍內
        if (this.accuracyHistory.length > 100) {
            this.accuracyHistory.shift();
        }
        
        // 更新連續正確記錄
        if (accuracy >= 80) {
            this.currentStreak++;
            this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
        } else {
            this.currentStreak = 0;
        }
        
        return accuracy;
    }
    
    getAverageScore() {
        return this.totalNotes > 0 ? Math.round(this.score / this.totalNotes) : 0;
    }
    
    getRecentAccuracy() {
        if (this.accuracyHistory.length === 0) return 0;
        const recent = this.accuracyHistory.slice(-10);
        return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
    }
    
    reset() {
        this.score = 0;
        this.totalNotes = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.accuracyHistory = [];
    }
}

// --- 載入狀態管理 ---
class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
    }
    
    startLoading(id, message = '載入中...') {
        this.loadingStates.set(id, { message, startTime: Date.now() });
        this.updateUI(id);
    }
    
    stopLoading(id) {
        this.loadingStates.delete(id);
        this.updateUI(id);
    }
    
    updateUI(id) {
        const loadingState = this.loadingStates.get(id);
        const element = document.getElementById('loading-indicator');
        const textElement = document.getElementById('loading-text');
        
        if (element && textElement) {
            if (loadingState) {
                textElement.textContent = loadingState.message;
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    }
}

// --- 音訊緩衝管理 ---
class AudioBuffer {
    constructor(maxSize = 1000) {
        this.buffer = [];
        this.maxSize = maxSize;
    }
    
    add(data) {
        this.buffer.push(data);
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }
    
    getAverage() {
        if (this.buffer.length === 0) return 0;
        return this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length;
    }
    
    clear() {
        this.buffer = [];
    }
}

// --- 錯誤處理工具 ---
class ErrorHandler {
    static async retry(fn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                console.warn(`重試 ${i + 1}/${maxRetries}: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
    
    static showError(message, duration = 5000) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transform = 'translateX(100%)';
            setTimeout(() => document.body.removeChild(errorDiv), 300);
        }, duration);
    }
    
    static showSuccess(message, duration = 3000) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #44ff44;
            color: black;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.opacity = '0';
            successDiv.style.transform = 'translateX(100%)';
            setTimeout(() => document.body.removeChild(successDiv), 300);
        }, duration);
    }
}

// --- 歌曲清單 (將由後端動態載入) ---
let songList = [];

// --- 全域變數 ---
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4 = 440;
const C0 = A4 * Math.pow(2, -4.75);
let audioContext, analyser, microphoneStream, animationFrameId;
let keyOffset = 0, midiData = null, lrcData = [], player = null, pitchShift = null;
let isAudioInitialized = false, pollingInterval = null;
let userMinNote = null, userMaxNote = null;
let songMinNote = null, songMaxNote = null;

// 初始化評分系統和載入管理器
const pitchScoring = new PitchScoring();
const loadingManager = new LoadingManager();
const audioBuffer = new AudioBuffer();

// --- DOM 元素 ---
const generatorSection = document.getElementById('generator');
const uploadForm = document.getElementById('upload-form');
const uploadBtn = document.getElementById('upload-btn');
const songFile = document.getElementById('song-file');
const progressArea = document.getElementById('progress-area');
const progressBar = document.getElementById('progress-bar');
const uploadStatus = document.getElementById('upload-status');
const mainApp = document.getElementById('main-app');
const playerArea = document.getElementById('player-area');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const playSongBtn = document.getElementById('play-song-btn');
const songSelect = document.getElementById('song-select');
const keySlider = document.getElementById('key-slider');
const keyValueDisplay = document.getElementById('key-value');
const userPitchMarker = document.getElementById('user-pitch-marker');
const lyricsLine = document.getElementById('lyrics-line');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    // 頁面一載入就執行
    uploadForm.addEventListener('submit', handleUpload);
    fetchSongs(); // 從後端取得已有的歌曲清單
    bindPlayerEventListeners();
    updateVisualizer(); // 啟動持續的繪圖迴圈
});

// --- 主要功能 ---

// 從後端 API 取得歌曲列表
async function fetchSongs() {
    try {
        const response = await ErrorHandler.retry(async () => {
            const res = await fetch('/songs');
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return res;
        });
        
        songList = await response.json();
        updateSongListUI();
        
        if (songList.length === 0) {
            console.log('目前沒有可用的歌曲，請上傳新歌曲');
        } else {
            console.log(`成功載入 ${songList.length} 首歌曲`);
        }
    } catch (error) {
        console.error("取得歌曲清單失敗:", error);
        ErrorHandler.showError(`無法載入歌曲清單: ${error.message}`);
    }
}

// 綁定播放器相關的事件
function bindPlayerEventListeners() {
    startBtn.addEventListener('click', startPitchDetection);
    stopBtn.addEventListener('click', stopPitchDetection);
    songSelect.addEventListener('change', (e) => {
        const selectedPath = e.target.value;
        if (selectedPath) {
            const songData = songList.find(song => song.mp3 === selectedPath);
            if(songData) {
                playerArea.classList.remove('hidden');
                initializeAudioAndLoadSong(songData);
                // 重置評分系統
                pitchScoring.reset();
                updateScoringDisplay();
            }
        } else {
            playerArea.classList.add('hidden');
            if (Tone.Transport.state === 'started') Tone.Transport.stop();
        }
    });
    keySlider.addEventListener('input', (e) => {
        keyOffset = parseInt(e.target.value);
        keyValueDisplay.textContent = keyOffset;
        if (pitchShift) pitchShift.pitch = keyOffset;
    });
    playSongBtn.addEventListener('click', () => {
        if (!player?.loaded) return alert("請先選擇歌曲並等待載入完成。");
        if (Tone.Transport.state !== 'started') {
            Tone.Transport.start();
        } else {
            Tone.Transport.stop();
        }
    });
    
    // 添加重置分數按鈕事件
    const resetScoreBtn = document.getElementById('reset-score-btn');
    if (resetScoreBtn) {
        resetScoreBtn.addEventListener('click', () => {
            pitchScoring.reset();
            updateScoringDisplay();
        });
    }
}

// 確保音訊功能已啟用，然後載入歌曲
async function initializeAudioAndLoadSong(songData) {
    if (!isAudioInitialized) {
        // 這是使用者選擇歌曲後的第一次互動，用來啟動音訊
        try {
            await Tone.start();
            audioContext = Tone.getContext().rawContext;
            pitchShift = new Tone.PitchShift().toDestination();
            isAudioInitialized = true;
        } catch (err) {
            console.error("音訊功能初始化失敗:", err);
            alert("音訊功能初始化失敗，請點擊頁面再試。");
            return;
        }
    }
    await loadSong(songData);
}

// --- 上傳與狀態查詢 ---
async function handleUpload(event) {
    event.preventDefault();
    if (!songFile.files[0]) {
        ErrorHandler.showError('請先選擇一個 MP3 檔案');
        return;
    }

    uploadBtn.disabled = true;
    progressArea.classList.remove('hidden');
    uploadStatus.textContent = '正在上傳檔案...';
    progressBar.style.width = '5%';

    const formData = new FormData();
    formData.append('songfile', songFile.files[0]);

    try {
        const response = await ErrorHandler.retry(async () => {
            const res = await fetch('/upload', { method: 'POST', body: formData });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `HTTP ${res.status}`);
            }
            return res;
        });
        
        const result = await response.json();
        startPollingStatus(result.jobId);
        ErrorHandler.showSuccess('檔案上傳成功，開始處理...');
    } catch (error) {
        uploadStatus.textContent = `錯誤: ${error.message}`;
        uploadBtn.disabled = false;
        ErrorHandler.showError(`上傳失敗: ${error.message}`);
    }
}

function startPollingStatus(jobId) {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/status/${jobId}`);
            if (!response.ok) throw new Error("查詢失敗");
            const job = await response.json();

            progressBar.style.width = `${job.progress}%`;
            uploadStatus.textContent = job.message;

            if (job.status === 'completed' || job.status === 'failed') {
                clearInterval(pollingInterval);
                pollingInterval = null;
                uploadBtn.disabled = false;
                if (job.status === 'completed') {
                    uploadStatus.textContent = `完成！已新增歌曲: ${job.song.name}`;
                    // 直接從後端重新抓取最新列表，確保資料同步
                    await fetchSongs();
                    // 自動選中新歌
                    songSelect.value = job.song.mp3; 
                    songSelect.dispatchEvent(new Event('change'));
                } else {
                     uploadStatus.textContent = `處理失敗: ${job.message}`;
                }
            }
        } catch (error) {
            clearInterval(pollingInterval);
            console.error("查詢狀態失敗:", error); // 記錄錯誤到控制台
            uploadStatus.textContent = `查詢狀態失敗，請檢查網路連線或稍後再試。錯誤: ${error.message}`;
            uploadBtn.disabled = false;
        }
    }, 2000);
}

function updateSongListUI() {
    songSelect.innerHTML = '<option value="">-- 請選擇 --</option>';
    songList.forEach(song => {
        const option = document.createElement('option');
        option.value = song.mp3; 
        option.textContent = song.name;
        songSelect.appendChild(option);
    });
}

// --- 播放器與音訊處理 ---
async function loadSong(songData) {
    loadingManager.startLoading('song', '正在載入歌曲...');
    playSongBtn.disabled = true;
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    if (player) player.dispose();
    midiData = null; lrcData = [];
    audioBuffer.clear(); // 清空音訊緩衝
    // 重置音域
    userMinNote = null; userMaxNote = null; songMinNote = null; songMaxNote = null;
    document.getElementById('user-range').textContent = '--';
    document.getElementById('song-range').textContent = '--';
    updateRangeMatch();
    try {
        const midiPromise = Midi.fromUrl(songData.midi);
        const lrcPromise = fetch(songData.lrc).then(res => {
            if (!res.ok) throw new Error(`無法載入歌詞檔案: ${res.status}`);
            return res.text();
        });
        player = new Tone.Player(songData.mp3).connect(pitchShift);
        await player.load(songData.mp3);
        const [midi, lrcText] = await Promise.all([midiPromise, lrcPromise]);
        midiData = midi;
        lrcData = parseLRC(lrcText);
        player.sync().start(0);
        playSongBtn.disabled = false;
        updateSongRange();
        console.log(`[✓] 歌曲載入完成: ${songData.name}`);
        console.log(`[✓] MIDI 音符數量: ${midiData.tracks[0]?.notes?.length || 0}`);
        console.log(`[✓] 歌詞行數: ${lrcData.length}`);
    } catch (error) {
        console.error("載入歌曲檔案失敗:", error);
        alert(`載入歌曲檔案失敗！\n錯誤: ${error.message}`);
    } finally {
        loadingManager.stopLoading('song');
    }
}

async function startPitchDetection() {
    if (!isAudioInitialized) {
        alert("錯誤：請先選擇一首歌曲來啟用音訊功能。");
        return;
    }
    if (microphoneStream) return;
    try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(microphoneStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        startBtn.disabled = true;
        stopBtn.disabled = false;
        userPitchMarker.style.display = 'block';
    } catch (err) {
        console.error("無法取得麥克風權限:", err);
        alert('無法取得麥克風權限，請確認瀏覽器設定。');
    }
}

function stopPitchDetection(){
    if(microphoneStream){
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream=null;
    }
    analyser=null;
    startBtn.disabled=false;
    stopBtn.disabled=true;
    userPitchMarker.style.display="none";
}

function parseLRC(text){
    const lines=text.split("\n");
    const result=[];
    const timeRegex=/\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    lines.forEach(line=>{
        const match=line.match(timeRegex);
        if(match){
            const time=parseInt(match[1],10)*60+parseInt(match[2],10)+parseInt(match[3],10)/1000;
            const text=line.replace(timeRegex,"").trim();
            if(text)result.push({time,text})
        }
    });
    return result
}

function mapNoteToY(noteNumber){
    const minNote=48;
    const maxNote=84;
    const normalized=1-((noteNumber-minNote)/(maxNote-minNote));
    return Math.max(0,Math.min(1,normalized))*canvas.height;
}

function updateScoringDisplay() {
    const averageScoreEl = document.getElementById('average-score');
    const recentAccuracyEl = document.getElementById('recent-accuracy');
    const currentStreakEl = document.getElementById('current-streak');
    const bestStreakEl = document.getElementById('best-streak');
    
    if (averageScoreEl) averageScoreEl.textContent = pitchScoring.getAverageScore();
    if (recentAccuracyEl) recentAccuracyEl.textContent = pitchScoring.getRecentAccuracy() + '%';
    if (currentStreakEl) currentStreakEl.textContent = pitchScoring.currentStreak;
    if (bestStreakEl) bestStreakEl.textContent = pitchScoring.bestStreak;
}

function updateVisualizer() {
    requestAnimationFrame(updateVisualizer);
    canvasCtx.fillStyle = "#20232a";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    drawPlayhead();
    drawMidiNotes();
    drawMicrophonePitch();
    updateLyrics();
}

function drawPlayhead() {
    const playheadX = canvas.width * 0.25;
    canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    canvasCtx.moveTo(playheadX, 0);
    canvasCtx.lineTo(playheadX, canvas.height);
    canvasCtx.stroke();
}

function drawMidiNotes() {
    const currentTime = Tone.Transport.state === "started" ? Tone.Transport.seconds : 0;
    const pixelsPerSecond = 100;
    if (midiData) {
        canvasCtx.fillStyle = "#61dafb";
        midiData.tracks[0].notes.forEach(note => {
            const noteStartTime = note.time;
            const noteEndTime = note.time + note.duration;
            if (noteEndTime > currentTime - 2 && noteStartTime < currentTime + 10) {
                const y = mapNoteToY(note.midi + keyOffset);
                const x = (noteStartTime - currentTime) * pixelsPerSecond + canvas.width * 0.25;
                const width = note.duration * pixelsPerSecond;
                canvasCtx.globalAlpha = noteStartTime < currentTime ? 0.5 : 1;
                canvasCtx.fillRect(x, y - 2.5, width, 5);
            }
        });
        canvasCtx.globalAlpha = 1;
    }
}

function drawMicrophonePitch() {
    if (analyser) {
        const dataArray = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatTimeDomainData(dataArray);
        const rms = Math.sqrt(dataArray.reduce((acc, val) => acc + val * val, 0) / dataArray.length);
        if (rms > 0.01) {
            const frequency = getPitch(dataArray, audioContext.sampleRate);
            if (frequency) {
                const userNoteNumber = 12 * (Math.log(frequency / C0) / Math.log(2));
                const midiNote = Math.round(userNoteNumber);
                userPitchMarker.style.top = `${mapNoteToY(userNoteNumber)}px`;
                userPitchMarker.style.display = "block";
                // 音域偵測
                if (userMinNote === null || midiNote < userMinNote) userMinNote = midiNote;
                if (userMaxNote === null || midiNote > userMaxNote) userMaxNote = midiNote;
                document.getElementById('user-range').textContent = `${midiToNote(userMinNote)} ~ ${midiToNote(userMaxNote)}`;
                updateRangeMatch();
                // 添加到音訊緩衝
                audioBuffer.add(frequency);
                // 評分系統：與當前目標音符比較
                if (midiData && Tone.Transport.state === "started") {
                    const currentTime = Tone.Transport.seconds;
                    const targetNote = findTargetNoteAtTime(currentTime);
                    if (targetNote) {
                        const targetFrequency = C0 * Math.pow(2, (targetNote.midi + keyOffset - 69) / 12);
                        const accuracy = pitchScoring.evaluatePitch(frequency, targetFrequency);
                        updateScoringDisplay();
                        // 視覺回饋：根據準確度改變標記顏色
                        if (accuracy >= 80) {
                            userPitchMarker.style.backgroundColor = '#33ff33'; // 綠色
                        } else if (accuracy >= 60) {
                            userPitchMarker.style.backgroundColor = '#ffff33'; // 黃色
                        } else {
                            userPitchMarker.style.backgroundColor = '#ff3333'; // 紅色
                        }
                        // 音準強化：顯示 cents 誤差
                        const cents = 1200 * Math.log2(frequency / targetFrequency);
                        let centsEl = document.getElementById('cents-error');
                        if (!centsEl) {
                            centsEl = document.createElement('div');
                            centsEl.id = 'cents-error';
                            centsEl.style = 'position:absolute;top:10px;left:10px;font-size:1.2em;color:#ffbb33;z-index:10;';
                            document.getElementById('dashboard').appendChild(centsEl);
                        }
                        if (Math.abs(cents) < 10) {
                            centsEl.textContent = '音準：完美';
                            centsEl.style.color = '#33ff33';
                        } else if (cents > 0) {
                            centsEl.textContent = `偏高 +${cents.toFixed(1)} cents`;
                            centsEl.style.color = '#ffbb33';
                        } else {
                            centsEl.textContent = `偏低 ${cents.toFixed(1)} cents`;
                            centsEl.style.color = '#ff3333';
                        }
                    }
                }
            }
        } else {
            userPitchMarker.style.display = "none";
        }
    }
}

// 新增：根據時間找到目標音符
function findTargetNoteAtTime(currentTime) {
    if (!midiData || !midiData.tracks[0]) return null;
    
    const notes = midiData.tracks[0].notes;
    for (let note of notes) {
        if (currentTime >= note.time && currentTime <= note.time + note.duration) {
            return note;
        }
    }
    return null;
}

function updateLyrics() {
    if (lrcData.length > 0 && Tone.Transport.state === "started") {
        const currentTime = Tone.Transport.seconds;
        let currentLyric = "";
        for (let i = lrcData.length - 1; i >= 0; i--) {
            if (currentTime >= lrcData[i].time) {
                currentLyric = lrcData[i].text;
                break;
            }
        }
        if (lyricsLine.textContent !== currentLyric) {
            lyricsLine.textContent = currentLyric;
        }
    } else {
        lyricsLine.textContent = "";
    }
}

function getPitch(dataArray,sampleRate){
    let bestCorrelation=0,bestOffset=-1;
    const bufferSize = dataArray.length;
    for(let offset=80;offset<bufferSize/2;offset++){
        let corr=0;
        for(let i=0;i<bufferSize/2;i++){
            corr+=dataArray[i]*dataArray[i+offset]
        }
        if(corr>bestCorrelation){
            bestCorrelation=corr;
            bestOffset=offset
        }
    }
    return bestOffset>0?sampleRate/bestOffset:null
}

function midiToNote(midi) {
    if (typeof midi !== 'number') return '--';
    const octave = Math.floor(midi / 12) - 1;
    return noteStrings[midi % 12] + octave;
}

function updateSongRange() {
    if (!midiData || !midiData.tracks[0]) return;
    const notes = midiData.tracks[0].notes;
    if (!notes.length) return;
    songMinNote = Math.min(...notes.map(n => n.midi));
    songMaxNote = Math.max(...notes.map(n => n.midi));
    document.getElementById('song-range').textContent = `${midiToNote(songMinNote)} ~ ${midiToNote(songMaxNote)}`;
    updateRangeMatch();
}

function updateRangeMatch() {
    const matchEl = document.getElementById('range-match');
    if (userMinNote === null || userMaxNote === null || songMinNote === null || songMaxNote === null) {
        matchEl.textContent = '';
        matchEl.className = 'range-match';
        return;
    }
    if (userMinNote <= songMinNote && userMaxNote >= songMaxNote) {
        matchEl.textContent = '音域足夠，適合練習！';
        matchEl.className = 'range-match ok';
    } else if (
        (userMinNote > songMinNote && userMaxNote >= songMaxNote) ||
        (userMinNote <= songMinNote && userMaxNote < songMaxNote)
    ) {
        matchEl.textContent = '音域部分覆蓋，建議調整 key 或多加練習';
        matchEl.className = 'range-match warn';
    } else {
        matchEl.textContent = '音域不足，建議選擇其他歌曲或調整 key';
        matchEl.className = 'range-match bad';
    }
}
