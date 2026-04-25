# 🚀 Supply Chain Resilience Backend

Predictive disruption detection engine — FastAPI + Prophet + PostgreSQL + Redis.

## ⚡ Quick Start (5 minutes)

### Option A: Docker Compose (recommended)

```bash
cd backend

# 1. Copy environment template
cp .env.example .env
# Edit .env and add your OPENWEATHER_API_KEY

# 2. Start all services (PostgreSQL, Redis, FastAPI, Celery)
docker-compose up -d

# 3. Run migrations
docker-compose exec backend alembic upgrade head

# 4. Open API docs
open http://localhost:8000/docs
```

### Option B: Local Development (no Docker)

**Prerequisites:** Python 3.11+, PostgreSQL, Redis

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your DB/Redis credentials + API keys

# 4. Run migrations
alembic upgrade head

# 5. Start the API server
uvicorn app.main:app --reload --port 8000
```

Server starts at: **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**  
ReDoc: **http://localhost:8000/redoc**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend                          │
│                                                                 │
│  ┌──────────────┐   ┌─────────────────┐   ┌────────────────┐  │
│  │  REST API    │   │   WebSocket     │   │  APScheduler   │  │
│  │  (6 routes)  │   │  /ws/disruptions│   │  (background   │  │
│  │              │   │                 │   │   jobs)        │  │
│  └──────┬───────┘   └────────┬────────┘   └───────┬────────┘  │
│         │                    │                     │           │
│         └────────────────────┴──────────────┬──────┘          │
│                                             │                  │
│  ┌─────────────────────────────────────────▼──────────────┐   │
│  │                  Service Layer                          │   │
│  │  • data_ingestion   (weather/traffic/ports)             │   │
│  │  • forecasting      (Prophet orchestration)             │   │
│  │  • prediction_engine (disruption detection)             │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │                   ML Layer (Prophet)                     │   │
│  │  • feature_engineering  (time-series transforms)         │   │
│  │  • prophet_model        (training + prediction)          │   │
│  │  • model_evaluation     (accuracy metrics)               │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│  ┌──────────┐  ┌────────────▼────────────┐  ┌──────────────┐  │
│  │  Redis   │  │      PostgreSQL          │  │   Celery     │  │
│  │  (cache) │  │  (6 tables, indexes)    │  │  (workers)   │  │
│  └──────────┘  └─────────────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | System health check |
| GET | `/api/v1/disruptions` | Active disruption predictions |
| POST | `/api/v1/shipments/analyze` | Analyze shipment risk |
| GET | `/api/v1/forecasts/{location}` | 72-hour location forecast |
| GET | `/api/v1/stats/performance` | Model accuracy metrics |
| POST | `/api/v1/routes/optimize` | Disruption-aware route hints |
| POST | `/api/v1/ingest/trigger` | Manual data ingestion trigger |
| WS | `/ws/disruptions` | Real-time disruption stream |

---

## 🗃️ Database Tables

| Table | Purpose |
|-------|---------|
| `shipments` | Shipment records |
| `weather_data` | OpenWeatherMap observations |
| `disruption_predictions` | ML-generated disruption alerts |
| `route_history` | Original vs. optimised routes (A*) |
| `prophet_forecasts` | Time-series forecast data points |
| `api_call_logs` | External API audit log |

---

## 🔧 Background Jobs

| Job | Interval | Task |
|-----|----------|------|
| Data Ingestion | Every 15 min | Fetch weather/traffic/ports |
| Prediction Cycle | Every 15 min | Run Prophet → detect disruptions |
| Metrics Evaluation | Daily 01:00 UTC | Compute accuracy metrics |
| Model Retraining | Weekly (Sun 02:00) | Retrain all 4 Prophet models |

---

## 🧪 Testing

```bash
# Fast tests (no Prophet training)
pytest tests/ -v -m "not slow"

# All tests (includes Prophet round-trip, ~2 min)
pytest tests/ -v

# Coverage report
pytest tests/ --cov=app --cov-report=html
```

---

## 🚢 Deployment (Railway)

1. Create a new Railway project
2. Add PostgreSQL plugin → copy `DATABASE_URL`
3. Add Redis plugin → copy `REDIS_URL`
4. Set environment variables in Railway dashboard
5. Connect GitHub repo → automatic deploys on push

Railway auto-handles:
- Dockerfile build
- Port assignment (`PORT` env var)
- PostgreSQL backups
- Redis persistence

---

## 📊 Prophet Models

Four specialist models are trained per location:

| Model | Predicts |
|-------|---------|
| `disruption_likelihood` | Probability of any disruption (0-1) |
| `disruption_severity` | Expected severity if disruption occurs (0-1) |
| `resolution_duration` | Hours until disruption resolves |
| `route_delay` | Expected delay for route (hours) |

Models retrain weekly with 90-day rolling window.  
New models are only deployed if accuracy **improves** on a holdout set.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `OPENWEATHER_API_KEY` | ✅ | [Get free key](https://openweathermap.org/api) |
| `GOOGLE_MAPS_API_KEY` | ⚠️ | Optional; falls back to mock data |
| `DEBUG` | ❌ | Set `true` for verbose SQL logs |
