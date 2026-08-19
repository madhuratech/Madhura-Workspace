# Madhura Workspace - Comprehensive Documentation

## 1. Introduction
Madhura Workspace is a state-of-the-art, role-based project management and collaboration platform. It is designed to streamline complex, multi-stage workflows through a centralized digital workspace. The platform dynamically connects teams across multiple disciplines (UI/UX, Tech, Testing, and DevOps) through a strict, linear pipeline, ensuring high security, isolation, and accountability.

## 2. Core Architecture & Workflow
The core of Madhura Workspace revolves around the **Linear Project Pipeline**. Projects do not exist as chaotic free-for-alls; instead, they flow sequentially through designated team stages.

### 2.1 The Project Pipeline
When a project is created by a Super Admin or HR, it requires a **Workflow Setup**. Four dedicated teams must be assigned to the project pipeline:
1. **UI/UX Team:** The starting point. Focuses on design and initial planning.
2. **Tech Team:** Focuses on development and technical implementation.
3. **Test Team:** Focuses on Quality Assurance (QA).
4. **DevOps Team:** Focuses on deployment and final production release.

### 2.2 Stage-Based Isolation
Madhura Workspace enforces strict access control through **Stage Locking**:
- **Kanban Isolation:** Each stage gets its own entirely separate, pristine Kanban board. When the project transfers from UI/UX to Tech, the Tech team starts with a blank board to track their own tasks without being cluttered by UI/UX tasks.
- **Visibility Restrictions:** Teams can *only* view the Kanban board when the project reaches their active stage. If the Tech team logs in while the project is still in the UI/UX stage, they will see a **"Stage Locked"** screen. They cannot view or interact with tasks until the stage is handed over to them.
- **Task Assignment:** Teams can only create and assign tasks within their active stage.

### 2.3 Stage Advancement & Handoff
When a team finishes their work, the Team Leader clicks **"Mark Stage Complete"**. 
1. The project automatically advances to the next stage.
2. Real-time notifications are sent to the incoming team.
3. The previous team loses the ability to edit the board, and the new team gains access to their fresh Kanban board.
4. When the DevOps team clicks **"Mark Project Complete"**, the project is marked as "Completed" and the Project Coordinator is notified.

---

## 3. Role-Based Access Control (RBAC)
The system is deeply integrated with role-based permissions to ensure security and hierarchy.

- **Super Admin / MD:** Has absolute access. Can view all projects, manage all teams, view the entire pipeline across all stages, and access sensitive settings.
- **HR:** Has administrative access similar to the Super Admin. Can create teams, assign projects, and manage attendance/leave records.
- **Team Leader (TL):** Manages their specific team. Can drag-and-drop tasks, assign tasks to their team members, and is responsible for clicking "Mark Stage Complete" to hand off the project.
- **Employee:** Can only view projects they are assigned to. Within the Kanban board, they can only drag-and-drop tasks that are directly assigned to them. They cannot advance project stages.

---

## 4. Module Overview
Madhura Workspace is composed of several interconnected modules designed to provide a holistic work environment.

### 4.1 Projects & Kanban
The central hub for workflow execution. Displays the status of all projects and houses the Stage-Locked Kanban boards for task management.

### 4.2 Dashboard & My Tasks
- **Dashboard:** A personalized bird's-eye view of active projects, recent activity, and quick stats.
- **My Tasks:** A consolidated view for employees to see all tasks assigned to them across all active projects, bypassing the need to check individual project boards.

### 4.3 Team Management & Settings
- **Team Module:** Allows HR and Admins to construct teams, appoint Team Leaders, and group employees by discipline.
- **Settings:** The command center for role synchronization. If a user is promoted from Employee to Team Leader in the Settings module, their permissions and access rights instantly update across the entire workspace.

### 4.4 Communication & Collaboration
- **Chat:** Real-time socket-based messaging for instant team communication.
- **Meetings:** Integrated scheduling for team syncs, sprint planning, and client calls.
- **Email:** In-app email client for formal external and internal correspondence.
- **Announcements:** Global broadcast system for HR and Admins to share company-wide updates.

### 4.5 Productivity & Resources
- **Documents:** Centralized file repository for project briefs, assets, and reports.
- **Notes:** Personal scratchpad for employees to jot down quick ideas or meeting minutes.
- **Tickets:** Internal IT and support ticketing system for resolving workplace issues.

