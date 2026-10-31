#  TripVault

**A simple way to manage trips, travel budgets, and expenses in one place.**

TripVault is a full-stack travel management application built to help users organize their trips, set budgets, and keep track of travel expenses. It combines a React frontend with a Spring Boot backend and MySQL database.

## Features

- **User Authentication** — Register and log in securely.
- **Trip Management** — Create, view, update, and manage trips.
- **Budget Tracking** — Set a budget for each trip.
- **Expense Management** — Record expenses and associate them with trips.
- **Private Photo Storage** — Store travel photos separately from public application files.
- **REST APIs** — Handle application data through the Spring Boot backend.
- **Responsive Interface** — Access the application through a clean web interface.

## Tech Stack

| Technology | Purpose |
|---|---|
| Java 17 | Backend development |
| Spring Boot | REST APIs and application logic |
| Maven | Backend build and dependency management |
| React | Frontend interface |
| JavaScript | Frontend functionality |
| Vite | Frontend development server |
| MySQL | Database |
| Git & GitHub | Version control |

## Project Structure

```text
TripVault/
├── Backend/
│   ├── backend/
│   │   └── pom.xml
│   └── run-local.ps1
├── Frontend/
│   └── travel-memory-vault-frontend/
├── images/
├── PROJECT-REPORT.md
└── README.md
```

## Prerequisites

Make sure you have installed:

- Java 17
- Node.js and npm
- MySQL Server
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Rishi737-beep/tripvault.git
cd tripvault
```

### 2. Configure the database

Start your local MySQL server and create the database:

```sql
CREATE DATABASE travel_memory_vault;
```

The default database username in the local setup is `root`. Use your own MySQL username if it differs.

The backend reads the database password from the Windows user environment variable `DB_PASSWORD`. Set it locally before starting the backend. Never put your actual password in this README or commit it to GitHub.

### 3. Start the backend

Open PowerShell in the project root and run:

```powershell
.\Backend\run-local.ps1
```

The script uses the project's Maven wrapper and local database configuration. The backend is configured to run on port `8080`.

### 4. Start the frontend

Open a **second terminal** and run:

```powershell
cd Frontend/travel-memory-vault-frontend
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

http://localhost:5173

Make sure MySQL is running before starting the backend.

## Configuration & Security

- Keep database credentials and JWT secrets outside the source code.
- Do not commit `.env` files, private photos, or other sensitive data.
- Configure the database connection and JWT secret through the environment variables expected by the backend.
- Use strong, unique secrets for local development and deployment.

## Future Improvements

- Improved trip summaries and expense insights
- More detailed budget reports
- Additional UI and usability improvements

## Developer

**Rishi Solanki**

- GitHub: [@Rishi737-beep](https://github.com/Rishi737-beep)
- Project Repository: [TripVault](https://github.com/Rishi737-beep/tripvault)

---

*Built as a full-stack project to practise backend development, REST APIs, database integration, and frontend development.*
