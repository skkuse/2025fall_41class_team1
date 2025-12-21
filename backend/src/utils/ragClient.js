const axios = require("axios");

async function queryRag(payload) {
  try {
    const response = await axios.post(
      "http://127.0.0.1:8001/chat",
      payload
    );

    return response.data?.reply ?? response.data ?? "⚠️ AI 응답 처리 실패";
  } catch (error) {
    console.error("🔴 RAG Server Error:", error.message);
    return "⚠️ 현재 AI 서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  }
}

module.exports = { queryRag };
