import requests, sys
sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://127.0.0.1:8000/api/v1/assistant/chat"

def ask(q):
    r = requests.post(BASE, json={"messages": [{"role": "user", "content": q}]})
    reply = r.json().get("reply", "ERROR")
    print(f"\nQ: {q}")
    print(f"A: {reply[:350]}")
    print("-" * 60)

questions = [
    "Which shipment has the highest risk of not arriving on time this week?",
    "What percentage of our shipments are currently at risk?",
    "How much cargo value is currently at risk due to disruptions?",
    "Which origin port is causing the most delays in our network?",
    "What is the average delay across all delayed shipments right now?",
    "Which cargo type has the highest disruption rate?",
    "How many shipments will be affected if the Suez Canal disruption escalates?",
    "What is the safest route from Mumbai to Rotterdam right now given active disruptions?",
    "Which is faster — going through Suez Canal or around Cape of Good Hope for a Shanghai to Rotterdam shipment?",
    "What is the risk difference between Sea+Land and Sea-Only routing for the Dubai to Hamburg lane?",
    "Which disruption is most likely to escalate in the next 24 hours based on the forecast?",
    "What is the compounded risk if both the Bay of Biscay and Rotterdam disruptions are active?",
    "Should I delay my shipment from Singapore to Hamburg by 48 hours to avoid the current disruption window?",
    "Which ports are currently experiencing above-average weather severity?",
    "Which shipment should I reroute first — SHP-1009 or SHP-1015 — based on urgency and risk?",
]

for q in questions:
    ask(q)
