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

The build process automatically validates these variables using `scripts/check-env.js`. For Vercel deployment, ensure these same variables are configured in the Vercel project's Environment Variables settings.

## Pre-Launch Campaign

**dodo-cleaners-web Integration:**
- The `dodo-cleaners-web` subproject contains a promotional website for Dodo Cleaners
- The `/event` page serves as a pre-registration campaign for the TapStamp loyalty system
- Customers can register before the official launch (August 1st) and receive 1 free stamp
- This bridges the gap between the business website and the NFC-based loyalty system
- Both projects share the same Supabase database and environment variables

**Campaign Flow:**
1. Customers visit dodo-cleaners-web/event page
2. Fill out registration form (name, phone, optional email)
3. System checks for duplicates and creates new customer record
4. Automatically awards 1 stamp for event participation
5. Shows celebration animation and confirms registration

## Architecture Overview

This is a Next.js 15 NFC-based customer loyalty system for laundromats with a simplified two-page structure:

### Core NFC Entry Points
- `/` - Primary customer NFC entry point (registration/stamp collection)
- `/stamp` - Alternative customer NFC entry point (identical functionality to `/`)
- `/admin` - Staff NFC entry point (manual stamp management and customer editing)

### Key System Flow
1. **Customer NFC Process**: localStorage check → direct stamp addition OR phone number input → existing/new customer handling
2. **Admin NFC Process**: Phone number input → manual stamp addition + customer status view
3. **Data Persistence**: Supabase PostgreSQL with customers, stamps, coupons, events tables

### NFC Customer Experience Requirements
**CRITICAL**: To avoid customer inconvenience, NO QR codes are used - only NFC cards provided by store.

**NFC Tap Flow:**
1. Staff hands NFC card to customer
2. Customer taps with their phone
3. **Check localStorage first**:
   - **Has customer ID**: Automatic stamp addition + celebration message
   - **No customer ID**: Prompt for phone number only
4. **Phone number check** (when localStorage empty):
   - **Existing customer**: Restore localStorage + stamp addition + celebration
   - **New customer**: Complete registration form + first stamp + celebration
5. This approach provides fast experience for regular customers while handling localStorage deletion gracefully

**Previous Implementation Issue**: 
- Old approach relied on localStorage check first
- Problem: If customer's localStorage was deleted, they would see registration form
- Then get error "already registered" when entering phone number
- New approach: Phone number first eliminates this UX problem

### Important Architectural Decisions

**CRITICAL SYSTEM REQUIREMENTS:**
- The registration page (`/`) MUST NOT contain any system explanations or NFC instructions
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

### Admin Authentication
- Admin access uses localStorage-based tokens with expiration (24 hours)
- Default password: "123" (configured in admin page component)
- Token key: `tagstamp_admin_token`, expiry key: `tagstamp_admin_expiry`

The system prioritizes simplicity: visit = stamp, with business logic for rewards/VIP handled automatically in the background.

## Page Structure and Terminology

**IMPORTANT**: This system has NO "main page" concept. Use precise terminology:

### Customer Flow Pages (`/` route)
- **Registration Page**: New customer form (when no localStorage ID)
- **Registration Complete Page**: First stamp confirmation with welcome message
- **Stamp Added Page**: Returning customer stamp confirmation
- **Stamp Details Page**: Customer can view detailed stamp information

### Customer Flow Pages (`/stamp` route)
- **Registration Page**: Alternative NFC entry point (identical to `/`)
- **Registration Complete Page**: First stamp confirmation
- **Stamp Added Page**: Returning customer stamp confirmation

### Admin Flow Pages (`/admin` route)
- **Admin Login Page**: Password authentication
- **Admin Dashboard**: Menu for stamp management and customer management
- **Add Stamps Page**: Search customer by phone for manual stamp addition
- **Customer Found Page**: Shows customer info before adding stamp
- **Stamp Added Successfully Page**: Confirmation after manual stamp addition
- **Customer Management Page**: Search customer for editing
- **Edit Customer Page**: Customer information editing with stamp history

### UI Design Standards

**Mobile-First Layout Optimization:**
- Logo size: `xl` (230px) for optimal mobile viewing
- Container padding: `px-6 py-6` standard
- Layout: `py-4` for consistent page margins
- Floating input fields with reduced padding: `px-3 py-2.5`
- Form spacing: `space-y-4` for compact mobile layout
- Title hierarchy: `text-lg` for main titles, `text-base`/`text-sm` for subtitles

**Color Theming:**
- Customer pages: Orange-yellow gradient (`from-orange-50 to-yellow-50`)
- Admin pages: Blue-indigo gradient (`from-blue-50 to-indigo-50`)
- Buttons: Orange gradient for customer, blue gradient for admin
- Accent colors: `text-orange-600` for customer titles, `text-blue-600` for admin

**Browser Exit Flow:**
- Custom completion pages with brand promotion
- Device-specific browser closing instructions
- Rewards system information display
- Graceful fallback for cases where `window.close()` fails

**Key Components:**
- `FloatingInput`: Space-efficient input fields with animated labels
- `Logo`: Unified branding across all pages with configurable sizes (sm/md/lg)
- `browserUtils`: Handles browser closing with promotional messaging

## Deployment Notes

**Vercel Configuration:**
- Requires environment variables to be configured in Vercel dashboard
- Build command uses `npm run build` (includes env validation)
- Use `npm run build:skip-env` locally if environment variables are missing

**Local Development:**
- Uses Turbopack for faster development builds
- Environment validation runs automatically on build
- All pages use `'use client'` directive for React hooks