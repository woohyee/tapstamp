# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production (includes environment variable validation)
- `npm run build:skip-env` - Build without environment validation
- `npm run check-env` - Validate required environment variables
- `npm run lint` - Run ESLint

## Environment Variables

Required variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key  
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

The build process automatically validates these variables using `scripts/check-env.js`.

## Architecture Overview

This is a Next.js 15 NFC-based customer loyalty system for laundromats with a simplified two-page structure:

### Core Pages
- `/stamp` - NFC entry point for customers (registration/stamp collection)
- `/admin` - NFC entry point for staff (manual stamp management)

### Key System Flow
1. **Customer NFC Process**: Local storage check → new registration form OR immediate stamp addition
2. **Admin NFC Process**: Phone number input → manual stamp addition + customer status view
3. **Data Persistence**: Supabase PostgreSQL with customers, stamps, coupons, events tables

### Important Architectural Decisions

**CRITICAL SYSTEM REQUIREMENTS:**
- The main page (`/`) MUST NOT contain any system explanations or NFC instructions
- No customer dashboard pages - only the two NFC entry points
- Stamp accumulation is visit-based only (no payment amount processing)
- Store owner manually determines $10+ purchases before offering NFC

### Database Architecture
- **customers**: Core customer data with stamp counts and VIP status
- **stamps**: Individual stamp records (amount field exists but not used for validation)
- **coupons**: Reward coupons with types (discount_10, discount_20, event_reward)
- **events**: Game participation records (lottery, ladder)

### Client Configuration
- Uses `@supabase/supabase-js` for database operations
- Local storage (`tagstamp_customer_id`) for customer identification
- Two Supabase clients: standard client and admin client with service role

### Type Definitions
All data interfaces are defined in `src/types/index.ts` including Customer, Stamp, Coupon, Event, and request/response types.

### API Routes
- `/api/stamp` - Handles stamp addition with automatic coupon issuance logic
- `/api/customers` - Customer management operations

The system prioritizes simplicity: visit = stamp, with business logic for rewards/VIP handled automatically in the background.