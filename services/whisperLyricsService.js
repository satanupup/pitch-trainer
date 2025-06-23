/**
 * Whisper 歌詞轉寫服務
 * 使用 OpenAI Whisper 模型或本地 Whisper 將音訊轉為高品質歌詞
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const config = require('../config/config');

// 將 exec 轉換為 Promise 版本
const execPromise = util.promisify(exec);

/**
 * 使用本地 Whisper 模型生成歌詞
 * @param {string} vocalPath - 人聲音訊檔案路徑
 * @param {string} outputDir - 輸出目錄
 * @param {Object} options - 選項
 * @param {string} options.model - Whisper 模型大小 (tiny, base, small, medium, large)
 * @param {string} options.language - 語言代碼 (zh, en, ja, etc.)
 * @returns {Promise<string>} - 生成的 LRC 檔案路徑
 */
async function generateLyricsWithLocalWhisper(vocalPath, outputDir, options = {}) {
    console.log(`[+] 使用本地 Whisper 生成歌詞: ${vocalPath}`);
    
    try {
        // 設定默認選項
        const model = options.model || 'medium';  // 使用 medium 模型提高準確度
        const language = options.language || 'zh'; // 默認中文
        
        // 檢查 whisper 命令是否可用
        const whisperPath = config.ai.whisperPath || 'whisper';
        
        // 執行 Whisper 命令，使用更多參數提高歌詞品質
        const command = `${whisperPath} "${vocalPath}" --model ${model} --language ${language} --output_format json --output_dir "${outputDir}" --word_timestamps True --condition_on_previous_text False`;
        
        console.log(`[+] 執行 Whisper 命令: ${command}`);
        const { stdout } = await execPromise(command);
        console.log(`[✓] Whisper 輸出: ${stdout}`);
        
        // 讀取 Whisper 生成的 JSON 文件
        const whisperOutputFile = path.join(outputDir, path.basename(vocalPath, path.extname(vocalPath)) + '.json');
        const whisperData = JSON.parse(await fs.readFile(whisperOutputFile, 'utf8'));
        
        // 生成 LRC 格式歌詞
        const lrcContent = await convertWhisperJsonToLrc(whisperData, vocalPath);
        
        // 保存 LRC 文件
        const lrcPath = path.join(outputDir, 'lyrics.lrc');
        await fs.writeFile(lrcPath, lrcContent);
        console.log(`[✓] Whisper 歌詞文件已保存: ${lrcPath}`);
        
        // 保存原始 JSON 為 lyrics_raw.json 以便後續處理
        const rawJsonPath = path.join(outputDir, 'lyrics_raw.json');
        await fs.writeFile(rawJsonPath, JSON.stringify(whisperData, null, 2));
        console.log(`[✓] 原始 JSON 數據已保存: ${rawJsonPath}`);
        
        return lrcPath;
    } catch (error) {
        console.error(`[-] Whisper 處理錯誤: ${error.message}`);
        throw error;
    }
}

/**
 * 使用 OpenAI Whisper API 生成歌詞
 * @param {string} vocalPath - 人聲音訊檔案路徑
 * @param {string} outputDir - 輸出目錄
 * @param {Object} options - 選項
 * @param {string} options.model - Whisper API 模型 (whisper-1)
 * @param {string} options.language - 語言代碼 (zh, en, ja, etc.)
 * @returns {Promise<string>} - 生成的 LRC 檔案路徑
 */
