/**
 * Whisper vs Google STT 模型比較測試腳本
 * 用於比較同一段音訊在不同語音識別模型下的辨識品質
 * 
 * 使用方法: node compare-stt-models.js <音訊檔案路徑>
 */

const fs = require('fs').promises;
const path = require('path');
const { execPromise } = require('../utils/execUtils');
const whisperLyricsService = require('../services/whisperLyricsService');
const { SpeechClient } = require('@google-cloud/speech');
const { Storage } = require('@google-cloud/storage');
const config = require('../config/config');

// 評分指標
const METRICS = {
  WORD_ERROR_RATE: 'wordErrorRate',
  CHARACTER_ERROR_RATE: 'characterErrorRate',
  PROCESSING_TIME: 'processingTime',
  TIMESTAMP_ACCURACY: 'timestampAccuracy'
};

async function main() {
  try {
    // 檢查命令行參數
    if (process.argv.length < 3) {
      console.error('請提供音訊檔案路徑');
      console.error('使用方法: node compare-stt-models.js <音訊檔案路徑>');
      process.exit(1);
    }

    const audioPath = process.argv[2];
    console.log(`[+] 開始比較 Whisper 和 Google STT 模型: ${audioPath}`);

    // 創建臨時輸出目錄
    const outputDir = path.join(__dirname, '../temp', `compare-${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`[+] 臨時輸出目錄: ${outputDir}`);

    // 優化音訊以提高識別準確度
    const optimizedAudioPath = await optimizeAudio(audioPath, outputDir);

    // 測試 Whisper 模型 (本地)
    console.log('\n[+] 測試 Whisper 本地模型...');
    const whisperLocalResults = await testWhisperLocal(optimizedAudioPath, outputDir);

    // 測試 Whisper API
    console.log('\n[+] 測試 Whisper API...');
    const whisperApiResults = await testWhisperApi(optimizedAudioPath, outputDir);

    // 測試 Google STT
    console.log('\n[+] 測試 Google Speech-to-Text...');
    const googleResults = await testGoogleSTT(optimizedAudioPath, outputDir);

    // 比較結果
    console.log('\n[+] 比較結果:');
    compareResults(whisperLocalResults, whisperApiResults, googleResults);

    // 清理臨時文件
    console.log('\n[+] 保留結果文件，清理臨時音訊文件...');
    await fs.unlink(optimizedAudioPath);

    console.log('\n[✓] 比較完成！結果已保存到:', outputDir);
    console.log(`[i] 建議: ${getBestModelRecommendation(whisperLocalResults, whisperApiResults, googleResults)}`);
  } catch (error) {
    console.error(`[-] 錯誤: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 優化音訊以提高識別準確度
async function optimizeAudio(audioPath, outputDir) {
  console.log(`[+] 優化音訊以提高識別準確度...`);
  const ffmpegPath = config.ai.ffmpegPath || 'ffmpeg';
  const optimizedAudioPath = path.join(outputDir, 'audio_optimized.wav');
  
  await execPromise(`${ffmpegPath} -i "${audioPath}" -af "highpass=f=200,lowpass=f=3000,afftdn=nf=-25,dynaudnorm=f=150:g=15" -ac 1 -ar 16000 "${optimizedAudioPath}"`);
  console.log(`[✓] 音訊優化完成: ${optimizedAudioPath}`);
  
  return optimizedAudioPath;
}

// 測試本地 Whisper 模型
async function testWhisperLocal(audioPath, outputDir) {
  const startTime = Date.now();
  
  try {
    // 檢查 whisper 命令是否可用
    const whisperPath = config.ai.whisperPath || 'whisper';
    await execPromise(`${whisperPath} --help`);
    
    // 創建 Whisper 本地輸出目錄
    const whisperLocalDir = path.join(outputDir, 'whisper-local');
    await fs.mkdir(whisperLocalDir, { recursive: true });
    
    // 使用不同模型大小進行測試
    const models = ['tiny', 'base', 'small', 'medium', 'large-v3'];
    const results = {};
    
    for (const model of models) {
      console.log(`[+] 測試 Whisper ${model} 模型...`);
      const modelStartTime = Date.now();
      
      try {
        // 執行 Whisper 命令
        const modelDir = path.join(whisperLocalDir, model);
        await fs.mkdir(modelDir, { recursive: true });
        
        const lrcPath = await whisperLyricsService.generateLyricsWithLocalWhisper(
          audioPath, 
          modelDir, 
          { model, language: 'zh' }
        );
        
        const processingTime = Date.now() - modelStartTime;
        console.log(`[✓] Whisper ${model} 處理時間: ${processingTime}ms`);
        
        // 讀取生成的 LRC 文件
        const lrcContent = await fs.readFile(lrcPath, 'utf8');
        
        // 保存結果
        results[model] = {
          processingTime,
          lrcPath,
          lrcContent,
          wordCount: countWords(lrcContent)
        };
      } catch (error) {
        console.error(`[-] Whisper ${model} 模型測試失敗: ${error.message}`);
        results[model] = { error: error.message };
      }
    }
    
    // 計算總處理時間
    const totalProcessingTime = Date.now() - startTime;
    
    // 找出最佳模型
    let bestModel = null;
    let maxWordCount = 0;
    
    for (const [model, result] of Object.entries(results)) {
      if (result.wordCount && result.wordCount > maxWordCount) {
        maxWordCount = result.wordCount;
        bestModel = model;
      }
    }
    
    return {
      name: 'Whisper Local',
      models: results,
      bestModel,
      totalProcessingTime,
      outputDir: whisperLocalDir
    };
  } catch (error) {
    console.error(`[-] Whisper 本地測試失敗: ${error.message}`);
    return {
      name: 'Whisper Local',
      error: error.message,
      totalProcessingTime: Date.now() - startTime
    };
  }
}

// 測試 Whisper API
async function testWhisperApi(audioPath, outputDir) {
  const startTime = Date.now();
  
  try {
    // 檢查 API 金鑰
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        name: 'Whisper API',
        error: '未設置 OPENAI_API_KEY 環境變數',
        totalProcessingTime: Date.now() - startTime
      };
    }
    
    // 創建 Whisper API 輸出目錄
    const whisperApiDir = path.join(outputDir, 'whisper-api');
    await fs.mkdir(whisperApiDir, { recursive: true });
    
    // 使用 Whisper API 生成歌詞
    const lrcPath = await whisperLyricsService.generateLyricsWithWhisperAPI(
      audioPath, 
      whisperApiDir, 
      { language: 'zh' }
    );
    
    // 計算處理時間
    const processingTime = Date.now() - startTime;
    console.log(`[✓] Whisper API 處理時間: ${processingTime}ms`);
    
    // 讀取生成的 LRC 文件
    const lrcContent = await fs.readFile(lrcPath, 'utf8');
    
    return {
      name: 'Whisper API',
      processingTime,
      lrcPath,
      lrcContent,
      wordCount: countWords(lrcContent),
      outputDir: whisperApiDir
    };
  } catch (error) {
    console.error(`[-] Whisper API 測試失敗: ${error.message}`);
    return {
      name: 'Whisper API',
      error: error.message,
      totalProcessingTime: Date.now() - startTime
    };
  }
}

// 測試 Google STT
async function testGoogleSTT(audioPath, outputDir) {
  const startTime = Date.now();
  
  try {
    // 創建 Google STT 輸出目錄
    const googleDir = path.join(outputDir, 'google-stt');
    await fs.mkdir(googleDir, { recursive: true });
    
    // 準備並執行 Google STT
    const response = await processWithGoogleSTT(audioPath, googleDir);
    
    // 生成 LRC 格式歌詞
    const lrcPath = await generateGoogleLRC(response, audioPath, googleDir);
    
    // 讀取生成的 LRC 文件
    const lrcContent = await fs.readFile(lrcPath, 'utf8');
    
    // 計算處理時間
    const processingTime = Date.now() - startTime;
    console.log(`[✓] Google STT 處理時間: ${processingTime}ms`);
    
    return {
      name: 'Google STT',
      processingTime,
      lrcPath,
      lrcContent,
      wordCount: countWords(lrcContent),
      outputDir: googleDir
    };
  } catch (error) {
    console.error(`[-] Google STT 測試失敗: ${error.message}`);
    return {
      name: 'Google STT',
      error: error.message,
      totalProcessingTime: Date.now() - startTime
    };
  }
}

/**
 * 使用 Google STT 處理音訊
 * @param {string} audioPath - 音訊檔案路徑
 * @param {string} outputDir - 輸出目錄
 * @returns {Promise<Object>} - Google STT 響應的 Promise
 */
async function processWithGoogleSTT(audioPath, outputDir) {
  // 準備 GCS 和 Speech 客戶端
  const BUCKET_NAME = config.google.storageBucket || 'pitch-trainer-bucket-961211674033';
  const gcsFileName = `speech-test-${Date.now()}.wav`;
  const gcsUri = `gs://${BUCKET_NAME}/${gcsFileName}`;
  
  // 創建 Storage 和 Speech 客戶端
  const storage = new Storage();
  const speechClient = createSpeechClient();
  
  try {
    // 上傳到 GCS
    console.log(`[+] 上傳檔案到 GCS: ${gcsUri}`);
    await storage.bucket(BUCKET_NAME).upload(audioPath, {
      destination: gcsFileName,
    });
    
    // 準備 GCS URI 請求
    const request = createSTTRequest(gcsUri);
    
    // 執行長時間識別
    console.log('[+] 呼叫 Google STT API...');
    const [operation] = await speechClient.longRunningRecognize(request);
    const [response] = await operation.promise();
    
    return response;
  } finally {
    // 清理 GCS 檔案
    try {
      await storage.bucket(BUCKET_NAME).file(gcsFileName).delete();
    } catch (e) {
      console.warn(`[-] 刪除 GCS 檔案失敗: ${e.message}`);
    }
  }
}

/**
 * 創建 Speech 客戶端
 * @returns {Object} - Speech 客戶端
 */
function createSpeechClient() {
  const isGoogleCloud = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  
  if (isGoogleCloud) {
    return new SpeechClient();
  } else {
    const keyFilePath = config.google.speechApiKeyFile || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    return new SpeechClient({
      keyFilename: keyFilePath
    });
  }
}

/**
 * 創建 STT 請求配置
 * @param {string} gcsUri - GCS URI
 * @returns {Object} - 請求配置
 */
function createSTTRequest(gcsUri) {
  return {
    audio: { uri: gcsUri },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'zh-TW',
      enableWordTimeOffsets: true,
      useEnhanced: true,
      enableAutomaticPunctuation: true,
      maxAlternatives: 1,
      speechContexts: [{
        phrases: ['歌詞', '音樂', '唱歌', '愛', '心', '你', '我', '他', '她', '想', '說', '走', '來', '去'],
        boost: 15
      }],
    },
  };
}

