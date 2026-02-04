# Setup and Installation

This guide will help you set up and run the ITM8 Attendance System on your local machine.

## Prerequisites

Ensure you have the following installed on your system:

- **Docker Desktop** (for containerized setup)
- **Python 3.12+** (for local backend development)
- **Node.js 18+** (for local frontend development)

## Environment Configuration

The project uses different environment files for development and production:

| Environment | Configuration File | Purpose |
|-------------|-------------------|---------|
| Development | `project/backend/.env` | Backend configuration for local development |
| Development | `project/frontend/.env` | Frontend configuration for local development |
| Production | `project/.env.production` | Centralized config for Docker Compose deployment |

### Development Setup

1. **Backend**: Navigate to `project/backend` and copy the template:
   ```bash
   cd project/backend
   cp .env.template .env
   ```
   Edit `.env` with your local development values (database credentials, SMTP settings, etc.).

2. **Frontend**: Navigate to `project/frontend` and copy the template:
   ```bash
   cd project/frontend
   cp .env.template .env
   ```
   For local development with the Vite proxy, you can leave `VITE_API_URL` empty.

### Production Setup

1. Navigate to the `project` directory and edit `.env.production`:
   ```bash
   cd project
   # Edit .env.production with your production values
   ```

2. Configure all required values including:
   - `VITE_API_URL`: Backend API endpoint (e.g., `http://localhost:8050` or your production backend URL)
   - Database connection (host, credentials)
   - JWT secret key (use a strong random string)
   - SMTP settings for email
   - CORS origins (must include your frontend URL, e.g., `http://localhost:8080`)

## Running the Application

### Method A: Docker Compose (Production)

This method runs the entire stack (Frontend, Backend, Redis) in containers.

1. Navigate to the `project` directory (where `docker-compose.yml` is located).

2. Configure your production environment:
   ```bash
   # Edit .env.production with your production values
   nano .env.production
   ```

3. Build and start the services:
   ```bash
   docker compose --env-file .env.production up -d --build
   ```

4. Access the application:
   - **Frontend**: http://localhost:8080 (Served via Nginx with Gzip & Caching)
   - **Backend API**: http://localhost:8050
   - **API Documentation**: http://localhost:8050/docs

**Note on Persistence**:
The configuration uses named volumes to prevent data loss:
- `itm8_attendance_uploads`: Persists user profile pictures (`/app/uploads`).
- `itm8_attendance_redis_data`: Persists session/cache data.

To stop the services:
```bash
docker compose down
```

### Method B: Local Development

If you prefer to run services individually for debugging.

#### 1. Backend

1. Navigate to `project/backend`.
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Ensure your `.env` file is configured (see [Development Setup](#development-setup)).
5. Run the server:
   ```bash
   python3 dev.py
   ```
   Or with uvicorn directly:
   ```bash
   uvicorn main:app --reload
   ```

#### 2. Frontend

1. Navigate to `project/frontend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure your `.env` file is configured (see [Development Setup](#development-setup)).
4. Start the development server:
   ```bash
   npm run dev
   ```

The Vite dev server includes a proxy configuration that forwards API requests to the backend at `http://localhost:8000`.

## Database Setup

The project uses MySQL. Ensure your database is initialized with the schemas provided in the `project/database` directory before starting the application.

## Environment Files Summary

```
project/
├── .env.production          # Production config (used by docker-compose)
├── docker-compose.yml
├── backend/
│   ├── .env                 # Development config (auto-loaded by config.py)
│   └── .env.template        # Template for developers
└── frontend/
    ├── .env                 # Development config (auto-loaded by Vite)
    └── .env.template        # Template for developers
```

> **Security Note**: All `.env` files including `.env.production` are gitignored to prevent committing sensitive credentials.
