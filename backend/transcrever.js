const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function transcreverAudio(buffer, mimetype) {
  try {
    console.log('🎙️ Transcrevendo áudio via Groq (Whisper)...');
    
    // Criar um arquivo temporário para o áudio
    const tempFilePath = path.join(__dirname, `temp_audio_${Date.now()}.ogg`);
    fs.writeFileSync(tempFilePath, buffer);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3",
      language: "pt",
      response_format: "text",
    });

    // Deletar o arquivo temporário
    fs.unlinkSync(tempFilePath);

    console.log('📝 Transcrição concluída:', transcription);
    return transcription;
  } catch (error) {
    console.error('❌ Erro na transcrição Groq:', error.message);
    throw error;
  }
}

module.exports = { transcreverAudio };
