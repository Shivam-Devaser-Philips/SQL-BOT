# Architecture

## Overview
The Banking Analytics Copilot is built on a modern stack utilizing FastAPI for the backend, React (Vite) for the frontend, and Grok (xAI) for AI capabilities. 

## Flow
1. **User Input**: Analyst types a natural language query in the React UI.
2. **Backend Processing**: Request is sent to the FastAPI `POST /api/chat` endpoint.
3. **AI Translation**: The `grok.py` agent sends the user prompt along with the Database Schema context to the LLM, instructing it to return strict JSON containing Oracle SQL.
4. **Validation**: The `validation.py` service scans the generated SQL to block destructive operations (INSERT, UPDATE, DELETE).
5. **Execution**: Safe SELECT queries are run against the Oracle Database (or SQLite during testing).
6. **Response**: Data, along with a suggested chart type and business explanation, is returned to the frontend and rendered.

## Components
- **Frontend**: React, TailwindCSS, Plotly (for charts).
- **Backend**: FastAPI, Pydantic, SQLAlchemy.
- **Database**: Oracle 23ai Free for main operational data; SQLite for Audit/History logs.
