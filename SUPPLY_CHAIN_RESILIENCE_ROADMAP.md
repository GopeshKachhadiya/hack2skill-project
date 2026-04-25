# 🚀 Smart Supply Chain Resilience System - Hackathon Project Roadmap
## AntiGravity Innovation: Predictive & Dynamic Route Optimization

---

## 📋 Project Overview

**Problem Statement:**
Modern global supply chains manage millions of concurrent shipments across highly complex and inherently volatile transportation networks. Critical transit disruptions ranging from sudden weather events to hidden operational bottlenecks are chronically identified only after delivery timelines are already compromised.

**Solution Vision:**
Build a **zero-investment, real-time supply chain intelligence platform** that:
- 🔮 Predicts disruptions 48-72 hours in advance using Prophet time-series forecasting
- 🗺️ Dynamically optimizes routes using A* pathfinding algorithm
- ⚡ Processes real-time data streams from public APIs
- 🎯 Provides instant alerts and route recommendations
- 📊 Scales to handle thousands of concurrent shipments

**Innovation Angle:** AntiGravity approach - **Lift problems before they sink operations**

---

## 👥 Team Structure & Responsibilities

### **Developer 1: Backend & Forecasting Pipeline** 
**Name:** `BACKEND_ENGINEER`
- Focus: Real-time data ingestion, Prophet ML pipeline, database layer
- Tech: Python, FastAPI, Prophet, PostgreSQL, Redis
- Deliverable: Predictive disruption detection engine

### **Developer 2: Frontend & Route Optimization**
**Name:** `FRONTEND_ENGINEER`
- Focus: Interactive UI, A* routing engine, real-time visualization
- Tech: React, Leaflet/Mapbox, Node.js, WebSockets
- Deliverable: Dynamic route optimization dashboard

---

## 🛠️ Tech Stack (100% Free/Open-Source)

### Backend Services
```
Core Framework:       FastAPI (async Python web framework)
ML/Forecasting:       Facebook Prophet (time-series prediction)
Routing Algorithm:    A* pathfinding (NetworkX library)
Real-Time Data:       OSINT sources + public APIs
Database (Primary):   PostgreSQL (free tier on Railway/Render)
Cache Layer:          Redis (free tier on Railway/Render)
Message Queue:        Celery + Redis (async job processing)
Task Scheduling:      APScheduler (background jobs)
API Documentation:    Swagger/OpenAPI (built-in FastAPI)
```

### Frontend Services
```
Framework:            React 18+ (with Vite)
Mapping Library:      Leaflet + OpenStreetMap (100% free)
Real-time Updates:    Socket.IO / WebSockets
State Management:     TanStack Query (React Query)
Charting:             Recharts / Chart.js (disruption timeline)
Weather Data:         OpenWeatherMap API (free tier)
Traffic Data:         TomTom / Google Maps API (free tier)
Deployment:           Vercel (free tier)
```

### Data Sources (All Free)
```
1. Weather Data:          OpenWeatherMap (free tier: 1000 calls/day)
2. Traffic Data:          Google Maps Platform (free tier: $200/month credits)
3. Port Status:           World Bank Port Performance Index (public data)
4. Geolocation:           GeoIP (MaxMind GeoLite2 - free)
5. Shipping News:         RSS feeds from MarineTraffic, Freightos
6. Historical Data:       Kaggle supply chain datasets (free download)
```

### DevOps & Deployment (Free Tier)
```
Version Control:      GitHub (free unlimited repos)
CI/CD Pipeline:       GitHub Actions (free 2000 min/month)
Backend Deployment:   Railway.app / Render (free hobby tier)
Frontend Deployment:  Vercel / Netlify (free tier)
Database Hosting:     Railway/Neon (PostgreSQL free tier)
Monitoring:           GitHub Actions logs + custom dashboards
Logging:              Winston (self-hosted) + Loki (optional)
```

---

## 📅 Phase-Based Roadmap (Hackathon Timeline)

### **Phase 0: Setup & Infrastructure (Days 1-0.5)**

#### Shared Tasks
- [ ] Clone repository & set up Git workflow
- [ ] Create project structure (monorepo with `/backend`, `/frontend`)
- [ ] Set up environment variables & .env templates
- [ ] Deploy PostgreSQL + Redis (Railway/Render free tier)
- [ ] Create Docker Compose for local development
- [ ] Set up GitHub Actions for CI/CD

---

## 📌 DEVELOPER 1 PROMPT: Backend & Forecasting Engineer

