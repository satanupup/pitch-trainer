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
    console.log('[+] 表單提交，開始處理上傳...');
    
    const file = elements.songFile.files[0];
    if (!file) {
      ErrorHandler.showError('請先選擇一個 MP3 檔案');
      return;
    }
    
    console.log(`[+] 選擇的文件: ${file.name}, 大小: ${file.size} 字節, 類型: ${file.type}`);
    
    // 顯示進度區域
    elements.progressArea.classList.remove('hidden');
    elements.progressBar.style.width = '0%';
    elements.uploadStatus.textContent = '準備上傳...';
    
    // 禁用上傳按鈕，防止重複提交
    elements.uploadBtn.disabled = true;
    
    try {
      await handleUpload(
        file,
        // 進度回調
        (progressData) => {
          console.log(`[i] 上傳進度更新: ${JSON.stringify(progressData)}`);
          if (progressData.status === 'uploading') {
            elements.progressBar.style.width = `${progressData.progress}%`;
            elements.uploadStatus.textContent = `上傳中... ${progressData.progress}%`;
          } else if (progressData.status === 'processing') {
            elements.progressBar.style.width = `${progressData.progress}%`;
            elements.uploadStatus.textContent = progressData.message || '處理中...';
          }
        },
        // 完成回調
        (result) => {
          console.log('[✓] 上傳和處理完成:', result);
          elements.progressBar.style.width = '100%';
          elements.uploadStatus.textContent = '處理完成！';
          elements.uploadBtn.disabled = false;
          
          // 上傳成功後自動刷新歌曲清單
          setTimeout(() => {
            this.refreshSongList(result.song?.mp3);
            // 隱藏進度區域
            elements.progressArea.classList.add('hidden');
          }, 2000);
        },
        // 錯誤回調
        (error) => {
          console.error(`[-] 上傳或處理過程中發生錯誤: ${error.message}`);
          elements.uploadStatus.textContent = `錯誤: ${error.message}`;
          elements.uploadBtn.disabled = false;
          // 保持進度區域可見，以便用戶看到錯誤信息
        }
      );
    } catch (error) {
      console.error(`[-] 處理上傳時發生異常: ${error.message}`);
      elements.uploadStatus.textContent = `錯誤: ${error.message}`;
      elements.uploadBtn.disabled = false;
    }
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
