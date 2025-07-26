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

### Fraud Prevention Requirements for Production

**Currently Implemented (Test Mode):**
- Session-based duplicate prevention (5-minute intervals using sessionStorage)
- Prevents multiple stamps within the same browser session

**Production Requirements (To Be Implemented):**

1. **Time-based Restrictions:**
   - Prevent same customer from earning stamps within configurable intervals (30min/1hr/4hr/24hr)
   - Track `last_stamp_at` timestamp in database
   - Daily maximum stamp limits per customer

2. **Location-based Security:**
   - NFC tags should only work within store premises
   - IP address / geolocation validation
   - Store-specific NFC card validation

3. **Admin Configuration:**
   - Configurable stamp earning intervals
   - Daily/weekly stamp limits
   - Suspicious activity detection thresholds

4. **Abuse Detection:**
   - Alert system for excessive attempts in short timeframes
   - Temporary account suspension for suspected fraud
   - Admin notification system

**Database Schema Extensions for Production:**
```sql
ALTER TABLE customers ADD COLUMN last_stamp_at TIMESTAMP;
ALTER TABLE customers ADD COLUMN daily_stamp_count INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN last_stamp_date DATE;
ALTER TABLE customers ADD COLUMN suspicious_activity_count INTEGER DEFAULT 0;
```

**Note:** Current implementation prioritizes ease of testing. Production deployment requires enabling fraud prevention features.

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

## Localization Policy

**Language Requirements:**
- **UI Text & Customer-facing Content**: Must use English only (deployed in Canada)
- **Code Comments**: English only
- **Variable Names**: English only
- **API Messages**: English only
- **Error Messages**: English only
- **Development Communication**: Korean allowed in conversations with Claude
- **Documentation**: English only

**Implementation Notes:**
- All customer-facing text should be in English
- System messages, buttons, labels must be English
- Database content should use English
- Error handling and validation messages in English

## Random Coupon Lottery Event System

**Event Trigger Condition:**
- Triggers when ANY customer reaches exactly 5 stamps
- Applies to all customers (new or existing, regardless of visit number)
- Only triggers once per customer (duplicate participation prevented via events table)

**5 Stamps Detection Logic:**
```javascript
// In /api/stamp/route.ts - checkAndIssueCoupons function
async function checkAndIssueCoupons(customer: { id: string; stamps: number }) {
  const stamps = customer.stamps
  let eventTriggered = null
  
  // 5개 스탬프 복권 이벤트 - EXACTLY 5 stamps only
  if (stamps === 5) {
    // Check if customer already participated in lottery
    const { data: existingEvent } = await supabase
      .from('events')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('event_type', 'lottery')
      .single()
    
    if (!existingEvent) {
      // Add lottery event participation record
      await supabase
        .from('events')
        .insert([{
          customer_id: customer.id,
          event_type: 'lottery',
          event_data: { eligible: true }
        }])
      
      eventTriggered = { type: 'lottery', stamps: 5 }
    }
  }
  
  return eventTriggered
}
```

**IMPORTANT - Universal Application:**
- This logic applies to ALL stamp addition scenarios:
  - New customer getting 1st stamp → no event
  - Existing customer getting 2nd, 3rd, 4th stamp → no event  
  - Existing customer getting 5th stamp → EVENT TRIGGERED
  - Existing customer getting 6th, 7th, 8th+ stamp → no event (already participated)
- Whether customer is brand new, returning, or long-time visitor is IRRELEVANT
- Whether it's their 1st visit or 100th visit is IRRELEVANT  
- ONLY the exact stamp count of 5 matters
- Phone number input triggering event = customer already had 4 stamps, now getting 5th

**Event Flow:**
1. **5 Stamps Achieved**: Customer gets 5th stamp → automatic redirect to `/coupon` page
2. **Congratulations Page**: "You've won a random coupon lottery!" with PLAY button
3. **Scratch Card Game**: Real scratch-to-reveal interface using Canvas API
4. **Result Display**: Prize revealed after 30% of card is scratched
5. **Coupon Usage**: Winner can use immediately (USE NOW) or save for later (Use Later)

**Probability System (0-99 Index Table):**
- **5% Empty** (indices 0-4): "OOPS!" with funny circus theme
- **50% 5% OFF** (indices 5-54): Green 5% discount coupon
- **30% 10% OFF** (indices 55-84): Blue 10% discount coupon  
- **10% 15% OFF** (indices 85-94): Purple 15% discount coupon
- **5% 20% OFF** (indices 95-99): Red 20% discount coupon

**Technical Implementation:**
```javascript
// Simple probability logic
const LOTTERY_TABLE = [
  ...Array(5).fill('empty'),      // 5%
  ...Array(50).fill('discount_5'), // 50%
  ...Array(30).fill('discount_10'), // 30%
  ...Array(10).fill('discount_15'), // 10%
  ...Array(5).fill('discount_20')   // 5%
]
const randomIndex = Math.floor(Math.random() * 100)
const result = LOTTERY_TABLE[randomIndex]
```

**Scratch Card Features:**
- Canvas-based real scratch interaction
- Silver foil texture with gradient effects
- Mouse/touch drag support
- Auto-reveal at 30% scratched
- Progress indicator bar
- Soft brush with gradient edges for natural scratch effect

**Coupon Management:**
- **Issue**: Winning coupons automatically saved to database with 30-day expiry
- **Use Now**: Blue button → immediately marks as used + red "USED" state  
- **Done Button**: CRITICAL - Always closes browser. For winners who didn't use "USE NOW", automatically saves coupon to database for later use
- **Admin Notification**: Console log notification when coupon is used (expandable to real-time notifications)

**CRITICAL Done Button Policy:**
- **Done button ALWAYS closes browser window** - no exceptions
- **For winning results (not already used)**: Automatically saves coupon to database with "unused" status before closing
- **For winning results (already used)**: Just closes browser (coupon already marked as used)
- **For empty results**: Just closes browser (nothing to save)
- **Session tracking**: Marks lottery as completed in sessionStorage to prevent infinite loops

**Use Later Workflow (Key Business Logic):**
1. **Customer wins coupon** but doesn't have enough laundry today
2. **Clicks "Use Later"** → coupon saved to database with 30-day expiry
3. **Customer returns later** (next visit with more laundry)
4. **NFC scan triggers stamp addition** → system automatically checks for unused coupons
5. **If unused coupons found** → displays green coupon notification with "USE NOW" buttons
6. **Customer can use coupon** when they have enough laundry for discount

**NFC Scan Coupon Detection:**
- Every NFC scan (after stamp processing) automatically checks `/api/coupons/check`
- Displays unused, non-expired coupons with USE NOW buttons
- Supports multiple unused coupons per customer
- Real-time coupon usage with admin notification
- Coupons removed from display after use

**Database Integration:**
- `/api/coupons/issue` - Issues winning coupons to database
- `/api/coupons/use` - Marks coupons as used and notifies admin
- `/api/coupons/check` - Checks for unused coupons during NFC scans
- `events` table tracks lottery participation to prevent duplicates
- `coupons` table stores issued coupons with usage status and expiry dates

**UI Design:**
- Scratch card uses actual Canvas API for realistic scratch effect
- Empty result shows circus/clown theme with bounce animations
- Winning results show gradient backgrounds with celebration emojis
- All text in English for Canadian deployment
- Mobile-optimized touch interactions