```
═══════════════════════════════════════════════════════════════════════════════
🎯 MISSION: Build the Predictive Intelligence Engine
═══════════════════════════════════════════════════════════════════════════════

OBJECTIVE:
You are the BACKEND ARCHITECT responsible for building a real-time supply chain 
disruption prediction engine. Your system must ingest live data streams, forecast 
disruptions 48-72 hours in advance using Prophet, and expose predictive insights 
via a scalable REST API.

FINAL DELIVERABLE:
A production-ready FastAPI backend that:
✅ Ingests real-time weather, traffic, and port status data
✅ Predicts disruptions using Prophet time-series forecasting
✅ Stores all predictions in PostgreSQL with Redis caching
✅ Exposes RESTful endpoints for Frontend consumption
✅ Runs background jobs for continuous forecasting
✅ Achieves 95%+ uptime with error handling & logging

═══════════════════════════════════════════════════════════════════════════════

TECH STACK:
┌─────────────────────────────────────────────────────────────┐
│ Framework:      FastAPI (async, automatic documentation)   │
│ Language:       Python 3.11+                               │
│ ML Library:     Facebook Prophet (time-series forecasting) │
│ Database:       PostgreSQL (Railway free tier)             │
│ Cache:          Redis (Railway free tier)                  │
│ Task Queue:     Celery + Redis                             │
│ Job Scheduler:  APScheduler                                │
│ HTTP Client:    HTTPX (async)                              │
│ ORM:            SQLAlchemy                                 │
│ Data Science:   Pandas, NumPy                              │
│ Logging:        Loguru + structlog                         │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

PHASE 1: Foundation (Days 1-1.5)
────────────────────────────────────

TASK 1.1: Project Structure & Dependencies
├── Create FastAPI app skeleton with Uvicorn
├── Set up SQLAlchemy ORM with PostgreSQL connection
├── Configure Redis connection pool
├── Create .env file with all credentials (Railway free tier)
├── Initialize Celery + APScheduler for background jobs
├── Set up structured logging (Loguru)
└── Verify all imports work correctly

File Structure:
backend/
├── app/
│   ├── __init__.py
│   ├── main.py (FastAPI app initialization)
│   ├── config.py (environment variables)
│   ├── database.py (PostgreSQL + SQLAlchemy setup)
│   ├── cache.py (Redis connection)
│   ├── models/
│   │   ├── shipment.py (Shipment schema)
│   │   ├── disruption.py (Disruption prediction schema)
│   │   └── weather.py (Weather data schema)
│   ├── api/
│   │   ├── routes.py (REST endpoints)
│   │   └── websocket.py (real-time updates)
│   ├── services/
│   │   ├── data_ingestion.py (API data fetching)
│   │   ├── forecasting.py (Prophet pipeline)
│   │   └── prediction_engine.py (orchestration)
│   ├── ml/
│   │   ├── prophet_model.py (Prophet training & prediction)
│   │   ├── feature_engineering.py (time-series features)
│   │   └── model_evaluation.py (accuracy metrics)
│   └── tasks/
│       ├── celery_app.py (Celery configuration)
│       └── background_jobs.py (scheduled forecasting)
├── tests/
│   ├── test_api.py
│   ├── test_forecasting.py
│   └── test_data_ingestion.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md

TASK 1.2: Database Schema Design
┌────────────────────────────────────────────────────────────┐
│ Tables to Create:                                          │
├────────────────────────────────────────────────────────────┤
│ 1. shipments                                               │
│    ├── id (UUID, PK)                                       │
│    ├── origin (VARCHAR)                                    │
│    ├── destination (VARCHAR)                               │
│    ├── departure_time (TIMESTAMP)                          │
│    ├── expected_arrival (TIMESTAMP)                        │
│    ├── current_status (ENUM)                               │
│    └── created_at (TIMESTAMP)                              │
│                                                            │
│ 2. weather_data                                            │
│    ├── id (UUID, PK)                                       │
│    ├── location (VARCHAR)                                  │
│    ├── temperature (FLOAT)                                 │
│    ├── humidity (FLOAT)                                    │
│    ├── weather_condition (VARCHAR)                         │
│    ├── timestamp (TIMESTAMP)                               │
│    └── severity (ENUM: low, medium, high, critical)      │
│                                                            │
│ 3. disruption_predictions                                  │
│    ├── id (UUID, PK)                                       │
│    ├── shipment_id (FK → shipments)                        │
│    ├── disruption_type (VARCHAR)                           │
│    ├── predicted_severity (FLOAT: 0-1)                     │
│    ├── probability (FLOAT: 0-1)                            │
│    ├── predicted_time_window (TSRANGE)                     │
│    ├── confidence_score (FLOAT: 0-1)                       │
│    ├── created_at (TIMESTAMP)                              │
│    └── status (ENUM: active, resolved)                     │
│                                                            │
│ 4. route_history                                           │
│    ├── id (UUID, PK)                                       │
│    ├── shipment_id (FK → shipments)                        │
│    ├── original_route (JSON array of coords)               │
│    ├── optimized_route (JSON array of coords)              │
│    ├── time_saved (INTEGER: minutes)                       │
│    ├── optimization_timestamp (TIMESTAMP)                  │
│    └── algorithm (VARCHAR: "A*")                           │
│                                                            │
│ 5. prophet_forecasts                                       │
│    ├── id (UUID, PK)                                       │
│    ├── disruption_type (VARCHAR)                           │
│    ├── location (VARCHAR)                                  │
│    ├── forecast_value (FLOAT)                              │
│    ├── forecast_timestamp (TIMESTAMP)                      │
│    ├── model_trained_at (TIMESTAMP)                        │
│    └── training_data_points (INTEGER)                      │
│                                                            │
│ 6. api_call_logs                                           │
│    ├── id (UUID, PK)                                       │
│    ├── api_source (VARCHAR)                                │
│    ├── status_code (INTEGER)                               │
│    ├── response_time_ms (INTEGER)                          │
│    ├── timestamp (TIMESTAMP)                               │
│    └── error_message (TEXT, nullable)                      │
└────────────────────────────────────────────────────────────┘

TASK 1.3: Create Database Migration Scripts
├── Use Alembic for version control
├── Create migration for all 6 tables
├── Add indexes on frequently queried columns
│   └── shipment_id, disruption_type, timestamp, location
├── Set up automatic backups (Railway handles this)
└── Test migrations locally + staging

Dependencies to Install:
pip install fastapi uvicorn sqlalchemy psycopg2-binary redis celery \
            apscheduler httpx prophet pandas numpy loguru python-dotenv \
            pydantic pydantic-settings marshmallow alembic

═══════════════════════════════════════════════════════════════════════════════

PHASE 2: Real-Time Data Ingestion Pipeline (Days 1.5-2.5)
──────────────────────────────────────────────────────────

TASK 2.1: Weather Data Integration (OpenWeatherMap)
├── API: https://api.openweathermap.org/data/2.5/weather
├── Free Tier: 1,000 calls/day (perfect for hackathon)
├── Implement AsyncHTTPClient with exponential backoff
├── Cache weather data in Redis for 30 minutes
├── Error handling for rate limits & timeouts
├── Store raw + processed weather data in PostgreSQL
│
└── Function: async def fetch_weather_data(location: str) -> dict
    ├── Check Redis cache first
    ├── Call OpenWeatherMap API if cache miss
    ├── Parse response (temp, humidity, condition, wind)
    ├── Detect severe weather (storm, extreme temp, etc.)
    ├── Store in DB + cache
    └── Return structured WeatherData object

TASK 2.2: Traffic & Route Data Integration (Google Maps API)
├── API: https://maps.googleapis.com/maps/api/directions/json
├── Free Tier: $200/month credits (sufficient)
├── Get real-time traffic conditions for major routes
├── Identify bottlenecks (congestion zones, accidents)
├── Cache for 5 minutes (more volatile than weather)
├── Correlate with shipment routes
│
└── Function: async def fetch_traffic_data(route: Route) -> dict
    ├── Query Google Maps Directions API with traffic model
    ├── Extract duration, distance, traffic delays
    ├── Parse turn-by-turn instructions
    ├── Identify high-risk segments
    ├── Store in DB + cache
    └── Return TrafficData object

TASK 2.3: Port Status & Shipping Data Integration
├── Data Source 1: MarineTraffic RSS feed (free, no auth)
│  └── URL: https://www.marinetraffic.com/en/ais/home/
├── Data Source 2: World Bank Port Performance Index (public)
│  └── URL: https://www.worldbank.org/en/topic/transport/brief/ppi
├── Data Source 3: Freightos shipping rates (RSS feed)
│  └── URL: https://freightos.com/feed/
├── Implement RSS feed parser with BeautifulSoup
├── Extract: port delays, vessel traffic, congestion alerts
└── Update DB every 30 minutes via APScheduler

└── Function: async def fetch_port_data() -> list[PortStatus]
    ├── Parse MarineTraffic RSS
    ├── Extract port congestion indicators
    ├── Query World Bank API
    ├── Store in DB
    └── Return list of PortStatus objects

TASK 2.4: Create Data Ingestion Service
├── Centralized service orchestrating all data sources
├── Implement retry logic (exponential backoff)
├── Handle partial failures gracefully
├── Log all API calls with timestamp + response time
├── Monitor rate limits
│
└── Function: async def ingest_all_data() -> IngestionReport
    ├── Parallel fetch: weather, traffic, ports
    ├── Aggregate results
    ├── Store in PostgreSQL
    ├── Log failures
    └── Return ingestion report (success/failure counts)

TASK 2.5: Real-Time WebSocket Stream (Optional but nice)
├── Implement WebSocket endpoint for Frontend
├── Stream disruption predictions as they're detected
├── Implement message queuing for reliable delivery
├── Use Redis Streams for message persistence
└── Endpoint: ws://localhost:8000/ws/disruptions

═══════════════════════════════════════════════════════════════════════════════

PHASE 3: Prophet Time-Series Forecasting (Days 2.5-4)
───────────────────────────────────────────────────────

UNDERSTANDING PROPHET FOR SUPPLY CHAIN:
Facebook Prophet is perfect for supply chain disruptions because:
✓ Handles seasonality (peak shipping periods, holidays)
✓ Detects trend changes automatically
✓ Robust to missing data & outliers
✓ Fast training (critical for real-time updates)
✓ Built-in uncertainty intervals (confidence bounds)

TASK 3.1: Feature Engineering for Time-Series
├── Convert raw data to time-indexed data points
├── Features to engineer:
│   ├── Daily disruption count (aggregated)
│   ├── Weekly seasonality (weekday effects)
│   ├── Monthly seasonality (business cycles)
│   ├── Weather severity rolling average (7-day window)
│   ├── Traffic congestion index (normalized 0-1)
│   ├── Holiday/event flags
│   └── Lag features (t-1, t-7, t-30 days)
├── Normalize all features to [0, 1] range
└── Store engineered features in PostgreSQL

└── Function: def engineer_time_series_features(
        raw_data: DataFrame,
        lookback_days: int = 90
    ) -> DataFrame
    ├── Aggregate data by location + disruption_type + hour
    ├── Calculate rolling statistics
    ├── Add lag features
    ├── Create cyclical features (sin/cos for months)
    ├── Fill missing values with interpolation
    └── Return feature-rich DataFrame

TASK 3.2: Prophet Model Training Pipeline
├── Build separate Prophet models for:
│   ├── Model 1: Disruption likelihood by location (hourly)
│   ├── Model 2: Disruption severity forecast
│   ├── Model 3: Expected resolution time
│   └── Model 4: Route delay predictions
├── Train on historical data (use Kaggle dataset or simulate)
├── Include regressors (weather severity, traffic index)
├── Detect changepoints (structural breaks in data)
├── Store trained models as serialized pickles
│
└── Function: def train_prophet_model(
        training_data: DataFrame,
        model_type: str  # 'likelihood', 'severity', 'duration'
    ) -> ProphetModel
    ├── Create Prophet instance with seasonality settings
    ├── Add regressors (weather, traffic)
    ├── Fit model on training data
    ├── Validate with 20% holdout set
    ├── Compute MAPE (Mean Absolute Percentage Error)
    ├── Save model to disk
    └── Return trained model

TASK 3.3: Real-Time Prediction Engine
├── Run predictions every 15 minutes (via APScheduler)
├── For each active shipment route:
│   ├── Get current weather data
│   ├── Get current traffic conditions
│   ├── Calculate time-series features
│   ├── Feed into Prophet models
│   ├── Generate 3-day forecast with confidence intervals
│   └── Flag high-probability disruptions
├── Store predictions in DB
├── Generate alerts for probability > 70%
│
└── Function: async def predict_disruptions() -> list[Disruption]
    ├── Query all active shipments
    ├── For each route segment:
    │   ├── Fetch real-time data
    │   ├── Run through all 4 Prophet models
    │   ├── Calculate combined disruption score
    │   ├── Compare against historical baseline
    │   └── Create prediction record
    ├── Identify cascading risks (one disruption → others)
    ├── Store all predictions in DB
    └── Return list of significant disruptions

TASK 3.4: Model Performance Monitoring
├── Track prediction accuracy daily
├── Compute metrics:
│   ├── Precision: % of predicted disruptions that actually occurred
│   ├── Recall: % of actual disruptions predicted
│   ├── MAPE: Mean Absolute Percentage Error
│   └── Coverage: time to prediction before disruption
├── Automatically retrain models weekly
├── Version control models (store training date in metadata)
├── Create dashboard showing model performance
│
└── Function: def evaluate_model_accuracy() -> ModelMetrics
    ├── Query predictions from 7 days ago
    ├── Check against actual disruptions
    ├── Calculate all metrics
    ├── Log to database
    └── Return metrics object

EXAMPLE PROPHET OUTPUT:
When predicting "disruption_likelihood" at location "Port of Shanghai":
─────────────────────────────────────────────────────────────────────
Timestamp         | Predicted Value | Lower Bound | Upper Bound
─────────────────────────────────────────────────────────────────────
2024-05-01 00:00  | 0.12 (12%)      | 0.08        | 0.18
2024-05-01 03:00  | 0.15 (15%)      | 0.10        | 0.22
2024-05-01 06:00  | 0.45 (45%)      | 0.35        | 0.58 ⚠️ HIGH
2024-05-01 09:00  | 0.68 (68%)      | 0.55        | 0.80 🚨 CRITICAL
2024-05-01 12:00  | 0.72 (72%)      | 0.60        | 0.85 🚨 CRITICAL
─────────────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════════════════

PHASE 4: REST API Endpoints (Days 4-4.5)
──────────────────────────────────────────

Build FastAPI endpoints (auto-documented with Swagger UI):

ENDPOINT 1: GET /api/v1/disruptions
├── Purpose: Get all active disruptions
├── Query Params:
│   ├── location: str (optional filter)
│   ├── severity: str (low|medium|high|critical)
│   └── limit: int = 50
├── Response: List[DisruptionPrediction]
│
└── Example Response:
    {
      "disruptions": [
        {
          "id": "uuid-1234",
          "location": "Port of Shanghai",
          "disruption_type": "port_congestion",
          "predicted_severity": 0.85,
          "probability": 0.72,
          "predicted_time_window": {
            "start": "2024-05-01T06:00:00Z",
            "end": "2024-05-01T18:00:00Z"
          },
          "confidence_score": 0.87,
          "recommended_action": "Reroute through Port of Rotterdam",
          "affected_shipments": 14
        }
      ]
    }

ENDPOINT 2: POST /api/v1/shipments/analyze
├── Purpose: Analyze single shipment for disruptions
├── Body: ShipmentAnalysisRequest
│   ├── origin: str (city/port code)
│   ├── destination: str (city/port code)
│   ├── departure_time: datetime
│   ├── cargo_type: str (optional)
│   └── priority: str (normal|urgent|time-sensitive)
├── Response: ShipmentRiskAnalysis
│
└── Example Response:
    {
      "shipment_id": "uuid-5678",
      "origin": "Shanghai",
      "destination": "Rotterdam",
      "overall_risk_score": 0.42,
      "risk_level": "MEDIUM",
      "forecasts": {
        "port_congestion": 0.35,
        "weather_delays": 0.28,
        "traffic_bottleneck": 0.15,
        "mechanical_failure": 0.05
      },
      "timeline": [
        {
          "checkpoint": "Port of Shanghai",
          "eta": "2024-05-02T08:00:00Z",
          "risk_level": "CRITICAL",
          "alert": "Typhoon forecast for May 2-4"
        }
      ],
      "recommendations": [
        "Delay departure 12 hours to avoid typhoon window",
        "If proceeding: use insurance coverage"
      ]
    }

ENDPOINT 3: GET /api/v1/forecasts/{location}
├── Purpose: Get 72-hour forecasts for a location
├── Path Param: location (string, e.g., "shanghai", "rotterdam")
├── Query Param: hours (default 72, max 168)
├── Response: ForecastTimeSeries
│
└── Example Response:
    {
      "location": "Shanghai",
      "forecast_generated_at": "2024-05-01T00:00:00Z",
      "data": [
        {
          "timestamp": "2024-05-01T00:00:00Z",
          "disruption_likelihood": 0.12,
          "disruption_likelihood_upper": 0.18,
          "disruption_likelihood_lower": 0.08,
          "weather_severity": 0.0,
          "traffic_index": 0.35
        },
        // ... 72 more hourly points ...
      ]
    }

ENDPOINT 4: GET /api/v1/stats/performance
├── Purpose: Get model performance metrics
├── Response: ModelPerformanceMetrics
│
└── Example Response:
    {
      "model_accuracy": {
        "precision": 0.82,
        "recall": 0.76,
        "f1_score": 0.79,
        "mape": 12.3
      },
      "coverage": {
        "avg_hours_to_disruption": 36.5,
        "total_disruptions_predicted": 1234,
        "correct_predictions": 1012,
        "false_positives": 89
      },
      "last_retrained": "2024-04-28T00:00:00Z",
      "next_retraining": "2024-05-05T00:00:00Z"
    }

ENDPOINT 5: POST /api/v1/routes/optimize
├── Purpose: This CALLS into Frontend's A* algorithm (see Dev 2 prompt)
├── Body: RouteOptimizationRequest
│   ├── waypoints: list[Coordinate]
│   ├── constraints: dict (time_window, cargo_type, etc.)
│   └── consider_disruptions: bool = true
├── Response: RouteOptimizationResult
│
└── NOTE: For hackathon scope, Frontend handles A* routing
          Backend can provide "disruption-aware" cost functions

ENDPOINT 6: WebSocket /ws/disruptions
├── Purpose: Real-time disruption stream
├── Client connects → receives updates whenever new disruptions predicted
├── Message format: DisruptionAlert
│   ├── id: str
│   ├── type: str (new|updated|resolved)
│   ├── disruption: DisruptionPrediction
│   └── timestamp: datetime
├── Keep-alive: send ping every 30 seconds

═══════════════════════════════════════════════════════════════════════════════

PHASE 5: Background Jobs & Scheduling (Days 4.5-5)
───────────────────────────────────────────────────

Use APScheduler to run continuous tasks:

JOB 1: Data Ingestion (Every 15 minutes)
├── Task: ingest_all_data()
├── Retry Logic: 3 attempts with exponential backoff
├── Timeout: 5 minutes
├── On Success: log to DB
└── On Failure: alert operations team

JOB 2: Disruption Predictions (Every 15 minutes)
├── Task: predict_disruptions()
├── Only runs if new data available
├── Updates all active shipments
└── Generates alerts if probability > 70%

JOB 3: Model Retraining (Weekly, Sundays 02:00 UTC)
├── Task: retrain_all_prophet_models()
├── Pull 90 days of historical data
├── Train all 4 models in parallel
├── Validate against holdout set
├── If accuracy improves: deploy new models
└── If accuracy degrades: keep old models, investigate

JOB 4: Performance Metrics (Daily, 01:00 UTC)
├── Task: evaluate_model_accuracy()
├── Compare predictions vs actual disruptions
├── Generate daily report
└── Log to dashboard DB

JOB 5: Database Cleanup (Weekly, Sundays 03:00 UTC)
├── Task: cleanup_old_records()
├── Archive predictions > 30 days old
├── Keep only latest 1000 disruption records
├── Vacuum PostgreSQL tables
└── Optimize indexes

Implementation using APScheduler:
```python
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()

