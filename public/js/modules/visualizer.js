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
  if (state.analyser) {
    const dataArray = new Float32Array(state.analyser.frequencyBinCount);
    state.analyser.getFloatTimeDomainData(dataArray);
    const rms = Math.sqrt(dataArray.reduce((acc, val) => acc + val * val, 0) / dataArray.length);
    if (rms > 0.01) {
      const frequency = getPitch(dataArray, state.audioContext.sampleRate);
      if (frequency) {
        const userNoteNumber = 12 * (Math.log(frequency / state.C0) / Math.log(2));
        // ... 其餘 pitch 標記繪製 ...
      }
    }
  }
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

export { init }; 