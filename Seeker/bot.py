import telebot
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    cid = message.chat.id
    text = (
        "🔍 **Seeker Bot Local** 🔍\n\n"
        "Este bot ajuda a gerenciar a ferramenta Seeker local.\n"
        "Para começar:\n"
        "1. Configure seu `.env` com este Chat ID.\n"
        "2. Inicie o servidor `app.py`.\n"
        "3. Use /generate para ver as instruções.\n\n"
        f"Seu Chat ID: `{cid}`"
    )
    bot.reply_to(message, text, parse_mode="Markdown")

@bot.message_handler(commands=['generate'])
def generate_link(message):
    base_url = os.getenv("BASE_URL", "http://localhost:5000")
    text = (
        "🚀 **Link Gerado!**\n\n"
        f"Link Local: `{base_url}`\n\n"
        "⚠️ **Nota:** Para o link funcionar fora da sua rede, use o **Ngrok**:\n"
        "`ngrok http 5000`"
    )
    bot.send_message(message.chat.id, text, parse_mode="Markdown")

if __name__ == "__main__":
    print("Bot Seeker Iniciado...")
    bot.infinity_polling()