scheduler.add_job(
    ingest_all_data,
    'interval',
    minutes=15,
    id='data_ingestion',
    coalesce=True,  # Don't queue multiple if one fails
    max_instances=1  # Only one running at a time
)

scheduler.add_job(
    predict_disruptions,
    'interval',
    minutes=15,
    id='disruption_prediction',
    max_instances=1
)

scheduler.add_job(
    retrain_all_models,
    'cron',
    day_of_week='6',  # Sunday
    hour=2,
    minute=0,
    id='weekly_retraining'
)

scheduler.start()
```

═══════════════════════════════════════════════════════════════════════════════

PHASE 6: Testing & Documentation (Days 5-5.5)
─────────────────────────────────────────────

TEST SUITE:
├── Unit Tests (pytest)
│   ├── test_prophet_forecasting.py
│   │   ├── Test Prophet model training
│   │   ├── Test prediction generation
│   │   ├── Test with synthetic data
│   │   └── Test model serialization
│   ├── test_data_ingestion.py
│   │   ├── Test API call success
│   │   ├── Test error handling
│   │   ├── Test caching mechanism
│   │   └── Test rate limiting
│   └── test_api_endpoints.py
│       ├── Test all 6 endpoints
│       ├── Test request validation
│       ├── Test response structure
│       └── Test error responses
│
├── Integration Tests
│   ├── test_end_to_end.py
│   │   ├── Data ingestion → Prophet forecast → API response
│   │   └── End-to-end disruption prediction
│   └── test_database.py
│       ├── Test CRUD operations
│       ├── Test indexes & queries
│       └── Test transaction handling
│
└── Load Testing (locust or k6)
    ├── Simulate 100 concurrent API requests
    ├── Measure response times
    └── Ensure p95 < 500ms

DOCUMENTATION:
├── README.md
│   ├── Project overview
│   ├── Setup instructions (5 minutes to run locally)
│   ├── Architecture diagram (ASCII)
│   └── How to extend the system
├── API_DOCS.md
│   ├── All 6 endpoints documented
│   ├── Example requests/responses
│   ├── Error codes & solutions
│   └── Rate limits & authentication (if added)
├── PROPHET_GUIDE.md
│   ├── How Prophet models work
│   ├── Feature engineering decisions
│   ├── Model parameters explained
│   └── How to retrain models
├── DEPLOYMENT.md
│   ├── Step-by-step Railway/Render setup
│   ├── Environment variables needed
│   ├── Database migration steps
│   └── Monitoring & alerts setup
└── CODE_STYLE.md
    ├── Python formatting (Black)
    ├── Type hints usage
    ├── Docstring format
    └── Commit message conventions

═══════════════════════════════════════════════════════════════════════════════

PHASE 7: Deployment & Handoff (Days 5.5-6)
────────────────────────────────────────────

DEPLOYMENT CHECKLIST:
├── Environment Setup
│   ├── [ ] Create Railway/Render account (free tier)
│   ├── [ ] Set up PostgreSQL database
│   ├── [ ] Create Redis instance
│   └── [ ] Generate API keys for OpenWeatherMap, Google Maps
│
├── Code Deployment
│   ├── [ ] Push code to GitHub
│   ├── [ ] Configure GitHub Actions for CI/CD
│   ├── [ ] Connect Railway to GitHub repo
│   ├── [ ] Set environment variables in Railway
│   └── [ ] Deploy main branch
│
├── Data Seeding
│   ├── [ ] Load historical shipping data
│   ├── [ ] Initialize Prophet models with training data
│   ├── [ ] Populate initial weather/traffic data
│   └── [ ] Test all APIs return data
│
├── Monitoring Setup
│   ├── [ ] Configure Railway/Render logs
│   ├── [ ] Set up email alerts for errors
│   ├── [ ] Create simple dashboard showing last 24h predictions
│   └── [ ] Test alert system
│
└── Handoff to Frontend
    ├── [ ] Document all API endpoints (Swagger UI)
    ├── [ ] Share database schema diagram
    ├── [ ] Provide API credentials
    ├── [ ] Demo all endpoints working
    └── [ ] Give Frontend engineer access to logs/monitoring

═══════════════════════════════════════════════════════════════════════════════

KEY METRICS & SUCCESS CRITERIA:

✅ SYSTEM REQUIREMENTS:
   • Predicts disruptions 48-72 hours in advance
   • Processes data every 15 minutes (< 2 min execution)
   • Achieves > 75% prediction accuracy
   • Handles 1000+ concurrent shipment analysis
   • API response time < 500ms (p95)
   • 99% uptime (scheduled maintenance excluded)

✅ CODE QUALITY:
   • 80%+ test coverage
   • 0 critical security vulnerabilities
   • Type hints on 100% of functions
   • Passing black/flake8 linters
   • Comprehensive docstrings

✅ DATA QUALITY:
   • < 5% missing data in time-series
   • Outliers detected & handled
   • Prophet models validated with holdout sets
   • Feature engineering reproducible

═══════════════════════════════════════════════════════════════════════════════

DEPENDENCIES SUMMARY:

Core:
  fastapi==0.104.1
  uvicorn==0.24.0
  sqlalchemy==2.0.23
  psycopg2-binary==2.9.9
  redis==5.0.1
  celery==5.3.4
  apscheduler==3.10.4

Data Science:
  prophet==1.1.5
  pandas==2.1.3
  numpy==1.26.2
  scikit-learn==1.3.2  # For metrics

HTTP & Async:
  httpx==0.25.1
  aiohttp==3.9.1

Development:
  pytest==7.4.3
  pytest-cov==4.1.0
  pytest-asyncio==0.21.1
  black==23.12.0
  flake8==6.1.0
  mypy==1.7.1

Requirements.txt Command:
pip freeze > requirements.txt

═══════════════════════════════════════════════════════════════════════════════

FINAL DELIVERABLE CHECKLIST:

By end of hackathon, Backend Engineer should deliver:

[ ] Production-ready FastAPI backend running on Railway
[ ] PostgreSQL database with 6 optimized tables
[ ] Redis cache layer for sub-100ms responses
[ ] 4 trained Prophet models (likelihood, severity, duration, delays)
[ ] Real-time data ingestion from 3+ sources
[ ] 6 fully documented REST API endpoints
[ ] WebSocket streaming for real-time updates
[ ] Background jobs running every 15 minutes
[ ] Comprehensive test suite (pytest)
[ ] Swagger/OpenAPI documentation
[ ] Deployment guide & architecture docs
[ ] Live Swagger UI at /docs
[ ] Model performance dashboard
[ ] All code commented & type-hinted
[ ] GitHub repo with clean commit history

═══════════════════════════════════════════════════════════════════════════════
```

