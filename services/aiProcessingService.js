// 若尚未安裝 @google/generative-ai，請先執行：
// npm install @google/generative-ai

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// 請將你的 Gemini API 金鑰設為環境變數 GOOGLE_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * 呼叫 Gemini 產生歌唱教練回饋
 * @param {Object} scoreData - 包含分數和分析數據的 JSON 物件
 * @returns {Promise<string>} - LLM 生成的繁體中文回饋
 */
async function getVocalCoachFeedback(scoreData) {
    const prompt = `你是一位友善且專業的歌唱教練。請根據以下用戶的練習分數與聲音分析數據，給出三點具體且鼓勵性的建議，內容請用繁體中文，並以條列方式呈現：\n\n使用者數據：${JSON.stringify(scoreData, null, 2)}`;
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const response = result.response;
    return response.text();
}

async function processSong(filePath) {
    // 呼叫 Python Flask 分析服務
    try {
        const formData = new FormData();
        const fs = require('fs');
        formData.append('audio', fs.createReadStream(filePath));
        const response = await axios.post('http://localhost:5001/analyze_vocal', formData, {
            headers: formData.getHeaders()
        });
        return response.data;
    } catch (error) {
        console.error('[-] 呼叫分析服務失敗:', error.message);
        throw new Error('分析服務失敗');
    }
}

module.exports = { getVocalCoachFeedback, processSong }; 