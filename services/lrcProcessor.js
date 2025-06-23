/**
 * LRC 歌詞後處理模組
 * 用於優化 AI 生成的歌詞，提高可讀性與對拍精準度
 */

const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');
const { MidiParser } = require('midi-parser-js');

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * 處理 LRC 歌詞文件
 * @param {string} lrcPath - LRC 文件路徑
 * @param {Object} options - 處理選項
 * @returns {Promise<string>} - 處理後的 LRC 文件路徑
 */
async function processLrcFile(lrcPath, options = {}) {
    console.log(`[+] 處理 LRC 歌詞文件: ${lrcPath}`);
    
    try {
        // 讀取 LRC 文件
        const lrcContent = await fs.readFile(lrcPath, 'utf8');
        
        // 解析 LRC 內容
        const parsedLrc = parseLrc(lrcContent);
        
        // 執行各種優化
        let optimizedLrc = parsedLrc;
        
        // 1. 斷句優化
        if (options.optimizeSentences !== false) {
            optimizedLrc = optimizeSentences(optimizedLrc);
        }
        
        // 2. 副歌檢測與統一
        if (options.detectChorus !== false) {
            optimizedLrc = detectAndOptimizeChorus(optimizedLrc);
        }
        
        // 3. 使用 Gemini 優化歌詞內容
        if (options.useGemini !== false) {
            optimizedLrc = await enhanceLyricsWithGemini(optimizedLrc);
        }
        
        // 4. 時間碼對齊優化
        if (options.alignTimestamps !== false && options.midiPath) {
            optimizedLrc = await alignTimestampsWithMidi(optimizedLrc, options.midiPath);
        }
        
        // 生成優化後的 LRC 內容
        const optimizedLrcContent = generateLrcContent(optimizedLrc);
        
        // 保存優化後的 LRC 文件
        const outputPath = options.outputPath || path.join(path.dirname(lrcPath), 'lyrics_optimized.lrc');
        await fs.writeFile(outputPath, optimizedLrcContent);
        console.log(`[✓] 優化後的 LRC 文件已保存: ${outputPath}`);
        
        return outputPath;
    } catch (error) {
        console.error(`[-] LRC 處理錯誤: ${error.message}`);
        throw error;
    }
}

/**
 * 解析 LRC 文件內容
 * @param {string} lrcContent - LRC 文件內容
 * @returns {Object} - 解析後的 LRC 數據
 */
