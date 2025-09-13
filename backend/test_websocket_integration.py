#!/usr/bin/env python3
"""
Test script to verify WebSocket integration with person analysis
"""

import requests
import time
from PIL import Image, ImageDraw, ImageFont
import io
import base64

def create_test_image():
    """Create a simple test image with a face-like drawing"""
    # Create a 400x400 image with white background
    img = Image.new('RGB', (400, 400), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple face
    # Head (circle)
    draw.ellipse([100, 80, 300, 280], outline='black', width=3)
    
    # Eyes
    draw.ellipse([140, 130, 170, 160], fill='black')
    draw.ellipse([230, 130, 260, 160], fill='black')
    
    # Nose
    draw.line([200, 170, 200, 200], fill='black', width=2)
    draw.line([200, 200, 185, 210], fill='black', width=2)
    draw.line([200, 200, 215, 210], fill='black', width=2)
    
    # Mouth
    draw.arc([160, 210, 240, 250], start=0, end=180, fill='black', width=3)
    
    # Add some text
    try:
        font = ImageFont.load_default()
        draw.text((150, 300), "Test Person", fill='black', font=font)
    except:
        draw.text((150, 300), "Test Person", fill='black')
    
    return img

def test_image_upload():
    """Test uploading an image for analysis"""
    print("🧪 Creating test image...")
    img = create_test_image()
    
    # Save to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG', quality=90)
    img_bytes.seek(0)
    
    print("📤 Uploading image to /analyze endpoint...")
    
    # Upload to analyze endpoint
    files = {'image': ('test_person.jpg', img_bytes, 'image/jpeg')}
    
    try:
        response = requests.post('http://127.0.0.1:8000/analyze', files=files, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Analysis completed successfully!")
            print(f"Request ID: {result.get('request_id', 'N/A')}")
            print(f"Is new person: {result.get('is_new_person', 'N/A')}")
            
            # Check if structured data exists
            llm_analysis = result.get('llm_analysis', {})
            structured_data = llm_analysis.get('structured_data')
            if structured_data:
                personal_info = structured_data.get('personal_info', {})
                print(f"Detected name: {personal_info.get('full_name', 'N/A')}")
                print(f"Location: {personal_info.get('location', 'N/A')}")
                
                professional_info = structured_data.get('professional_info', {})
                print(f"Position: {professional_info.get('current_position', 'N/A')}")
            
            print("\n🎯 WebSocket should have broadcasted this person to frontend!")
            return True
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_video_capture():
    """Test video capture endpoint"""
    print("\n📹 Testing video capture...")
    
    try:
        # Start video
        start_response = requests.get('http://127.0.0.1:8000/video/start', timeout=10)
        if start_response.status_code == 200:
            print("✅ Video started successfully!")
            
            time.sleep(1)  # Wait a moment
            
            # Capture frame
            capture_response = requests.post('http://127.0.0.1:8000/video/capture', timeout=30)
            if capture_response.status_code == 200:
                result = capture_response.json()
                print("✅ Frame captured and analyzed!")
                print(f"Request ID: {result.get('request_id', 'N/A')}")
                return True
            else:
                print(f"❌ Frame capture failed: {capture_response.status_code}")
                return False
        else:
            print(f"❌ Video start failed: {start_response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Video test failed: {e}")
        return False
    finally:
        # Stop video
        try:
            requests.get('http://127.0.0.1:8000/video/stop', timeout=5)
        except:
            pass

def main():
    print("🚀 Testing WebSocket Integration for Person Analysis")
    print("=" * 50)
    
    # Test server health
    try:
        health = requests.get('http://127.0.0.1:8000/health', timeout=5)
        if health.status_code == 200:
            print("✅ Server is healthy")
        else:
            print("❌ Server health check failed")
            return
    except:
        print("❌ Cannot connect to server. Make sure it's running on port 8000")
        return
    
    print("\n📝 Instructions:")
    print("1. Make sure your frontend is running (npm run dev)")
    print("2. Open browser console to see WebSocket messages")
    print("3. Watch for new person notifications in the UI")
    print()
    
    # Test image upload
    success1 = test_image_upload()
    
    if success1:
        print("\n⏱️  Wait 5 seconds to see if person appears in frontend...")
        time.sleep(5)
    
    # Test video capture (optional - requires camera)
    print("\n" + "=" * 50)
    test_choice = input("Do you want to test video capture? (y/n): ").lower().strip()
    if test_choice == 'y':
        success2 = test_video_capture()
    else:
        success2 = True
        print("⏭️  Skipping video capture test")
    
    print("\n" + "=" * 50)
    if success1:
        print("🎉 Test completed! Check your frontend for new person.")
        print("💡 Tips:")
        print("   - Check browser console for WebSocket messages")
        print("   - Look for notification popup in top-right")
        print("   - New person should appear in sidebar")
        print("   - Analysis data should be in person profile")
    else:
        print("⚠️  Some tests failed. Check server logs for details.")

if __name__ == "__main__":
    main()
