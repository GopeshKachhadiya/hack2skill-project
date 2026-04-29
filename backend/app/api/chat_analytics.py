from __future__ import annotations
import math
from typing import Any, Dict, List, Optional
from app.ml.model_evaluation import build_mock_performance_report

# ── helpers ────────────────────────────────────────────────────────────────────

AT_RISK = {"critical", "disrupted", "delayed"}

def _haversine_km(o: Dict, d: Dict) -> float:
    R = 6371
    lat1, lon1 = math.radians(o["lat"]), math.radians(o["lng"])
    lat2, lon2 = math.radians(d["lat"]), math.radians(d["lng"])
    a = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def _risk_label(score: float) -> str:
    if score >= 0.75: return "CRITICAL"
    if score >= 0.50: return "HIGH"
    if score >= 0.25: return "MEDIUM"
    return "LOW"


# ── 1. Highest risk of not arriving on time ────────────────────────────────────

def highest_late_risk(shipments: List[Dict]) -> str:
    candidates = [s for s in shipments if s["currentStatus"] in AT_RISK]
    if not candidates:
        return "All tracked shipments are currently **on time** with no critical risk flags."
    top = max(candidates, key=lambda s: (float(s["riskScore"]), float(s["delay"])))
    return "\n".join([
        f"The shipment with the highest risk of **not arriving on time** is **{top['id']}**:",
        f"* **Route:** {top['origin']} → {top['destination']}",
        f"* **Status:** {top['currentStatus'].replace('_',' ').title()}",
        f"* **Risk Score:** {round(float(top['riskScore'])*100,1)}%",
        f"* **Current Delay:** {top['delay']}h",
        f"* **ETA:** {top['expectedArrival']}",
        f"* **Cargo Value:** ${float(top['cargoValue']):,.0f}",
        f"\nRecommendation: Immediate rerouting or priority escalation advised.",
    ])


# ── 2. % shipments at risk ─────────────────────────────────────────────────────

def pct_at_risk(shipments: List[Dict]) -> str:
    total = len(shipments)
    if not total:
        return "No shipment data available."
    at_risk = [s for s in shipments if s["currentStatus"] in AT_RISK]
    pct = round(len(at_risk) / total * 100, 1)
    by_status: Dict[str, int] = {}
    for s in at_risk:
        by_status[s["currentStatus"]] = by_status.get(s["currentStatus"], 0) + 1
    breakdown = ", ".join(f"**{v} {k}**" for k, v in sorted(by_status.items()))
    return "\n".join([
        f"**{pct}%** of shipments ({len(at_risk)} out of {total}) are currently **at risk**.",
        f"Breakdown: {breakdown}.",
        f"The remaining **{total - len(at_risk)} shipments** ({round(100-pct,1)}%) are on time or delivered.",
    ])


# ── 3. Cargo value at risk ─────────────────────────────────────────────────────

def cargo_value_at_risk(shipments: List[Dict]) -> str:
    at_risk = [s for s in shipments if s["currentStatus"] in AT_RISK]
    total_val = sum(float(s["cargoValue"]) for s in shipments)
    risk_val = sum(float(s["cargoValue"]) for s in at_risk)
    pct = round(risk_val / total_val * 100, 1) if total_val else 0
    return "\n".join([
        f"**${risk_val:,.0f}** worth of cargo is currently at risk due to disruptions.",
        f"* That represents **{pct}%** of the total tracked cargo value (${total_val:,.0f}).",
        f"* **{len(at_risk)} shipments** are affected (critical, disrupted, or delayed).",
        f"\nAction: Prioritize insurance review and rerouting for the highest-value at-risk shipments.",
    ])


# ── 4. Which origin port causes most delays ────────────────────────────────────