---

## 📌 DEVELOPER 2 PROMPT: Frontend & Route Optimization Engineer

```
═══════════════════════════════════════════════════════════════════════════════
🎯 MISSION: Build the Intelligent Route Optimization Dashboard
═══════════════════════════════════════════════════════════════════════════════

OBJECTIVE:
You are the FRONTEND ARCHITECT responsible for building an interactive supply 
chain dashboard with A* pathfinding route optimization. Your system must 
visualize real-time disruption predictions, allow dynamic route recalculation, 
and provide an intuitive interface for supply chain operators to make 
data-driven decisions instantly.

FINAL DELIVERABLE:
A production-ready React dashboard that:
✅ Displays 70+ real-time shipments on interactive map
✅ Implements A* pathfinding for route optimization
✅ Shows disruption predictions with 48-72hr forecasts
✅ Enables instant rerouting with cost-benefit analysis
✅ Streams real-time disruption alerts via WebSocket
✅ Provides detailed analytics & performance metrics

═══════════════════════════════════════════════════════════════════════════════

TECH STACK:
┌──────────────────────────────────────────────────────────────┐
│ Framework:      React 18+ with Vite                          │
│ Language:       TypeScript (for type safety)                 │
│ Mapping:        Leaflet + Leaflet-React + OpenStreetMap     │
│ Routing:        A* algorithm (JavaScript implementation)     │
│ Real-time:      Socket.IO client                             │
│ State Mgmt:     TanStack Query (React Query)                 │
│ Charting:       Recharts + Chart.js                          │
│ UI Framework:   Shadcn/ui + Tailwind CSS                     │
│ Icons:          Lucide React                                 │
│ HTTP Client:    Axios                                        │
│ Data Tables:    TanStack Table (React Table)                 │
│ Notifications:  React Toastify                               │
│ Testing:        Vitest + React Testing Library               │
│ Deployment:     Vercel (free tier)                           │
└──────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

PHASE 1: Project Setup & Architecture (Days 1-1.5)
──────────────────────────────────────────────────

TASK 1.1: Initialize React + Vite Project
├── Create Vite React + TypeScript project
├── Install all dependencies (see full list below)
├── Set up environment variables (.env.local)
├── Configure API_BASE_URL pointing to Backend (Railway URL)
├── Set up API client with Axios (interceptors for auth)
└── Create folder structure

File Structure:
frontend/
├── src/
│   ├── components/
│   │   ├── Map/
│   │   │   ├── ShipmentMap.tsx (main map component)
│   │   │   ├── ShipmentMarker.tsx (individual shipment pin)
│   │   │   ├── DisruptionZone.tsx (visual warning zones)
│   │   │   ├── RouteLayer.tsx (display routes on map)
│   │   │   └── styles.module.css
│   │   ├── Dashboard/
│   │   │   ├── MetricsCard.tsx (KPI cards)
│   │   │   ├── DisruptionAlerts.tsx (alert panel)
│   │   │   ├── ShipmentTable.tsx (data table)
│   │   │   └── ForecastChart.tsx (timeline chart)
│   │   ├── RouteOptimization/
│   │   │   ├── RouteOptimizer.tsx (main optimizer UI)
│   │   │   ├── WaypointInput.tsx (add/edit waypoints)
│   │   │   ├── RoutingOptions.tsx (A* parameters)
│   │   │   ├── RouteComparison.tsx (before/after)
│   │   │   └── CostAnalysis.tsx (time/distance breakdown)
│   │   ├── Notifications/
│   │   │   ├── ToastContainer.tsx
│   │   │   ├── DisruptionAlert.tsx (alert popup)
│   │   │   └── AlertPreferences.tsx (notification settings)
│   │   ├── Analytics/
│   │   │   ├── PerformanceChart.tsx (prediction accuracy)
│   │   │   ├── DisruptionTimeline.tsx (historical view)
│   │   │   └── NetworkHealth.tsx (system status)
│   │   └── Layout/
│   │       ├── Navbar.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Footer.tsx
│   │       └── MainLayout.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx (main page)
│   │   ├── RouteOptimization.tsx (A* page)
│   │   ├── Analytics.tsx (metrics page)
│   │   ├── ShipmentDetail.tsx (single shipment details)
│   │   └── NotFound.tsx
│   ├── hooks/
│   │   ├── useShipments.ts (fetch shipments from API)
│   │   ├── useDisruptions.ts (fetch disruptions)
│   │   ├── useWebSocket.ts (real-time updates)
│   │   ├── useAStar.ts (A* routing logic)
│   │   ├── useRouteOptimization.ts (cost calculation)
│   │   └── useLocalStorage.ts (persist user preferences)
│   ├── services/
│   │   ├── api.ts (Axios instance + interceptors)
│   │   ├── shipmentAPI.ts (all shipment endpoints)
│   │   ├── disruptionAPI.ts (all disruption endpoints)
│   │   ├── routingAPI.ts (route optimization endpoints)
│   │   ├── websocket.ts (Socket.IO connection)
│   │   └── astar-routing.ts (A* algorithm implementation)
│   ├── types/
│   │   ├── shipment.ts (TypeScript interfaces)
│   │   ├── disruption.ts
│   │   ├── route.ts
│   │   ├── api.ts
│   │   └── index.ts (export all types)
│   ├── utils/
│   │   ├── formatters.ts (date, distance, time formatting)
│   │   ├── validators.ts (input validation)
│   │   ├── geo.ts (haversine distance, bounds, etc.)
│   │   ├── constants.ts (map tiles, colors, etc.)
│   │   └── helpers.ts (general utilities)
│   ├── styles/
│   │   ├── globals.css (Tailwind imports)
│   │   ├── variables.css (CSS custom properties)
│   │   └── animations.css
│   ├── App.tsx (main app component, routing)
│   ├── main.tsx (entry point)
│   └── vite-env.d.ts
├── public/
│   └── assets/
├── tests/
│   ├── astar.test.ts (A* algorithm tests)
│   ├── components/
│   ├── hooks/
│   └── services/
├── .env.local (not in git)
├── .env.example
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── package.json
└── README.md

TASK 1.2: Configure Vite & Build System
├── Set up TypeScript strict mode
├── Configure Tailwind CSS
├── Import Shadcn/ui components
├── Set up path aliases (@/components, @/utils, etc.)
├── Configure Vite optimizations
├── Set up hot-reload development
└── Verify build output

TASK 1.3: Create API Service Layer
├── Configure Axios instance with:
│   ├── Base URL from environment
│   ├── Default headers (Content-Type)
│   ├── Timeout 30 seconds
│   ├── Request/response interceptors
│   └── Error handling & logging
├── Create API client functions:
│   ├── shipmentAPI.getAll() - fetch all shipments
│   ├── disruptionAPI.getAll() - fetch disruptions
│   ├── routingAPI.optimize() - call A* backend
│   └── All with retry logic & error handling
└── Test all APIs connect successfully to backend

═══════════════════════════════════════════════════════════════════════════════

PHASE 2: Interactive Map Visualization (Days 1.5-2.5)
─────────────────────────────────────────────────────

TASK 2.1: Set Up Leaflet Map
├── Install leaflet, leaflet-react, leaflet-draw
├── Create main map component with:
│   ├── OpenStreetMap base tiles (free, no auth)
│   ├── Responsive sizing (full width/height)
│   ├── Zoom controls (1-18)
│   ├── Pan & drag enabled
│   ├── Touch support for mobile
│   └── Flyto animations for smooth transitions
├── Add map controls:
│   ├── Reset view button (world-wide)
│   ├── Search location input
│   ├── Layer toggle (satellite/street/terrain)
│   └── Legend showing symbol meanings
│
└── Component: ShipmentMap.tsx
    ├── Props: { shipments, disruptions, selectedShipment }
    ├── State: mapCenter, zoom, hoveredMarker
    ├── Features:
    │   ├── Render shipment markers
    │   ├── Render disruption zones
    │   ├── Highlight selected shipment
    │   └── Show route polylines
    └── Effects:
        ├── Fetch shipments on mount
        ├── Subscribe to WebSocket updates
        └── Fly to selected shipment

TASK 2.2: Shipment Markers & Clustering
├── Create custom markers with:
│   ├── Color coding by status (en-route, delayed, delivered)
│   ├── Size by cargo value / priority
│   ├── Icon showing cargo type (container, truck, plane)
│   └── Pulse animation for critical shipments
├── Implement marker clustering:
│   ├── Use Leaflet.markercluster library
│   ├── Show count of shipments in clusters
│   ├── Cluster dissolves on zoom
│   ├── Click cluster → zoom to bounds
│   └── Performance: handle 1000+ markers smoothly
├── Tooltip on hover:
│   ├── Shipment ID
│   ├── Origin → Destination
│   ├── ETA
│   ├── Current delay (if any)
│   └── Disruption risk level
│
└── Component: ShipmentMarker.tsx
    ├── Props: { shipment, isSelected, onSelect }
    ├── Renders: Leaflet.Marker with custom icon
    ├── Events: click → select, hover → tooltip
    └── Colors:
        ├── Green: on-time
        ├── Yellow: 1-4h delay
        ├── Red: 5+ hours delay
        └── Purple: disruption predicted

TASK 2.3: Route Visualization
├── Render original routes as blue polylines
├── Render optimized routes as green polylines
├── Add waypoint markers along routes:
│   ├── Start point (green circle)
│   ├── Intermediate waypoints (yellow squares)
│   ├── End point (red circle)
│   └── Estimated arrival time labels
├── Show route properties on hover:
│   ├── Total distance
│   ├── Estimated duration
│   ├── Pass-through zones with disruptions
│   └── Cost breakdown (time, distance, disruption risk)
├── Animate route drawing:
│   ├── Use Leaflet-snakepoly for animation
│   ├── Draw line gradually over 2 seconds
│   └── Show checkmarks at milestones
│
└── Component: RouteLayer.tsx
    ├── Props: { originalRoute, optimizedRoute, showDisturbances }
    ├── Renders: Leaflet.Polyline with custom styling
    ├── Animations: route drawing, pulsing
    └── Info windows with segment details

TASK 2.4: Disruption Zones & Heat Maps
├── Overlay disruption zones as:
│   ├── Semi-transparent circles (radius = impact area)
│   ├── Color = severity (yellow→orange→red→purple)
│   ├── Opacity = probability (0.3-0.8)
│   └── Size = number of affected shipments
├── Add heat map for disruption density:
│   ├── Use Leaflet.heat for heatmap overlay
│   ├── Generate from disruption predictions
│   ├── Update every 15 minutes
│   └── Show temporal heat map (toggle for different time windows)
├── Popup on click showing:
│   ├── Disruption type (port_congestion, weather, traffic)
│   ├── Predicted time window
│   ├── Probability & confidence
│   ├── Affected shipments count
│   └── Recommended actions
│
└── Component: DisruptionZone.tsx
    ├── Props: { disruptions, timeWindow }
    ├── Renders: Leaflet circles with gradients
    ├── Interaction: click for details popup
    └── Auto-updates with data changes

TASK 2.5: Map Interaction Features
├── Click shipment marker → show details panel:
│   ├── Shipment info (ID, cargo, value)
│   ├── Timeline (departure, waypoints, ETA)
│   ├── Current status & location
│   ├── Risk assessment
│   ├── Recommended actions
│   └── "Optimize Route" button
├── Right-click to add/modify waypoints:
│   ├── Click map → add waypoint
│   ├── Drag waypoint → reposition
│   ├── Right-click waypoint → delete
│   ├── Real-time route recalculation
│   └── Show cost comparison (original vs optimized)
├── Keyboard shortcuts:
│   ├── F: fit all shipments in view
│   ├── Ctrl+Z: undo last action
│   ├── Ctrl+S: save current view
│   └── ?: help/shortcuts menu
└── Mobile support:
    ├── Touch to select shipment
    ├── Pinch to zoom
    ├── Two-finger tap for options menu
    └── Responsive sidebar on small screens

═══════════════════════════════════════════════════════════════════════════════

PHASE 3: A* Pathfinding Algorithm Implementation (Days 2.5-4)
──────────────────────────────────────────────────────────────

UNDERSTANDING A* FOR ROUTING:
A* is a best-first search algorithm perfect for route optimization because:
✓ Fast & optimal (finds shortest path quickly)
✓ Heuristic-guided (uses map distance to guide search)
✓ Handles weighted edges (roads have different costs)
✓ Avoids dead ends (more efficient than Dijkstra)
✓ Can incorporate multiple cost factors (time, distance, disruptions)

TASK 3.1: A* Algorithm Implementation
├── Create Graph data structure:
│   ├── Nodes: major cities/ports/distribution centers
│   ├── Edges: shipping lanes/roads between nodes
│   ├── Edge weights:
│   │   ├── Base weight: distance (km)
│   │   ├── Dynamic weight: current traffic/delays
│   │   ├── Risk weight: disruption probability
│   │   └── Tolls/restrictions: user preferences
│   └── Heuristic: straight-line distance to goal
│
├── Implement core A* functions:
│   ├── openSet: priority queue (min-heap)
│   ├── gScore: cost from start to current node
│   ├── fScore: gScore + heuristic estimate
│   ├── reconstructPath: backtrace from goal to start
│   └── getNeighbors: find adjacent nodes in graph
│
└── Function: astar(
        start: Node,
        goal: Node,
        graph: Graph,
        costFunction: (edge) => number,
        heuristic: (node) => number
    ) -> Path

TASK 3.2: Create Node & Graph Data Structures
├── Define Node interface:
│   ├── id: string (unique identifier)
│   ├── name: string (city/port name)
│   ├── latitude: number
│   ├── longitude: number
│   ├── type: string (port|city|warehouse)
│   └── properties: {
│       ├── baseDelay: hours (typical port delay)
│       ├── operationalCosts: $/day
│       └── capacity: containers/day
│   }
│
├── Define Edge interface:
│   ├── from: string (start node ID)
│   ├── to: string (end node ID)
│   ├── distance: number (km, great-circle)
│   ├── baseTime: number (hours, baseline transit time)
│   ├── currentDelay: number (hours, live traffic)
│   ├── disruptionRisk: number (0-1 probability)
│   └── cost: number ($/ton, shipping cost)
│
└── Create Graph class:
    ├── Methods:
    │   ├── addNode(node): void
    │   ├── addEdge(from, to, weight): void
    │   ├── getNode(id): Node | null
    │   ├── getNeighbors(nodeId): Node[]
    │   ├── getEdgeWeight(from, to): number
    │   └── loadFromJSON(geojson): Graph
    └── Data source:
        ├── Pre-load major ports (Shanghai, Rotterdam, Singapore, etc.)
        ├── Add major cities (distribution hubs)
        ├── Create edges between nearby nodes
        ├── Store in memory (fast access)
        └── Sync with backend every 5 minutes

TASK 3.3: Implement Cost Function & Heuristic
├── Cost Function (dynamic):
│   ├── baseCost = distance / avgSpeed + baseTime
│   ├── delayCost = currentDelay (from traffic data)
│   ├── disruptionCost = disruptionRisk * penaltyFactor
│   │   └── penaltyFactor = 100 (make high-risk routes very expensive)
│   ├── timeSensitivePenalty = cargo_priority * delayImpact
│   └── TOTAL_COST = α*distance + β*delay + γ*disruption + δ*urgency
│
├── Parameters (tunable):
│   ├── α (distance weight): 1.0 (default)
│   ├── β (delay weight): 2.0 (delays matter more)
│   ├── γ (disruption weight): 3.0 (avoid disruptions most)
│   ├── δ (urgency weight): 0.5-5.0 (priority-dependent)
│   └── Allow user to adjust weights
│
├── Heuristic Function (straight-line distance):
│   ├── h(node) = haversine(node.lat/lon, goal.lat/lon) / avgSpeed
│   ├── Admissible (never overestimates actual cost)
│   ├── Returns hours (same units as cost function)
│   └── Consistent (h(n) ≤ cost(n→m) + h(m))
│
└── Function: calculateEdgeCost(
        from: Node,
        to: Node,
        trafficData: TrafficData,
        disruptionData: DisruptionData,
        userPreferences: Preferences
    ) -> number

TASK 3.4: A* Core Algorithm
Pseudocode & TypeScript Implementation:

```typescript
interface AStarNode {
  id: string;
  gScore: number;        // cost from start
  fScore: number;        // gScore + heuristic
  parent: AStarNode | null;
  open: boolean;
}

