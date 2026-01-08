# X-Factory Backend

Trade finance on XRPL with escrow-based milestone payments.

## Quick Start

```bash
# Start the database
docker-compose up -d db

# Install deps and run migrations
npm install
npx prisma migrate dev

# Start the server
npm run dev
```

Server runs at http://localhost:3001

## Running Tests

```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:api      # API tests only
npm run test:xrpl     # XRPL tests only
```

## Features

- JWT auth with all routes protected
- Role-based access (buyers fund, facilitators verify, buyers release)
- Users can only see their own wallets and deals
- Escrow payments released on milestone verification
- RLUSD stablecoin settlement
- Full transaction audit trail

## API

All endpoints (except auth) require `Authorization: Bearer <token>` header.

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token
- `GET /api/auth/me` - Current user + wallets

### Wallets
- `POST /api/wallets` - Create wallet (buyer/supplier/facilitator)
- `GET /api/wallets` - List your wallets
- `GET /api/wallets/:address` - Wallet details
- `GET /api/wallets/:address/history` - Transaction history

### Deals
- `POST /api/deals` - Create deal (must be buyer)
- `GET /api/deals` - List your deals
- `GET /api/deals/:id` - Deal details
- `POST /api/deals/:id/fund` - Fund escrow (buyer only)
- `POST /api/deals/:id/milestones/:index/verify` - Verify (facilitator only)
- `POST /api/deals/:id/milestones/:index/release` - Release payment (buyer only)
- `POST /api/deals/:id/dispute` - Raise dispute

## Environment

Copy `.env.example` to `.env`:

```
DATABASE_URL=postgresql://xfactory:xfactory_dev@localhost:5433/xfactory
JWT_SECRET=your-secret-here
XRPL_WS_URL=wss://s.altnet.rippletest.net:51233
```

## Project Structure

```
src/
├── routes/        # API endpoints (auth protected)
├── middleware/    # Auth middleware
├── services/
│   ├── xrpl/      # XRPL operations (escrow, DID, credentials)
│   ├── auth.ts    # JWT + sessions
│   ├── deal.ts    # Deal logic
│   └── storage.ts # Prisma data layer
└── types/         # TypeScript types
```
