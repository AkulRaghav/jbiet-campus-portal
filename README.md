# JBIET Students Examination Portal

**JB Institute of Engineering & Technology (UGC Autonomous)**  
Accredited by NAAC, Approved by AICTE & Permanently Affiliated to JNTUH

A full-stack college management and examination portal built with Next.js, Prisma, and TypeScript.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Push schema to database (creates SQLite dev.db)
npx prisma db push

# 4. Seed with test data
npx tsx prisma/seed.ts

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Test Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Faculty | `FAC001` | `Faculty@123` |
| Student | `22671A0501` to `22671A0510` | `Student@123` |
| Accountant | `accountant1` | `Account@123` |
| Bus Provider | `busadmin` | `BusProv@123` |

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- **Backend:** Next.js API routes + Server Actions
- **Database:** SQLite (dev) / PostgreSQL (production) via Prisma ORM 5
- **Auth:** Custom session-based auth with bcrypt password hashing
- **Charts:** Recharts (attendance pie charts)
- **Email:** Nodemailer (mock in dev, real SMTP in production)
- **Storage:** S3-compatible (mock in dev)

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (auth, students, faculty, etc.)
│   ├── dashboard/        # Role-based dashboards
│   │   ├── admin/        # Admin pages (students, faculty, notices, etc.)
│   │   ├── student/      # Student pages (profile, results, attendance, etc.)
│   │   ├── faculty/      # Faculty pages (attendance marking, documents)
│   │   ├── accountant/   # Fee management
│   │   └── bus-provider/ # Bus fee management
│   ├── login/            # Login page
│   └── page.tsx          # Public home with notices
├── components/
│   └── layout/           # Sidebar, DashboardLayout
├── lib/
│   ├── auth.ts           # Authentication, sessions, rate limiting
│   ├── prisma.ts         # Database client
│   ├── email.ts          # Email service (mock/production)
│   ├── storage.ts        # S3 file storage
│   ├── audit.ts          # Audit logging
│   ├── roll-number.ts    # Roll number generation
│   ├── document-checker.ts # Rule-based document structure checker
│   └── validators/       # Zod validation schemas
└── middleware.ts         # Security headers, auth redirect
```

## For Production Deployment

### Switch to PostgreSQL

1. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`
2. Update `DATABASE_URL` in `.env` to your PostgreSQL connection string
3. Run `npx prisma migrate dev` to create migrations
4. Add back `enum` types for type safety (SQLite doesn't support them)

### Required External Credentials

| Service | Env Variable | Purpose |
|---------|-------------|---------|
| SMTP Email | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Send auto-generated passwords to new users |
| S3 Storage | `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Store photos, documents, certificates |
| Claude API | `CLAUDE_API_KEY` | Power the student chatbot with AI responses |

### Database Indexes

The schema includes indexes on: roll number, branch, section, batch year, and fee status — designed to support 100,000+ student records efficiently.

## Security Implementation

- **Password hashing:** bcrypt with 12 salt rounds
- **Session management:** httpOnly, secure, SameSite cookies (8-hour expiry)
- **Rate limiting:** 5 failed login attempts → 15-minute lockout (per IP + username)
- **Server-side authorization:** Every API route checks role before proceeding
- **Input validation:** Zod schemas validate all inputs server-side
- **Security headers:** X-Content-Type-Options, X-Frame-Options, HSTS, etc.
- **Audit logging:** All sensitive operations logged with user, timestamp, and changes
- **Parameterized queries:** Prisma ORM prevents SQL injection by design
- **File upload validation:** MIME type allowlist, size limits

## License

Private — JBIET Internal Use Only