function aStar(
  startId: string,
  goalId: string,
  graph: Graph,
  costFn: (from: Node, to: Node) => number,
  heuristic: (node: Node) => number
): Path {
  const openSet = new MinHeap<AStarNode>();  // sorted by fScore
  const closedSet = new Set<string>();
  const nodeMap = new Map<string, AStarNode>();

  // Initialize start node
  const startNode = graph.getNode(startId);
  const astarStart = {
    id: startId,
    gScore: 0,
    fScore: heuristic(startNode),
    parent: null,
    open: true
  };
  openSet.push(astarStart);
  nodeMap.set(startId, astarStart);

  while (!openSet.isEmpty()) {
    // Get node with lowest fScore
    const current = openSet.pop();
    current.open = false;

    // Goal found!
    if (current.id === goalId) {
      return reconstructPath(current);
    }

    closedSet.add(current.id);
    const currentNode = graph.getNode(current.id);
    const neighbors = graph.getNeighbors(current.id);

    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.id)) continue;

      const currentNodeObj = graph.getNode(current.id)!;
      const tentativeGScore = 
        current.gScore + costFn(currentNodeObj, neighbor);

      const neighborAstar = nodeMap.get(neighbor.id);
      
      if (!neighborAstar || tentativeGScore < neighborAstar.gScore) {
        // This path is better than any previous one

        const astarNeighbor = {
          id: neighbor.id,
          gScore: tentativeGScore,
          fScore: tentativeGScore + heuristic(neighbor),
          parent: current,
          open: true
        };

        if (!neighborAstar) {
          openSet.push(astarNeighbor);
          nodeMap.set(neighbor.id, astarNeighbor);
        } else {
          // Update existing neighbor
          neighborAstar.gScore = tentativeGScore;
          neighborAstar.fScore = tentativeGScore + heuristic(neighbor);
          neighborAstar.parent = current;
          openSet.updatePriority(neighbor.id);
        }
      }
    }
  }

  // No path found
  return null;
}