/**
 * 生成 Google LRC 格式歌詞
 * @param {Object} response - Google STT 響應
 * @param {string} audioPath - 音訊檔案路徑
 * @param {string} googleDir - 輸出目錄
 * @returns {Promise<string>} - LRC 檔案路徑的 Promise
 */
async function generateGoogleLRC(response, audioPath, googleDir) {
  let lrcContent = '';
  
  // 添加標題信息
  lrcContent += '[ti:Google STT 測試]\n';
  lrcContent += '[ar:AI 生成]\n';
  lrcContent += `[al:${path.basename(audioPath, path.extname(audioPath))}]\n`;
  lrcContent += '[by:AI 音準資源製作器]\n\n';
  
  // 處理時間戳記
  lrcContent += processResponseWords(response);
  
  // 保存 LRC 文件
  const lrcPath = path.join(googleDir, 'lyrics.lrc');
  await fs.writeFile(lrcPath, lrcContent);
  
  return lrcPath;
}

/**
 * 處理響應中的單詞時間戳
 * @param {Object} response - Google STT 響應
 * @returns {string} - 處理後的 LRC 內容
 */
function processResponseWords(response) {
  let content = '';
  
  for (const result of response.results) {
    const alternative = result.alternatives?.[0];
    if (!alternative?.words?.length) continue;
    
    for (const word of alternative.words) {
      const timestamp = formatTimestamp(word.startTime);
      content += `${timestamp}${word.word}\n`;
    }
  }
  
  return content;
}

