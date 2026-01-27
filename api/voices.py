from flask import Flask, jsonify
from flask_cors import CORS
import edge_tts
import asyncio
from functools import wraps

app = Flask(__name__)
CORS(app)

def async_route(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        return asyncio.run(f(*args, **kwargs))
    return wrapped

@app.route('/api/voices', methods=['GET'])
@app.route('/voices', methods=['GET'])
@async_route
async def get_voices():
    """Get all available Vietnamese voices"""
    voices = await edge_tts.list_voices()
    vi_voices = [
        {
            'name': v['ShortName'],
            'gender': v['Gender'],
            'locale': v['Locale']
        }
        for v in voices if v['Locale'].startswith('vi-')
    ]
    return jsonify(vi_voices)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
