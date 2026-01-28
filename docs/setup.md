# Setup and Installation

This guide will help you set up and run the ITM8 Attendance System on your local machine.

## Prerequisites

Ensure you have the following installed on your system:

- **Docker Desktop** (for containerized setup)
- **Python 3.12+** (for local backend development)
- **Node.js 18+** (for local frontend development)

## Environment Configuration

Before running the application, you need to configure the environment variables.

1.  Navigate to the `project/backend` directory.
2.  Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
3.  Open `.env` and fill in the required values (Database credentials, Secret keys, etc.).

## Running the Application

### Method A: Docker Compose (Recommended)

This method runs the entire stack (Frontend, Backend, Database, Redis) in containers.

1.  Navigate to the `project` directory (where `docker-compose.yml` is located).
2.  Build and start the services:
    ```bash
    docker-compose up -d --build
    ```
3.  Access the application:
    - **Frontend**: http://localhost
    - **Backend API**: http://localhost:8000
    - **API Documentation**: http://localhost:8000/docs

To stop the services:
```bash
docker-compose down
```

### Method B: Local Development

If you prefer to run services individually for debugging.

#### 1. Backend

1.  Navigate to `project/backend`.
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the server:
    ```bash
    uvicorn main:app --reload

    or

    python3 app.py
    ```

#### 2. Frontend

1.  Navigate to `project/frontend`.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## Database Migration

The project uses SQL files for initialization. Ensure your database is initialized with the schemas provided in the `project/database` directory.