async function generateLyricsWithWhisperAPI(vocalPath, outputDir, options = {}) {
    console.log(`[+] 使用 OpenAI Whisper API 生成歌詞: ${vocalPath}`);
    
    try {
        // 檢查 API 金鑰
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('未設置 OPENAI_API_KEY 環境變數');
        }
        
        // 設定默認選項
        const model = options.model || 'whisper-1';
        const language = options.language || 'zh'; // 默認中文
        
        // 讀取音訊文件
        const audioData = await fs.readFile(vocalPath);
        
        // 準備表單數據
        const formData = new FormData();
        formData.append('file', new Blob([audioData]), path.basename(vocalPath));
        formData.append('model', model);
        formData.append('language', language);
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities', ['word']);
        
        // 呼叫 OpenAI API
        console.log(`[+] 正在呼叫 OpenAI Whisper API...`);
        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                ...formData.getHeaders()
            }
        });
        
        // 檢查響應
        if (!response.data?.segments) {
            throw new Error('API 返回的數據格式不正確');
        }
        
        // 保存原始 JSON 響應
        const rawJsonPath = path.join(outputDir, 'lyrics_raw.json');
        await fs.writeFile(rawJsonPath, JSON.stringify(response.data, null, 2));
        console.log(`[✓] 原始 JSON 數據已保存: ${rawJsonPath}`);
        
        // 轉換為 LRC 格式
        const lrcContent = await convertWhisperApiResponseToLrc(response.data, vocalPath);
        
        // 保存 LRC 文件
        const lrcPath = path.join(outputDir, 'lyrics.lrc');
        await fs.writeFile(lrcPath, lrcContent);
        console.log(`[✓] Whisper API 歌詞文件已保存: ${lrcPath}`);
        
        return lrcPath;
    } catch (error) {
        console.error(`[-] Whisper API 處理錯誤: ${error.message}`);
        if (error.response) {
            console.error(`[-] API 錯誤詳情:`, error.response.data);
        }
        throw error;
    }
}

/**
 * 將 Whisper JSON 轉換為 LRC 格式
 * @param {Object} whisperData - Whisper 生成的 JSON 數據
 * @param {string} vocalPath - 原始音訊檔案路徑
 * @returns {Promise<string>} - LRC 格式的歌詞內容
 */
async function convertWhisperJsonToLrc(whisperData, vocalPath) {
    console.log(`[+] 將 Whisper JSON 轉換為 LRC 格式...`);
    
    // 生成 LRC 標題信息
    const lrcHeader = generateLrcHeader(vocalPath);
    
    // 處理歌詞內容
    const lrcBody = processWhisperSegments(whisperData);
    
    // 合併標題和內容
    return lrcHeader + lrcBody;
}

/**
 * 生成 LRC 標題信息
 * @param {string} vocalPath - 原始音訊檔案路徑
 * @returns {string} - LRC 標題信息
 */
function generateLrcHeader(vocalPath) {
    let header = '';
    header += '[ti:Whisper自動生成歌詞]\n';
    header += '[ar:AI 生成]\n';
    header += `[al:${path.basename(vocalPath, path.extname(vocalPath))}]\n`;
    header += '[by:AI 音準資源製作器]\n\n';
    return header;
}

/**
 * 處理 Whisper 段落數據
 * @param {Object} whisperData - Whisper 生成的 JSON 數據
 * @returns {string} - LRC 格式的歌詞內容
 */
function processWhisperSegments(whisperData) {
    // 檢查是否有段落數據
    if (!whisperData.segments) {
        return processLegacyWhisperFormat(whisperData);
    }
    
    // 檢查是否有詳細的單詞時間戳
    if (hasWordTimestamps(whisperData)) {
        return processWithWordTimestamps(whisperData.segments);
    } else {
        return processWithSegmentTimestamps(whisperData.segments);
    }
}

/**
 * 檢查 Whisper 數據是否包含單詞時間戳
 * @param {Object} whisperData - Whisper 生成的 JSON 數據
 * @returns {boolean} - 是否包含單詞時間戳
 */
function hasWordTimestamps(whisperData) {
    return whisperData.segments[0]?.words && 
           whisperData.segments[0].words.length > 0;
}

/**
 * 處理舊版 Whisper 輸出格式
 * @param {Array} whisperData - 舊版 Whisper 輸出數據
 * @returns {string} - LRC 格式的歌詞內容
 */
function processLegacyWhisperFormat(whisperData) {
    let lrcContent = '';
    
    whisperData.forEach(segment => {
        const timeCode = formatTimeCode(segment.start);
        lrcContent += `${timeCode}${segment.text.trim()}\n`;
    });
    
    return lrcContent;
}

