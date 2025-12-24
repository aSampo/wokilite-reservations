# WokiLite - Restaurant Reservation System

Efficient table assignment system based on 15-minute slots.

## Tech Stack

- Node.js + TypeScript
- Express
- Zod (validation)
- Pino (logging)
- Vitest (testing)
- date-fns (date/time handling)

## Setup

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev          # Development mode with hot-reload
npm run build        # Compile TypeScript
npm start            # Run production build
npm test             # Run tests
npm run lint         # Type checking
```

## Project Structure

```
src/
├── config/          # Configuration
├── types/           # TypeScript types
├── routes/          # API endpoints
├── services/        # Business logic
├── repositories/    # Data access layer
├── middleware/      # Express middleware
└── utils/           # Utilities
```
