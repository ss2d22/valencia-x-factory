# Cross-Border B2B Escrow Platform MVP

A Next.js hackathon MVP demonstrating cross-border B2B payments using milestone-based escrow. Built with Next.js (App Router), React, Tailwind CSS, and shadcn/ui components.

## Features

- **Landing Page**: Headline, features, and SWIFT vs Platform comparison table
- **Login System**: Role-based login
- **Dashboard**: Real-time escrow balance tracking, milestone progress, and role-specific views
- **Deal Details**: Timeline view of milestones with release functionality
- **Transaction Summary**: Complete settlement details and blockchain transaction hash

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Card, Button, Badge, Progress, Collapsible)
- **Icons**: Lucide React
- **State Management**: React Context API

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/
│   │   └── page.tsx          # Login page with role selection
│   ├── dashboard/
│   │   └── page.tsx          # Main dashboard
│   ├── deal/
│   │   └── page.tsx          # Deal details with milestones
│   ├── transaction/
│   │   └── page.tsx          # Transaction summary
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── ui/                   # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── progress.tsx
│   │   └── collapsible.tsx
│   └── AppProvider.tsx       # Context provider for state management
├── lib/
│   └── utils.ts              # Utility functions
└── types/
    └── index.ts              # TypeScript type definitions
```

## Usage

1. **Start Demo**: Click "Start Demo" on the landing page
2. **Login**: Choose your role (Buyer or Supplier)
3. **Dashboard**: View escrow balance and milestone progress
4. **Deal Details**: Click "View Deal Details" to see the milestone timeline
5. **Release Milestones**: As Buyer, click "Release Milestone Payment" to release funds
6. **Transaction Summary**: View complete settlement details and transaction hash

## Features in Detail

### Milestone Release Logic
- Milestones must be released sequentially
- Each milestone release updates escrow balance and supplier balance
- Releasing a milestone is only possible if previous milestones are completed

### Dispute Handling
- Buyers can raise disputes, which disables further milestone releases
- Disputed milestones are marked in red
- Transaction status changes to "Disputed"

### Role-Based Views
- **Buyer View**: Shows escrow balance, release buttons, dispute option
- **Supplier View**: Shows received balance, milestone status tracking

## Status Indicators

- 🟢 **Green (Released)**: Milestone payment has been released
- 🟡 **Yellow (Pending)**: Milestone is awaiting release
- 🔴 **Red (Disputed)**: Milestone is under dispute

## Development

This is a frontend-only MVP with mock data. No backend is required. All state is managed in React Context and persists during the session.

## License

This is a hackathon MVP demonstration project.
