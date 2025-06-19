import { fetchSongs, handleUpload } from './modules/api.js';
import { elements, updateSongListUI, updateScoringDisplay } from './modules/ui.js';
import { initializeAudioAndLoadSong, startPitchDetection, stopPitchDetection } from './modules/audio.js';
import { init as initVisualizer } from './modules/visualizer.js';
import { state } from './modules/state.js';
import { PitchScoring } from './modules/scoring.js';

class App {
  constructor() {
    this.pitchScoring = new PitchScoring();
  }

  async init() {
    // 初始化 Canvas 視覺化
    initVisualizer(elements.canvas);
    // 綁定事件
    elements.uploadForm.addEventListener('submit', this.handleUpload.bind(this));
    elements.startBtn.addEventListener('click', this.handleStartPitchDetection.bind(this));
    elements.stopBtn.addEventListener('click', this.handleStopPitchDetection.bind(this));
    elements.songSelect.addEventListener('change', this.handleSongSelect.bind(this));
    elements.keySlider.addEventListener('input', this.handleKeyChange.bind(this));
    elements.playSongBtn.addEventListener('click', this.handlePlaySong.bind(this));
    if (elements.resetScoreBtn) {
      elements.resetScoreBtn.addEventListener('click', this.handleResetScore.bind(this));
    }
    // 載入歌曲清單
    const songList = await fetchSongs();
    state.songList = songList;
    updateSongListUI(songList);
  }

  async handleUpload(event) {
    event.preventDefault();
    const file = elements.songFile.files[0];
    await handleUpload(file, null, (result) => {
      // 上傳成功後自動刷新歌曲清單
      this.refreshSongList(result.song?.mp3);
    });
  }

  async refreshSongList(selectMp3) {
    const songList = await fetchSongs();
    state.songList = songList;
    updateSongListUI(songList);
    if (selectMp3) {
      elements.songSelect.value = selectMp3;
      this.handleSongSelect({ target: { value: selectMp3 } });
    }
  }

  async handleSongSelect(event) {
    const selectedPath = event.target.value;
    if (selectedPath) {
      const songData = state.songList.find(song => song.mp3 === selectedPath);
      if (songData) {
        elements.playerArea.classList.remove('hidden');
        await initializeAudioAndLoadSong(songData);
        this.pitchScoring.reset();
        updateScoringDisplay({
          averageScore: this.pitchScoring.getAverageScore(),
          recentAccuracy: this.pitchScoring.getRecentAccuracy(),
          currentStreak: this.pitchScoring.currentStreak,
          bestStreak: this.pitchScoring.bestStreak
        });
      }
    } else {
      elements.playerArea.classList.add('hidden');
      if (window.Tone && Tone.Transport.state === 'started') Tone.Transport.stop();
    }
  }

  handleKeyChange(event) {
    state.keyOffset = parseInt(event.target.value);
    elements.keyValueDisplay.textContent = state.keyOffset;
    if (state.pitchShift) state.pitchShift.pitch = state.keyOffset;
  }

  handlePlaySong() {
    if (!state.player?.loaded) {
      ErrorHandler.showError('請先選擇歌曲並等待載入完成。');
      return;
    }
    
    try {
      if (window.Tone && Tone.Transport.state !== 'started') {
        // 確保音頻上下文已啟動
        Tone.start().then(() => {
          console.log('[✓] Tone.js 音頻上下文已啟動');
          // 開始播放
          if (state.player.tonePlayer) {
            state.player.tonePlayer.start();
          }
          Tone.Transport.start();
          elements.playSongBtn.textContent = '停止';
        }).catch(err => {
          console.error('[-] 無法啟動 Tone.js 音頻上下文:', err);
          ErrorHandler.showError('播放失敗，請點擊頁面再試。');
        });
      } else if (window.Tone) {
        // 停止播放
        if (state.player.tonePlayer) {
          state.player.tonePlayer.stop();
        }
        Tone.Transport.stop();
        elements.playSongBtn.textContent = '播放';
      }
    } catch (err) {
      console.error('[-] 播放/停止時發生錯誤:', err);
      ErrorHandler.showError(`播放失敗: ${err.message}`);
    }
  }

  handleStartPitchDetection() {
    startPitchDetection();
    elements.startBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.userPitchMarker.style.display = 'block';
  }

  handleStopPitchDetection() {
    stopPitchDetection();
    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.userPitchMarker.style.display = 'none';
  }

  handleResetScore() {
    this.pitchScoring.reset();
    updateScoringDisplay({
      averageScore: this.pitchScoring.getAverageScore(),
      recentAccuracy: this.pitchScoring.getRecentAccuracy(),
      currentStreak: this.pitchScoring.currentStreak,
      bestStreak: this.pitchScoring.bestStreak
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
}); 
