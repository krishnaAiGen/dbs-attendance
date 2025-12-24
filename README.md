# AttendEase - Smart Attendance Management System

A Next.js application for managing classroom attendance using QR codes with GPS-based proximity verification to prevent proxy attendance.

## Features

- **QR Code Attendance**: Professors generate dynamic QR codes that students scan to mark attendance
- **GPS Verification**: Students must be within 100 meters of the classroom to mark attendance
- **Real-time Updates**: QR codes refresh every 30 seconds with HMAC signature verification
- **Role-based Access**: Separate dashboards for students and professors
- **Attendance History**: Track attendance records with timestamps and distance data
- **Export to CSV**: Professors can export attendance data

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with credentials provider
- **Styling**: Tailwind CSS
- **QR Code**: `qrcode` for generation, `html5-qrcode` for scanning
- **Location**: Browser Geolocation API
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dbs-attendance
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database URL and NextAuth secret:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/dbs_attendance?schema=public"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

4. Generate Prisma client and push schema:
```bash
npx prisma generate
npx prisma db push
```

5. Seed the database with professor keys:
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Professor Keys

The following professor keys are pre-seeded for registration:

| Key Code | Subject |
|----------|---------|
| PROF-MATH-001 | Mathematics |
| PROF-PHY-002 | Physics |
| PROF-CHEM-003 | Chemistry |
| PROF-CS-004 | Computer Science |
| PROF-ENG-005 | English |

## Usage

### For Students

1. Register with your email and password at `/register/student`
2. Log in to access your dashboard
3. Click "Scan QR Code" when in class
4. Allow location access and scan the professor's QR code
5. Attendance is marked if you're within 100 meters

### For Professors

1. Register with a professor key at `/register/professor`
2. Log in to access your dashboard
3. Click "Start New Session" to begin taking attendance
4. Allow location access to establish the classroom location
5. Display the QR code for students to scan
6. Monitor real-time attendance count
7. End the session when done

## API Endpoints

### Authentication
- `POST /api/auth/register/student` - Student registration
- `POST /api/auth/register/professor` - Professor registration
- NextAuth handlers at `/api/auth/*`

### Sessions
- `POST /api/sessions` - Create new attendance session
- `GET /api/sessions` - List sessions
- `GET /api/sessions/[id]` - Session details
- `GET /api/sessions/[id]/qr` - Get current QR payload
- `PATCH /api/sessions/[id]` - End session

### Attendance
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance` - Get student's attendance history

## Security Features

- Password hashing with bcrypt
- Input validation with Zod
- Protected API routes with session and role checks
- HMAC-SHA256 signed QR payloads
- 60-second QR code validity window
- GPS proximity verification (100m threshold)

## Project Structure

```
├── app/
│   ├── (auth)/           # Login and registration pages
│   ├── (dashboard)/      # Student and professor dashboards
│   └── api/              # API routes
├── components/
│   ├── qr-display/       # QR code generator component
│   ├── qr-scanner/       # QR scanner component
│   └── ui/               # Reusable UI components
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── distance.ts       # Haversine distance calculation
│   ├── prisma.ts         # Prisma client
│   ├── qr.ts             # QR payload generation/verification
│   └── validations.ts    # Zod schemas
└── prisma/
    ├── schema.prisma     # Database schema
    └── seed.ts           # Database seeding
```

## License

ISC
