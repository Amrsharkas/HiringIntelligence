# Subscription System Documentation

## Overview

The platform now uses a subscription-based model where organizations must subscribe to a plan to access the system. Credits are allocated monthly based on the subscription plan, and additional credit packs can be purchased as needed.

## Key Changes

### ✅ What Changed:
- **No Free Credits**: New organizations start with 0 credits (previously 100)
- **Subscription Required**: Organizations must subscribe to a plan to use the platform
- **Monthly Credits**: Credits are allocated automatically on subscription renewal
- **Credit Expiration**: All credits expire after 45 days from allocation
- **Job Posting Limits**: Plans have job posting limits (except Pro and Enterprise)
- **Additional Credit Packs**: Available for purchase alongside subscriptions

### 🆕 New Features:
- **4 Subscription Tiers**: Starter, Growth, Pro, Enterprise
- **Monthly/Yearly Billing**: 18% discount on yearly plans
- **Automatic Credit Allocation**: Credits added on subscription renewal
- **Job Posts Tracking**: Usage tracked against plan limits
- **Subscription Management**: Users can upgrade, cancel, and manage subscriptions
- **Stripe Integration**: Full webhook support for subscription lifecycle

## Subscription Plans

| Plan | Monthly Price | Yearly Price | Credits/Month | Job Posts | Support |
|------|---------------|--------------|---------------|-----------|---------|
| **Starter** | 14,500 EGP | 11,890 EGP | 200 | 5 | Standard |
| **Growth** | 39,000 EGP | 31,980 EGP | 700 | 20 | Priority |
| **Pro** | 95,000 EGP | 77,900 EGP | 1,900 | Unlimited | Priority |
| **Enterprise** | 155,000 EGP | 127,100 EGP | 3,500 | Unlimited | Dedicated |

*Note: Yearly plans include an 18% discount*

## Additional Credit Packs

| Pack | Price | Credits | Price per Credit |
|------|-------|---------|------------------|
| **100 Credits** | 9,000 EGP | 100 | 90 EGP |
| **300 Credits** | 24,000 EGP | 300 | 80 EGP |
| **1,000 Credits** | 70,000 EGP | 1,000 | 70 EGP |

## Credit Usage

### Per Candidate Breakdown:
- **AI CV Analysis** (Scan + AI Report + Match Score): 1 credit
- **AI Interview Package** (Persona + Technical + AI Report): 4 credits
- **Total per engaged candidate**: 5 credits

### Credit Rules:
- ✅ Credits allocated on subscription creation and renewal
- ✅ Additional credits can be purchased anytime
- ✅ Credits expire 45 days after allocation
- ✅ Oldest credits are used first (FIFO)
- ✅ Subscription credits don't roll over to next month

## Setup Instructions

### 1. Initial Setup (One-Time)

Run the setup script to initialize the subscription system:

```bash
# Option A: Via API endpoint (recommended)
curl -X POST http://localhost:3005/api/subscriptions/setup \
  -H "Content-Type: application/json" \
  --cookie "your-session-cookie"

# Option B: Via Node script
cd /var/www/plato/HiringIntelligence
npx tsx server/setupSubscriptionSystem.ts
```

This will:
- ✅ Create 4 subscription plans in the database
- ✅ Deactivate old credit packages
- ✅ Create new credit packs (100, 300, 1000)
- ✅ Create Stripe subscription products (if credentials configured)

### 2. Configure Stripe Webhooks

```bash
# Start Stripe CLI to forward webhooks
stripe listen --forward-to localhost:3005/api/payments/webhook

# Copy the webhook signing secret
# Add to .env file:
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Create Stripe Products (Optional)

If you skipped this during setup or want to recreate:

```bash
curl -X POST http://localhost:3005/api/subscriptions/stripe/create-products \
  -H "Content-Type: application/json" \
  --cookie "your-session-cookie"
```

## API Endpoints

### Subscription Management

```typescript
// Get available subscription plans
GET /api/subscriptions/plans
Response: SubscriptionPlan[]

// Subscribe to a plan
POST /api/subscriptions/subscribe
Body: { planId: string, billingCycle: 'monthly' | 'yearly', trialDays?: number }
Response: { checkoutUrl: string, sessionId: string }

// Get current subscription
GET /api/subscriptions/current
Response: SubscriptionWithPlan | null

// Cancel subscription
POST /api/subscriptions/cancel
Body: { immediate?: boolean }
Response: { success: true, message: string }

// Get expiring credits
GET /api/subscriptions/credits/expiring
Response: CreditExpiration[]
```

### Setup Endpoints (Admin)

```typescript
// Initialize subscription plans
POST /api/subscriptions/plans/initialize
Response: { success: true, plans: SubscriptionPlan[] }

// Complete system setup
POST /api/subscriptions/setup
Response: { success: true, message: string }

// Create Stripe products
POST /api/subscriptions/stripe/create-products
Response: { success: true, message: string }
```

### Credit Packages

```typescript
// Get credit packages (for additional purchases)
GET /api/credit-packages
Response: CreditPackage[]

