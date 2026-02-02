# Technology Stack

This document outlines the core technologies and libraries used in the ITM8 Attendance System.

## Backend

The backend is built with Python 3.12 and follows an asynchronous architecture.

### Core Framework
- **FastAPI**: A modern, fast (high-performance) web framework for building APIs with Python based on standard Python type hints.
- **Uvicorn**: An ASGI web server API implementation.

### Database & Storage
- **AIOMySQL**: A library for accessing a MySQL database from the asyncio (PEP-3156) framework.
- **PyMySQL**: A pure-Python MySQL client library.
- **Redis**: Used for caching and session storage (via Docker).

### Authentication & Security
- **Python-Jose**: Used for JSON Web Token (JWT) encoding and decoding.
- **Passlib**: Password hashing library using Bcrypt.
- **Python-Multipart**: Streaming multipart parser for file uploads and form data.

### Utilities

- **Pydantic**: Data validation and settings management using Python type annotations.
- **Email-Validator**: Robust email syntax validation.
- **SlowAPI**: Rate limiting library for FastAPI (based on limits).
- **AioSMTPLib**: Asynchronous SMTP client for sending emails.

### Image Processing
- **Pillow**: Python Imaging Library (Fork) for handling profile picture uploads.

## Frontend

The frontend is a Single Page Application (SPA) built with React 19.

### Core Framework
- **React 19**: The library for web and native user interfaces.
- **TypeScript**: Adds static definitions to JavaScript.
- **Vite**: Next Generation Frontend Tooling.

### Styling & UI
- **Tailwind CSS v4**: A utility-first CSS framework.
- **Radix UI**: Unstyled, accessible components for building high-quality design systems.
- **Lucide React**: Beautiful & consistent icon library.
- **Sonner**: An opinionated toast component for React.
- **Next Themes**: Abstraction for themes (Dark Mode) in Next.js/React applications.
- **Three.js** / **React Three Fiber**: 3D library and React renderer for 3D graphics.

### State & Logic
- **React Router DOM**: Declarative routing for React web applications.
- **React Hook Form**: Performant, flexible and extensible forms with easy-to-use validation.
- **Zod**: TypeScript-first schema declaration and validation library.
- **Axios**: Promise based HTTP client for the browser and node.js.
- **Date-fns**: Modern JavaScript date utility library.
- **TanStack Table**: Headless UI for building powerful tables & datagrids.
- **Recharts**: Redefined chart library built with React and D3.

## Infrastructure

- **Docker**: Containerization platform.
- **Docker Compose**: Tool for defining and running multi-container Docker applications.
- **Nginx**: Web server and reverse proxy.