function reconstructPath(node: AStarNode): Path {
  const path: string[] = [];
  let current = node;
  
  while (current) {
    path.unshift(current.id);  // prepend
    current = current.parent;
  }
  
  return {
    nodeIds: path,
    waypoints: path.map(id => graph.getNode(id))
  };
}
```

TASK 3.5: Route Optimization Service
├── Implement constraint handling:
│   ├── Time window constraints (cargo must arrive by date)
│   ├── Port operating hours (ports close at night)
│   ├── Cargo restrictions (hazmat routes, etc.)
│   ├── Fuel capacity (max range per leg)
│   └── Budget constraints (max cost acceptable)
├── Create multi-goal routing:
│   ├── Route with multiple stops (TSP variant)
│   ├── Run A* between each stop pair
│   ├── Combine individual paths
│   └── Optimize stop ordering if needed
├── Cost-benefit analysis:
│   ├── Original route cost
│   ├── Optimized route cost
│   ├── Savings: time + distance + risk
│   ├── Percentage improvement
│   └── Visual comparison chart
│
└── Function: optimizeRoute(
        origin: Location,
        destination: Location,
        waypoints?: Location[],
        constraints?: RouteConstraints
    ) -> RouteOptimizationResult

TASK 3.6: Testing A* Algorithm
├── Unit tests with synthetic graphs:
│   ├── Simple 5-node grid → verify shortest path
│   ├── Graph with barriers → verify pathfinding around obstacles
│   ├── Weighted edges → verify cost optimization
│   └── Performance test (1000+ nodes) → ensure < 500ms
├── Integration tests with real data:
│   ├── Shanghai → Rotterdam on real shipping graph
│   ├── Compare vs known optimal routes
│   ├── Verify cost calculations
│   └── Test constraint handling
└── Benchmark:
    ├── Time to find path (target: < 200ms)
    ├── Path optimality (should be near-optimal)
    ├── Memory usage (< 100MB)
    └── Scalability (handle graphs with 5000+ nodes)

═══════════════════════════════════════════════════════════════════════════════

PHASE 4: Route Optimization UI & Controls (Days 4-4.5)
──────────────────────────────────────────────────────

TASK 4.1: Route Optimizer Panel
├── Left sidebar component with:
│   ├── Origin input (autocomplete from known locations)
│   ├── Destination input
│   ├── Waypoints list (add/remove/reorder)
│   ├── Optimization preferences:
│   │   ├── Priority selector (fastest, cheapest, safest)
│   │   ├── Time window picker (departure date/time)
│   │   ├── Cargo type selector
│   │   ├── Budget limit input
│   │   └── Risk tolerance slider (0-100)
│   └── "Calculate Route" button (prominent)
│
└── Component: RouteOptimizer.tsx
    ├── State: origin, destination, waypoints, preferences
    ├── Handlers:
    │   ├── onAddWaypoint()
    │   ├── onRemoveWaypoint()
    │   ├── onReorderWaypoints()
    │   └── onOptimize()
    └── Integrates with backend A* routing

TASK 4.2: Route Comparison Display
├── Split-screen view:
│   ├── Left: Original route (blue)
│   ├── Right: Optimized route (green)
│   └── Center: Side-by-side metrics comparison
├── Metrics displayed:
│   ├── Distance (km)
│   ├── Transit time (hours)
│   ├── Number of stops
│   ├── Total cost ($)
│   ├── Risk score (0-100)
│   ├── Time saved
│   └── Cost saved
├── Visual diff:
│   ├── Highlight newly added waypoints
│   ├── Highlight removed waypoints
│   ├── Show rerouted segments in bold
│   └── Animate transition between routes
│
└── Component: RouteComparison.tsx
    ├── Props: { original: Route, optimized: Route }
    ├── Layout: flexbox grid 2 columns
    └── Charts: bar charts for metrics

TASK 4.3: Cost Breakdown & Analysis
├── Interactive breakdown showing:
│   ├── Transportation time cost
│   ├── Distance-based cost
│   ├── Disruption risk cost
│   ├── Insurance costs
│   └── Contingency buffer
├── Segment-level breakdown:
│   ├── Click segment → see detailed costs
│   ├── Identify most expensive segments
│   ├── Suggest alternative routing for expensive segments
│   └── Show why optimizer chose this segment
├── What-if analysis:
│   ├── Adjust risk tolerance → recalculate
│   ├── Change time window → recalculate
│   ├── Toggle constraints → recalculate
│   └── Real-time preview
│
└── Component: CostAnalysis.tsx
    ├── State: { selectedSegment, costBreakdown }
    ├── Renders: Recharts pie/bar charts
    └── Interactions: hover segments, drill down

TASK 4.4: Real-Time Recommendations
├── As user optimizes routes:
│   ├── Show live updates from backend
│   ├── Display predicted disruptions along route
│   ├── Highlight bottleneck hours
│   ├── Suggest time windows to avoid
│   └── Show alternatives if current route has high risk
├── Recommendation cards:
│   ├── "Delay departure 4 hours to avoid typhoon"
│   ├── "Port of Shanghai has 12h queue - consider Rotterdam"
│   ├── "Route via Suez saves 2 days vs Cape of Good Hope"
│   └── "Highest risk window: May 1-3, 06:00-18:00"
├── One-click actions:
│   ├── "Accept Recommendation" → auto-adjust waypoints
│   ├── "See Alternative" → show next-best route
│   └── "More Options" → show top 5 route variants
│
└── Component: LiveRecommendations.tsx
    ├── Real-time connection to backend
    ├── Streams recommendations via WebSocket
    └── Auto-dismiss after 10 seconds

TASK 4.5: Advanced Routing Features
├── Multi-shipment optimization:
│   ├── Select 2+ shipments with similar routes
│   ├── Consolidate shipments (share container)
│   ├── Find optimal combined route
│   ├── Show cost savings per shipment
│   └── One-click consolidate action
├── Contingency routing:
│   ├── Generate top 3 alternative routes
│   ├── Automatically switch if primary route disrupted
│   ├── Estimate reroute time (should be < 5 minutes)
│   └── Show fallback routes on map
├── Route templates:
│   ├── Save frequently used routes as templates
│   ├── Load template → auto-fill origin/destination
│   ├── One-click deployment
│   └── Versioning (keep history of changes)

═══════════════════════════════════════════════════════════════════════════════

PHASE 5: Real-Time Updates & Notifications (Days 4.5-5)
────────────────────────────────────────────────────────

TASK 5.1: WebSocket Integration
├── Connect to backend WebSocket on mount:
│   ├── ws://backend-url/ws/disruptions
│   ├── Implement auto-reconnect (exponential backoff)
│   ├── Connection status indicator (top-right corner)
│   ├── Heartbeat/ping to keep alive
│   └── Graceful disconnect on unmount
├── Message types received:
│   ├── DisruptionAlert (new disruption detected)
│   ├── DisruptionUpdated (existing disruption changed)
│   ├── DisruptionResolved (disruption cleared)
│   ├── ShipmentStatusUpdate (shipment moved)
│   └── ForecastUpdate (new predictions)
├── Auto-update shipments:
│   ├── Fetch updated data from backend
│   ├── Update UI in real-time (no page refresh)
│   ├── Animate position changes on map
│   └── Log all updates for debugging
│
└── Hook: useWebSocket(url, onMessage)
    ├── Manages connection lifecycle
    ├── Returns: { status, send, lastMessage }
    └── Auto-reconnects on disconnect

TASK 5.2: Disruption Alerts & Notifications
├── Toast notifications for:
│   ├── New disruption detected (critical)
│   ├── Nearby shipment affected (warning)
│   ├── Recommended action available (info)
│   └── Congestion cleared (success)
├── Notification panel (sidebar):
│   ├── Show last 20 notifications
│   ├── Grouped by type (disruptions, reroutes, etc.)
│   ├── Timestamp + severity indicator
│   ├── Mark as read/unread
│   └── Swipe to dismiss on mobile
├── Notification preferences:
│   ├── Toggle notification types on/off
│   ├── Set alert thresholds (only critical disruptions, etc.)
│   ├── Quiet hours (8pm-6am, no notifications)
│   ├── Sound alert on/off
│   └── Desktop notifications (browser permission)
│
└── Component: DisruptionAlert.tsx
    ├── Props: { alert: DisruptionAlert }
    ├── Shows: type, location, time, action button
    └── Animation: slide in from right, auto-dismiss 10s

TASK 5.3: Live Shipment Updates
├── Update shipment locations on map:
│   ├── Smooth animation (0.5s) between positions
│   ├── Pulsing dot for current position
│   ├── Trail showing recent path (last 6 hours)
│   └── ETA countdown timer
├── Status badges:
│   ├── Green: on-time
│   ├── Yellow: slightly delayed
│   ├── Orange: moderately delayed
│   ├── Red: severely delayed
│   └── Purple: route change recommended
├── Update shipment table:
│   ├── Re-render only changed rows (performance)
│   ├── Highlight newly delayed shipments
│   ├── Show alert icons for disruptions
│   └── One-click "Optimize" for affected shipments
│
└── Hook: useShipmentUpdates()
    ├── Subscribes to WebSocket updates
    ├── Updates React state intelligently
    ├── Only re-renders affected components
    └── Debounces rapid updates (max 1/sec)

═══════════════════════════════════════════════════════════════════════════════

PHASE 6: Analytics & Insights Dashboard (Days 5-5.5)
────────────────────────────────────────────────────

TASK 6.1: Model Performance Analytics
├── Display metrics from backend:
│   ├── Prediction accuracy (%)
│   ├── Precision vs Recall
│   ├── Mean error in hours
│   └── Coverage (avg hours to prediction)
├── Visualizations:
│   ├── Line chart: accuracy over time (daily rolling average)
│   ├── Confusion matrix (heatmap)
│   ├── ROC curve
│   └── Feature importance (what factors matter most)
├── Model health checks:
│   ├── Last retrained timestamp
│   ├── Training data points used
│   ├── Data quality score (% missing data)
│   └── Drift detection (model performance declining?)
│
└── Component: PerformanceChart.tsx
    ├── Data source: /api/v1/stats/performance
    ├── Charts: Recharts line + heatmap
    └── Update interval: 6 hours

TASK 6.2: Disruption Timeline & Insights
├── Historical view showing:
│   ├── All disruptions in past 30 days
│   ├── Timeline (horizontal bar chart)
│   ├── Color coded by type
│   ├── Click → show details
│   └── Filter by type/location/severity
├── Patterns & trends:
│   ├── Most common disruption types
│   ├── Hotspot locations (map showing frequency)
│   ├── Peak disruption times (heatmap by hour)
│   ├── Seasonal patterns (chart)
│   └── Correlation with weather events
├── Impact analysis:
│   ├── Shipments affected per disruption
│   ├── Average delay per disruption
│   ├── Cost impact ($)
│   └── Recovery time (how long to clear)
│
└── Component: DisruptionTimeline.tsx
    ├── Data source: /api/v1/disruptions?limit=1000
    ├── Timeline library: react-vertical-timeline-component
    └── Filterable by date range

TASK 6.3: Network Health Dashboard
├── System status indicators:
│   ├── Backend API: online/offline, response time (ms)
│   ├── Database: latency (ms), query performance
│   ├── Data sources: last update time for each API
│   │   ├── Weather API
│   ├─├── Traffic API
│   │   ├── Port data API
│   │   └── Shipment data API
│   ├── WebSocket: connected (yes/no), latency
│   └── Overall system health (%)
├── Performance metrics:
│   ├── API call success rate (%)
│   ├── Average response time (ms)
│   ├── Data freshness (minutes since last update)
│   └── Error rate (failed predictions, etc.)
├── Alerts & issues:
│   ├── List of current issues
│   ├── Impact severity
│   ├── Est. resolution time
│   └── Subscribe to notifications
│
└── Component: NetworkHealth.tsx
    ├── Data source: /api/v1/system/health
    ├── Renders: status badges + metrics grid
    └── Auto-refresh every 30 seconds

═══════════════════════════════════════════════════════════════════════════════

PHASE 7: Testing & Optimization (Days 5.5-6)
──────────────────────────────────────────────

TEST SUITE:
├── Unit Tests (Vitest)
│   ├── A* algorithm tests:
│   │   ├── test_simple_grid.ts (5-node grid)
│   │   ├── test_weighted_edges.ts
│   │   ├── test_impossible_path.ts (no solution)
│   │   └── test_large_graph.ts (1000+ nodes)
│   ├── Utility functions:
│   │   ├── test_haversine_distance.ts
│   │   ├── test_cost_calculation.ts
│   │   └── test_formatters.ts
│   └── Data structures:
│       ├── test_min_heap.ts
│       └── test_graph.ts
│
├── Component Tests (React Testing Library)
│   ├── test_shipment_map.tsx (renders markers, clicks)
│   ├── test_route_optimizer.tsx (input, calculate, display)
│   ├── test_disruption_alert.tsx (rendering, dismiss)
│   └── test_analytics_dashboard.tsx (data loading, charts)
│
├── Integration Tests
│   ├── test_map_shipment_flow.tsx (load shipments → click → show details)
│   ├── test_routing_flow.tsx (input route → optimize → display)
│   ├── test_websocket_updates.tsx (connect → receive update → render)
│   └── test_api_integration.ts (mock API calls)
│
└── E2E Tests (Optional, using Cypress or Playwright)
    ├── test_complete_user_flow.cy.ts
    │   ├── Load dashboard
    │   ├── Click shipment marker
    │   ├── Click optimize route
    │   ├── See optimized route
    │   └── Save route
    └── test_alert_handling.cy.ts
        ├── Receive WebSocket alert
        ├── Toast appears
        ├── Click action
        └── Route updates

PERFORMANCE OPTIMIZATION:
├── Code splitting:
│   ├── Lazy load route optimizer component
│   ├── Lazy load analytics page
│   └── Separate bundle for large libraries (Recharts)
├── Image optimization:
│   ├── Compress marker icons
│   ├── Use SVG for simple graphics
│   └── Lazy load map tiles
├── Rendering optimization:
│   ├── Memoize expensive components (React.memo)
│   ├── Use useMemo for calculations
│   ├── Virtualize long lists (TanStack Table)
│   └── Debounce map pan/zoom handlers
├── API call optimization:
│   ├── Cache shipment data (5 minute TTL)
│   ├── Batch API requests where possible
│   ├── Paginate large data sets
│   └── Use WebSocket for real-time (not polling)
├── Bundle size:
│   ├── Target: < 500KB (gzipped)
│   ├── Run npm run analyze to check
│   ├── Remove unused dependencies
│   └── Tree-shake unused exports

═══════════════════════════════════════════════════════════════════════════════

PHASE 8: Deployment & Documentation (Days 6-6.5)
──────────────────────────────────────────────────

DEPLOYMENT:
├── Build optimization:
│   ├── npm run build
│   ├── Check build output (should be < 1MB gzipped)
│   ├── Verify source maps created
│   └── Test build locally (npm run preview)
├── Deploy to Vercel:
│   ├── Connect GitHub repo to Vercel
│   ├── Set environment variables (REACT_APP_API_URL)
│   ├── Deploy on every push to main
│   ├── Enable auto-preview for PR branches
│   └── Set up custom domain (if available)
├── Environment variables needed:
│   ├── REACT_APP_API_URL (Backend Railway URL)
│   ├── REACT_APP_OPENWEATHER_KEY (get from backend)
│   ├── REACT_APP_GOOGLE_MAPS_KEY (get from backend)
│   └── REACT_APP_WS_URL (WebSocket URL)

DOCUMENTATION:
├── README.md
│   ├── Project overview
│   ├── Feature list
│   ├── Screenshots/demo video links
│   ├── Setup instructions (npm install → npm run dev)
│   ├── Architecture diagram
│   └── Tech stack explanation
├── ROUTING_GUIDE.md
│   ├── How A* algorithm works
│   ├── Parameter tuning guide
│   ├── Cost function breakdown
│   └── Examples (Shanghai → Rotterdam)
├── DEPLOYMENT.md
│   ├── Deploy to Vercel (step-by-step)
│   ├── Environment variables setup
│   ├── Connecting to backend API
│   └── Monitoring & debugging
├── CONTRIBUTION.md
│   ├── Development setup
│   ├── Code style guide (Prettier, ESLint)
│   ├── Testing requirements (80%+ coverage)
│   ├── Commit message format
│   └── Pull request process
└── TROUBLESHOOTING.md
    ├── Common issues & solutions
    ├── WebSocket connection issues
    ├── API timeout problems
    ├── Map rendering issues
    └── Performance debugging

═══════════════════════════════════════════════════════════════════════════════

KEY METRICS & SUCCESS CRITERIA:

✅ PERFORMANCE:
   • Page load time: < 3 seconds
   • A* routing time: < 500ms for 5000+ node graphs
   • WebSocket latency: < 100ms
   • Map rendering: 60 FPS with 1000+ markers
   • Memory usage: < 200MB

✅ USER EXPERIENCE:
   • 100% responsive (desktop, tablet, mobile)
   • No layout shift (CLS < 0.1)
   • Accessibility: WCAG 2.1 AA compliant
   • Touch-friendly: 48px+ tap targets
   • Smooth animations (no jank)

✅ CODE QUALITY:
   • 80%+ test coverage
   • TypeScript strict mode enabled
   • Zero ESLint errors
   • Prettier formatted
   • Comprehensive JSDoc comments

═══════════════════════════════════════════════════════════════════════════════

DEPENDENCIES SUMMARY:

Core:
  react==18.2.0
  react-dom==18.2.0
  react-router-dom==6.20.0
  typescript==5.3.3

Mapping & Routing:
  leaflet==1.9.4
  react-leaflet==4.2.1
  leaflet-cluster==1.5.1
  leaflet.heat==0.2.0

Real-time:
  socket.io-client==4.7.2

State & Data:
  @tanstack/react-query==5.25.0
  @tanstack/react-table==8.10.3
  axios==1.6.2

UI & Styling:
  shadcn-ui==0.8.0
  tailwindcss==3.3.6
  lucide-react==0.294.0
  react-toastify==9.1.3

Charting:
  recharts==2.10.3
  chart.js==4.4.1
  react-chartjs-2==5.2.0

Development:
  vite==5.0.7
  vitest==1.0.4
  @testing-library/react==14.1.2
  @testing-library/jest-dom==6.1.5

Installation:
npm install react react-dom react-router-dom typescript \
  leaflet react-leaflet socket.io-client \
  @tanstack/react-query @tanstack/react-table axios \
  shadcn-ui tailwindcss lucide-react react-toastify \
  recharts chart.js react-chartjs-2 \
  --save

npm install -D vite vitest @testing-library/react \
  @testing-library/jest-dom prettier eslint \
  --save-dev

═══════════════════════════════════════════════════════════════════════════════

FINAL DELIVERABLE CHECKLIST:

By end of hackathon, Frontend Engineer should deliver:

[ ] Live React dashboard deployed on Vercel
[ ] Interactive Leaflet map with 1000+ shipment markers
[ ] A* pathfinding algorithm fully functional
[ ] Route optimization UI with cost analysis
[ ] Real-time WebSocket integration
[ ] Disruption alerts with 72-hour forecasts
[ ] Analytics dashboard with performance metrics
[ ] 80%+ test coverage
[ ] Responsive design (desktop/tablet/mobile)
[ ] 60 FPS performance on modern browsers
[ ] Swagger/API documentation linked
[ ] Comprehensive documentation (README, guides)
[ ] GitHub repo with clean commit history
[ ] Demo video or walkthrough (2-3 minutes)
[ ] Accessibility compliance (WCAG AA)
[ ] All components typed (TypeScript strict)
[ ] Error handling for all edge cases

═══════════════════════════════════════════════════════════════════════════════
```

