# Mindaptix CRM — App Developer API (v1)

This document describes the **REST APIs** intended for app/mobile developers.
All endpoints live under:

- Base path: `/api/v1`
- Auth: **session cookie** (`mindaptix_session`) created by `POST /api/v1/auth/login`
- Content-Type: `application/json`

> Note: This CRM is also a Next.js app with “server actions” used by the web dashboard. The routes documented here are the stable JSON API surface for external app clients.

## Authentication

### Login

`POST /api/v1/auth/login`

Request body:

```json
{ "email": "user@company.com", "password": "..." }
```

Response: `200`

```json
{
  "sessionId": "…",
  "expiresAt": "2026-11-25T12:34:56.000Z",
  "user": {
    "id": "…",
    "fullName": "…",
    "email": "…",
    "role": "EMPLOYEE",
    "managerId": "",
    "projectIds": [],
    "leadIds": []
  }
}
```

This response sets an HTTP-only cookie `mindaptix_session`. Your app must **persist cookies**.

Example (`curl`):

```bash
curl -i -c cookies.txt -X POST 'http://localhost:3000/api/v1/auth/login' \
  -H 'content-type: application/json' \
  --data '{"email":"user@company.com","password":"PASSWORD"}'
```

### Current session

`GET /api/v1/auth/me`

Returns `{ session: AuthenticatedSession | null }`.

```bash
curl -b cookies.txt 'http://localhost:3000/api/v1/auth/me'
```

### Logout

`POST /api/v1/auth/logout`

```bash
curl -b cookies.txt -X POST 'http://localhost:3000/api/v1/auth/logout'
```

## Tasks

### List tasks

`GET /api/v1/tasks`

Query params:

- `limit` (default 20, max 50)
- `status` (optional): `PENDING | IN_PROGRESS | COMPLETED | CLOSED | REJECTED | FAILED`
- `assignedUserId` (optional): only honored for `SUPER_ADMIN` / `MANAGER`

```bash
curl -b cookies.txt 'http://localhost:3000/api/v1/tasks?limit=20&status=IN_PROGRESS'
```

Response: `200`

```json
{ "tasks": [ { "id": "...", "title": "...", "status": "PENDING", "dueDate": "2026-11-25" } ] }
```

### Create task

`POST /api/v1/tasks`

Request body:

```json
{
  "title": "Prepare client proposal",
  "description": "Draft proposal and share PDF.",
  "assignedUserId": "USER_ID (required for admins; ignored for EMPLOYEE)",
  "dueDate": "YYYY-MM-DD",
  "dueTime": "HH:MM",
  "priority": "LOW|MEDIUM|HIGH",
  "labels": ["DEV","DESIGN"]
}
```

### Update my task status

`PATCH /api/v1/tasks/{taskId}/status`

Request body:

```json
{ "status": "PENDING|IN_PROGRESS|COMPLETED" }
```

### Add task comment

`POST /api/v1/tasks/{taskId}/comments`

Request body:

```json
{ "message": "Update: completed the first draft." }
```

## Attendance

### Check in

`POST /api/v1/attendance/check-in`

Request body:

```json
{ "workMode": "OFFICE|WFH|FIELD", "lat": 30.71, "lng": 76.69, "accuracy": 15 }
```

### Pending checkout tasks

`GET /api/v1/attendance/checkout-pending-tasks`

### Check out

`POST /api/v1/attendance/check-out`

Request body (optional):

```json
{ "lat": 30.71, "lng": 76.69, "accuracy": 15, "pendingTaskReason": "Blocked on dependency..." }
```

### Cancel checkout

`POST /api/v1/attendance/cancel-checkout`

## DSR (Daily Status Report)

### Submit DSR

`POST /api/v1/dsr`

Request body:

```json
{
  "workDate": "YYYY-MM-DD",
  "projectId": "",
  "summary": "Short title",
  "accomplishments": "What you did today...",
  "blockers": "",
  "nextPlan": "",
  "githubRepoUrls": ["https://github.com/org/repo"],
  "githubUsername": "githubUser",
  "githubBranch": "main"
}
```

> Attachments: this v1 JSON endpoint supports GitHub evidence. The web dashboard supports file uploads for screenshots; if you need mobile uploads, we can add a multipart upload API.

## Notifications

### List notifications

`GET /api/v1/notifications?limit=8`

### Mark as read

`POST /api/v1/notifications/read`

Request body:

```json
{ "ids": ["NOTIFICATION_ID_1", "NOTIFICATION_ID_2"] }
```