def most_delay_origin(shipments: List[Dict]) -> str:
    from collections import Counter
    delayed = [s for s in shipments if s["currentStatus"] in {"delayed", "critical", "disrupted"}]
    if not delayed:
        return "No delayed or critical shipments found — all origins are performing normally."
    counts = Counter(s["origin"] for s in delayed)
    top_port, top_count = counts.most_common(1)[0]
    lines = [
        f"**{top_port}** is causing the most delays with **{top_count} delayed/critical shipments** originating there.",
        "**Top 5 delay-causing ports:**",
    ]
    for port, count in counts.most_common(5):
        lines.append(f"* **{port}**: {count} shipment(s) delayed")
    return "\n".join(lines)


# ── 5. Average delay across delayed shipments ──────────────────────────────────

def avg_delay(shipments: List[Dict]) -> str:
    delayed = [s for s in shipments if s["currentStatus"] == "delayed" and float(s["delay"]) > 0]
    if not delayed:
        return "There are no delayed shipments in the current dataset."
    avg = round(sum(float(s["delay"]) for s in delayed) / len(delayed), 1)
    worst = max(delayed, key=lambda s: float(s["delay"]))
    return "\n".join([
        f"The **average delay** across {len(delayed)} delayed shipments is **{avg} hours**.",
        f"* **Worst delay:** {worst['id']} at {worst['delay']}h ({worst['origin']} → {worst['destination']})",
        f"* **Shortest delay:** {min(delayed, key=lambda s: float(s['delay']))['delay']}h",
    ])


# ── 6. Cargo type with highest disruption rate ─────────────────────────────────

def cargo_type_disruption_rate(shipments: List[Dict]) -> str:
    from collections import defaultdict
    counts: Dict[str, Dict[str, int]] = defaultdict(lambda: {"total": 0, "at_risk": 0})
    for s in shipments:
        ct = s.get("cargoType", "Unknown")
        counts[ct]["total"] += 1
        if s["currentStatus"] in AT_RISK:
            counts[ct]["at_risk"] += 1
    if not counts:
        return "No shipment data available."
    rates = {ct: (v["at_risk"] / v["total"] * 100 if v["total"] else 0) for ct, v in counts.items()}
    top = max(rates, key=rates.get)
    lines = [
        f"**{top}** cargo type has the highest disruption rate at **{round(rates[top],1)}%**.",
        "**Disruption rates by cargo type:**",
    ]
    for ct, rate in sorted(rates.items(), key=lambda x: -x[1]):
        d = counts[ct]
        lines.append(f"* **{ct}**: {round(rate,1)}% ({d['at_risk']}/{d['total']} shipments at risk)")
    return "\n".join(lines)


# ── 7. Suez Canal escalation impact ───────────────────────────────────────────

def suez_impact(shipments: List[Dict], disruptions: List[Dict]) -> str:
    keywords = ["suez", "red sea", "gulf of aden", "mediterranean"]
    affected = [
        s for s in shipments
        if any(kw in s.get("origin","").lower() or kw in s.get("destination","").lower() for kw in keywords)
    ]
    suez_disruption = next((d for d in disruptions if "suez" in d.get("location","").lower()), None)
    sev = round(float(suez_disruption.get("predicted_severity", 0.5)) * 100, 0) if suez_disruption else 50
    transit = [s for s in shipments if "suez" in s.get("origin","").lower() + s.get("destination","").lower()]
    estimate = max(len(affected), len(transit), int(len(shipments) * 0.18))
    return "\n".join([
        f"If the Suez Canal disruption escalates, an estimated **~{estimate} shipments** would be directly affected.",
        f"* Current Suez disruption severity: **{sev:.0f}%**",
        f"* Directly identified Suez-route shipments: **{len(transit)}**",
        f"* Estimated broader Red Sea / Mediterranean impact: **~{int(len(shipments)*0.18)} shipments**",
        f"\nRecommendation: Pre-plan Cape of Good Hope reroutes — adds ~3,500 km but avoids the disruption zone.",
    ])


# ── 8. Safest route given disruptions ─────────────────────────────────────────