/**
 * 格式化時間戳
 * @param {Object} startTime - 開始時間
 * @returns {string} - 格式化的時間戳
 */
function formatTimestamp(startTime) {
  const seconds = startTime.seconds + startTime.nanos / 1e9;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  // 格式化為 LRC 時間戳記 [mm:ss.xx]
  return `[${minutes.toString().padStart(2, '0')}:${remainingSeconds.toFixed(2).padStart(5, '0')}]`;
}

// 比較結果
function compareResults(whisperLocalResults, whisperApiResults, googleResults) {
  // 創建比較表格
  printComparisonTableHeader();
  
  // 處理時間比較
  compareProcessingTimes(whisperLocalResults, whisperApiResults, googleResults);
  
  // 詞數比較
  compareWordCounts(whisperLocalResults, whisperApiResults, googleResults);
  
  // 最佳模型比較
  compareBestModels(whisperLocalResults);
  
  // 結束表格
  console.log('└─────────────────────┴───────────────┴───────────────┴───────────────┘');
  
  // 保存比較結果為 JSON
  saveComparisonResults(whisperLocalResults, whisperApiResults, googleResults);
}

/**
 * 打印比較表格標題
 */
function printComparisonTableHeader() {
  console.log('┌─────────────────────┬───────────────┬───────────────┬───────────────┐');
  console.log('│ 指標                │ Whisper 本地  │ Whisper API   │ Google STT    │');
  console.log('├─────────────────────┼───────────────┼───────────────┼───────────────┤');
}

