# Attendance Hub 🚀

A premium, traceable, and role-based Work Attendance Management System. Designed for HR, Managers, and Administrators to monitor attendance, handle exceptions, and maintain a rigorous audit trail of manual adjustments.

![Premium UI](https://via.placeholder.com/1200x600/6366f1/ffffff?text=Attendance+Hub+Dashboard+Overview)

## 🌟 Key Features

- **Strategic Dashboard**: Real-time snapshot of daily attendance stats (Total workforce, Present, Exceptions, On-Leave).
- **Intelligent Exception Management**: Dedicated view for flagging and resolving attendance inconsistencies (Late, Absent, etc.).
- **Rigorous Audit Logging**: Mandatory audit trail for every manual status override, ensuring 100% traceability.
- **RBAC (Role-Based Access Control)**: Secure middleware protecting sensitive operations (Admin, HR, Manager roles).
- **Premium User Experience**: Modern glassmorphism UI built with React, Tailwind CSS, and a custom design system.
- **Docker-First Architecture**: Seamless deployment with separate backend and frontend containers.

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 + Vite (TypeScript)
- **Styling**: Tailwind CSS + Custom Design System
- **Routing**: React Router 6
- **Architecture**: Atomic components with Glassmorphism aesthetics

### Backend
- **Runtime**: Node.js + Express (TypeScript)
- **Security**: RBAC Middleware + Express Validator
- **Logging**: Action-based Audit Log System
- **Validation**: Strict schema validation for data integrity

## 📂 Project Structure

```text
.
├── backend/                # Express API service
│   ├── src/
│   │   ├── middleware/     # Auth & RBAC logic
│   │   ├── routes/         # API endpoints
│   │   ├── modules/        # Domain logic (Attendance, Audit)
│   │   └── types/          # Shared TS interfaces
│   └── Dockerfile
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # UI Library & Modals
│   │   ├── pages/          # View logic (Dashboard, List)
│   │   ├── services/       # API integration
│   │   └── index.css       # Design System tokens
│   └── Dockerfile
└── docker-compose.yml      # Orchestration for local development
```

## 🚀 Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

### Quick Launch (Recommended)
Clone the repository and run:

```bash
docker-compose up --build
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

## 🛡 Business Rules & Principles

Based on the core project requirements:
1. **Traceability > Automation**: The system prioritizes "who changed what and why" over automated fixes.
2. **Mandatory Logging**: No attendance record can be modified without a corresponding entry in the `AuditLog`.
3. **RBAC Enforcement**: Permissions are checked at the API level (e.g., only Admin/HR can modify attendance).

## 🗺 Roadmap

- [ ] **Database Integration**: Migrate from mock repositories to PostgreSQL.
- [ ] **Authentic Auth**: Switch from mock middleware to JWT-based authentication.
- [ ] **Employee History**: Implement drill-down views for individual attendance trends.
- [ ] **Rules Engine**: Customizable attendance rules (late thresholds, flexible hours).

## 📄 License

This project is licensed under the MIT License.