def safest_route(origin: str, dest: str, disruptions: List[Dict]) -> str:
    high_risk = [d for d in disruptions if float(d.get("predicted_severity", 0)) >= 0.5]
    risk_zones = [d["location"] for d in high_risk]
    lines = [
        f"**Safest route analysis: {origin} → {dest}**",
        f"* **{len(high_risk)} high-severity disruption zone(s)** are currently active.",
    ]
    if risk_zones:
        lines.append(f"* **Zones to avoid:** {', '.join(risk_zones[:5])}")
    lines += [
        "* **Recommended mode:** Sea-Only (Bezier) to stay on open maritime corridors.",
        "* **Alternative:** If Suez is affected, route via Cape of Good Hope (+3,500 km but lower risk).",
        "\nUse the **Route Optimization** page → select ports → choose 'Sea Only' → click 'Find Optimized Route' for a live risk-aware path.",
    ]
    return "\n".join(lines)


# ── 9. Suez vs Cape of Good Hope comparison ───────────────────────────────────

def suez_vs_cape(disruptions: List[Dict]) -> str:
    suez_d = next((d for d in disruptions if "suez" in d.get("location","").lower()), None)
    suez_sev = round(float(suez_d.get("predicted_severity", 0.3)) * 100, 0) if suez_d else 30
    return "\n".join([
        "**Suez Canal vs Cape of Good Hope — Shanghai to Rotterdam**",
        "",
        "| Route | Distance | Transit Time | Current Risk |",
        "|---|---|---|---|",
        f"| Suez Canal | ~19,500 km | ~22 days | **{suez_sev:.0f}% severity** {'⚠️ ACTIVE DISRUPTION' if suez_d else ''} |",
        "| Cape of Good Hope | ~23,000 km | ~26 days | Low (~15%) |",
        "",
        f"**Verdict:** {'Cape of Good Hope is recommended right now — Suez has an active disruption.' if suez_d and suez_sev > 40 else 'Suez Canal is currently the faster and lower-risk option.'}",
        "* Suez adds ~4 days less transit but currently carries higher disruption risk.",
        "* Cape route adds ~3,500 km and 4 days but avoids the active risk zone.",
    ])


# ── 10. Sea+Land vs Sea-Only risk difference ──────────────────────────────────

def routing_mode_comparison(origin: str, dest: str, disruptions: List[Dict]) -> str:
    land_risks = [d for d in disruptions if float(d.get("predicted_severity", 0)) > 0.3]
    sea_risks = [d for d in disruptions if "weather" in d.get("disruption_type","").lower()]
    return "\n".join([
        f"**Routing mode comparison: {origin} → {dest}**",
        "",
        "| Mode | Risk Exposure | Distance | Best For |",
        "|---|---|---|---|",
        f"| Sea + Land (A*) | {len(land_risks)} active risk zones | Shorter | Standard freight |",
        f"| Sea Only (Bezier) | {len(sea_risks)} weather zones | +8–12% longer | High-value / time-sensitive |",
        "",
        f"* **Sea + Land** uses A* pathfinding across the full route graph — faster but crosses more disruption zones.",
        f"* **Sea Only** stays on open maritime corridors — safer but slightly longer.",
        f"* With {len(land_risks)} active disruptions, **Sea Only mode is recommended** for this lane right now.",
    ])


# ── 11. Which disruption will escalate soonest ────────────────────────────────

def likely_escalation(disruptions: List[Dict]) -> str:
    if not disruptions:
        return "No active disruptions tracked right now."
    top = max(disruptions, key=lambda d: float(d.get("probability", 0)) * float(d.get("predicted_severity", 0)))
    prob = round(float(top.get("probability", 0)) * 100, 0)
    sev = round(float(top.get("predicted_severity", 0)), 2)
    return "\n".join([
        f"**{top['location']}** has the highest escalation risk in the next 24 hours.",
        f"* **Type:** {top['disruption_type'].replace('_',' ').title()}",
        f"* **Current Severity:** {sev} ({_risk_label(sev)})",
        f"* **Escalation Probability:** {prob:.0f}%",
        f"* **Recommended Action:** {top.get('recommended_action', 'Monitor closely and pre-plan reroutes.')}",
        f"\n**All disruptions ranked by escalation risk:**",
    ] + [
        f"* **{d['location']}**: prob {round(float(d.get('probability',0))*100,0):.0f}%, severity {round(float(d.get('predicted_severity',0)),2)}"
        for d in sorted(disruptions, key=lambda d: float(d.get("probability",0))*float(d.get("predicted_severity",0)), reverse=True)[:5]
    ])