### 4.6 HR & Analytics
- **Attendance & Leave:** Tracking system for employee presence, PTO requests, and approvals.
- **Analytics Reports:** Data-driven insights into project velocity, team performance, and bottleneck identification.
- **Activity Logs:** An immutable audit trail tracking all major actions (task creation, stage advancements, role changes) for accountability and compliance.

---

## 5. Technical Stack
- **Frontend:** React, Tailwind CSS, Vite, Framer Motion (for animations), React Beautiful DnD (for Kanban).
- **Backend:** Node.js, Express, MongoDB, Mongoose.
- **Real-time:** Socket.io for live updates (task creation, stage advancement, chat).

## 6. Frontend Routes Map
The React application follows a structured routing system wrapped in an authentication guard (`PrivateRoute`).

### 6.1 Authentication & Onboarding
- `/login` - User Authentication.
- `/register` - User Registration.
- `/` - Workspace Overview (Select or Create Workspace).

### 6.2 Main Application Routes (Inside Workspace)
All internal routes are scoped to a specific workspace and wrapped in an App Layout with a Sidebar.
- `/dashboard` - Overview metrics, recent activity, and quick actions.
- `/projects` - Grid/List view of all accessible projects.
- `/projects/:id` - The Stage-Locked Kanban Board for a specific project.
- `/my-tasks` - Consolidated list of all tasks assigned to the logged-in user.
- `/team` - Hierarchy and team management (Restricted to HR/Admins).
- `/settings` - Role synchronization, profile updates, and theme toggling.
- `/chat` - Global & team-based real-time communication.
- `/meetings` - Scheduling module.
- `/documents` - File repository.
- `/email` - Integrated email client.
- `/tickets` - IT/Support ticketing.
- `/notes` - Personal digital notepad.
- `/attendance` - HR module for PTO and check-ins.
- `/analytics` - Data visualization and reports.
- `/activity` - Immutable audit log of all system actions.

---

## 7. Backend API Architecture
The Node.js/Express backend provides RESTful endpoints, secured via JWT middleware. 

### 7.1 Authentication & User Routes
- `POST /api/auth/register` - Create user.
- `POST /api/auth/login` - Authenticate & generate JWT.
- `GET /api/users/me` - Fetch logged-in profile.

### 7.2 Workspace & Team Routes
- `POST /api/workspaces` - Create a new workspace.
- `GET /api/workspaces` - List accessible workspaces.
- `POST /api/workspaces/:wsId/teams` - Create a new discipline team (e.g., UI/UX, Tech).
- `PUT /api/workspaces/:wsId/members/:userId` - Critical route for role sync (e.g., promoting Employee to TL).

### 7.3 Core Pipeline (Projects) Routes
- `POST /api/workspaces/:wsId/projects` - Create project and establish the Workflow Setup (UI/UX -> Tech -> Test -> DevOps).
- `GET /api/workspaces/:wsId/projects` - Fetch projects (filtered by user role and assignments).
- `PUT /api/workspaces/:wsId/projects/:projectId/advance` - Triggers stage advancement. Updates `project.stage`, emits `projectUpdated` via Socket.io, logs to Activity, and sends notifications to the next team.

### 7.4 Kanban (Tasks) Routes
- `POST /api/workspaces/:wsId/projects/:projectId/tasks` - Create a task. The backend automatically enforces `stage: project.stage` to lock it to the active pipeline stage.
- `GET /api/workspaces/:wsId/projects/:projectId/tasks` - Fetch tasks. The frontend then strictly filters this list by `task.stage === project.stage` to enforce stage locking.
- `PUT /api/tasks/:id` - Update task status (Drag & Drop). Triggers `taskUpdated` socket event.

### 7.5 Real-Time Events (Socket.io)
- `connection` - Authenticate socket.
- `joinWorkspace` - Subscribe to workspace events.
- `taskCreated` / `taskUpdated` / `taskDeleted` - Syncs the Kanban board across all active clients in the stage.
- `projectUpdated` - Notifies clients when the stage advances, forcing the UI to lock out the previous team.

## 8. Conclusion
Madhura Workspace elegantly solves the chaotic nature of multi-disciplinary software development by enforcing a strict, stage-gated pipeline. By combining robust REST APIs, Socket.io real-time sync, and hard-coded stage isolation on both the backend models and frontend routing, it ensures that every team is laser-focused on their specific responsibilities.
