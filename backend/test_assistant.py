import requests
import sys
sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://127.0.0.1:8000/api/v1/assistant/chat"

questions = [
    "give me weather details of Port of Shanghai",
    "tell me current Precision in our site",
    "tell me about Total Disruptions",
    "give me number of Total Disruptions",
    "tell me about Avg Hours to Disruption",
    "give me distance between Port of Shanghai to Port of Rotterdam",
    "give me details about between Port of Shanghai to Port of Rotterdam",
]

for q in questions:
    r = requests.post(BASE, json={"messages": [{"role": "user", "content": q}]})
    reply = r.json().get("reply", "ERROR")
    print(f"Q: {q}")
    print(f"A: {reply[:250]}")
    print("---")