/**
 * 使用單詞時間戳處理 Whisper 段落
 * @param {Array} segments - Whisper 段落數據
 * @returns {string} - LRC 格式的歌詞內容
 */
function processWithWordTimestamps(segments) {
    let lrcContent = '';
    let currentSentence = '';
    let sentenceStartTime = 0;
    let wordCount = 0;
    
    // 遍歷所有段落
    for (const segment of segments) {
        // 遍歷段落中的每個單詞
        for (const word of segment.words) {
            // 如果是句子的第一個單詞，記錄開始時間
            if (wordCount === 0) {
                sentenceStartTime = word.start;
            }
            
            // 添加單詞到當前句子
            currentSentence += word.word + ' ';
            wordCount++;
            
            // 如果達到一定數量的單詞或遇到標點符號，結束當前句子
            if (shouldEndSentence(word.word, wordCount)) {
                // 添加到 LRC 內容
                const timeCode = formatTimeCode(sentenceStartTime);
                lrcContent += `${timeCode}${currentSentence.trim()}\n`;
                
                // 重置句子
                currentSentence = '';
                wordCount = 0;
            }
        }
        
        // 處理段落結束時的未完成句子
        if (currentSentence.trim() !== '') {
            const timeCode = formatTimeCode(sentenceStartTime);
            lrcContent += `${timeCode}${currentSentence.trim()}\n`;
            
            currentSentence = '';
            wordCount = 0;
        }
    }
    
    return lrcContent;
}

/**
 * 判斷是否應該結束當前句子
 * @param {string} word - 當前單詞
 * @param {number} wordCount - 當前句子的單詞數
 * @returns {boolean} - 是否應該結束句子
 */
function shouldEndSentence(word, wordCount) {
    return wordCount >= 5 || /[，。！？,.!?]$/.test(word);
}

/**
 * 使用段落時間戳處理 Whisper 段落
 * @param {Array} segments - Whisper 段落數據
 * @returns {string} - LRC 格式的歌詞內容
 */
function processWithSegmentTimestamps(segments) {
    let lrcContent = '';
    
    for (const segment of segments) {
        const timeCode = formatTimeCode(segment.start);
        lrcContent += `${timeCode}${segment.text.trim()}\n`;
    }
    
    return lrcContent;
}

/**
 * 格式化時間碼
 * @param {number} time - 時間（秒）
 * @returns {string} - 格式化的時間碼 [mm:ss.xx]
 */
function formatTimeCode(time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `[${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}]`;
}

/**
 * 將 Whisper API 響應轉換為 LRC 格式
 * @param {Object} apiResponse - Whisper API 響應數據
 * @param {string} vocalPath - 原始音訊檔案路徑
 * @returns {Promise<string>} - LRC 格式的歌詞內容
 */
async function convertWhisperApiResponseToLrc(apiResponse, vocalPath) {
    console.log(`[+] 將 Whisper API 響應轉換為 LRC 格式...`);
    
    // 生成 LRC 標題信息
    const lrcHeader = generateApiLrcHeader(vocalPath);
    
    // 處理歌詞內容
    const lrcBody = processApiResponse(apiResponse);
    
    // 合併標題和內容
    return lrcHeader + lrcBody;
}

/**
 * 生成 API 版本的 LRC 標題信息
 * @param {string} vocalPath - 原始音訊檔案路徑
 * @returns {string} - LRC 標題信息
 */
function generateApiLrcHeader(vocalPath) {
    let header = '';
    header += '[ti:Whisper API自動生成歌詞]\n';
    header += '[ar:AI 生成]\n';
    header += `[al:${path.basename(vocalPath, path.extname(vocalPath))}]\n`;
    header += '[by:AI 音準資源製作器]\n\n';
    return header;
}

/**
 * 處理 Whisper API 響應數據
 * @param {Object} apiResponse - Whisper API 響應數據
 * @returns {string} - LRC 格式的歌詞內容
 */
