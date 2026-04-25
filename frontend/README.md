# NEXUS — Smart Supply Chain Resilience Platform
### Developer 2: Frontend & Route Optimization Engineer

> **AntiGravity Innovation**: Lift problems before they sink operations.

---

## 🚀 Quick Start

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   │   └── Topbar.tsx           # Header with WS status
│   │   └── Map/
│   │       └── ShipmentMap.tsx      # Leaflet interactive map
│   ├── pages/
│   │   ├── Dashboard.tsx            # Main KPI dashboard
│   │   ├── LiveMap.tsx              # Full-screen map page
│   │   ├── RouteOptimization.tsx    # A* route optimizer
│   │   ├── Shipments.tsx            # Shipments table
│   │   ├── Analytics.tsx            # Prophet model analytics
│   │   ├── Alerts.tsx               # Disruption alerts feed
│   │   └── SystemHealth.tsx         # System monitoring
│   ├── hooks/
│   │   ├── useShipments.ts          # React Query + mock fallback
│   │   ├── useDisruptions.ts        # React Query + mock fallback
│   │   └── useWebSocket.ts          # WS with auto-reconnect
│   ├── utils/
│   │   ├── astar.ts                 # A* algorithm + Graph class
│   │   ├── constants.ts             # Shipping nodes/edges, colors
│   │   ├── formatters.ts            # Date, currency, risk labels
│   │   ├── geo.ts                   # Haversine distance, coords
│   │   └── mockData.ts              # Mock data generators
│   ├── services/
│   │   └── api.ts                   # Axios instance
│   └── types/
│       └── index.ts                 # All TypeScript interfaces
```

---

## ✅ Developer 2 Deliverables

| Feature | Status |
|---------|--------|
| React 18 + Vite + TypeScript | ✅ |
| Dark mode glassmorphism UI | ✅ |
| Leaflet interactive map (75+ shipments) | ✅ |
| Color-coded shipment markers | ✅ |
| Disruption zones with tooltips | ✅ |
| A* pathfinding algorithm | ✅ |
| Graph class with shipping network | ✅ |
| Route optimization with priority modes | ✅ |
| Cost-benefit comparison view | ✅ |
| React Query data fetching | ✅ |
| Mock data fallback (offline dev) | ✅ |
| WebSocket hook with auto-reconnect | ✅ |
| Prophet forecast charts (Recharts) | ✅ |
| Model performance analytics | ✅ |
| Disruption alert feed | ✅ |
| System health monitoring | ✅ |
| Shipments table with sort/filter | ✅ |
| Responsive design | ✅ |
| TypeScript strict mode | ✅ |

---

## 🔌 Environment Variables

```
VITE_API_BASE_URL=http://localhost:8000   # Backend FastAPI URL
VITE_WS_URL=ws://localhost:8000          # WebSocket URL
```

---

## 🗺️ A* Algorithm

The routing engine at `src/utils/astar.ts` implements:
- **MinHeap** priority queue for O(log n) operations
- **Graph class** with 15 global ports and 18 bidirectional shipping lanes
- **Dynamic cost function**: `α*distance + β*delay + γ*disruption_risk`
- **4 priority modes**: Balanced, Fastest, Cheapest, Safest
- **Admissible heuristic**: Haversine straight-line time estimate

### Cost Parameters

| Mode | α (distance) | β (delay) | γ (disruption) |
|------|-------------|-----------|----------------|
| Balanced | 1.0 | 2.0 | 3.0 |
| Fastest | 2.0 | 4.0 | 1.0 |
| Cheapest | 3.0 | 1.0 | 0.5 |
| Safest | 0.5 | 1.0 | 6.0 |

---

## 🔌 Backend API Integration

Connects to Developer 1's FastAPI backend:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/shipments` | GET | Fetch all shipments |
| `/api/v1/disruptions` | GET | Fetch active disruptions |
| `/api/v1/forecasts/{location}` | GET | 72h Prophet forecast |
| `/api/v1/stats/performance` | GET | Model metrics |
| `/ws/disruptions` | WS | Real-time alerts stream |

All APIs have **automatic mock data fallback** for offline development.

---

## 🎨 Tech Stack

- **React 18** + **Vite** + **TypeScript**
- **Leaflet** + **react-leaflet** — Interactive world map
- **Recharts** — Prophet forecast charts, analytics
- **TanStack React Query** — Async state management
- **Socket.IO client** — WebSocket real-time updates
- **Lucide React** — Icon library
- **React Toastify** — Toast notifications
- **Axios** — HTTP client with interceptors

---

## 📊 Key Pages

### Dashboard
- 4 KPI metric cards (shipments, on-time rate, delays, disruptions)
- Live Leaflet world map with 75+ color-coded shipment markers
- Active disruption alert panel
- 72-hour Prophet forecast area chart
- Fleet status pie chart
- Recent shipments table

### Route Optimizer (A*)
- Origin/destination port selector (15 global ports)
- Optimization priority: Balanced / Fastest / Cheapest / Safest
- Risk tolerance slider (0–100%)
- Real-time A* calculation
- Before/after route comparison cards
- Performance bar chart comparison

### Analytics
- Prophet model metrics: Precision, Recall, F1, MAPE
- 30-day accuracy trend line chart
- Radar chart (model profile)
- Per-location 72-hour forecast
- Coverage statistics

### Alerts
- Live disruption feed sorted by severity
- Detailed cards: type, location, probability, confidence, time window
- AI recommendations for each disruption

### System Health
- Backend API / Database / WebSocket status
- Data source freshness (Weather, Traffic, Port)
- Overall health gauge
