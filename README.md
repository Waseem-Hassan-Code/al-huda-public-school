# Al-Huda Public School Management System

A comprehensive school management system built with Next.js 16, featuring student admissions, fee management with automatic voucher generation, attendance tracking, exam management, and multi-role access control with fine-grained permissions.

## Features

### 🎓 Student Management

- Multi-step admission form with guardian information
- Student profiles with complete academic history
- Class and section management
- Student promotion and transfer tracking
- ID card generation

### 💰 Fee Management

- **Automatic monthly fee voucher generation** (via CRON job)
- Partial payment support with running balance
- Multiple payment methods (Cash, Bank Transfer, Cheque, Online)
- Receipt generation
- Overdue fee tracking and late fee calculation
- Discount management with reasons
- Fee structure templates per class

### 📅 Attendance Management

- Daily attendance marking with bulk actions
- Multiple status types (Present, Absent, Late, Leave, Half Day)
- Attendance reports and statistics
- Quick mark all present/absent

### 📝 Exam & Results

- Multiple exam types (Monthly, Term, Annual)
- Grade calculation with pass/fail status
- Result entry by subject
- Report card generation

### 👨‍🏫 Teacher Management

- Teacher profiles with subject assignments
- Salary processing and payment tracking
- Timetable management

### 🔐 Role-Based Access Control

- **Super Admin**: Full system access
- **Principal**: Academic and staff management
- **Accountant**: Fee and salary management
- **Clerk**: Student registration and attendance
- **Teacher**: Attendance and results entry
- **Student/Parent**: View-only access

### 🌐 Multi-Language Support

- English and Urdu interface (i18n ready)
- RTL support for Urdu

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI Library**: Material UI (MUI) v7
- **Charts**: Recharts
- **State Management**: Redux Toolkit
- **Form Handling**: React Hook Form + Zod
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   cd al-huda-public-school
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your database credentials:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/al_huda_school"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   CRON_SECRET="your-cron-secret"
   ```

4. **Setup database**

   ```bash
   # Generate Prisma client
   npm run db:generate

   # Run migrations
   npm run db:migrate

   # Seed the database with sample data
   npm run db:seed
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Open browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

| Role        | Email                                | Password |
| ----------- | ------------------------------------ | -------- |
| Super Admin | admin@alhudapublicschool.edu.pk      | admin123 |
| Principal   | principal@alhudapublicschool.edu.pk  | admin123 |
| Accountant  | accountant@alhudapublicschool.edu.pk | admin123 |
| Clerk       | clerk@alhudapublicschool.edu.pk      | admin123 |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── students/      # Student CRUD
│   │   ├── teachers/      # Teacher CRUD
│   │   ├── fees/          # Fee management
│   │   ├── attendance/    # Attendance tracking
│   │   ├── exams/         # Exam management
│   │   └── cron/          # Background job endpoints
│   ├── dashboard/         # Dashboard page
│   ├── students/          # Student pages
│   ├── teachers/          # Teacher pages
│   ├── fees/              # Fee management pages
│   ├── attendance/        # Attendance pages
│   └── ...
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── dashboard/        # Dashboard widgets
│   └── common/           # Reusable components
├── lib/                   # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── permissions.ts    # RBAC permissions
│   ├── sequences.ts      # Auto-ID generation
│   └── utils.ts          # Helper functions
└── store/                 # Redux store
```

## Automatic Fee Generation

The system supports automatic monthly fee voucher generation via a CRON job:

### Manual Trigger (for testing)

```bash
curl -X POST http://localhost:3000/api/cron/generate-fees \
  -H "Authorization: Bearer your-cron-secret"
```

### Production Setup (using Vercel CRON)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-fees",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

## Available Scripts

| Script                | Description              |
| --------------------- | ------------------------ |
| `npm run dev`         | Start development server |
| `npm run build`       | Build for production     |
| `npm run start`       | Start production server  |
| `npm run lint`        | Run ESLint               |
| `npm run db:generate` | Generate Prisma client   |
| `npm run db:push`     | Push schema changes      |
| `npm run db:migrate`  | Run migrations           |
| `npm run db:seed`     | Seed database            |
| `npm run db:studio`   | Open Prisma Studio       |

## API Documentation

### Authentication

- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session

### Students

- `GET /api/students` - List students (paginated)
- `POST /api/students` - Create new student
- `GET /api/students/:id` - Get student details
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Deactivate student

### Fee Vouchers

- `GET /api/fee-vouchers` - List vouchers
- `POST /api/fee-vouchers` - Generate vouchers
- `GET /api/fee-vouchers/:id` - Get voucher details

### Fee Payments

- `GET /api/fee-payments` - List payments
- `POST /api/fee-payments` - Record payment (partial supported)

### Attendance

- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance (bulk)

## Permissions

The system uses a fine-grained permission system:

```typescript
// Example permissions
"students.view"; // View student list
"students.create"; // Create new student
"students.edit"; // Edit student info
"fees.view"; // View fee vouchers
"fees.collect"; // Collect fee payments
"attendance.mark"; // Mark attendance
"results.enter"; // Enter exam results
"users.manage_permissions"; // Manage user permissions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@alhudapublicschool.edu.pk or create an issue in the repository.

## Database migrations

Migrations are created and applied automatically:

- `npm run dev` applies pending migrations, then compares `prisma/schema.prisma` with the database. If you changed the schema, it writes a new migration (`prisma/migrations/<timestamp>_auto_<tables>`) and applies it. Commit that folder.
- Changes that can lose data (dropping a table or column, changing a column type, making a column required, adding a unique constraint) are shown first and only applied if you type `yes`.
- `npm start` and IIS (`web.config` -> `scripts/start.mjs`) only apply migrations committed from development. They never create new ones. If a migration fails, the app does not start; check the logs.
- `npm run db:deploy` applies pending migrations without starting the app.

Renaming a field or model looks like "drop + add" to Prisma, which deletes that column's data. To keep the data, create that one migration by hand: `npm run db:migrate -- --create-only --name rename_x`, change the SQL to `ALTER TABLE ... RENAME COLUMN ...`, then start the app.

Don't use `prisma db push`. It changes the database without creating a migration, so production would never receive the change.

## SMS (Android phone over USB)

SMS is sent from inside the web app through an Android phone connected by USB. There is no separate SMS server to start (the old `sms-bridge` folder is retired).

One-time setup on the computer running the app:

1. Install Android Platform Tools (contains `adb`). Either add its folder to the system PATH, or set `ADB_PATH` to the full path of `adb.exe` (in `.env`, or under `<environmentVariables>` in `web.config` for IIS), for example `C:\platform-tools\adb.exe`.
2. On the phone, turn on Developer options and USB debugging, connect it by USB, and tap **Allow** with "Always allow from this computer" ticked.
3. Under IIS the app runs as the IIS account, so the phone asks to allow the computer once more the first time the app uses it. Allow it the same way.
4. In Messaging, open Settings and tick **Enable SMS Messaging**.

The SMS tab shows whether the phone is connected. On Android 5.1 and older, SMS is sent automatically (bulk works). On Android 6 and newer, Android doesn't allow background sending over USB: each SMS opens the phone's SMS app with the text filled in and someone taps Send, so SMS goes to one parent at a time.
