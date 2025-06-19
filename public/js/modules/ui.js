// 快取所有常用 DOM 元素
const elements = {
  generatorSection: document.getElementById('generator'),
  uploadForm: document.getElementById('upload-form'),
  uploadBtn: document.getElementById('upload-btn'),
  songFile: document.getElementById('song-file'),
  progressArea: document.getElementById('progress-area'),
  progressBar: document.getElementById('progress-bar'),
  uploadStatus: document.getElementById('upload-status'),
  mainApp: document.getElementById('main-app'),
  playerArea: document.getElementById('player-area'),
  startBtn: document.getElementById('start-btn'),
  stopBtn: document.getElementById('stop-btn'),
  playSongBtn: document.getElementById('play-song-btn'),
  songSelect: document.getElementById('song-select'),
  keySlider: document.getElementById('key-slider'),
  keyValueDisplay: document.getElementById('key-value'),
  userPitchMarker: document.getElementById('user-pitch-marker'),
  lyricsLine: document.getElementById('lyrics-line'),
  canvas: document.getElementById('visualizer'),
  dashboard: document.getElementById('dashboard'),
  averageScoreEl: document.getElementById('average-score'),
  recentAccuracyEl: document.getElementById('recent-accuracy'),
  currentStreakEl: document.getElementById('current-streak'),
  bestStreakEl: document.getElementById('best-streak'),
  userRange: document.getElementById('user-range'),
  songRange: document.getElementById('song-range'),
  rangeMatch: document.getElementById('range-match'),
  resetScoreBtn: document.getElementById('reset-score-btn'),
};

function updateSongListUI(songList) {
  elements.songSelect.innerHTML = '<option value="">-- 請選擇 --</option>';
  songList.forEach(song => {
    const option = document.createElement('option');
    option.value = song.mp3;
    option.textContent = song.name;
    elements.songSelect.appendChild(option);
  });
}

function updateScoringDisplay({ averageScore, recentAccuracy, currentStreak, bestStreak }) {
  if (elements.averageScoreEl) elements.averageScoreEl.textContent = averageScore;
  if (elements.recentAccuracyEl) elements.recentAccuracyEl.textContent = recentAccuracy + '%';
  if (elements.currentStreakEl) elements.currentStreakEl.textContent = currentStreak;
  if (elements.bestStreakEl) elements.bestStreakEl.textContent = bestStreak;
}

function updateRangeMatch({ userMinNote, userMaxNote, songMinNote, songMaxNote, midiToNote }) {
  const matchEl = elements.rangeMatch;
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

export { elements, updateSongListUI, updateScoringDisplay, updateRangeMatch }; 