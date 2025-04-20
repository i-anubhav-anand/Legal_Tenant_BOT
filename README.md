# Legal Tech Application

A full-stack application for legal document retrieval and tenant assistance, featuring a Django backend with RAG (Retrieval Augmented Generation) capabilities and a Next.js frontend.

## Project Structure

```
Legal_Tech/
├── legal_rag_api/          # Django backend
├── frontend/
│   └── legal-tenant-bot/   # Next.js frontend
├── data/                   # Data directories (created on startup)
│   ├── documents/          # Uploaded documents
│   └── vector_db/          # Vector databases
├── docker-compose.yml      # Docker Compose configuration
├── start.sh                # Startup script
└── reset.sh                # Cleanup script
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd Legal_Tech
   ```

2. Run the start script:
   ```bash
   ./start.sh
   ```

   The script will:
   - Create necessary data directories
   - Check for environment files
   - Build and start Docker containers
   - Run Django migrations
   - Start both backend and frontend services

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api/

## Managing the Application

### View Logs

```bash
docker-compose logs -f
```

### Stop the Application

```bash
docker-compose down
```

### Reset the Application

To stop the containers and optionally clean data:

```bash
./reset.sh
```

## Development Workflow

### Backend Changes

Any changes to the backend code will be reflected immediately due to the volume mounting and Django's development server. If you need to install new packages:

```bash
docker-compose exec backend pip install <package>
```

Remember to update the requirements.txt file:

```bash
docker-compose exec backend pip freeze > legal_rag_api/requirements.txt
```

### Frontend Changes

The Next.js development server will automatically reload when you make changes to the frontend code.

## Troubleshooting

### Backend Issues

- Check Django logs: `docker-compose logs backend`
- Access Django shell: `docker-compose exec backend python manage.py shell`
- Run Django commands: `docker-compose exec backend python manage.py <command>`

### Frontend Issues

- Check Next.js logs: `docker-compose logs frontend`
- Access Node.js container: `docker-compose exec frontend sh`

## Important Notes

- The data directory contains all persistent data, including document uploads and vector databases
- Make sure to properly backup this directory if you have important data 