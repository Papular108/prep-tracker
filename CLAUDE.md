# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend**: Django 5.2 + Django REST Framework + SimpleJWT + django-cors-headers, SQLite (dev)
- **Frontend**: React 19 + Vite + React Router DOM + Axios + jwt-decode
- **Python venv**: `venv/` at project root

## Commands

### Backend

```bash
# Activate venv first
source venv/bin/activate

# Run dev server
python manage.py runserver

# Apply migrations
python manage.py migrate

# Make migrations after model changes
python manage.py makemigrations

# Run tests
python manage.py test syllabus

# Run a single test
python manage.py test syllabus.tests.TestClassName.test_method_name
```

### Frontend

```bash
cd frontend

# Install deps
npm install

# Dev server (http://localhost:5173)
npm run dev

# Lint
npm run lint

# Build
npm run build
```

## Architecture

The project is a study prep tracker. Users create syllabi, which contain a nested hierarchy of content they need to study.

### Data Model (backend/syllabus/models.py)

Four-level hierarchy, each linked by FK:
```
UserSyllabus (owned by User)
  └── Module (subject area, has weightage_marks)
        └── Chapter
              └── SubTopic (leaf node; tracks is_completed, has_notes)
```

### API Layer (syllabus/)

- `serializers.py`: Nested read-only serializers — `UserSyllabusSerializer` embeds the full tree (modules → chapters → sub_topics) in a single response.
- `views.py`: `UserSyllabusViewSet` (ModelViewSet, JWT auth required, user-scoped queryset); `RegisterView` (open).
- `urls.py`: DRF `DefaultRouter` auto-generates `/api/syllabus/` and `/api/syllabus/{id}/`.

### Auth Flow

JWT via SimpleJWT. Endpoints:
- `POST /api/register/` — create account
- `POST /api/token/` — obtain access + refresh tokens
- `POST /api/token/refresh/` — refresh access token

All `/api/syllabus/` endpoints require `Authorization: Bearer <access_token>`. The backend settings have `CORS_ALLOW_ALL_ORIGINS = True` for local dev.

### Django Project Layout

- `backend/` — Django project package (settings, root urls, wsgi/asgi)
- `syllabus/` — sole Django app (models, views, serializers, urls, admin, migrations)
- `manage.py` — at repo root; `DJANGO_SETTINGS_MODULE` defaults to `backend.settings`
- `frontend/` — standalone Vite React SPA (separate `package.json`, `node_modules`)