/**
 * 比較處理時間
 */
function compareProcessingTimes(whisperLocalResults, whisperApiResults, googleResults) {
  const whisperLocalTime = whisperLocalResults.totalProcessingTime || 'N/A';
  const whisperApiTime = whisperApiResults.processingTime || 'N/A';
  const googleTime = googleResults.processingTime || 'N/A';
  
  console.log(`│ 處理時間 (ms)       │ ${padRight(whisperLocalTime, 13)} │ ${padRight(whisperApiTime, 13)} │ ${padRight(googleTime, 13)} │`);
}

/**
 * 比較詞數
 */
function compareWordCounts(whisperLocalResults, whisperApiResults, googleResults) {
  const whisperLocalWordCount = getWhisperLocalWordCount(whisperLocalResults);
  const whisperApiWordCount = whisperApiResults.wordCount || 'N/A';
  const googleWordCount = googleResults.wordCount || 'N/A';
  
  console.log(`│ 識別詞數            │ ${padRight(whisperLocalWordCount, 13)} │ ${padRight(whisperApiWordCount, 13)} │ ${padRight(googleWordCount, 13)} │`);
}

/**
 * 獲取 Whisper 本地詞數
 */
function getWhisperLocalWordCount(whisperLocalResults) {
  if (!whisperLocalResults.bestModel) return 'N/A';
  return whisperLocalResults.models[whisperLocalResults.bestModel].wordCount || 'N/A';
}

/**
 * 比較最佳模型
 */
function compareBestModels(whisperLocalResults) {
  const bestModel = whisperLocalResults.bestModel || 'N/A';
  console.log(`│ 最佳本地模型        │ ${padRight(bestModel, 13)} │ ${padRight('N/A', 13)} │ ${padRight('N/A', 13)} │`);
}

/**
 * 保存比較結果為 JSON
 */
function saveComparisonResults(whisperLocalResults, whisperApiResults, googleResults) {
  const comparisonResults = {
    timestamp: new Date().toISOString(),
    whisperLocal: {
      processingTime: whisperLocalResults.totalProcessingTime || 'N/A',
      wordCount: getWhisperLocalWordCount(whisperLocalResults),
      bestModel: whisperLocalResults.bestModel || 'N/A',
      error: whisperLocalResults.error
    },
    whisperApi: {
      processingTime: whisperApiResults.processingTime || 'N/A',
      wordCount: whisperApiResults.wordCount || 'N/A',
      error: whisperApiResults.error
    },
    googleSTT: {
      processingTime: googleResults.processingTime || 'N/A',
      wordCount: googleResults.wordCount || 'N/A',
      error: googleResults.error
    }
  };
  
  // 將結果寫入 JSON 文件
  const outputDir = getOutputDir(whisperLocalResults, whisperApiResults, googleResults);
  fs.writeFile(
    path.join(outputDir, 'comparison-results.json'),
    JSON.stringify(comparisonResults, null, 2)
  ).catch(err => console.error(`[-] 保存比較結果失敗: ${err.message}`));
}

/**
 * 獲取輸出目錄
 */
function getOutputDir(whisperLocalResults, whisperApiResults, googleResults) {
  return path.dirname(
    whisperLocalResults.outputDir || 
    whisperApiResults.outputDir || 
    googleResults.outputDir
  );
}