# ── 12. Compounded risk of two disruptions ────────────────────────────────────

def compounded_risk(loc_a: str, loc_b: str, disruptions: List[Dict]) -> str:
    da = next((d for d in disruptions if loc_a.lower() in d.get("location","").lower()), None)
    db = next((d for d in disruptions if loc_b.lower() in d.get("location","").lower()), None)
    if not da and not db:
        return f"No active disruptions found for **{loc_a}** or **{loc_b}**."
    sev_a = float(da.get("predicted_severity", 0)) if da else 0.2
    sev_b = float(db.get("predicted_severity", 0)) if db else 0.2
    compounded = round(1 - (1 - sev_a) * (1 - sev_b), 3)
    return "\n".join([
        f"**Compounded risk: {loc_a} + {loc_b}**",
        f"* **{loc_a} severity:** {round(sev_a*100,1)}% {'(active)' if da else '(estimated)'}",
        f"* **{loc_b} severity:** {round(sev_b*100,1)}% {'(active)' if db else '(estimated)'}",
        f"* **Combined network risk:** **{round(compounded*100,1)}%** (calculated as 1-(1-A)×(1-B))",
        f"* **Overall risk level:** **{_risk_label(compounded)}**",
        f"\nShipments transiting both zones face compounded exposure — rerouting via alternative corridors is strongly advised.",
    ])


# ── 13. Should I delay my shipment? ───────────────────────────────────────────

def delay_decision(origin: str, dest: str, hours: int, disruptions: List[Dict]) -> str:
    route_disrs = [
        d for d in disruptions
        if origin.lower() in d.get("location","").lower()
        or dest.lower() in d.get("location","").lower()
    ]
    window_end_hrs = 24
    if route_disrs:
        top = max(route_disrs, key=lambda d: float(d.get("predicted_severity", 0)))
        sev = float(top.get("predicted_severity", 0))
        verdict = "YES — delay recommended" if hours <= 48 and sev > 0.4 else "NOT NECESSARY — risk is manageable"
        return "\n".join([
            f"**Decision: Should you delay your {origin} → {dest} shipment by {hours}h?**",
            f"* **Active disruption detected:** {top['location']} (severity {round(sev*100,1)}%)",
            f"* **Disruption window:** Next ~{window_end_hrs}h",
            f"* **Verdict: {verdict}**",
            "",
            "**Analysis:**",
            f"* A {hours}h delay {'would clear the disruption window' if hours >= window_end_hrs else 'may not fully clear the disruption — consider 48h delay or rerouting'}.",
            f"* Risk reduction by delaying: ~{round(sev*60,0):.0f}% potential delay avoidance.",
            f"\nAlternative: Keep schedule but switch to **Sea-Only routing** to avoid the disruption zone.",
        ])
    return "\n".join([
        f"**Decision: Should you delay your {origin} → {dest} shipment by {hours}h?**",
        "* **No active disruptions** detected on this route right now.",
        "* **Verdict: NO DELAY NEEDED** — conditions are nominal.",
        f"\nProceed as scheduled. Monitor the **Disruptions** page for any emerging risks.",
    ])


# ── 14. Ports with above-average weather severity ─────────────────────────────

def above_avg_weather_ports(disruptions: List[Dict]) -> str:
    weather = [d for d in disruptions if "weather" in d.get("disruption_type","").lower()]
    if not weather:
        return "No weather disruptions are currently active across monitored ports."
    avg_sev = sum(float(d.get("predicted_severity",0)) for d in weather) / len(weather)
    above = [d for d in weather if float(d.get("predicted_severity",0)) > avg_sev]
    lines = [
        f"**{len(above)} port(s)** are experiencing **above-average weather severity** (avg: {round(avg_sev*100,1)}%):",
    ]
    for d in sorted(above, key=lambda x: float(x.get("predicted_severity",0)), reverse=True):
        lines.append(
            f"* **{d['location']}**: {round(float(d.get('predicted_severity',0))*100,1)}% severity — {d.get('recommended_action','Monitor closely.')[:80]}"
        )
    if not above:
        lines = [f"All active weather disruptions are at or below the average severity of {round(avg_sev*100,1)}%. No ports require immediate attention."]
    return "\n".join(lines)


