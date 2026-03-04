# Attendance Hub 🚀

A premium, traceable, and role-based Work Attendance Management System. Designed for HR, Managers, and Administrators to monitor attendance, handle exceptions, and maintain a rigorous audit trail of manual adjustments.

![Premium UI](https://via.placeholder.com/1200x400/6366f1/ffffff?text=Attendance+Hub+Dashboard+v2.0)

## 🌟 Key Features

- **Strategic Dashboard**: Real-time snapshot of daily attendance stats (Total workforce, Present, Exceptions, On-Leave).
- **Dual Attendance Modes**: 
  - **Snapshot (Snap)**: Immediate overview of everyone's final state for today.
  - **Log (Flow)**: Detailed exploration of all records across custom date ranges.
- **Intelligent Employee Management**: Enhanced search with **multi-language support** (CN/JP/EN) and smart enum mapping (e.g., searching "在职" finds "Active" status).
- **Automated Leave Workflow**: Comprehensive application and approval system for Paid/Unpaid leave with automatic status synchronization.
- **Server-Side Pagination & Sorting**: High-performance lists across all modules with interactive table headers.
- **Rigorous Audit Logging**: Mandatory audit trail for every manual status override, ensuring 100% traceability.
- **RBAC (Role-Based Access Control)**: Secure JWT-based authentication protecting sensitive operations (Admin, HR, Manager, Viewer roles).
- **Premium User Experience**: Modern glassmorphism UI built with React, Tailwind CSS, and a specialized custom design system.

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 + Vite (TypeScript)
- **Styling**: Tailwind CSS + Custom Design System
- **State/Routing**: React Router 6 + Context API
- **Icons**: Custom SVG-based iconography for lightweight performance

### Backend
- **Runtime**: Node.js + Express (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Security**: JWT Authentication + RBAC Middleware + bcryptjs
- **Logging**: Action-based Audit Log System

## 📂 Project Structure

```text
.
├── backend/                # Express & Prisma Service
│   ├── prisma/             # Schema definitions and seeding
│   ├── src/
│   │   ├── middleware/     # JWT Auth & RBAC logic
│   │   ├── routes/         # API endpoints
│   │   ├── modules/        # Domain logic (Attendance, Employee, Leave)
│   │   └── services/       # Core Attendance Engine
│   └── Dockerfile
├── frontend/               # Vite React SPA
│   ├── src/
│   │   ├── components/     # UI Library (Pagination, Layouts)
│   │   ├── pages/          # View logic (Dashboard, Employees, Leave)
│   │   ├── services/       # API integration layers
│   │   └── contexts/       # Global State (Auth)
│   └── Dockerfile
└── docker-compose.yml      # Full stack orchestration (App, DB, pgAdmin)
```

## 🚀 Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

### Quick Launch
1. Clone the repository.
2. Run the following command:

```bash
docker-compose up --build
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **pgAdmin**: [http://localhost:5050](http://localhost:5050)

## 🛡 Business Rules & Principles

Based on the core project requirements:
1. **Traceability > Automation**: The system prioritizes "who changed what and why" over automated fixes.
2. **Mandatory Logging**: No attendance record can be modified without a corresponding entry in the `AuditLog`.
3. **Smart Synchronization**: Approved leave requests automatically update an employee's profile and attendance status.
4. **Search Universality**: Search fields handle cross-language terms for global usability.

## 🗺 Project Progress

- [x] **Database Integration**: Full PostgreSQL + Prisma implementation.
- [x] **JWT Authentication**: Secure login with role-based navigation.
- [x] **Employee Management**: CRUD operations with advanced search filters.
- [x] **Leave Workflow**: Complete Request -> Approve -> Sync flow.
- [x] **Drill-down History**: Detailed individual attendance trends and audit traces.
- [x] **List Performance**: Server-side pagination and sorting active everywhere.
- [ ] **Advanced Rules Engine**: UI for customizing late thresholds and flexible shifts.

## 📄 License

This project is licensed under the MIT License.
