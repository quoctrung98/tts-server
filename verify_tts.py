import edge_tts
import asyncio
import os

async def test_tts():
    text = "Xin chào, đây là bài kiểm tra chuyển đổi văn bản sang giọng nói."
    voice = "vi-VN-HoaiMyNeural"
    output_file = "test_output.mp3"
    
    print(f"Testing Edge-TTS with text: '{text}'")
    print(f"Voice: {voice}")
    
    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_file)
        print(f"✅ Success! Audio saved to {output_file}")
        
        # Clean up
        if os.path.exists(output_file):
            os.remove(output_file)
            print("Cleanup: Removed test output file.")
            
    except Exception as e:
        print(f"❌ Failed! Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_tts())