function processApiResponse(apiResponse) {
    // 檢查是否有段落數據
    if (!apiResponse.segments) {
        return '';
    }
    
    // 檢查是否有詳細的單詞時間戳
    if (apiResponse.words && apiResponse.words.length > 0) {
        return processApiWordTimestamps(apiResponse.words);
    } else {
        return processApiSegmentTimestamps(apiResponse.segments);
    }
}

/**
 * 處理 API 單詞時間戳
 * @param {Array} words - API 單詞數據
 * @returns {string} - LRC 格式的歌詞內容
 */
function processApiWordTimestamps(words) {
    let lrcContent = '';
    let currentSentence = '';
    let sentenceStartTime = 0;
    let wordCount = 0;
    
    // 遍歷所有單詞
    for (const word of words) {
        // 如果是句子的第一個單詞，記錄開始時間
        if (wordCount === 0) {
            sentenceStartTime = word.start;
        }
        
        // 添加單詞到當前句子
        currentSentence += word.word + ' ';
        wordCount++;
        
        // 如果達到一定數量的單詞或遇到標點符號，結束當前句子
        if (shouldEndSentence(word.word, wordCount)) {
            // 添加到 LRC 內容
            const timeCode = formatTimeCode(sentenceStartTime);
            lrcContent += `${timeCode}${currentSentence.trim()}\n`;
            
            // 重置句子
            currentSentence = '';
            wordCount = 0;
        }
    }
    
    // 處理最後一個未完成的句子
    if (currentSentence.trim() !== '') {
        const timeCode = formatTimeCode(sentenceStartTime);
        lrcContent += `${timeCode}${currentSentence.trim()}\n`;
    }
    
    return lrcContent;
}

/**
 * 處理 API 段落時間戳
 * @param {Array} segments - API 段落數據
 * @returns {string} - LRC 格式的歌詞內容
 */
function processApiSegmentTimestamps(segments) {
    // 重用現有的段落處理函數，因為邏輯相同
    return processWithSegmentTimestamps(segments);
}

/**
 * 主要歌詞生成函數 - 自動選擇最佳方法
 * @param {string} vocalPath - 人聲音訊檔案路徑
 * @param {string} outputDir - 輸出目錄
 * @param {Object} options - 選項
 * @returns {Promise<string>} - 生成的 LRC 檔案路徑
 */
async function generateLyrics(vocalPath, outputDir, options = {}) {
    console.log(`[+] 使用 Whisper 生成歌詞: ${vocalPath}`);
    
    try {
        // 檢查是否有 OpenAI API 金鑰
        const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
        
        // 檢查是否有本地 Whisper
        let hasLocalWhisper = false;
        try {
            const whisperPath = config.ai.whisperPath || 'whisper';
            await execPromise(`${whisperPath} --help`);
            hasLocalWhisper = true;
        } catch (error) {
            console.log(`[i] 本地 Whisper 不可用: ${error.message}`);
        }
        
        // 根據可用性選擇方法
        if (options.forceApi && hasOpenAIKey) {
            // 強制使用 API
            return await generateLyricsWithWhisperAPI(vocalPath, outputDir, options);
        } else if (options.forceLocal && hasLocalWhisper) {
            // 強制使用本地
            return await generateLyricsWithLocalWhisper(vocalPath, outputDir, options);
        } else if (hasLocalWhisper) {
            // 優先使用本地 Whisper
            return await generateLyricsWithLocalWhisper(vocalPath, outputDir, options);
        } else if (hasOpenAIKey) {
            // 備用使用 API
            return await generateLyricsWithWhisperAPI(vocalPath, outputDir, options);
        } else {
            throw new Error('無法使用 Whisper: 本地 Whisper 不可用且未設置 OPENAI_API_KEY');
        }
    } catch (error) {
        console.error(`[-] Whisper 歌詞生成錯誤: ${error.message}`);
        throw error;
    }
}

module.exports = {
    generateLyrics,
    generateLyricsWithLocalWhisper,
    generateLyricsWithWhisperAPI
};





