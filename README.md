# Anvayaa Supply Chain Resilience Platform

Anvayaa is a next-generation supply chain resilience system designed to proactively detect global shipping disruptions and optimize logistics routes using AI-driven forecasting and advanced pathfinding algorithms.

The platform combines real-time data ingestion, time-series forecasting (Prophet), and disruption-aware routing (A*) to provide a comprehensive solution for modern logistics challenges.

---

## Core Features

- **Predictive Disruption Detection**: Utilizes Prophet models to forecast disruptions 48-72 hours in advance based on weather, port congestion, and historical traffic data.
- **Smart Route Optimization**: Implements an A* pathfinding algorithm with a dynamic cost function considering distance, delay, and disruption risk across 15+ global shipping hubs.
- **Interactive Live Map**: Real-time visualization of 75+ shipments with color-coded risk markers and active disruption zones.
- **AI-Driven Analytics**: Detailed performance metrics for predictive models, including Precision, Recall, and Mean Absolute Percentage Error (MAPE).
- **Real-Time Alerts**: WebSocket-driven disruption feed providing immediate notification and AI-generated mitigation recommendations.
- **System Health Monitoring**: Proactive monitoring of external data sources and internal service status.

---

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: MongoDB (Beanie ODM)
- **ML Engine**: Facebook Prophet
- **Task Scheduling**: APScheduler
- **Logging**: Loguru
- **Testing**: Pytest

### Frontend
- **Framework**: React 18 (Vite + TypeScript)
- **Mapping**: Leaflet / React-Leaflet
- **Data Visualization**: Recharts
- **State Management**: TanStack React Query
- **Icons**: Lucide React
- **Styling**: Vanilla CSS (Modern Glassmorphism)

---

## Project Structure

```text
Hack2skill/
├── backend/                # FastAPI Application
│   ├── app/
│   │   ├── api/            # REST & WebSocket endpoints
│   │   ├── ml/             # Prophet model logic
│   │   ├── models/         # MongoDB/Beanie schemas
│   │   ├── services/       # Core business logic
│   │   └── tasks/          # Background jobs
│   └── tests/              # Backend test suite
├── frontend/               # Next.js / React Application
│   ├── src/
│   │   ├── components/     # UI Components (Layout, Map)
│   │   ├── pages/          # Application views
│   │   ├── hooks/          # React Query & WS hooks
│   │   └── utils/          # A* Algorithm & formatters
│   └── public/             # Static assets
└── docker-compose.yml      # Container orchestration
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/rudra109/hack2skill-project.git
   cd hack2skill-project
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # venv\Scripts\activate on Windows
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## API Documentation

Once the backend is running, you can access the interactive API documentation at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Routing Algorithm (A*)

The optimization engine uses the A* algorithm to calculate the most efficient path through a global network of ports. 
- **Dynamic Costing**: `Cost = α*distance + β*delay + γ*risk`
- **Priority Modes**: Supports Balanced, Fastest, Cheapest, and Safest optimization profiles.
- **Heuristic**: Haversine distance-based time estimation.

---

## Environment Configuration

Create a `.env` file in the `backend` directory with the following variables:
- `DATABASE_URL`: MongoDB connection string.
- `OPENWEATHER_API_KEY`: API key for weather data.
- `OPENROUTE_API_KEY`: API key for routing data.