function parseLrc(lrcContent) {
    console.log(`[+] 解析 LRC 內容...`);
    
    const lines = lrcContent.split('\n');
    const metadata = {};
    const lyrics = [];
    
    // 解析每一行
    for (const line of lines) {
        // 跳過空行
        if (!line.trim()) continue;
        
        // 解析元數據行 (如 [ti:歌名])
        if (line.startsWith('[') && line.includes(':') && !(/\[\d+:/).test(line)) {
            const metaRegex = /\[([a-z]+):(.*)\]/;
            const metaMatch = metaRegex.exec(line);
            if (metaMatch) {
                metadata[metaMatch[1]] = metaMatch[2];
                continue;
            }
        }
        
        // 解析歌詞行 (如 [00:12.34]歌詞內容)
        const timeRegex = /\[(\d+):(\d+\.\d+)\](.*)/;
        const timeMatch = timeRegex.exec(line);
        if (timeMatch) {
            const minutes = parseInt(timeMatch[1]);
            const seconds = parseFloat(timeMatch[2]);
            const timestamp = minutes * 60 + seconds;
            const text = timeMatch[3].trim();
            
            if (text) {
                lyrics.push({
                    timestamp,
                    minutes,
                    seconds,
                    text
                });
            }
        }
    }
    
    // 按時間戳排序
    lyrics.sort((a, b) => a.timestamp - b.timestamp);
    
    return { metadata, lyrics };
}

/**
 * 優化歌詞斷句
 * @param {Object} parsedLrc - 解析後的 LRC 數據
 * @returns {Object} - 優化後的 LRC 數據
 */
function optimizeSentences(parsedLrc) {
    console.log(`[+] 優化歌詞斷句...`);
    
    const { metadata, lyrics } = parsedLrc;
    
    // 如果歌詞行數太少，不需要優化
    if (lyrics.length <= 3) {
        return parsedLrc;
    }
    
    // 合併短句並添加標點
    const optimizedLyrics = mergeShortLines(lyrics);
    
    return { metadata, lyrics: optimizedLyrics };
}

/**
 * 合併過短的歌詞行
 * @param {Array} lyrics - 歌詞行數組
 * @returns {Array} - 合併後的歌詞行
 */
function mergeShortLines(lyrics) {
    const optimizedLyrics = [];
    let i = 0;
    
    while (i < lyrics.length) {
        const currentLine = { ...lyrics[i] };
        const nextLine = i < lyrics.length - 1 ? lyrics[i + 1] : null;
        
        // 檢查是否需要合併
        if (shouldMergeLines(currentLine, nextLine)) {
            // 合併當前行和下一行
            currentLine.text += ' ' + nextLine.text;
            // 將合併後的行添加到結果中
            optimizedLyrics.push(currentLine);
            // 跳過兩行
            i += 2;
        } else {
            // 當前行不需要合併，直接添加
            optimizedLyrics.push(currentLine);
            // 處理下一行
            i += 1;
        }
    }
    
    // 添加標點符號
    return addPunctuation(optimizedLyrics);
}

/**
 * 判斷是否應該合併兩行歌詞
 * @param {Object} currentLine - 當前行
 * @param {Object} nextLine - 下一行
 * @returns {boolean} - 是否應該合併
 */
function shouldMergeLines(currentLine, nextLine) {
    if (!nextLine) return false;
    
    // 檢查當前行是否太短（少於 5 個字符）
    const isTooShort = currentLine.text.length < 5;
    
    // 檢查當前行是否是句子的一部分（沒有結束標點）
    const isPartialSentence = !(/[。！？!?]$/.test(currentLine.text));
    
    // 檢查時間間隔是否很短（小於 2 秒）
    const isCloseInTime = nextLine.timestamp - currentLine.timestamp < 2;
    
    return (isTooShort || isPartialSentence) && isCloseInTime;
}

/**
 * 為歌詞行添加適當的標點符號
 * @param {Array} lyrics - 歌詞行數組
 * @returns {Array} - 添加標點後的歌詞行
 */
function addPunctuation(lyrics) {
    for (let i = 0; i < lyrics.length; i++) {
        const line = lyrics[i];
        
        // 如果行尾沒有標點符號，添加適當的標點
        if (!(/[，。！？,.!?]$/).test(line.text)) {
            // 如果是最後一行或下一行時間間隔較大，添加句號
            if (i === lyrics.length - 1 || 
                (lyrics[i + 1].timestamp - line.timestamp > 3)) {
                line.text += '。';
            } else {
                // 否則添加逗號
                line.text += '，';
            }
        }
    }
    
    return lyrics;
}

/**
 * 檢測並優化副歌部分
 * @param {Object} parsedLrc - 解析後的 LRC 數據
 * @returns {Object} - 優化後的 LRC 數據
 */
function detectAndOptimizeChorus(parsedLrc) {
    console.log(`[+] 檢測並優化副歌...`);
    
    const { metadata, lyrics } = parsedLrc;
    
    // 如果歌詞行數太少，不需要優化
    if (lyrics.length <= 10) {
        return parsedLrc;
    }
    
    // 1. 生成可能的段落
    const segments = generatePossibleSegments(lyrics);
    
    // 2. 尋找重複段落
    const repeatedSegments = findRepeatedSegments(segments);
    
    // 3. 優化副歌部分
    const optimizedLyrics = optimizeChorusIfFound(lyrics, repeatedSegments);
    
    return { metadata, lyrics: optimizedLyrics };
}

/**
 * 生成可能的歌詞段落
 * @param {Array} lyrics - 歌詞行數組
 * @returns {Array} - 可能的段落數組
 */
function generatePossibleSegments(lyrics) {
    const segments = [];
    const minSegmentLength = 3; // 最小副歌長度（行數）
    
    for (let i = 0; i < lyrics.length - minSegmentLength; i++) {
        for (let j = i + minSegmentLength; j <= Math.min(i + 10, lyrics.length); j++) {
            const segment = lyrics.slice(i, j);
            const segmentText = segment.map(line => line.text).join(' ');
            segments.push({
                start: i,
                end: j - 1,
                length: j - i,
                text: segmentText
            });
        }
    }
    
    return segments;
}

/**
 * 尋找重複的段落
 * @param {Array} segments - 可能的段落數組
 * @returns {Array} - 重複的段落數組
 */
function findRepeatedSegments(segments) {
    const repeatedSegments = [];
    
    for (let i = 0; i < segments.length; i++) {
        const segment1 = segments[i];
        
        for (let j = i + 1; j < segments.length; j++) {
            const segment2 = segments[j];
            
            // 如果兩個段落重疊，跳過
            if (segment2.start <= segment1.end) continue;
            
            // 計算相似度
            const similarity = calculateSimilarity(segment1.text, segment2.text);
            
            // 如果相似度高，可能是副歌
            if (similarity > 0.7) {
                repeatedSegments.push({
                    segment1,
                    segment2,
                    similarity
                });
            }
        }
    }
    
    // 按相似度排序
    return repeatedSegments.sort((a, b) => b.similarity - a.similarity);
}

/**
 * 如果找到副歌，優化歌詞
 * @param {Array} lyrics - 原始歌詞行數組
 * @param {Array} repeatedSegments - 重複的段落數組
 * @returns {Array} - 優化後的歌詞行數組
 */
function optimizeChorusIfFound(lyrics, repeatedSegments) {
    // 複製歌詞數組，避免修改原始數據
    const optimizedLyrics = [...lyrics];
    
    // 如果找到重複段落，優化副歌
    if (repeatedSegments.length > 0) {
        const bestMatch = repeatedSegments[0];
        const chorus1 = optimizedLyrics.slice(bestMatch.segment1.start, bestMatch.segment1.end + 1);
        const chorus2 = optimizedLyrics.slice(bestMatch.segment2.start, bestMatch.segment2.end + 1);
        
        console.log(`[✓] 檢測到副歌: 第一次出現在 ${chorus1[0].timestamp}s, 第二次出現在 ${chorus2[0].timestamp}s`);
        
        // 統一副歌歌詞（使用第一次出現的副歌作為標準）
        for (let i = 0; i < chorus1.length && i < chorus2.length; i++) {
            // 保留時間戳，但統一歌詞文本
            optimizedLyrics[bestMatch.segment2.start + i].text = chorus1[i].text;
        }
        
        // 標記副歌（在第二次出現的副歌前添加 [Chorus] 標記）
        const chorusStartIndex = bestMatch.segment2.start;
        if (chorusStartIndex > 0) {
            // 在副歌前添加標記
            optimizedLyrics[chorusStartIndex].text = '[副歌] ' + optimizedLyrics[chorusStartIndex].text;
        }
    } else {
        console.log(`[i] 未檢測到明顯的副歌部分`);
    }
    
    return optimizedLyrics;
}

/**
 * 計算兩個字符串的相似度（使用 Levenshtein 距離）
 * @param {string} str1 - 第一個字符串
 * @param {string} str2 - 第二個字符串
 * @returns {number} - 相似度（0-1）
 */
function calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    
    // 如果長度差異太大，直接返回低相似度
    if (Math.abs(len1 - len2) / Math.max(len1, len2) > 0.3) {
        return 0;
    }
    
    // 計算 Levenshtein 距離
    const dp = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
    
    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,      // 刪除
                dp[i][j - 1] + 1,      // 插入
                dp[i - 1][j - 1] + cost // 替換
            );
        }
    }
    
    // 計算相似度
    const maxLen = Math.max(len1, len2);
    return 1 - dp[len1][len2] / maxLen;
}

