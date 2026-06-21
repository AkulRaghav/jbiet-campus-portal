<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4-38BDF8?style=for-the-badge&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" />
</p>

# 🎓 JBIET Students Examination & College Management Portal

> **JB Institute of Engineering & Technology (UGC Autonomous)**  
> Accredited by NAAC | Approved by AICTE | Permanently Affiliated to JNTUH  
> College Code: 671 | Hyderabad, Telangana, India

A production-grade, full-stack **college ERP and examination management system** handling student academics, attendance tracking, fee management, exam registration, document workflows, AI-powered chatbot, and multi-role dashboards — designed to serve **100,000+ students** across 11 engineering branches.

---

## 📋 Table of Contents

- [Features Overview](#-features-overview)
- [System Architecture](#-system-architecture)
- [Role-Based Access Control](#-role-based-access-control)
- [Module Breakdown](#-module-breakdown)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Test Accounts](#-test-accounts)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Security Implementation](#-security-implementation)
- [Deployment Guide](#-deployment-guide)
- [Project Structure](#-project-structure)

---

## ✨ Features Overview

| Category | Features |
|----------|----------|
| **Authentication** | Role-based login, session cookies, forced password change, rate limiting, account lockout |
| **Student Portal** | Profile, results (SGPA/CGPA/backlogs), attendance heatmap, fee status, timetable, document submission, AI chatbot |
| **Faculty Portal** | Attendance marking (today-only enforcement), student management, document review with comments, leave management |
| **Admin Portal** | Student/Faculty CRUD, result entry, fee management, timetable builder, notices, audit log, reports & analytics |
| **Exam Workflows** | Exam session creation, student registration, fee payment, hall ticket generation, RV/Recounting registration |
| **Document System** | Submission with faculty selection, automated structure checker, review/comments, notifications, project repository with AI chat |
| **AI Features** | Data-grounded chatbot (uses student's real data), document-specific Q&A, search across project repository |
| **Communication** | In-app notifications, email alerts on comments, public notice board |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                       │
│  Next.js App Router + React 19 + Tailwind CSS 4             │
├─────────────────────────────────────────────────────────────┤
│                     MIDDLEWARE LAYER                          │
│  Security Headers | Auth Redirect | Rate Limiting            │
├─────────────────────────────────────────────────────────────┤
│                    API ROUTES (Server)                        │
│  25+ RESTful endpoints with server-side authorization        │
├─────────────────────────────────────────────────────────────┤
│                      DATA LAYER                              │
│  Prisma ORM → SQLite (dev) / PostgreSQL (prod)              │
├─────────────────────────────────────────────────────────────┤
│                   EXTERNAL SERVICES                           │
│  S3 Storage | SMTP Email | Claude AI API                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Role-Based Access Control

The system enforces **5 distinct roles** with strict server-side permission checks on every API route:

| Role | Access Level | Key Capabilities |
|------|-------------|-----------------|
| **ADMIN** | Full system control | Create/edit/delete students & faculty, manage results, fees, timetables, notices, exam sessions, view audit logs |
| **STUDENT** | Own data only | View profile/results/attendance/fees, submit documents, register for exams, use chatbot, download hall tickets |
| **FACULTY** | Assigned sections only | Mark attendance (today only), view assigned students, review documents, comment on submissions, apply for leave |
| **ACCOUNTANT** | Fee data only | View/update fee payment status across all categories, generate transaction reports |
| **BUS_PROVIDER** | Bus fees only | View/update only bus fee records, no access to academic or personal data |

> **Security principle:** Authorization is enforced server-side on every API route. Hiding a button in the UI is not security — the API itself rejects unauthorized requests regardless of how they're made.

---

## 📦 Module Breakdown

### 🎓 Student Management
| Feature | Description |
|---------|-------------|
| Auto Roll Number | Generated in JBIET format: `YY` + `671` + `BranchCode` + `Seq` (e.g., `22671A0501`) |
| Profile | 30+ fields including academic info, personal details, documents |
| Self-Edit | Students can update personal fields; academic fields are locked (server-enforced) |
| Password | Auto-generated on creation, emailed, forced change on first login |

### 📊 Results & Academics
| Feature | Description |
|---------|-------------|
| 8-Semester Structure | 4-year program with per-semester SGPA, cumulative CGPA |
| Subject-wise Results | Internal (30) + External (70) marks, grade, grade points, credits |
| Backlog Tracking | Active backlogs auto-detected, cleared when supplementary results published |
| Exam Sessions | Admin-created sessions (e.g., "Jun-2026") with registration windows |
| Downloadable Results | Students can download formatted result sheets per semester |

### ✅ Attendance System
| Feature | Description |
|---------|-------------|
| Faculty Marking | Toggle-based roster, today-only enforcement (past-date edits blocked server-side) |
| Student View | Calendar heatmap, weekly trend chart, subject-wise breakdown, 75% threshold alerts |
| Eligibility Gate | Below 75% = not eligible for exams (consistent across chatbot, dashboard, and attendance page) |
| Risk Detection | Subjects below 75% highlighted, "classes you can miss" computed live |

### 💰 Fee Management
| Feature | Description |
|---------|-------------|
| Categories | Tuition, Exam, Bus, Hostel, Library, Lab, Other |
| Decoupled Rules | Exam fee is independent of tuition (per real JBIET process) |
| Hall Ticket Gate | Tuition/transport dues block online hall ticket download (must collect in person) |
| Bus Provider | Separate role with access to bus fees only |
| Scholarship | Auto-applied amounts tracked per student |

### 📄 Document Workflows
| Feature | Description |
|---------|-------------|
| Submission | Student selects faculty guide → uploads PDF/PPT → auto-checked for structure |
| Review | Faculty sees branch→section→student drill-down, adds per-document comments |
| Notifications | In-app badge + email sent when faculty comments |
| Repository | Showcased projects browsable by all, with AI-powered chat-on-document |
| Structure Checker | Rule-based analysis: missing sections, page count, references, ToC |

### 🤖 AI Chatbot
| Feature | Description |
|---------|-------------|
| Grounded Responses | Uses student's real live data (attendance %, fee balance, CGPA, backlogs) |
| 3-Category Logic | Policy answers, own-data answers, and honest escalation to correct office |
| Security | Rate limited (10/min), message size capped (1000 chars), cross-student data blocked |
| Fallback | Works without API key via intelligent keyword matching with real data |

### 📝 Exam Registration & RV
| Feature | Description |
|---------|-------------|
| Exam Sessions | Admin creates with type, semester, regulation, batch, open/close dates |
| Registration | Students register for applicable sessions, pay exam fee |
| RV Registration | Dual-listbox paper selection, Revaluation (₹500) vs Recounting (₹300) |
| Hall Ticket | Downloadable after registration + fee, blocked if tuition pending |

### 👨‍🏫 Faculty Features
| Feature | Description |
|---------|-------------|
| Leave Management | Apply (CL/EL/ML/OD/SCL), view balance, admin approval workflow |
| Attendance | Mark for assigned sections only, today-only editing |
| Document Review | Branch→Section→Student navigation, per-report comments |
| Profile | View assignments, subjects, class teacher status |

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript | 5.x |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| Database | SQLite (dev) / PostgreSQL (prod) | — |
| ORM | Prisma | 5.22.0 |
| Auth | Custom (bcrypt + httpOnly cookies) | — |
| Icons | Lucide React | Latest |
| Charts | Recharts | 3.8.1 |
| Email | Nodemailer | 7.x |
| Storage | AWS S3 SDK | 3.x |
| Validation | Zod | 4.x |
| PDF Parsing | pdf-parse | 2.x |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/AkulRaghav/jbiet-campus-portal.git
cd jbiet-campus-portal

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database (creates SQLite dev.db)
npx prisma db push

# Seed with test data
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Open **http://localhost:3000** in your browser.

### Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema changes to DB |
| `npm run db:seed` | Seed database with test data |
| `npm run db:studio` | Open Prisma Studio (DB viewer) |

---

## 🔑 Test Accounts

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Admin | `admin` | `Admin@123` | Full system access |
| Faculty | `FAC001` | `Faculty@123` | Dr. Rajesh Kumar, CSE |
| Student | `22671A0501` | `Student@123` | Anand Sharma, CSE-A (7 semesters of data) |
| Student | `22671A0502` | `Student@123` | Priya Reddy, CSE-A |
| Student | `22671A0503` | `Student@123` | Karthik Rao (low attendance test) |
| Students | `22671A0504` – `22671A0510` | `Student@123` | Additional test students |
| Accountant | `accountant1` | `Account@123` | Fee management access |
| Bus Provider | `busadmin` | `BusProv@123` | Bus fees only |

---

## 🗃 Database Schema

The system uses **25+ models** with proper indexing for performance at scale:

### Core Models

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| `User` | Authentication (all roles) | → Student, Faculty, Sessions |
| `Student` | Academic + personal profile | → Branch, Section, Attendance, Results, Fees, Documents |
| `Faculty` | Employee profile | → Branch, Assignments, Documents, Leave |
| `Branch` | 11 engineering departments | → Students, Faculty, Subjects, Sections |
| `Section` | Class divisions (A, B, C per batch) | → Students, Assignments, Timetables |
| `Subject` | Course catalog | → Assignments, Attendance, Results |

### Academic Models

| Model | Purpose |
|-------|---------|
| `Attendance` | Daily per-student per-subject records |
| `SemesterResult` | Per-semester SGPA/CGPA with exam session |
| `SubjectResult` | Per-subject marks, grade, backlog status |
| `FacultyAssignment` | Faculty → Section → Subject mapping per semester |
| `Timetable` / `TimetableSlot` | Weekly schedule per section |

### Exam & Fee Models

| Model | Purpose |
|-------|---------|
| `ExamSession` | Admin-created exam cycles with registration windows |
| `ExamRegistration` | Student registration + fee payment per session |
| `FeeRecord` | Per-student per-category fee tracking |
| `RevaluationRequest` | RV/RC requests with status tracking |
| `SubjectDetention` | Insufficient internals tracking |

### Document & Communication Models

| Model | Purpose |
|-------|---------|
| `DocumentSubmission` | Student uploads with faculty targeting |
| `DocumentComment` | Per-document faculty feedback |
| `Notification` | In-app alerts (unread badge) |
| `ChatMessage` | Chatbot conversation history |
| `PublicNotice` | Public announcements (no login required) |

### Administrative Models

| Model | Purpose |
|-------|---------|
| `LeaveApplication` | Faculty leave requests + approval |
| `LeaveBalance` | Per-type annual leave tracking |
| `AcademicCalendarEvent` | College-wide calendar events |
| `AuditLog` | Who changed what, when |
| `ContactDirectory` | Issue-type → contact mapping |

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/api/auth/login` | Public | Login with rate limiting |
| POST | `/api/auth/logout` | Auth | Destroy session |
| POST | `/api/auth/change-password` | Auth | Update password |
| GET | `/api/auth/me` | Auth | Current user + profile |

### Students
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/api/students` | Admin, Faculty | List/search students |
| POST | `/api/students` | Admin | Create student (auto roll number) |
| GET | `/api/students/[id]` | Scoped | Get student details |
| PUT | `/api/students/[id]` | Admin | Update student |
| DELETE | `/api/students/[id]` | Admin | Delete student |
| PUT | `/api/students/profile` | Student | Self-edit (locked fields enforced) |

### Academics
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET/POST | `/api/attendance` | Scoped | View/mark attendance |
| GET/POST | `/api/results` | Scoped | View/enter results |
| GET/POST | `/api/timetable` | Scoped | View/manage timetable |
| GET | `/api/subjects` | Auth | List subjects by branch/semester |

### Fees & Exams
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET/POST/PUT | `/api/fees` | Scoped | Fee CRUD |
| GET/POST | `/api/exam-sessions` | Scoped | Exam session management |
| POST/PUT | `/api/exam-registration` | Student | Register + pay exam fee |
| GET/POST/PUT | `/api/revaluation` | Scoped | RV request lifecycle |

### Documents & Communication
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET/POST/DELETE | `/api/documents` | Scoped | Document submission CRUD |
| POST | `/api/documents/comment` | Faculty | Add review comment |
| GET | `/api/documents/download` | Scoped | Download with auth check |
| GET/PUT | `/api/repository` | Auth | Browse/showcase documents |
| POST | `/api/repository/chat` | Auth | AI chat grounded in document |
| POST | `/api/chatbot` | Student | AI assistant with live data |
| GET/PUT | `/api/notifications` | Student | Notification management |
| GET/POST | `/api/notices` | Public/Admin | Public announcements |

### Administrative
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET/POST/PUT | `/api/leave` | Faculty/Admin | Leave management |
| GET/POST | `/api/calendar` | Auth/Admin | Academic calendar |
| GET | `/api/admin/reports` | Admin | Analytics dashboard data |
| GET | `/api/audit` | Admin | Audit log viewer |
| GET/POST | `/api/contacts` | Public/Admin | Contact directory |

---

## 🔒 Security Implementation

| Control | Implementation |
|---------|---------------|
| **Password Hashing** | bcrypt with 12 salt rounds — never plaintext |
| **Session Security** | httpOnly, Secure, SameSite=Lax cookies, 8-hour expiry |
| **Rate Limiting** | 5 failed logins → 15-minute lockout per IP+username |
| **Server-Side Auth** | Every API route re-verifies session + role — not UI-dependent |
| **Input Validation** | Zod schemas on all inputs, reject malformed data before DB |
| **SQL Injection** | Prisma ORM with parameterized queries — no raw SQL concatenation |
| **XSS Prevention** | React's built-in escaping + security headers |
| **CSRF Protection** | SameSite cookies + same-origin checks |
| **File Upload** | MIME type allowlist, 25MB size limit |
| **Audit Trail** | All sensitive operations logged (who, what, when) |
| **Data Scoping** | Students see only own data; faculty see only assigned sections |
| **Today-Only Edits** | Attendance marking locked to current date (server-enforced) |
| **Chatbot Safety** | Rate limited, message size capped, cross-student data blocked |

---

## 🚢 Deployment Guide

### Production Requirements

| Service | Environment Variable | Purpose |
|---------|---------------------|---------|
| PostgreSQL | `DATABASE_URL` | Production database |
| SMTP Server | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Email delivery |
| S3 Storage | `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | File uploads |
| Claude API | `CLAUDE_API_KEY` | AI chatbot (optional — fallback works without it) |

### Steps

1. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`
2. Set `DATABASE_URL` to your PostgreSQL connection string
3. Run `npx prisma migrate dev` to create migrations
4. Set all environment variables per the table above
5. Run `npm run build` then `npm start`

### Recommended Hosting
- **Vercel** (frontend + API routes)
- **Railway** or **Supabase** (PostgreSQL)
- **AWS S3** or **Cloudflare R2** (file storage)

---

## 📁 Project Structure

```
jbiet-campus-portal/
├── prisma/
│   ├── schema.prisma          # Full database schema (25+ models)
│   └── seed.ts                # Test data seeding script
├── public/
│   └── images/                # Static assets (campus photo)
├── src/
│   ├── app/
│   │   ├── api/               # 25+ API route handlers
│   │   │   ├── auth/          # Login, logout, password, me
│   │   │   ├── students/      # Student CRUD + profile
│   │   │   ├── faculty/       # Faculty management
│   │   │   ├── attendance/    # Attendance marking/viewing
│   │   │   ├── results/       # Results management
│   │   │   ├── fees/          # Fee records
│   │   │   ├── documents/     # Submission, comments, download
│   │   │   ├── chatbot/       # AI chatbot with grounding
│   │   │   ├── repository/    # Project showcase + AI chat
│   │   │   ├── exam-sessions/ # Exam cycle management
│   │   │   ├── exam-registration/ # Student registration
│   │   │   ├── revaluation/   # RV/RC requests
│   │   │   ├── leave/         # Faculty leave
│   │   │   ├── calendar/      # Academic calendar
│   │   │   ├── notifications/ # In-app notifications
│   │   │   ├── notices/       # Public announcements
│   │   │   ├── admin/reports/ # Analytics
│   │   │   └── ...
│   │   ├── dashboard/
│   │   │   ├── admin/         # 10+ admin pages
│   │   │   ├── student/       # 12+ student pages
│   │   │   ├── faculty/       # 5+ faculty pages
│   │   │   ├── accountant/    # Fee management pages
│   │   │   └── bus-provider/  # Bus fee pages
│   │   ├── login/             # Split-layout login page
│   │   └── page.tsx           # Public homepage with notices
│   ├── components/
│   │   ├── layout/            # Sidebar, DashboardLayout
│   │   └── charts/            # Recharts components
│   ├── lib/
│   │   ├── auth.ts            # Session management, bcrypt, rate limiting
│   │   ├── prisma.ts          # Database client singleton
│   │   ├── email.ts           # SMTP/mock email service
│   │   ├── storage.ts         # S3 file operations
│   │   ├── audit.ts           # Audit logging
│   │   ├── roll-number.ts     # Auto roll number generation
│   │   ├── document-checker.ts # PDF structure analysis
│   │   └── validators/        # Zod schemas
│   └── middleware.ts          # Security headers + auth
├── .env.example               # Environment template
├── package.json
└── README.md
```

---

## 🏫 Supported Branches

| Code | Branch | Short |
|------|--------|-------|
| 01-CE | Civil Engineering | CE |
| 02-EEE | Electrical & Electronics Engineering | EEE |
| 03-ME | Mechanical Engineering | ME |
| 04-ECE | Electronics & Communication Engineering | ECE |
| 05-CSE | Computer Science & Engineering | CSE |
| 12-IT | Information Technology | IT |
| 19-ECM | Electronics & Computer Engineering | ECM |
| 72-AIDS | Artificial Intelligence and Data Science | AI&DS |
| 73-AIML | Artificial Intelligence and Machine Learning | AI&ML |
| 66-CSM | CSE (AI&ML) | CSM |
| 67-CSD | CSE (Data Science) | CSD |

---

## 📄 License

Private — JBIET Internal Use Only

---

<p align="center">
  <strong>Built with ❤️ for JB Institute of Engineering & Technology</strong><br/>
  <sub>Hyderabad, Telangana, India</sub>
</p>
