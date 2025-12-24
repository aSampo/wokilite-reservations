# WokiLite Project Rules

## Core Requirements

### Time & Scheduling

- **Fixed slot size:** 15 minutes (not configurable)
- **Default reservation duration:** 90 minutes
- **Intervals:** treat as [start, end) - end is exclusive
- **Timezone:** IANA format at restaurant level (e.g., "America/Argentina/Buenos_Aires")
- **Shifts:** reservations must fall within shift windows when defined; otherwise full day available

### Domain Rules

- Every entity includes audit metadata: `createdAt`, `updatedAt` (ISO 8601)
- Timestamps must use ISO 8601 format with timezone
- IDs follow pattern: `PREFIX_timestamp_counter` (e.g., "RES_001")

### Table Assignment

- **CORE:** Single table assignment per reservation
- Must satisfy: `minSize ≤ partySize ≤ maxSize`
- No overlap with existing reservations
- **Must implement efficient table-assignment algorithm**

### Concurrency & Idempotency

- Prevent double-booking under concurrency (logical lock per sector+slot)
- Implement idempotency for `POST /reservations` via `Idempotency-Key` header
- Simultaneous requests for same sector/slot must not produce double bookings

### Reservation Status

- **CORE:** Use `CONFIRMED` and `CANCELLED` only
- **BONUS:** `PENDING` for large group approval flow
- Cancelled reservations don't count for availability

### Error Codes

- `400` - Invalid format/validation error
- `404` - Entity not found
- `409` - No capacity/conflict
- `422` - Outside service window or policy violation
- `429` - Rate limiting (optional)
- `5xx` - Server errors

## API Endpoints (CORE)

### GET /availability

Query params: `restaurantId`, `sectorId`, `date`, `partySize`

- Returns 15-minute slots for given date/sector/party size
- Respects shifts when defined
- Accounts for existing reservations and cancellations

### POST /reservations

Headers: `Idempotency-Key` (required)
Body: `restaurantId`, `sectorId`, `partySize`, `startDateTimeISO`, `customer`, `notes?`

- Assigns one table automatically
- Returns `201` with reservation details or `409` if no capacity
- Must be idempotent

### DELETE /reservations/:id

- Returns `204` on success
- Slot becomes available immediately
- Updates `updatedAt` timestamp

### GET /reservations/day

Query params: `restaurantId`, `date`, `sectorId?` (optional)

- If `sectorId` provided → return that sector only
- If `sectorId` omitted → return all sectors for that day
- Only return non-cancelled reservations

## Tech Stack

### Required

- **Runtime:** Node.js + TypeScript
- **Framework:** Express or Fastify
- **Validation:** Zod
- **Logging:** Pino
- **Testing:** Vitest/Jest (minimum 3 meaningful tests)
- **Date/Time:** date-fns + date-fns-tz

### Persistence

- **CORE:** In-memory allowed
- **BONUS:** Database (SQL or NoSQL)

## Code Style

### TypeScript

- Strict mode enabled
- All types explicitly defined
- Use interfaces from `src/types/index.ts`

### Imports

- Use double quotes for strings
- Absolute imports when possible
- Group imports: external → internal → types

### Functions

- Pure functions when possible
- Avoid mutations
- Use date-fns for all date operations (no raw Date methods)

### Logging

- Log format: `{ requestId, sectorId, partySize, operation, durationMs, outcome }`
- Use appropriate log levels: info, warn, error
- Include context in all logs

## Testing Requirements (Minimum)

1. **Happy path:** create valid reservation → 201; same slot becomes unavailable
2. **Concurrency:** two concurrent creates for same slot → one 201, other 409
3. **Boundary:** adjacent reservations touching at end-exclusive don't collide
4. **Shifts:** attempt outside shift → 422
5. **Idempotency:** repeat create with same key returns same reservation
6. **Cancel:** DELETE → 204, slot returns to available
7. **Daily listing:** with and without sectorId returns correct sets
8. **Timestamps:** verify createdAt/updatedAt on create/cancel
   ß

## Seed Data

Use example from spec (section 9):

- Restaurant: "Bistro Central" (R1)
- Timezone: "America/Argentina/Buenos_Aires"
- Shifts: 12:00-16:00, 20:00-23:45
- Sectors: "Main Hall" (S1), "Terrace" (S2)
- Tables: T1-T5 with varying capacities

## Important Notes

- **Efficiency matters:** Table assignment algorithm must be efficient
- **Atomicity:** Use locks/transactions to prevent race conditions
- **Timezone handling:** Always consider restaurant timezone
- **End-exclusive intervals:** [start, end) - end time is NOT included
- **Customer data:** Always persist and return customer details
