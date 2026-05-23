# AgriCosmo AI Enterprise Backend

A globally scalable, highly resilient Modular Monolith built in FastAPI, ready for seamless transition to microservices.

## 🏛 System Design & Architecture

### API Gateway Integration
Currently, the monolith utilizes `app/api/middleware.py` as an internalized gateway layer enforcing:
- Global Observability (Request IDs, Processing Latency)
- Centralized Authentication & Strict RBAC Enforcement
- Secure headers and standardized Logging format
When transitioning to microservices, this middleware will be directly extracted into a proxy like NGINX/Kong while preserving business logic downstream.

### Multi-Tiered AI Resilience
The central chatbot relies on an **Orchestration Wrapper** coupled to a **Circuit Breaker**:
1. **Groq (LLaMA-3)** is the primary inference core.
2. If Groq triggers 3 consecutive faults, the Circuit Breaker trips instantly, routing all requests to **HuggingFace** preventing total process blockage.
3. HuggingFace attempts a strict 1-retry fallback.
4. If unavailable, an internalized Rule-Based NLP engine assumes operations seamlessly.

### Caching Strategy
A decoupled `@cache_with_ttl` Redis decorator wraps heavily trafficked `GET` queries (Weather integrations, product pages). If the physical Redis instance faults, it gracefully skips caching while still executing logic.

### Background Task Routing & Scaling
Celery bindings route isolated workloads into specific node queues (`ai_tasks`, `image_tasks`, `analytics_tasks`), allowing you to scale independent ML processing instances away from general web instances.

---

## 🚀 Running the Production Cluster

The entire enterprise architecture is wrapped in Docker. You can spin up the Web cluster, Async Workers, Postgres DB, and Redis instance using:

```bash
docker-compose up --build
```

Access the `/metrics` API or standard `/docs` Open API interface directly mapped through the API layer.