// Purchase credits (creates Stripe checkout)
POST /api/payments/create-checkout
Body: { creditPackageId: string }
Response: { sessionId: string, url: string }
```

## Database Schema

### New Tables:

#### `subscription_plans`
- Stores the 4 subscription tiers
- Monthly and yearly pricing
- Credits allocated per month
- Job posts limits
- Support level

#### `organization_subscriptions`
- Links organizations to subscription plans
- Tracks Stripe subscription ID
- Status (active, canceled, past_due, trialing)
- Billing cycle and period dates

#### `subscription_invoices`
- Records all subscription billing
- Tracks credits allocated per invoice
- Links to Stripe invoice ID

#### `credit_expirations`
- Tracks all credit allocations
- 45-day expiration from allocation
- Source tracking (subscription vs purchase)
- FIFO credit usage

### Updated Tables:

#### `organizations`
- `currentCredits`: Now defaults to 0 (was 100)
- `creditLimit`: Now defaults to 0 (was 100)
- `subscriptionStatus`: active, inactive, trial, past_due, canceled
- `currentSubscriptionId`: Link to active subscription
- `jobPostsUsed`: Counter for job posting limits

## Middleware

### `requireActiveSubscription`
Enforces that organizations have an active subscription before accessing features.

```typescript
import { requireActiveSubscription } from './subscriptionMiddleware';

app.post('/api/job-postings', 
  requireActiveSubscription,  // Check subscription
  checkJobPostsLimit,          // Check job posts limit
  async (req, res) => { ... }
);
```

**Status Codes:**
- `402`: Subscription required or inactive
- Grace period: 7 days for `past_due` status

### `checkJobPostsLimit`
Validates organization hasn't exceeded job posting limit for their plan.

### `requireCredits`
Existing middleware - now works alongside subscription check.

## Frontend Components

### `SubscriptionPlanSelector`
Displays all 4 subscription plans with monthly/yearly toggle.

```tsx
import { SubscriptionPlanSelector } from '@/components/SubscriptionPlanSelector';

<SubscriptionPlanSelector onSuccess={() => console.log('Subscribed!')} />
```

### `SubscriptionStatusCard`
Shows current subscription details, renewal date, job posts usage.

```tsx
import { SubscriptionStatusCard } from '@/components/SubscriptionStatusCard';

<SubscriptionStatusCard 
  onManageClick={() => setShowManagement(true)}
  onUpgradeClick={() => setShowPlans(true)}
/>
```

### `CreditPackageSelector` (Updated)
Now displays the 3 additional credit packs with EGP pricing.

## Stripe Webhooks

The system handles these Stripe events:

```typescript
// Subscription lifecycle
customer.subscription.created    → Create subscription record, allocate credits
customer.subscription.updated    → Update subscription status and dates
customer.subscription.deleted    → Mark as canceled

// Billing
invoice.paid                     → Allocate monthly credits, create invoice record
invoice.payment_failed           → Mark subscription as past_due

// One-time purchases (credit packs)
checkout.session.completed       → Add purchased credits (if mode === 'payment')
```

## Testing Checklist

- [ ] New organization registers → 0 credits
- [ ] Subscribe to Starter plan → Redirects to Stripe
- [ ] Complete payment → Credits allocated (200)
- [ ] Credits appear in dashboard
- [ ] Create job posts → Counter increments
- [ ] Reach job post limit → Blocked with upgrade message
- [ ] Purchase additional credits → Added to balance
- [ ] Credits expire after 45 days
- [ ] Cancel subscription → Marked for cancellation
- [ ] Subscription renews → New credits allocated

## Migration for Existing Organizations

If you have existing organizations with the old credit system:

### Option A: Grandfather Existing Orgs
```sql
-- Keep existing credits for current organizations
-- They can continue using credits until they run out
-- Then they must subscribe
```

### Option B: Auto-Migrate to Free Plan
```sql
-- Create a "Legacy" or "Free" plan
-- Auto-assign existing organizations
```

### Option C: Manual Migration
- Contact each organization
- Offer special onboarding pricing
- Manually assign them to appropriate plans

## Troubleshooting

### Credits Not Allocated
- Check webhook is configured: `STRIPE_WEBHOOK_SECRET`
- Verify `invoice.paid` event is being received
- Check logs: `console.log` in `handleInvoicePaid`
- Manually trigger: Call `subscriptionService.allocateMonthlyCredits(subscriptionId)`

### Subscription Not Created
- Verify Stripe customer was created
- Check `customer.subscription.created` webhook
- Ensure metadata includes `organizationId` and `planId`

### Job Posts Limit Not Working
- Verify `requireActiveSubscription` middleware is added
- Check `jobPostsUsed` counter is incrementing
- Ensure plan has `jobPostsLimit` set correctly

### Credits Expiring Too Soon
- Check `expiresAt` date in `credit_expirations` table
- Default is 45 days from `createdAt`
- Run expiration job: `subscriptionService.expireOldCredits()`

## Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3005/subscription/success
STRIPE_CANCEL_URL=http://localhost:3005/subscription/canceled

# App Configuration
APP_URL=http://localhost:3005
```

## Support

For issues or questions:
1. Check logs: `server/` console output
2. Verify Stripe dashboard for payment status
3. Check database: Query `organization_subscriptions` table
4. Review webhook events in Stripe dashboard

## Future Enhancements

- [ ] Annual plan discounts (currently 18%)
- [ ] Proration for plan upgrades/downgrades
- [ ] Team member limits per plan
- [ ] Usage analytics per plan
- [ ] Custom enterprise plans
- [ ] Promotional codes and discounts
- [ ] Referral program
- [ ] Grace period customization
