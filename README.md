# Imp Wizard

Guided onboarding implementation wizard for implementation teams.

## Stack

- **Backend:** ASP.NET Core 8 Web API (C#) — namespaces `ImpWizard.*`
- **Frontend:** React 18 (TypeScript / Vite) with shadcn/ui
- **Database:** SQL Server (Docker container for development)
- **Auth:** JWT Bearer tokens + ASP.NET Core Identity
- **Dev Environment:** Docker Compose (API + client + SQL Server)

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (primary dev workflow)
- Optional (local dev): .NET 8 SDK, Node.js 18+

## Getting Started

### Run with Docker (recommended)

```bash
docker compose up
```

This starts the API, React client, and SQL Server together. The app will be available at:
- Client: `http://localhost:5173`
- API: `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger`

### Run locally (optional)

#### API

```bash
cd src/EkosWizard.Api
dotnet run
```

The API will be available at `https://localhost:7000` (HTTPS) or `http://localhost:5000` (HTTP).
Swagger UI: `https://localhost:7000/swagger`

#### React client

```bash
cd client
npm install
npm run dev
```

The client will be available at `http://localhost:5173`.
API calls to `/api/*` are proxied to the .NET backend automatically.

### Run tests

```bash
cd src/EkosWizard.Tests
dotnet test
```

## Project Structure

```
EkosWizard/                         # Google Drive root (folder name unchanged)
├── EkosWizard.sln                  # Solution (project display names: ImpWizard.*)
├── docker-compose.yml
├── Dockerfile.api
├── README.md
├── PROJECT-PLAN.html
│
├── src/                            # .NET backend (namespace root: ImpWizard.*)
│   ├── EkosWizard.Api/             # ASP.NET Core 8 Web API (controllers, services, middleware)
│   ├── EkosWizard.Core/            # Domain models, interfaces
│   ├── EkosWizard.Infrastructure/  # EF Core, data seeder, migrations, background service
│   └── EkosWizard.Tests/           # xUnit tests
│
└── client/                         # React 18 TypeScript frontend (Vite + shadcn/ui)
    └── src/
        ├── api/                    # Axios client + typed API hooks (TanStack Query)
        ├── pages/                  # Admin pages, Wizard steps, Login
        └── components/             # Layout, shared UI, step-specific components
```

## Default Login

- **Username:** `admin`
- **Email:** `admin@impwizard.local`
- **Password:** `Beer123!`
