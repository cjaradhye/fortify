# Fortify — Interview Cheat Sheet

Project: Fortify
Stack: MERN, Amazon S3, Python, scikit-learn, Pandas, Numpy, Solidity
Type: Website
Repo: GitHub (April 2025)

This document prepares concise talking points and deep technical answers for interviews. It covers: two-line descriptions for each added tech, detailed explanations of what those resume lines mean, and two deep-dive questions with answers (scalability HLD/LLD and microservices implementation).

---

## Tech stack lines (two lines each: where and why)

React / MERN (client & server)
- Where: `client/` (React + Vite) and `server/` (Express APIs) — core UI and API layer.
- Why: Rapid frontend development, component-driven UI, and REST APIs for data and ML inference.

Amazon S3
- Where: Deployed frontend assets (S3-hosted static site) and model/artifact storage under `model/` artifacts.
- Why: Cheap, durable static hosting for frontend and reliable artifact storage for model weights.

Python, scikit-learn, Pandas, Numpy
- Where: `model/` contains `train.py`, `predictor.py`, `model_definitions.py`, and artifacts.
- Why: Model training, data processing, and feature engineering for automated vulnerability detection.

Solidity, Hardhat
- Where: `contracts/` and `blockchain/` folders contain smart contracts and Hardhat config.
- Why: Real smart contract examples and local testing/deployment with Hardhat for security analysis.

Docker
- Where: Root `Dockerfile` provides multi-stage builds for `server`, `client`, and `model` environments.
- Why: Ensures reproducible development and production environments; simplifies CI/CD containers.

GitHub Actions
- Where: `.github/workflows/ci.yml` — runs Jest and PyTest on pushes and PRs.
- Why: Automated CI for quality gates before merging; automates test runs and can be extended to deployments.

Jest
- Where: `client/__tests__/` contains React component tests (example: `CompileButton`).
- Why: Unit testing frontend UI to prevent regressions and ensure reliable UX.

PyTest
- Where: `model/tests/` contains tests for `predictor.py`.
- Why: Unit testing ML inference logic to prevent model regressions and edge-case failures.

MongoDB (MERN)
- Where: `server/models/` and `config/db.js` (if present) contain MongoDB usage for user and contract storage.
- Why: Flexible document storage for contract metadata, user info, and scan results.

---

## Detailed explanation for each resume line

### "Smart contract analysis tool with vulnerability detection."
- What it means: A system that ingests Solidity contracts, runs static and ML-based analyses, and outputs vulnerability labels and explanations.
- How it works (details):
  - Static analysis uses pattern matching and heuristic checks (e.g., finding unguarded external calls, reentrancy patterns) in `scripts/fetchContract.js` and analysis scripts under `server/blockchain`.
  - ML-based analysis uses the model in `model/` which converts source code into embeddings or TF-IDF vectors (`tfidf_vectorizer.pkl`) and predicts vulnerability probabilities (via `predictor.py`).
  - Results are stored in MongoDB and returned via REST endpoints.
- Recruiter directions: Show `contracts/`, `server/scripts/fetchContract.js`, `model/predictor.py`, and sample outputs in `server/scripts/extractArtifacts.js` or `server/blockchain/contract-source.sol`.

### "Integrated machine learning model for automated security assessment."
- What it means: A trained ML classifier evaluates smart contract code to flag likely vulnerabilities automatically.
- How it works (details):
  - Data preprocessing: `train.py` and `prepareData.ipynb` show how TF-IDF and feature extraction are performed using Pandas/Numpy.
  - Training: `train.py` trains the model (likely scikit-learn) and saves `model_weights.pth` and `model_config.pkl`.
  - Inference: `predictor.py` loads vectorizers and models to return probability scores and labels.
- Recruiter directions: Show `model/train.py`, `model/predictor.py`, `tfidf_vectorizer.pkl`, and `model_artifacts/`.

### "Full-stack application with React frontend and Python backend."
- What it means: The user-facing UI is React-based; model and heavy logic run in Python services (or called from Node). The backend orchestrates analysis and storage.
- How it works (details):
  - React/Vite serves the UI, calling Express endpoints on `server/` for contract fetch and ML inference.
  - The Express server either directly runs Python scripts (via child processes) or calls a Python microservice for inference.
  - Data is persisted in MongoDB, and static assets are deployed to S3.
- Recruiter directions: Show `client/` folder, `server/` routes, and `model/` inference code.

### "Containerized application with Docker for consistent deployment."
- What it means: The app runs reliably across environments using Docker images built from the `Dockerfile`.
- How it works (details):
  - Multi-stage Dockerfile builds separate images for server, client, and model environments; final runtime image for the server includes necessary artifacts.
  - CI builds Docker images and can push them to a registry for deployment.
