# Dashboard Structure

This feature follows a simple route -> server -> component -> action flow.

## Folder map

- `config.ts`
  Dashboard navigation, role labels, and route visibility rules.
- `types.ts`
  Shared dashboard view-model types used by server data builders and UI.
- `team-scope.ts`
  Role-based visibility helpers for employee/team filtering.
- `data.ts`
  Central dashboard read-model builder. This is the main place where dashboard pages collect MongoDB data and shape it for UI.

## Server data

- `server/page-data.ts`
  Public server-only entrypoint for dashboard page data.
  If you want to know where a dashboard page fetches data from, start here.

## Route rendering

- `router/render-page.tsx`
  Role-aware dashboard route dispatcher.
  Standard module pages use this layer before a role page is rendered. The dashboard overview and employee/project detail routes have their own page composition.

## Role pages

- `roles/admin/*`
  Super admin dashboard overview wiring.
- `roles/manager/*`
  Admin/manager dashboard overview wiring.
- `roles/employee/*`
  Employee dashboard overview and page wiring.
- `roles/sales/*`
  Sales-specific page wiring.

## Components

- `components/*`
  All dashboard UI panels and overview screens.
  A panel file usually matches one sidebar page:
  - `attendance-panel.tsx`
  - `leaves-panel.tsx`
  - `tasks-panel.tsx`
  - `dsr-panel.tsx`
  - `reports-panel.tsx`
  - `settings-panel.tsx`

## Actions

- `actions/*`
  Server actions used like internal APIs.
  If a button submits data, approval happens, or a form changes database records, the logic lives here.
  Main files:
  - `attendance.ts`
  - `leaves.ts`
  - `tasks.ts`
  - `projects.ts`
  - `users.ts`
  - `dsr.ts`
  - `sales-leads.ts`
  - `settings.ts`

## MongoDB layer

- `src/database/mongodb/connect.ts`
  MongoDB connection setup.
- `src/database/mongodb/models/workforce/*`
  Users, attendance, sessions, leaves.
- `src/database/mongodb/models/operations/*`
  Projects, tasks, daily updates.
- `src/database/mongodb/models/sales/*`
  Sales lead and client pitch records.
- `src/database/mongodb/models/system/*`
  Notifications and company settings.
- `src/database/mongodb/models/index.ts`
  Barrel export for all MongoDB models.

## Fast lookup guide

- "Where does dashboard page data come from?"
  `server/page-data.ts` -> `data.ts`
- "Where is the UI for a sidebar page?"
  `components/*-panel.tsx`
- "Where is the write logic / API-like action?"
  `actions/*.ts`
- "Where is the MongoDB schema?"
  `src/database/mongodb/models/**/*`

## Standalone business features

Payments lives in `../payments`, with its own components, types, actions and server data loader. Dashboard navigation and role dispatch link to that feature; payment implementation does not belong in the central dashboard data or UI files. See [Payments architecture](../payments/README.md).