# ── 15. Compare two shipments for rerouting priority ──────────────────────────

def compare_reroute_priority(s1: Dict, s2: Dict) -> str:
    def score(s: Dict) -> float:
        priority_w = {"urgent": 1.0, "time-sensitive": 0.8, "time_sensitive": 0.8, "normal": 0.3}
        p = priority_w.get(s.get("priority","normal"), 0.3)
        r = float(s.get("riskScore", 0))
        v = min(float(s.get("cargoValue", 0)) / 5_000_000, 1.0)
        return round(r * 0.5 + p * 0.3 + v * 0.2, 4)
    sc1, sc2 = score(s1), score(s2)
    winner = s1 if sc1 >= sc2 else s2
    loser = s2 if sc1 >= sc2 else s1
    return "\n".join([
        f"**Rerouting priority: {s1['id']} vs {s2['id']}**",
        "",
        f"| Metric | {s1['id']} | {s2['id']} |",
        "|---|---|---|",
        f"| Status | {s1['currentStatus']} | {s2['currentStatus']} |",
        f"| Risk Score | {round(float(s1['riskScore'])*100,1)}% | {round(float(s2['riskScore'])*100,1)}% |",
        f"| Delay | {s1['delay']}h | {s2['delay']}h |",
        f"| Priority | {s1['priority']} | {s2['priority']} |",
        f"| Cargo Value | ${float(s1['cargoValue']):,.0f} | ${float(s2['cargoValue']):,.0f} |",
        f"| **Priority Score** | **{sc1}** | **{sc2}** |",
        "",
        f"**Reroute {winner['id']} first** — it has the higher combined urgency score ({max(sc1,sc2)}).",
        f"({loser['id']} can follow immediately after with score {min(sc1,sc2)}.)",
    ])


# ── 16. Total at-risk cargo value ─────────────────────────────────────────────

def total_critical_value(shipments: List[Dict]) -> str:
    critical = [s for s in shipments if s["currentStatus"] == "critical"]
    val = sum(float(s["cargoValue"]) for s in critical)
    return "\n".join([
        f"There are **{len(critical)} critical shipments** currently in transit.",
        f"* **Total cargo value at critical risk:** **${val:,.0f}**",
        f"* Average value per critical shipment: ${val/len(critical):,.0f}" if critical else "",
    ])


# ── 17. Prediction accuracy in plain English ──────────────────────────────────

def prediction_accuracy_context() -> str:
    r = build_mock_performance_report()
    acc = r["model_accuracy"]
    cov = r["coverage"]
    correct_pct = round(cov["correct_predictions"] / cov["total_disruptions_predicted"] * 100, 1)
    fp_rate = round(cov["false_positives"] / cov["total_disruptions_predicted"] * 100, 1)
    return "\n".join([
        "**Platform prediction accuracy breakdown:**",
        f"* **Precision:** {round(acc['precision']*100,1)}% — of every 100 alerts raised, {round(acc['precision']*100)} were real disruptions.",
        f"* **Recall:** {round(acc['recall']*100,1)}% — the model catches {round(acc['recall']*100)} out of every 100 real disruption events.",
        f"* **F1 Score:** {round(acc['f1_score']*100,1)}% — balanced accuracy measure.",
        f"* **Overall correct prediction rate:** {correct_pct}% ({cov['correct_predictions']:,} of {cov['total_disruptions_predicted']:,}).",
        f"* **False alert rate:** {fp_rate}% ({cov['false_positives']} false positives).",
        f"\n**Assessment:** An F1 of {round(acc['f1_score']*100,1)}% is considered **good** for supply-chain disruption prediction. Critical shipments should still be monitored manually as a safety net.",
    ])
