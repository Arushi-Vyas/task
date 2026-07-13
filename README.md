# Team Task Manager

Full-stack app for creating projects, assigning tasks, and tracking progress
with per-project role-based access (Admin / Member).

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, express-validator
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS

## Project structure

```
team-task-manager/
├── backend/     REST API (Express + MongoDB)
└── frontend/    Next.js client
```

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env      # then edit MONGO_URI / JWT_SECRET as needed
npm run dev                # starts on http://localhost:5000
```

Requires a running MongoDB instance (local `mongod` or a MongoDB Atlas URI).

### Environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWTs — set this to a long random string |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Frontend origin, for CORS |

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # points at the backend API
npm run dev                         # starts on http://localhost:3000
```

## Data model & roles

- **User** — name, email, hashed password.
- **Project** — has an `owner` and a `members[]` list, where each member
  has a per-project `role` of `admin` or `member`. This means the same
  person can be an admin on one project and just a member on another.
  The creator of a project is automatically added as its first admin.
- **Task** — belongs to a `project`, optionally has an `assignedTo` user,
  a `status` (`todo` / `in-progress` / `done`), a `priority`
  (`low` / `medium` / `high`), and an optional `dueDate`. A task is
  computed as `isOverdue` when its due date has passed and it isn't done.

### Role-based access control (RBAC)

| Action | Admin | Member |
|---|---|---|
| View project & tasks | ✅ | ✅ |
| Create tasks | ✅ | ✅ (can only assign to self) |
| Assign tasks to others | ✅ | ❌ |
| Edit / delete any task | ✅ | only their own (creator/assignee) |
| Update task status | ✅ | ✅, if creator or assignee |
| Add / remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| Edit / delete project | ✅ | ❌ |

The project owner's role can never be downgraded and the owner can't be
removed from their own project.

## REST API reference

All endpoints (except signup/login) require `Authorization: Bearer <token>`.

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register `{ name, email, password }` |
| POST | `/api/auth/login` | Login `{ email, password }` → `{ user, token }` |
| GET | `/api/auth/me` | Get the logged-in user |

### Projects
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/projects` | any user | Create a project (creator = admin) |
| GET | `/api/projects` | any user | List projects you belong to |
| GET | `/api/projects/:id` | member | Get one project |
| PUT | `/api/projects/:id` | admin | Update name/description |
| DELETE | `/api/projects/:id` | admin | Delete project + its tasks |
| POST | `/api/projects/:id/members` | admin | Add member by `{ email, role }` |
| PATCH | `/api/projects/:id/members/:userId` | admin | Change a member's role |
| DELETE | `/api/projects/:id/members/:userId` | admin | Remove a member |

### Tasks
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/projects/:id/tasks` | member | Create task in project |
| GET | `/api/projects/:id/tasks?status=&assignedTo=&overdue=true` | member | List/filter tasks |
| GET | `/api/tasks/:id` | member | Get one task |
| PUT | `/api/tasks/:id` | admin/creator | Edit task fields / reassign |
| PATCH | `/api/tasks/:id/status` | admin/creator/assignee | Update status |
| DELETE | `/api/tasks/:id` | admin/creator | Delete task |
| GET | `/api/tasks/dashboard` | any user | Cross-project summary (counts, overdue, assigned-to-me) |

## Validation

- Mongoose schema validation on all models (required fields, lengths, enums,
  email format, positive-date checks).
- `express-validator` request-body validation on signup/login and
  project/task creation & update routes, with aggregated error messages.
- Centralized error middleware normalizes Mongoose validation errors,
  duplicate-key errors, and bad ObjectId casts into clean JSON responses.

## Notes on scope

This was built to satisfy the assignment requirements end-to-end (auth,
project/team management, task CRUD + assignment + status, dashboard with
overdue tracking, REST APIs backed by MongoDB, validations, relationships,
and RBAC) with a working UI on top. Things you could add next: unit/integration
tests, pagination on task/project lists, email notifications, drag-and-drop
Kanban board, and refresh tokens.