---

## 📌 SHARED TASKS & Collaboration Points

```
═══════════════════════════════════════════════════════════════════════════════
HANDOFF & SYNCHRONIZATION POINTS
═══════════════════════════════════════════════════════════════════════════════

DAY 1 (Setup Phase)
├── 9:00 AM: Initial kickoff meeting (30 min)
│   ├── Review roadmap together
│   ├── Clarify deliverables
│   └── Set daily sync time (e.g., 4 PM)
├── Dev1 Sets up: GitHub repo, Docker, databases
├── Dev2 Sets up: React project, TypeScript, Vite
└── 4:00 PM: First sync → verify local environments work

DAY 1-2 (Architecture Review)
├── Dev1 Creates: Database schema (send to Dev2)
├── Dev2 Creates: TypeScript types mirroring schema
├── Shared: API contract document
│   ├── All endpoint signatures
│   ├── Request/response structures
│   └── Error codes & formats
└── Design Review: Any changes needed?

DAY 2-3 (Parallel Development)
├── Dev1 Work:
│   ├── Implement data ingestion services
│   ├── Build Prophet forecasting pipeline
│   └── Create REST endpoints (Swagger docs auto-generated)
├── Dev2 Work:
│   ├── Build map component
│   ├── Implement A* algorithm
│   └── Create route optimizer UI
└── Daily 4 PM: 15-min sync
    ├── Any blockers?
    ├── API changes needed?
    └── Schedule is on track?

DAY 3-4 (Integration Ready)
├── Dev1 Milestone: ✅ All API endpoints working
├── Dev2 Milestone: ✅ A* algorithm passing tests
├── Dev1 Deploys: Backend to Railway (public URL)
├── Dev2 Updates: .env with API_URL
└── Integration Testing: Dev2 tests all APIs from UI

DAY 4-5 (Real-Time Integration)
├── Dev1 Implements: WebSocket endpoints
├── Dev2 Connects: WebSocket client
├── Dev1 Provides: Database for test shipments
├── Dev2 Loads: Sample data for demo
└── End-to-end flow: Data → Prediction → Alert → Map Update

DAY 5-6 (Polish & Documentation)
├── Dev1:
│   ├── Add monitoring dashboards
│   ├── Write API documentation
│   ├── Create deployment guide
│   └── Load realistic test data
├── Dev2:
│   ├── Performance optimization
│   ├── Accessibility compliance
│   ├── Write user guide
│   └── Create demo walkthrough
└── Testing: Both run full end-to-end tests

WEEKLY SYNC AGENDA (30 minutes, Fridays):
├── Dev1 Demo: Backend features (live dashboard showing predictions)
├── Dev2 Demo: Frontend features (map with 100 shipments, route optimizer)
├── Blockers & solutions
├── Next week priorities
└── Team morale & feedback

═══════════════════════════════════════════════════════════════════════════════

API CONTRACT (Shared Document)

Endpoint:     GET /api/v1/disruptions
Developers:   Dev1 (implements), Dev2 (consumes)
Status:       ✅ Implemented
Swagger:      https://backend-url/docs

Endpoint:     POST /api/v1/shipments/analyze
Developers:   Dev1 (implements), Dev2 (consumes)
Status:       ✅ Implemented
Swagger:      https://backend-url/docs

Endpoint:     POST /api/v1/routes/optimize
Developers:   Dev1 (provides cost functions), Dev2 (consumes)
Status:       ⚠️ In Development
Swagger:      https://backend-url/docs

WebSocket:    ws://backend-url/ws/disruptions
Developers:   Dev1 (implements), Dev2 (connects)
Status:       ✅ Ready by Day 4

═══════════════════════════════════════════════════════════════════════════════
```

