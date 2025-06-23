import { state } from './state.js';

let canvas, canvasCtx;

function init(canvasElement) {
  canvas = canvasElement;
  canvasCtx = canvas.getContext('2d');
  requestAnimationFrame(updateVisualizer);
}

function updateVisualizer() {
  requestAnimationFrame(updateVisualizer);
  canvasCtx.fillStyle = '#20232a';
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  drawPlayhead();
  drawMidiNotes();
  drawMicrophonePitch();
  drawLoudnessCurve();
  // updateLyrics(); // 歌詞建議由 UI 模組處理
}

function drawPlayhead() {
  const playheadX = canvas.width * 0.25;
  canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  canvasCtx.lineWidth = 2;
  canvasCtx.beginPath();
  canvasCtx.moveTo(playheadX, 0);
  canvasCtx.lineTo(playheadX, canvas.height);
  canvasCtx.stroke();
}

function drawMidiNotes() {
  const currentTime = window.Tone && Tone.Transport.state === 'started' ? Tone.Transport.seconds : 0;
  const pixelsPerSecond = 100;
  if (state.midiData) {
    canvasCtx.fillStyle = '#61dafb';
    state.midiData.tracks[0].notes.forEach(note => {
      const noteStartTime = note.time;
      const noteEndTime = note.time + note.duration;
      if (noteEndTime > currentTime - 2 && noteStartTime < currentTime + 10) {
        const y = mapNoteToY(note.midi + state.keyOffset);
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
  if (!state.analyser) return;
  
  const dataArray = new Float32Array(state.analyser.frequencyBinCount);
  state.analyser.getFloatTimeDomainData(dataArray);
  
  // 計算音量 RMS 值
  const rms = calculateRMS(dataArray);
  if (rms <= 0.01) return;
  
  // 獲取頻率
  const frequency = getPitch(dataArray, state.audioContext.sampleRate);
  if (!frequency) return;
  
  // 計算音符編號
  const userNoteNumber = 12 * (Math.log(frequency / state.C0) / Math.log(2));
  
  // 繪製音高視覺效果
  drawPitchVisuals(userNoteNumber);
  
  // 更新 UI 元素
  updatePitchUI(userNoteNumber);
  
  // 評估音準
  evaluatePitchAccuracy(userNoteNumber);
}

function drawLoudnessCurve() {
  if (!state.analyser) return;
  const dataArray = new Float32Array(state.analyser.frequencyBinCount);
  state.analyser.getFloatTimeDomainData(dataArray);
  const rms = Math.sqrt(dataArray.reduce((acc, val) => acc + val * val, 0) / dataArray.length);
  state.rmsHistory.push(rms);
  if (state.rmsHistory.length > canvas.width) state.rmsHistory.shift();
  const yBase = canvas.height * 0.75;
  const yMax = canvas.height * 0.95;
  canvasCtx.save();
  canvasCtx.beginPath();
  for (let i = 0; i < state.rmsHistory.length; i++) {
    const x = i;
    const y = yMax - (state.rmsHistory[i] * (yMax - yBase) * 8);
    if (i === 0) canvasCtx.moveTo(x, y);
    else canvasCtx.lineTo(x, y);
  }
  canvasCtx.strokeStyle = '#ffbb33';
  canvasCtx.lineWidth = 2;
  canvasCtx.stroke();
  canvasCtx.restore();
}

// 依賴的輔助函數
function mapNoteToY(noteNumber) {
  const minNote = 48;
  const maxNote = 84;
  const normalized = 1 - ((noteNumber - minNote) / (maxNote - minNote));
  return Math.max(0, Math.min(1, normalized)) * canvas.height;
}

function getPitch(dataArray, sampleRate) {
  let bestCorrelation = 0, bestOffset = -1;
  const bufferSize = dataArray.length;
  for (let offset = 80; offset < bufferSize / 2; offset++) {
    let corr = 0;
    for (let i = 0; i < bufferSize / 2; i++) {
      corr += dataArray[i] * dataArray[i + offset];
    }
    if (corr > bestCorrelation) {
      bestCorrelation = corr;
      bestOffset = offset;
    }
  }
  return bestOffset > 0 ? sampleRate / bestOffset : null;
}

// 計算 RMS 音量值
function calculateRMS(dataArray) {
  return Math.sqrt(dataArray.reduce((acc, val) => acc + val * val, 0) / dataArray.length);
}

// 繪製音高視覺效果
function drawPitchVisuals(userNoteNumber) {
  const y = mapNoteToY(userNoteNumber);
  const x = canvas.width * 0.25; // 與播放頭位置一致
  
  // 繪製音高點
  canvasCtx.fillStyle = '#33ff33';
  canvasCtx.beginPath();
  canvasCtx.arc(x, y, 5, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 繪製水平線
  canvasCtx.strokeStyle = 'rgba(51, 255, 51, 0.5)';
  canvasCtx.lineWidth = 1;
  canvasCtx.beginPath();
  canvasCtx.moveTo(x - 15, y);
  canvasCtx.lineTo(x + 15, y);
  canvasCtx.stroke();
}

// 更新 UI 元素
function updatePitchUI(userNoteNumber) {
  const y = mapNoteToY(userNoteNumber);
  
  // 更新音高標記位置
  state.elements?.userPitchMarker?.style.display = 'block';
  if (state.elements?.userPitchMarker) {
    state.elements.userPitchMarker.style.top = `${y}px`;
  }
  
  // 更新音符顯示
  if (state.elements?.keyValueDisplay) {
    const midiNote = Math.round(userNoteNumber);
    const noteName = midiToNote(midiNote);
    state.elements.keyValueDisplay.textContent = noteName;
  }
}

// 評估音準準確度
function evaluatePitchAccuracy(userNoteNumber) {
  if (!state.currentTargetNote || !state.scoring) return;
  
  const accuracy = state.scoring.evaluatePitch(userNoteNumber, state.currentTargetNote);
  
  if (accuracy !== null && state.elements?.accuracyDisplay) {
    state.elements.accuracyDisplay.textContent = `${Math.round(accuracy)}%`;
  }
}

export { init }; 