- Recruiter directions: Show `Dockerfile` and explain the build stages; run `docker build` locally and show runtime.

---

## Interview deep-dive questions

### Q1 — How will you make this project scalable? Provide HLD and LLD.

High-Level Design (HLD):
- Objectives: Support thousands of concurrent users, fast inference (<500ms for cached predictions), resilient storage, and easy horizontal scaling.
- Components:
  - API Gateway / Load Balancer (AWS ALB) for routing and TLS termination.
  - Frontend CDN (S3 + CloudFront) for static assets with global caching.
  - Backend microservices: Auth, Contract Ingestion, Static Analysis, ML Inference, Results Aggregator.
  - Asynchronous Queue (AWS SQS / Kafka) to decouple ingestion and heavy processing.
  - Model serving layer (AWS ECS/EKS or SageMaker) with autoscaling groups for inference.
  - Persistent storage: MongoDB Atlas for metadata, S3 for artifacts, and a managed Redis for caching.
  - Observability: Prometheus + Grafana for metrics, ELK or CloudWatch for logs, and Jaeger for tracing.

Design considerations:
- Use API Gateway + ALB to horizontally scale the stateless Node.js APIs.
- ML Inference scaled separately: model servers behind a load balancer, with autoscaling based on CPU/GPU utilization and request latency.
- Use S3 and CloudFront for the frontend to reduce backend load.
- Use SQS/Kafka and worker pools (autoscaling) for long-running static analysis and model retraining jobs; workers pull tasks and report results.

Low-Level Design (LLD):
- API endpoints:
  - POST /analyze — accept contract, enqueue job, return job ID.
  - GET /analyze/{id} — return status and results.
- Data flow:
  1. Client uploads contract source to S3 or sends to API. API stores metadata in MongoDB and enqueues analysis task to SQS.
  2. Ingestion worker downloads source, runs static analyzers, and enqueues inference request to ML inference service.
  3. ML inference service loads model in memory (hot warm pools), predicts probabilities, writes results to MongoDB and S3 (reports/artifacts).
  4. Notification to client via WebSocket (or polling) when job completes.
- Caching & optimization:
  - Redis caches inference results by contract hash to avoid reprocessing identical contracts.
  - Batch inference for high throughput when processing large volumes.
- Autoscaling & resilience:
  - Worker autoscaling based on SQS queue depth.
  - Circuit breakers and retry policies around external calls.

Metrics and SLOs:
- P50 inference latency target: <200ms (cached), <1s (cold).
- Throughput target: 100 requests/sec per cluster, autoscale beyond.
- Error rate: <0.1%.

### Q2 — How will you implement this using microservices?

Microservices decomposition:
- Auth Service (Node.js + Passport.js): user management, JWT issuance.
- Contract Service (Node.js): ingestion, validation, storage, and metadata.
- Static Analysis Service (Python/Node): runs rule-based analyzers.
- ML Inference Service (Python, scikit-learn or model server): serves predictions via REST/gRPC.
- Results Service (Node.js): aggregates results and prepares reports.
- Orchestrator / Scheduler (Node.js worker or Airflow): manages retrain jobs and periodic tasks.

Communication patterns:
- Synchronous: REST/gRPC for fast control-plane requests (auth, job status).
- Asynchronous: SQS/Kafka for heavy tasks and event-driven processing.

Deployment & CI/CD:
- Each service has its own Docker image and GitHub Actions workflow triggered on changes.
- Use Helm charts or Terraform for deployment to EKS, with separate namespaces per environment.
- Use canary deployments and health checks for safe releases.

Data consistency:
- Each service owns its data; use event sourcing or change data capture if cross-service sync needed.
- MongoDB used for contract metadata; S3 for artifacts; Redis for cross-service caching.

Scaling microservices:
- Independent autoscaling based on service-specific metrics (queue depth, latency).
- Use shared libraries for logging and tracing to ensure observability across services.

---

## Repo pointers to show during interviews
- Code: `client/`, `server/`, `model/`, `contracts/`.
- Tests: `client/__tests__/CompileButton.test.jsx`, `model/tests/test_predictor.py`.
- CI: `.github/workflows/ci.yml`.
- Containerization: `Dockerfile`.
- Model artifacts & vectorizers: `model_artifacts/`, `tfidf_vectorizer.pkl`.

---

## Next steps (suggested)
- Add explicit SLO dashboards and coverage reports (`coverage.txt`).
- Implement Redis caching and message queue examples (`queue/worker_example.js`).
- Add Kubernetes manifests and Terraform/CloudFormation templates for infra.

---

If you want, I can now:
- Add sample Redis + SQS worker code.
- Generate Helm charts and Terraform templates.
- Create sample metrics dashboards with Prometheus configs.

