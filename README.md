# WokiLite - Restaurant Reservation System

Atomic table assignment system for restaurant reservations with concurrency control and idempotency.

## 📑 Table of Contents

- [🌐 Live Deployment](#-live-deployment)
- [🚀 Quick Start](#-quick-start)
- [📋 API Endpoints](#-api-endpoints)
- [🏗️ Architecture & Design Decisions](#️-architecture--design-decisions)
- [✅ Testing](#-testing)
- [🎯 CORE Requirements Implemented](#-core-requirements-implemented)
- [📦 Project Structure](#-project-structure)
- [🔧 Environment Variables](#-environment-variables)
- [🧰 Tools & Libraries Used](#-tools--libraries-used)
- [🚀 Deployment](#-deployment)
- [🚧 Known Limitations & Assumptions](#-known-limitations--assumptions)

## 🌐 Live Deployment

The service is deployed and available at:

**🔗 [https://wokilite-reservations-production.up.railway.app](https://wokilite-reservations-production.up.railway.app/health)**

Try the health endpoint:

```bash
curl https://wokilite-reservations-production.up.railway.app/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-12-26T11:39:55Z",
  "requestId": "5eaf7121-fd6f-4ae8-912b-7f6671244d11"
}
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup database (first time only)
# Create .env file with: echo 'DATABASE_URL="file:./prisma/dev.db"' > .env

# Run database migrations
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate

# Run in development mode
npm run dev

# Run tests (requires prisma:generate and prisma:migrate first)
npm test

# Build for production
npm run build

# Start production server
npm start
```

**First time setup:**

1. Create `.env` file: `echo 'DATABASE_URL="file:./prisma/dev.db"' > .env`
2. Run `npm run prisma:migrate` to create the database schema
3. Run `npm run prisma:generate` to generate Prisma Client (already included in build script)

Server will be available at `http://localhost:3000` (configurable via `PORT` env var).

**Database Management:**

- `npm run prisma:migrate` - Create and apply migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:generate` - Regenerate Prisma Client after schema changes

## 📋 API Endpoints

### Health Check

```
GET /health
```

### Check Availability

```
GET /availability?restaurantId=R1&sectorId=S1&date=2025-09-08&partySize=4
```

**Response 200:**

```json
{
  "slotMinutes": 15,
  "durationMinutes": 90,
  "slots": [
    {
      "start": "2025-09-08T20:00:00-03:00",
      "available": true,
      "tables": ["T4"]
    },
    {
      "start": "2025-09-08T20:15:00-03:00",
      "available": false,
      "reason": "no_capacity"
    }
  ]
}
```

### Create Reservation

```
POST /reservations
Headers: { "Idempotency-Key": "abc-123" }
Body: {
  "restaurantId": "R1",
  "sectorId": "S1",
  "partySize": 4,
  "startDateTimeISO": "2025-09-08T20:00:00-03:00",
  "customer": {
    "name": "John Doe",
    "phone": "+54 9 11 5555-1234",
    "email": "john.doe@mail.com"
  },
  "notes": "Anniversary"
}
```

**Response 201:**

```json
{
  "id": "RES_001",
  "restaurantId": "R1",
  "sectorId": "S1",
  "tableIds": ["T4"],
  "partySize": 4,
  "start": "2025-09-08T20:00:00-03:00",
  "end": "2025-09-08T21:30:00-03:00",
  "status": "CONFIRMED",
  "customer": {
    "name": "John Doe",
    "phone": "+54 9 11 5555-1234",
    "email": "john.doe@mail.com"
  },
  "createdAt": "2025-09-08T19:50:21-03:00",
  "updatedAt": "2025-09-08T19:50:21-03:00"
}
```

**Error 409 (No Capacity):**

```json
{
  "error": "no_capacity",
  "detail": "No available table fits party size at requested time"
}
```

**Error 422 (Outside Service Window):**

```json
{
  "error": "outside_service_window",
  "detail": "Requested time is outside shifts"
}
```

### Cancel Reservation

```
DELETE /reservations/:id
```

**Response:** `204 No Content`

**Note:** This is a soft delete - the reservation's `status` is set to `CANCELLED` and a `cancelledAt` timestamp is added. The reservation remains in storage for audit purposes but is filtered from queries by default (unless `includeCancelled=true` is specified).

### Get Restaurant Info

```
GET /restaurants/info?restaurantId=R1
```

**Purpose:** Retrieve restaurant metadata and available sectors. This endpoint is designed to populate the frontend with essential information like restaurant name, timezone, service shifts, and sector options for dropdown menus and validation.

**Response 200:**

```json
{
  "restaurant": {
    "id": "R1",
    "name": "Bistro Central",
    "timezone": "America/Argentina/Buenos_Aires",
    "shifts": [
      { "start": "12:00", "end": "16:00" },
      { "start": "20:00", "end": "23:45" }
    ]
  },
  "sectors": [
    { "id": "S1", "name": "Main Hall" },
    { "id": "S2", "name": "Terrace" }
  ]
}
```

**Error 404 (Restaurant Not Found):**

```json
{
  "error": "not_found",
  "detail": "Restaurant not found"
}
```

**Use Cases:**

- Display restaurant name and timezone in the UI
- Show service hours to users
- Populate sector dropdown

### List Reservations for a Day

```
GET /reservations/day?restaurantId=R1&date=2025-09-08[&sectorId=S1][&includeCancelled=true]
```

**Query Parameters:**

- `restaurantId` (required): Restaurant ID
- `date` (required): Date in YYYY-MM-DD format
- `sectorId` (optional): Filter by specific sector
- `includeCancelled` (optional): Include cancelled reservations (default: false)

**Response 200:**

```json
{
  "date": "2025-09-08",
  "items": [
    {
      "id": "RES_001",
      "sectorId": "S1",
      "tableIds": ["T4"],
      "partySize": 4,
      "start": "2025-09-08T20:00:00-03:00",
      "end": "2025-09-08T21:30:00-03:00",
      "status": "CONFIRMED",
      "customer": { "name": "John Doe", "phone": "...", "email": "..." },
      "createdAt": "2025-09-08T19:50:21-03:00",
      "updatedAt": "2025-09-08T19:50:21-03:00"
    }
  ]
}
```

**Note:** Cancelled reservations will include a `cancelledAt` timestamp in the response when `includeCancelled=true`.

## 🏗️ Architecture & Design Decisions

### Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5.9
- **Framework:** Express 5.2
- **Database:** SQLite with Prisma ORM
- **Validation:** Zod 4.2
- **Logging:** Pino 10.1
- **Testing:** Vitest 4.0
- **Concurrency:** async-mutex 0.5
- **Date handling:** date-fns 4.1 + date-fns-tz 3.2

### Core Design Principles

#### 1. **Efficient Table Assignment Algorithm**

The algorithm (`table-assignment.service.ts`) finds the best table efficiently:

**How it works:**

1. Get all tables in the sector
2. Check which tables are occupied at that time slot
3. Keep only tables that are free AND fit the party size
4. Pick the smallest available table (minimize wasted seats)

**Example:** Party of 4 people

- Table A: seats 2-4 ✅ (wastes 0 seats) ← **Best choice**
- Table B: seats 4-6 ✅ (wastes 2 seats)
- Table C: seats 2-2 ❌ (too small)

This ensures efficient capacity usage across the restaurant.

#### 2. **Concurrency Control**

Implemented with **Mutex per sector+slot** using `async-mutex`:

- Each `sectorId:startISO` combination has its own lock
- Prevents double-booking under high concurrency
- Fine-grained: different slots don't block each other

#### 3. **Idempotency**

- `Idempotency-Key` header on `POST /reservations`
- Persistent storage in database (`IdempotencyKey` table)
- Retry with same key returns original reservation (201)
- No duplicate reservations on network retry
- Atomic transaction ensures consistency

#### 4. **Timezone Handling**

- Each restaurant has its IANA timezone (`America/Argentina/Buenos_Aires`)
- All dates handled in restaurant's timezone
- Slots and validations respect local time
- Using `date-fns-tz` for precise conversions

#### 5. **Time Boundaries (end-exclusive)**

- Intervals `[start, end)` with exclusive end
- Adjacent reservations can share boundary without conflict
- Example: `[20:00, 21:30)` and `[21:30, 23:00)` don't collide

#### 6. **Service Shifts**

- Restaurants can define shifts (e.g., lunch 12:00-16:00, dinner 20:00-23:45)
- If no shifts defined, full day is available
- Returns `422` if reservation falls outside service window

### Data Model

**SQLite database** with Prisma ORM:

- `Restaurant`: configuration, timezone, shifts (stored as JSON)
- `Sector`: restaurant areas (Main Hall, Terrace, etc.)
- `Table`: min/max capacity, belongs to a sector
- `Reservation`: customer data, timestamps, status (tableIds stored as JSON)
- `IdempotencyKey`: idempotency key mapping to reservations

All entities include `createdAt` and `updatedAt` (ISO 8601).

**Database Schema:**

- Located in `prisma/schema.prisma`
- Migrations in `prisma/migrations/`
- Database file: `prisma/dev.db` (SQLite)

### Error Handling

- `400` Bad Request: invalid format, Zod validation failure
- `404` Not Found: entity doesn't exist
- `409` Conflict: no capacity available
- `422` Unprocessable Entity: outside service window
- `500` Internal Server Error: unexpected errors

### Logging & Observability

- Structured logging with Pino
- Request ID tracking (`X-Request-Id` header)
- Logs include: `requestId`, `sectorId`, `partySize`, `operation`, `outcome`

## ✅ Testing

**23 tests** covering critical scenarios:

1. **Idempotency** (2) - Same key returns same reservation
2. **Concurrency** (2) - Simultaneous requests → one succeeds, other 409
3. **Time Boundaries** (2) - Adjacent reservations don't collide
4. **Service Window** (2) - Shift validation (422 outside hours)
5. **Customer Data** (1) - Persistence verification
6. **Timestamps** (1) - `createdAt`/`updatedAt` correctness
7. **Cancellation** (6) - Soft delete, capacity freed, idempotent
8. **Include Cancelled** (3) - Query parameter filtering
9. **Mutex Control** (2) - `Promise.all` prevents double-booking
10. **Timezone Handling** (2) - Daily queries respect restaurant timezone

**⚠️ Important: Before running tests, you must:**

1. Generate Prisma Client: `npm run prisma:generate`
2. Setup database: `npm run prisma:migrate`

Then run the tests:

```bash
npm test               # Run all tests (23 passing)
npm run test:ui        # Interactive UI
npm run test:coverage  # Coverage report
```

**Note:** The database must exist and Prisma Client must be generated before running tests, otherwise you'll get "Error code 14: Unable to open the database file".

## 🎯 CORE Requirements Implemented

- ✅ Availability with 15-minute slots
- ✅ Efficient single table assignment
- ✅ Atomicity and double-booking prevention
- ✅ Idempotency on POST /reservations
- ✅ Reservation CRUD with customer data
- ✅ Cancellation (DELETE)
- ✅ Daily listing (with/without sectorId)
- ✅ Shift validation
- ✅ Automatic timestamps
- ✅ Error handling (400/404/409/422)

## 📦 Project Structure

```
src/
├── config/                 # Configuration
├── modules/
│   ├── availability/       # Availability logic & routes
│   ├── reservations/       # Reservation logic & routes
│   └── restaurants/        # Restaurant info & routes
├── shared/
│   ├── db/                 # Prisma client singleton
│   ├── middleware/         # Request ID, idempotency, validation
│   ├── repositories/       # Prisma-based data access layer
│   ├── services/           # Table assignment algorithm
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Date, timezone, logger, ID generation
prisma/
├── schema.prisma          # Database schema definition
└── migrations/            # Database migration history
├── seed/                   # Initial data (Bistro Central)
└── index.ts                # Express app entry point
```

## 🔧 Environment Variables

```bash
PORT=3000                           # Server port
NODE_ENV=development                # Environment
DATABASE_URL="file:./prisma/dev.db" # SQLite database path
LOG_LEVEL=info                      # Pino log level
CORS_ORIGIN=*                       # CORS allowed origins
CORS_CREDENTIALS=false              # CORS credentials
```

**Required:**

- `DATABASE_URL`: Path to SQLite database file (default: `file:./prisma/dev.db`)

**Optional:**

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `LOG_LEVEL`: Pino log level (default: info)

## 🧰 Tools & Libraries Used

### Core Dependencies

- **Express 5.2:** Web framework (chosen for simplicity and mature ecosystem)
- **Prisma 6.1:** Type-safe ORM for database access
- **@prisma/client:** Generated Prisma Client for type-safe queries
- **Zod 4.2:** Runtime validation with TypeScript inference
- **Pino 10.1:** High-performance structured logging
- **date-fns 4.1 + date-fns-tz 3.2:** Immutable date manipulation with timezone support
- **async-mutex 0.5:** Concurrency control (Mutex implementation)
- **cors 2.8:** CORS middleware

### Development Tools

- **TypeScript 5.9:** Type safety
- **tsx 4.21:** Fast TypeScript execution for dev mode
- **Vitest 4.0:** Fast unit testing with native ESM support
- **@vitest/ui:** Interactive test UI

### AI-Assisted Development

This project was developed with **Cursor AI** assistance to accelerate:

- TypeScript + Express boilerplate
- Comprehensive test cases
- Timezone handling with date-fns-tz

## 🚀 Deployment

### Live Deployment

The service is deployed on **Railway** and available at:

**🔗 [https://wokilite-reservations-production.up.railway.app](https://wokilite-reservations-production.up.railway.app/health)**

### How It's Deployed

**Platform:** Railway  
**CI/CD:** Automatic deployment from `main` branch  
**Start Command:** `npm run start:prod` (runs migrations before starting server)

#### Production Environment Variables

**Required:**

- `DATABASE_URL` - Database connection string (provided by Railway database service)
- `NODE_ENV=production`

**Optional:**

- `PORT` - Server port (Railway sets automatically)
- `LOG_LEVEL` - Logging level (default: `info`)
- `CORS_ORIGIN` - Allowed CORS origins (default: `*`)
- `CORS_CREDENTIALS` - Enable CORS credentials (default: `false`)

### Deployment Scripts

- `npm run build` - Compiles TypeScript and generates Prisma Client
- `npm run start:prod` - Runs `prisma migrate deploy` then starts the server
- `npm start` - Starts server (assumes migrations already applied)

## 🚧 Known Limitations & Assumptions

### Limitations

1. **SQLite database:** Single-file database, not suitable for high-concurrency production (consider PostgreSQL for production)
2. **Single table assignment:** doesn't combine tables for large groups
3. **No waitlist:** rejects immediately if no capacity
4. **Fixed 90-min duration:** doesn't vary by party size
5. **No advance booking policy:** doesn't validate min/max days in advance

### Assumptions

- Reservations are `CONFIRMED` immediately (no approval flow)
- Cancellation sets `status: 'CANCELLED'` and `cancelledAt` timestamp (cancelled reservations remain in storage but are filtered from queries)
- A restaurant can have multiple sectors
- Party size must be between `minSize` and `maxSize` of some table
- Restaurant timezone is valid (IANA)
- Reservations can be made up to 15 minutes before shift end time (e.g., 14:45 reservation for a shift ending at 15:00)

### Database Architecture

Uses **Prisma with SQLite** for persistent storage:

- **Prisma ORM:** Type-safe database access with automatic migrations
- **SQLite:** Lightweight, file-based database perfect for development
- **Migrations:** Version-controlled schema changes
- **Indexes:** Optimized queries on `(sectorId, startDateTimeISO, endDateTimeISO)` for overlap detection
- **Transactions:** Atomic operations for idempotency and consistency

### Why async-mutex?

Alternatives considered:

- **Redis locks:** requires additional infrastructure
- **DB transactions:** not available without DB
- **async-mutex:** simple, effective for in-memory, easy to test

### Scalability Considerations

To scale to production:

1. Migrate from SQLite to PostgreSQL (better concurrency)
2. Implement Redis for distributed idempotency cache (if needed)
3. Add rate limiting (express-rate-limit)
4. Consider read replicas for high-traffic read operations
5. Add database indexes for frequently queried fields
