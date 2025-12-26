# WokiLite - Restaurant Reservation System

Atomic table assignment system for restaurant reservations with concurrency control and idempotency.

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

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

Server will be available at `http://localhost:3000` (configurable via `PORT` env var).

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

### List Reservations for a Day

```
GET /reservations/day?restaurantId=R1&date=2025-09-08[&sectorId=S1]
```

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

## 🏗️ Architecture & Design Decisions

### Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5.9
- **Framework:** Express 5.2
- **Validation:** Zod 4.2
- **Logging:** Pino 10.1
- **Testing:** Vitest 4.0
- **Concurrency:** async-mutex 0.5
- **Date handling:** date-fns 4.1 + date-fns-tz 3.2

### Core Design Principles

#### 1. **Efficient Table Assignment Algorithm**

The algorithm (`table-assignment.service.ts`) finds the best table in **O(R + T)** time:

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
- In-memory cache of keys → reservation IDs
- Retry with same key returns original reservation (201)
- No duplicate reservations on network retry

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

**In-memory storage** with typed repositories:

- `Restaurant`: configuration, timezone, shifts
- `Sector`: restaurant areas (Main Hall, Terrace, etc.)
- `Table`: min/max capacity, belongs to a sector
- `Reservation`: customer data, timestamps, status

All entities include `createdAt` and `updatedAt` (ISO 8601).

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

7 test suites covering critical cases:

1. **Idempotency:** same key returns same reservation
2. **Concurrency:** simultaneous requests to same slot → one 201, other 409
3. **Time Boundaries:** adjacent reservations (end-exclusive) don't collide
4. **Service Window:** shift validation (422 outside hours)
5. **Customer Data:** customer information persistence
6. **Timestamps:** correct `createdAt`/`updatedAt`
7. **Mutex Control:** `Promise.all` doesn't produce double-booking

```bash
npm test               # Run all tests
npm run test:ui        # Interactive UI
npm run test:coverage  # Coverage report
```

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
│   └── reservations/       # Reservation logic & routes
├── shared/
│   ├── middleware/         # Request ID, idempotency, validation
│   ├── repositories/       # In-memory data access
│   ├── services/           # Table assignment algorithm
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Date, timezone, logger, ID generation
├── seed/                   # Initial data (Bistro Central)
└── index.ts                # Express app entry point
```

## 🔧 Environment Variables

```bash
PORT=3000                           # Server port
NODE_ENV=development                # Environment
LOG_LEVEL=info                      # Pino log level
CORS_ORIGIN=*                       # CORS allowed origins
CORS_CREDENTIALS=false              # CORS credentials
```

## 🧰 Tools & Libraries Used

### Core Dependencies

- **Express 5.2:** Web framework (chosen for simplicity and mature ecosystem)
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

### Deployment

- **Platform:** Railway
- **URL:** [https://wokilite-reservations-production.up.railway.app](https://wokilite-reservations-production.up.railway.app/health)
- **CI/CD:** Automatic deployment from main branch
- **Environment:** Production-ready with CORS enabled

## 🚧 Known Limitations & Assumptions

### Limitations

1. **In-memory storage:** data is lost on restart (no database)
2. **Single table assignment:** doesn't combine tables for large groups
3. **No waitlist:** rejects immediately if no capacity
4. **Fixed 90-min duration:** doesn't vary by party size
5. **No advance booking policy:** doesn't validate min/max days in advance

### Assumptions

- Reservations are `CONFIRMED` immediately (no approval flow)
- Cancellation is hard-delete (no soft-delete)
- A restaurant can have multiple sectors
- Party size must be between `minSize` and `maxSize` of some table
- Restaurant timezone is valid (IANA)
- Reservations can be made up to 15 minutes before shift end time (e.g., 14:45 reservation for a shift ending at 15:00)

### Why In-Memory Storage?

Meets CORE requirements and allows fast iteration. In production, would be replaced with PostgreSQL:

- Prisma/Drizzle for ORM
- Unique constraints in DB for double-booking prevention
- Indexes on `(sectorId, startDateTimeISO, endDateTimeISO)` for overlap queries

### Why async-mutex?

Alternatives considered:

- **Redis locks:** requires additional infrastructure
- **DB transactions:** not available without DB
- **async-mutex:** simple, effective for in-memory, easy to test

### Scalability Considerations

To scale to production:

1. Migrate to relational DB (Postgres)
2. Implement Redis for idempotency cache
3. Add rate limiting (express-rate-limit)