---

## 🚀 Quick Start Guide (For Both Developers)

```bash
# Clone & Setup (both)
git clone https://github.com/your-org/supply-chain-resilience.git
cd supply-chain-resilience

# Backend Setup (Dev1)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with Railway credentials
python -m alembic upgrade head
uvicorn app.main:app --reload

# Frontend Setup (Dev2)
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with Backend API URL
npm run dev

# Both: Deploy to Production
git push origin main  # Triggers GitHub Actions CI/CD
# Backend: Auto-deploys to Railway
# Frontend: Auto-deploys to Vercel
```

---

## 📊 Success Metrics

| Metric | Target | Dev1 Responsible | Dev2 Responsible |
|--------|--------|------------------|------------------|
| Prediction Accuracy | > 75% | ✅ | - |
| Response Time | < 500ms | ✅ | ✅ |
| Map Performance | 60 FPS (1000+ markers) | - | ✅ |
| A* Routing | < 200ms (5000 nodes) | - | ✅ |
| Uptime | 99% | ✅ | ✅ |
| Test Coverage | > 80% | ✅ | ✅ |
| Documentation | Comprehensive | ✅ | ✅ |

---

## 💡 Innovation Highlights (AntiGravity Approach)

1. **Predictive Disruption Detection**
   - Prophet forecasts 48-72 hours in advance
   - Prevents cascading delays before they happen

2. **Dynamic Route Optimization**
   - A* algorithm adapts routes in real-time
   - Avoids disruption zones intelligently
   - Balances time, cost, and risk

3. **Real-Time Alerts**
   - WebSocket streams updates instantly
   - Operators make decisions before crises hit

4. **Zero-Investment Stack**
   - All free/open-source tools
   - Free APIs (OpenWeatherMap, Google Maps, Railway, Vercel)
   - No licensing costs

5. **Scalable Architecture**
   - Handles 1000+ concurrent shipments
   - Background jobs run asynchronously
   - Database optimized with indexes & caching

---

## 🎯 Final Deliverables

**Backend (Dev1):**
- Production FastAPI server running on Railway
- PostgreSQL database with all schemas
- Prophet models trained & saving predictions
- 6 REST endpoints + WebSocket
- 200+ test cases passing
- Complete API documentation

**Frontend (Dev2):**
- React dashboard on Vercel
- Interactive map with 1000+ shipments
- A* routing engine fully functional
- Real-time disruption alerts
- 80%+ test coverage
- Performance optimized

**Together:**
- GitHub repo with clean commit history
- Comprehensive README & documentation
- Live demo (both systems running)
- 5-minute presentation explaining the solution
- Potential for enterprise deployment

═══════════════════════════════════════════════════════════════════════════════
End of Roadmap
═══════════════════════════════════════════════════════════════════════════════
```
