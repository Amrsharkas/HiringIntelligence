# Quick Start Guide - Subscription System

## 🚀 Get Started in 5 Minutes

### Step 1: Verify Setup ✅

The system has already been initialized! Check that everything is ready:

```bash
# Verify plans exist
curl http://localhost:3005/api/subscriptions/plans | jq

# Should show 4 plans: Starter, Growth, Pro, Enterprise
```

### Step 2: Configure Webhooks (Required)

#### Option A: Local Development

```bash
# Install Stripe CLI (Mac)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3005/api/payments/webhook

# Copy the webhook secret (whsec_...) and add to .env:
# STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Option B: Skip Webhooks (Manual Testing)

If you want to test without webhooks, you can manually create subscriptions in the database. This is NOT recommended for production.

### Step 3: Test Subscription Flow

1. **Start your app:**
```bash
npm run dev
```

2. **Login to the dashboard:**
```
http://localhost:3005
```

3. **View subscription plans:**
   - You should see a "Subscription Status Card" on the dashboard
   - Click "Choose a Plan" button

4. **Subscribe to a plan:**
   - Select any plan (e.g., "Starter")
   - Choose billing cycle (Monthly or Yearly)
   - Click "Get Started"
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

5. **Verify subscription created:**
   - Return to dashboard
   - Subscription status should show "Active"
   - Credits should be allocated (200 for Starter plan)

### Step 4: Test Credit Purchases

1. **Click on Credit Balance Card**
2. **Select "Purchase Additional Credits"**
3. **Choose a credit pack** (100, 300, or 1,000 credits)
4. **Complete checkout**
5. **Verify credits added**

---

## 🧪 Quick Tests

### Test 1: View Plans
```bash
curl http://localhost:3005/api/subscriptions/plans
```

### Test 2: Check Current Subscription
```bash
# You need to be logged in (use browser session cookie)
curl http://localhost:3005/api/subscriptions/current \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### Test 3: Simulate Webhook Events

```bash
# Terminal 1: Keep stripe listen running
stripe listen --forward-to localhost:3005/api/payments/webhook

# Terminal 2: Trigger events
stripe trigger customer.subscription.created
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

### Test 4: Check Logs

```bash
# Watch for subscription events
tail -f logs/app.log | grep -i subscription

# Watch for credit allocation
tail -f logs/app.log | grep -i "allocated.*credits"

# Watch for webhook processing
tail -f logs/app.log | grep webhook
```

---

## 🎯 Common Scenarios

### Scenario: New Organization Signs Up

1. Organization creates account
2. Sees "No Active Subscription" warning
3. Clicks "Choose a Plan"
4. Selects Starter plan (14,500 EGP/month)
5. Completes payment
6. Gets 200 credits instantly
7. Can now use the platform!

### Scenario: Organization Needs More Credits

1. Uses up monthly allocation
2. Sees low credit warning
3. Clicks "Purchase Additional Credits"
4. Buys 300 Credits Pack (24,000 EGP)
5. Gets 300 credits instantly
6. Continues hiring

### Scenario: Organization Hits Job Post Limit

1. Starter plan allows 5 job posts
2. Creates 5th job post successfully
3. Tries to create 6th job post
4. Gets error: "Job posts limit reached"
5. Sees "Upgrade to Growth" suggestion
6. Upgrades to Growth plan (20 job posts)
7. Can now create more jobs

---

## 📱 UI Components Location

### Subscription Plan Selector
```typescript
// Located in dashboard, opens in modal
// Shows all 4 plans with pricing and features
```

### Subscription Status Card
```typescript
// Top of dashboard, next to Credit Balance
// Shows current plan, renewal date, usage
```

### Credit Package Selector
```typescript
// Accessible from Credit Balance card
// Shows 3 additional credit packs
```

---

## 🔧 Environment Variables

Make sure these are set in your `.env`:

```bash
# Required for subscriptions
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Get this from stripe listen

# Optional but recommended
STRIPE_SUCCESS_URL=http://localhost:3005/subscription/success
STRIPE_CANCEL_URL=http://localhost:3005/subscription/canceled
APP_URL=http://localhost:3005
```

---

## ⚡ Quick Troubleshooting

### Problem: "No subscription found"
**Solution:** Organization needs to subscribe to a plan first

### Problem: "Insufficient credits"
**Solution:** Purchase a credit pack or wait for monthly renewal

### Problem: "Job posts limit reached"
**Solution:** Upgrade to a higher plan (Growth, Pro, or Enterprise)

### Problem: Webhook not working
**Solution:** 
1. Check `stripe listen` is running
2. Verify `STRIPE_WEBHOOK_SECRET` in .env
3. Restart your app after adding the secret

### Problem: Credits not allocated after payment
**Solution:**
1. Check webhook logs: `tail -f logs/app.log | grep webhook`
2. Manually trigger: `stripe trigger invoice.paid`
3. Check database: `SELECT * FROM subscription_invoices;`

---

## 📚 Additional Resources

- **Full Documentation:** [SUBSCRIPTION_SYSTEM.md](./SUBSCRIPTION_SYSTEM.md)
- **Implementation Details:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Stripe Docs:** https://stripe.com/docs/billing/subscriptions/overview
- **Test Cards:** https://stripe.com/docs/testing

---

## 🎉 You're Ready!

Your subscription system is fully set up and ready to use. Organizations can now:

✅ Subscribe to plans (14,500 - 155,000 EGP/month)  
✅ Get monthly credits automatically  
✅ Purchase additional credits anytime  
✅ Track usage and limits  
✅ Upgrade/downgrade plans  

**Happy hiring! 🚀**