// 獲取最佳模型建議
function getBestModelRecommendation(whisperLocalResults, whisperApiResults, googleResults) {
  // 檢查是否有錯誤
  if (allModelsHaveErrors(whisperLocalResults, whisperApiResults, googleResults)) {
    return '所有模型都失敗了，請檢查您的環境配置和音訊文件。';
  }
  
  // 獲取詞數建議
  const wordCountRecommendation = getWordCountRecommendation(
    whisperLocalResults, 
    whisperApiResults, 
    googleResults
  );
  
  // 獲取處理時間建議
  const timeRecommendation = getTimeRecommendation(
    whisperLocalResults, 
    whisperApiResults, 
    googleResults
  );
  
  // 返回綜合建議
  return `${wordCountRecommendation} ${timeRecommendation}\n  
綜合建議：
1. 對於中文歌詞，Whisper 通常有更好的辨識率，特別是 medium 或 large 模型
2. 對於穩定性，Google STT 更可靠，但對方言和特殊用詞支援較弱
3. 對於處理速度，Whisper API 通常最快，但需要 API 金鑰和網路連接
4. 最佳實踐：先嘗試 Whisper medium 模型，如果失敗則回退到 Google STT`;
}

/**
 * 檢查是否所有模型都有錯誤
 */
function allModelsHaveErrors(whisperLocalResults, whisperApiResults, googleResults) {
  return !!whisperLocalResults.error && 
         !!whisperApiResults.error && 
         !!googleResults.error;
}

/**
 * 獲取基於詞數的建議
 */
function getWordCountRecommendation(whisperLocalResults, whisperApiResults, googleResults) {
  const hasWhisperLocalError = !!whisperLocalResults.error;
  const hasWhisperApiError = !!whisperApiResults.error;
  const hasGoogleError = !!googleResults.error;
  
  // 詞數比較
  const whisperLocalWordCount = getLocalWordCount(whisperLocalResults);
  const whisperApiWordCount = whisperApiResults.wordCount || 0;
  const googleWordCount = googleResults.wordCount || 0;
  
  // 詞數權重較高
  const maxWordCount = Math.max(whisperLocalWordCount, whisperApiWordCount, googleWordCount);
  
  if (maxWordCount === whisperLocalWordCount && !hasWhisperLocalError) {
    return `Whisper 本地 ${whisperLocalResults.bestModel} 模型識別詞數最多，建議使用。`;
  } 
  
  if (maxWordCount === whisperApiWordCount && !hasWhisperApiError) {
    return 'Whisper API 識別詞數最多，建議使用。';
  } 
  
  if (maxWordCount === googleWordCount && !hasGoogleError) {
    return 'Google STT 識別詞數最多，建議使用。';
  }
  
  return '';
}

/**
 * 獲取本地 Whisper 詞數
 */
function getLocalWordCount(whisperLocalResults) {
  if (!whisperLocalResults.bestModel) return 0;
  return whisperLocalResults.models[whisperLocalResults.bestModel].wordCount || 0;
}

/**
 * 獲取基於處理時間的建議
 */
function getTimeRecommendation(whisperLocalResults, whisperApiResults, googleResults) {
  const hasWhisperLocalError = !!whisperLocalResults.error;
  const hasWhisperApiError = !!whisperApiResults.error;
  const hasGoogleError = !!googleResults.error;
  
  // 處理時間比較
  const whisperLocalTime = whisperLocalResults.totalProcessingTime || Infinity;
  const whisperApiTime = whisperApiResults.processingTime || Infinity;
  const googleTime = googleResults.processingTime || Infinity;
  
  // 考慮處理時間
  const minTime = Math.min(
    hasWhisperLocalError ? Infinity : whisperLocalTime,
    hasWhisperApiError ? Infinity : whisperApiTime,
    hasGoogleError ? Infinity : googleTime
  );
  
  if (minTime === whisperLocalTime && !hasWhisperLocalError) {
    return `Whisper 本地 ${whisperLocalResults.bestModel} 模型處理速度最快。`;
  } 
  
  if (minTime === whisperApiTime && !hasWhisperApiError) {
    return 'Whisper API 處理速度最快。';
  } 
  
  if (minTime === googleTime && !hasGoogleError) {
    return 'Google STT 處理速度最快。';
  }
  
  return '';
}

// 輔助函數：計算 LRC 中的詞數
function countWords(lrcContent) {
  if (!lrcContent) return 0;
  
  // 移除時間戳和標題信息
  const cleanedContent = lrcContent
    .replace(/\[\d+:\d+\.\d+\]/g, '')  // 移除時間戳
    .replace(/\[.*?\]/g, '')           // 移除標題信息
    .trim();
  
  // 計算詞數（中文每個字算一個詞）
  return cleanedContent.replace(/\s+/g, '').length;
}

// 輔助函數：右側填充
function padRight(value, length) {
  return String(value).padEnd(length);
}

// 執行主函數
main().catch(console.error);







