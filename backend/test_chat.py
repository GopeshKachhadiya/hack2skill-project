import urllib.request
import json

url = 'http://127.0.0.1:8000/api/v1/assistant/chat'
data = json.dumps({"messages": [{"role": "user", "content": "can you list some of the recent shipments tracked on the platform?"}]}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")