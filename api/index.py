from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import edge_tts
import asyncio
import tempfile
import os
from functools import wraps
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for Expo app

def async_route(f):
    """Decorator to handle async functions in Flask"""
    @wraps(f)
    def wrapped(*args, **kwargs):
        return asyncio.run(f(*args, **kwargs))
    return wrapped

@app.route('/', defaults={'path': ''})
@app.route('/api', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    # This helps diagnose what path Flask is actually seeing
    return jsonify({
        "status": "debug",
        "message": "Flask caught this request. Use /voices, /speak, or /proxy-html",
        "path_received": path,
        "request_path": request.path
    }), 200

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

@app.route('/api/speak', methods=['POST'])
@app.route('/speak', methods=['POST'])
@async_route
async def speak():
    """Convert text to speech and return audio file"""
    data = request.json
    text = data.get('text', '')
    voice = data.get('voice', 'vi-VN-HoaiMyNeural')  # Default Vietnamese voice
    rate = data.get('rate', '+0%')  # e.g., '+10%' or '-10%'
    pitch = data.get('pitch', '+0Hz')  # e.g., '+10Hz' or '-10Hz'
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
    temp_path = temp_file.name
    temp_file.close()
    
    try:
        # Generate speech
        communicate = edge_tts.Communicate(
            text,
            voice,
            rate=rate,
            pitch=pitch
        )
        await communicate.save(temp_path)
        
        # Send file
        return send_file(
            temp_path,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='speech.mp3'
        )
    except Exception as e:
        print(f"Error generating speech: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        # Schedule cleanup (file will be deleted after response is sent)
        try:
            if os.path.exists(temp_path):
                # Small delay to ensure file is sent before deletion
                await asyncio.sleep(0.1)
                os.unlink(temp_path)
        except Exception as e:
            print(f"Cleanup warning: {e}")

@app.route('/api/health', methods=['GET'])
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/proxy-html', methods=['POST'])
@app.route('/proxy-html', methods=['POST'])
def proxy_html():
    """
    CORS Proxy - Fetch HTML from URL to bypass browser CORS restrictions
    Frontend will handle parsing
    """
    data = request.json
    url = data.get('url', '')
    
    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    
    try:
        # Fetch HTML with proper headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        response.raise_for_status()
        
        # Return raw HTML (frontend will parse)
        return jsonify({
            'html': response.text,
            'status_code': response.status_code,
            'url': response.url,  # Final URL after redirects
        })
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timeout - website took too long to respond'}), 408
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Connection error - cannot reach website'}), 503
    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'HTTP error: {e.response.status_code}'}), e.response.status_code
    except Exception as e:
        return jsonify({'error': f'Failed to fetch: {str(e)}'}), 500

# Vercel requires the app in the global scope or as 'handler'
# No app.run() needed as Vercel handles the server

if __name__ == '__main__':
    print("=" * 50)
    print("🎤 Edge-TTS Vercel API Starting...")
    print("=" * 50)
    port = int(os.environ.get('PORT', 5000))
    print(f"📍 Local URL: http://localhost:{port}")
    print("\nAvailable Endpoints (both work):")
    print(f"  GET  /api/voices     or  /voices")
    print(f"  POST /api/speak      or  /speak")
    print(f"  POST /api/proxy-html or  /proxy-html")
    print(f"  GET  /api/health     or  /health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=port, debug=True)



