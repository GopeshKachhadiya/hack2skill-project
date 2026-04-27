import urllib.request

try:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/v1/shipments") as response:
        print(response.getcode())
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
