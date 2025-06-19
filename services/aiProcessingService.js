// 若尚未安裝 @google/generative-ai，請先執行：
// npm install @google/generative-ai

const { GoogleGenerativeAI } = require('@google/generative-ai');

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

module.exports = { getVocalCoachFeedback }; 