/**
 * 使用 Gemini 優化歌詞內容
 * @param {Object} parsedLrc - 解析後的 LRC 數據
 * @returns {Promise<Object>} - 優化後的 LRC 數據
 */
async function enhanceLyricsWithGemini(parsedLrc) {
    console.log(`[+] 使用 Gemini 優化歌詞內容...`);
    
    const { metadata, lyrics } = parsedLrc;
    
    // 如果沒有設置 Google API 金鑰，跳過優化
    if (!process.env.GOOGLE_API_KEY) {
        console.log(`[!] 未設置 GOOGLE_API_KEY，跳過 Gemini 優化`);
        return parsedLrc;
    }
    
    try {
        // 提取純文本歌詞
        const lyricsText = lyrics.map(line => line.text).join('\n');
        
        // 使用 Gemini 模型
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // 構建提示詞
        const prompt = `
你是一位專業的歌詞編輯。以下是通過語音識別生成的歌詞，可能存在一些錯誤或不連貫的地方。
請幫我修正並優化這些歌詞，使其更加通順、有意義，並保持原始的情感和主題。
如果有明顯的錯誤，請修正；如果有缺失的部分，請根據上下文合理補充。
請保持繁體中文輸出，並確保修改後的歌詞仍然符合原始歌詞的風格和意境。
請保持每行的長度大致相同，適合歌唱。
請不要添加任何解釋，只需返回優化後的歌詞文本。

原始歌詞：
${lyricsText}

優化後的歌詞：`;
        
        // 呼叫 Gemini API
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const response = result.response;
        const enhancedLyricsText = response.text().trim();
        
        // 將優化後的歌詞拆分為行
        const enhancedLines = enhancedLyricsText.split('\n');
        
        // 如果優化後的行數與原始行數不匹配，保留原始歌詞
        if (enhancedLines.length !== lyrics.length) {
            console.log(`[!] Gemini 優化後的行數 (${enhancedLines.length}) 與原始行數 (${lyrics.length}) 不匹配，保留原始歌詞`);
            return parsedLrc;
        }
        
        // 更新歌詞文本，保留原始時間戳
        const optimizedLyrics = lyrics.map((line, index) => ({
            ...line,
            text: enhancedLines[index]
        }));
        
        console.log(`[✓] Gemini 優化完成`);
        return { metadata, lyrics: optimizedLyrics };
    } catch (error) {
        console.error(`[-] Gemini API 調用錯誤: ${error.message}`);
        // 如果 Gemini API 失敗，返回原始歌詞
        return parsedLrc;
    }
}

