import google.generativeai as genai
import sys

API_KEY = "AIzaSyAgGxNn-1TcaCk3ywY_hch4ICTkwMvVamI"
genai.configure(api_key=API_KEY)

try:
    print("Listing models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
            
    print("\nTesting gemini-1.5-flash...")
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hi")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
