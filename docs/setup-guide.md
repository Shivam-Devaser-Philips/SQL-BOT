# Setup Guide

## Local Development (No Docker)

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### 1. Backend Setup
Open a terminal in the `backend` folder:
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`.

### 2. Frontend Setup
Open a terminal in the `frontend` folder:
```powershell
# Install node modules
npm install

# Start Vite dev server
npm run dev
```
The React App will be available at `http://localhost:3000`.

---

## Docker Deployment (Production / Full Stack)
Ensure Docker Desktop is running.

```powershell
# Build and start all services
docker-compose up -d --build
```
This will start:
- FastAPI Backend on port 8000
- React Frontend on port 3000
- (Optional) Oracle 23ai Database if uncommented in docker-compose.yml