/**
 * 使用 MIDI 數據對齊歌詞時間碼
 * @param {Object} parsedLrc - 解析後的 LRC 數據
 * @param {string} midiPath - MIDI 文件路徑
 * @returns {Promise<Object>} - 優化後的 LRC 數據
 */
async function alignTimestampsWithMidi(parsedLrc, midiPath) {
    console.log(`[+] 使用 MIDI 對齊歌詞時間碼: ${midiPath}`);
    
    try {
        // 讀取 MIDI 文件
        const midiData = await fs.readFile(midiPath);
        
        // 解析 MIDI 數據
        const midi = MidiParser.parse(midiData);
        
        // 如果沒有音符數據，返回原始歌詞
        if (!midi.track || midi.track.length === 0) {
            console.log(`[!] MIDI 文件沒有音軌數據，跳過對齊`);
            return parsedLrc;
        }
        
        // 找到包含音符的音軌
        const noteTrack = midi.track?.find(track => 
            track.event?.some(event => event.type === 9)
        );
        
        if (!noteTrack) {
            console.log(`[!] MIDI 文件沒有包含音符的音軌，跳過對齊`);
            return parsedLrc;
        }
        
        // 提取音符事件
        const noteEvents = noteTrack.event
            .filter(event => event.type === 9 && event.data[1] > 0) // Note On 事件
            .map(event => ({
                note: event.data[0],
                velocity: event.data[1],
                deltaTime: event.deltaTime
            }));
        
        // 計算每個音符的絕對時間（秒）
        let currentTime = 0;
        const ticksPerBeat = midi.timeDivision;
        const tempo = 500000; // 默認 tempo (微秒/四分音符)
        const secondsPerTick = (tempo / 1000000) / ticksPerBeat;
        
        const noteTimestamps = [];
        for (const note of noteEvents) {
            currentTime += note.deltaTime * secondsPerTick;
            noteTimestamps.push({
                time: currentTime,
                note: note.note
            });
        }
        
        // 對齊歌詞時間碼
        const { metadata, lyrics } = parsedLrc;
        const alignedLyrics = [];
        
        // 如果音符數量太少，不進行對齊
        if (noteTimestamps.length < lyrics.length) {
            console.log(`[!] MIDI 音符數量 (${noteTimestamps.length}) 少於歌詞行數 (${lyrics.length})，跳過對齊`);
            return parsedLrc;
        }
        
        // 為每行歌詞找到最接近的音符時間
        for (let i = 0; i < lyrics.length; i++) {
            const line = lyrics[i];
            
            // 計算當前行在整個歌詞中的相對位置（0-1）
            const relativePosition = i / (lyrics.length - 1);
            
            // 根據相對位置找到對應的音符索引
            const noteIndex = Math.floor(relativePosition * (noteTimestamps.length - 1));
            
            // 使用音符時間作為歌詞時間
            const noteTime = noteTimestamps[noteIndex].time;
            
            // 創建新的歌詞行
            const minutes = Math.floor(noteTime / 60);
            const seconds = noteTime % 60;
            
            alignedLyrics.push({
                timestamp: noteTime,
                minutes,
                seconds,
                text: line.text
            });
        }
        
        console.log(`[✓] 時間碼對齊完成`);
        return { metadata, lyrics: alignedLyrics };
    } catch (error) {
        console.error(`[-] MIDI 對齊錯誤: ${error.message}`);
        // 如果對齊失敗，返回原始歌詞
        return parsedLrc;
    }
}

/**
 * 生成 LRC 格式內容
 * @param {Object} parsedLrc - 解析後的 LRC 數據
 * @returns {string} - LRC 格式的歌詞內容
 */
function generateLrcContent(parsedLrc) {
    const { metadata, lyrics } = parsedLrc;
    let lrcContent = '';
    
    // 添加元數據
    for (const [key, value] of Object.entries(metadata)) {
        lrcContent += `[${key}:${value}]\n`;
    }
    
    // 添加空行
    lrcContent += '\n';
    
    // 添加歌詞行
    for (const line of lyrics) {
        const minutes = line.minutes.toString().padStart(2, '0');
        const seconds = line.seconds.toFixed(2).padStart(5, '0');
        lrcContent += `[${minutes}:${seconds}]${line.text}\n`;
    }
    
    return lrcContent;
}

module.exports = {
    processLrcFile,
    parseLrc,
    optimizeSentences,
    detectAndOptimizeChorus,
    enhanceLyricsWithGemini,
    alignTimestampsWithMidi,
    generateLrcContent
};











