from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import edge_tts
import asyncio
import tempfile
import os
from functools import wraps

app = Flask(__name__)
CORS(app)

def async_route(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        return asyncio.run(f(*args, **kwargs))
    return wrapped

@app.route('/api/speak', methods=['POST'])
@app.route('/speak', methods=['POST'])
@async_route
async def speak():
    data = request.json
    text = data.get('text', '')
    voice = data.get('voice', 'vi-VN-HoaiMyNeural')
    rate = data.get('rate', '+0%')
    pitch = data.get('pitch', '+0Hz')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
    temp_path = temp_file.name
    temp_file.close()
    
    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await communicate.save(temp_path)
        return send_file(temp_path, mimetype='audio/mpeg', as_attachment=False, download_name='speech.mp3')
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            if os.path.exists(temp_path):
                await asyncio.sleep(0.1)
                os.unlink(temp_path)
        except:
            pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
