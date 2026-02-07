# Agent Guidelines for BS Monters

This is a Next.js 15 (App Router) e-commerce landing page for luxury watches in Algeria.

## Build/Lint Commands

```bash
# Development with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm run start

# ESLint (Next.js presets)
npm run lint
```

**Testing:** No testing framework is currently configured.

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled** (`strict: true` in tsconfig.json)
- Target: ES2017, Module: ESNext
- Use `@/*` path alias for imports from `./src/*`

### Imports

```typescript
// 1. React hooks
import { useState, useEffect, useMemo } from "react";

// 2. Next.js built-ins
import Image from "next/image";
import { NextRequest, NextResponse } from 'next/server';

// 3. Third-party libraries
import { motion } from "framer-motion";

// 4. Local components (use @/* path alias)
import Header from "@/components/layout/Header";

// 5. JSON data
import wilayas from "./data/algerian-wilayas.json";
```

### Component Structure
- Use `"use client"` directive for client components
- Export components as default
- Define props interface with `Props` suffix:

```typescript
interface CountdownTimerProps {
  endDate?: Date;
  className?: string;
}

export default function CountdownTimer({ endDate, className = "" }: CountdownTimerProps) {
  // Component logic
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CountdownTimer.tsx` |
| Props interfaces | PascalCase + Props | `CountdownTimerProps` |
| Hooks | camelCase with `use` prefix | `useWilayaOptions` |
| Helper functions | camelCase | `formatDZD`, `trackFb` |
| Type definitions | PascalCase | `OrderData`, `DeliveryOption` |
| API routes | lowercase | `route.ts` |

### Styling
- Use Tailwind CSS utility classes
- Use Arabic text direction (`dir="rtl"` in layout)
- Custom class composition pattern:
  ```typescript
  const glass = "bg-white/60 backdrop-blur-xl border border-white/40";
  ```

### Error Handling

**Client Components:**
```typescript
try {
  const result = await response.json();
} catch (error) {
  setSubmitError("فشل في الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
}
```

**API Routes:**
```typescript
try {
  // Process request
} catch (error) {
  console.error('Error:', error);
  // Return success anyway to prevent duplicate submissions
  return NextResponse.json(
    { success: true, message: '✅ تم استلام طلبك بنجاح' },
    { status: 200 }
  );
}
```

### API Response Pattern
Always return structured responses:
```typescript
interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  clientRequestId?: string;
}
```

### Project Structure
```
src/
├── app/
│   ├── api/           # API routes
│   ├── data/          # JSON data files
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Main page
├── components/
│   ├── layout/        # Header, Footer
│   └── ui/            # UI components
```

## Environment Variables Setup

**Required for order processing:**

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Configure Google Sheets:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project → Enable Google Sheets API
   - Create Service Account → Download JSON key
   - Share your spreadsheet with the service account email
   - Paste JSON content into `GOOGLE_SERVICE_ACCOUNT_JSON`
   - Copy spreadsheet ID from URL into `GOOGLE_SHEET_ID`

3. Configure Email (Gmail):
   - Enable 2FA on Gmail account
   - Generate [App Password](https://myaccount.google.com/apppasswords)
   - Use App Password (NOT regular password) in `EMAIL_PASS`

**Environment Variables:**
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Service account JSON (single line)
- `GOOGLE_SHEET_ID` - Spreadsheet ID from URL
- `EMAIL_USER` - Gmail address
- `EMAIL_PASS` - Gmail App Password
- `NOTIFICATION_EMAIL` - Where to send order notifications

**Important:** Never commit `.env.local` to git. It's already in `.gitignore`.

## Key Dependencies

- Next.js 15.4.6 (App Router)
- React 19.1.0
- TypeScript 5.x
- Tailwind CSS 3.4.17
- Framer Motion (animations)
- Google APIs (Sheets integration)
- Nodemailer (email notifications)
