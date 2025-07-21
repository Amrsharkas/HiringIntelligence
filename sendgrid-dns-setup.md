# SendGrid DNS Authentication Setup

## Overview
To ensure reliable email delivery for team invitations, you need to authenticate your domain with SendGrid by adding DNS records.

## Steps to Set Up DNS Authentication

### 1. Access SendGrid Domain Authentication
1. Log into your SendGrid account at [sendgrid.com](https://sendgrid.com)
2. Navigate to **Settings** > **Sender Authentication**
3. Click **Authenticate Your Domain**

### 2. Choose Your Domain
- If you have a custom domain (e.g., `yourcompany.com`), use that
- If you're using Replit's domain, you can use `replit.app` or register a custom domain

### 3. DNS Records to Add
SendGrid will provide you with specific DNS records. They typically include:

#### CNAME Records (examples):
```
s1._domainkey.yourdomain.com -> s1.domainkey.u[number].wl[number].sendgrid.net
s2._domainkey.yourdomain.com -> s2.domainkey.u[number].wl[number].sendgrid.net
```

#### TXT Record (example):
```
yourdomain.com -> v=spf1 include:sendgrid.net ~all
```

### 4. For Replit Applications
If you're using the default Replit domain:
1. You may need to use SendGrid's "Link Branding" instead
2. Or register a custom domain through Replit's domain service
3. Alternative: Use a verified sender email address

### 5. Temporary Solution
While setting up DNS, you can:
1. Use a verified sender email in SendGrid
2. Add your email to SendGrid's verified sender list
3. Update the email service to use your verified email

## Quick Fix for Now

Let me update the email service to use a verified sender approach: