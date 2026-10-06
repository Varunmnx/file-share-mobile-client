# FileDrop Mobile (React Native CLI)

A production-ready, dark-themed React Native mobile app for **FileDrop** — serverless temporary file & folder sharing backed by **Cloudflare Workers (Rust)**, **D1 (SQLite)**, and **R2 (Object Storage)**.

Built with **React Native CLI (Bare React Native, NOT Expo client)** and TypeScript.

---

## Features

- **⚡ End-to-End API Integration**:
  - **Auth**: Register, Login, Token Refresh (silent retry via Axios interceptor), Logout, User profile (`/me`).
  - **File Sharing**: Single file selection (documents, videos, images, audio, archives) with direct R2 presigned PUT upload and live byte progress.
  - **Folder Sharing (ZIP)**: Multi-file and directory selection with automatic in-memory `.zip` archive compression via `JSZip` before upload.
  - **Password Protection**: Optional PBKDF2 password-gated access with HMAC-signed grant tokens.
  - **One-Time Burning**: Atomic one-time access claim via `POST /s/:token/access`. Links immediately expire after recipient downloads.
  - **Recipient Download**: Unauthenticated receiver screen allowing anyone with a token or URL to claim and download files directly to device storage (`Downloads` directory).
  - **Usage & Quotas**: Live meter tracking active transfer counts and storage bytes against plan quotas.
  - **Plans & Upgrades**: Comparison of Free vs Pro tiers and Stripe/Razorpay checkout integration.
  - **Configurable Backend**: Switch between Android Emulator (`10.0.2.2:8787`), Localhost (`localhost:8787`), LAN IP, or Cloudflare Production URL with a built-in connection tester.
  - **Deep Linking**: Opens share URLs directly via `filedrop://s/:token`.

---

## Architecture & API Flow

```
Upload Flow:
  1. User picks file or folder (folders are packaged into a .zip archive)
  2. POST /transfers              → Creates transfer record (quota checked, CREATING)
  3. POST /transfers/:id/upload-url → Generates SigV4 presigned PUT URL (UPLOADING)
  4. PUT <presigned-url>         → App streams binary payload directly to Cloudflare R2
  5. POST /transfers/:id/complete → Validates actual R2 size (READY)

Recipient Flow:
  1. GET  /s/:token              → Transfer metadata (filename, size, expiry, password requirement)
  2. POST /s/:token/password     → (If password-protected) Verifies password → signed HMAC grant
  3. POST /s/:token/access       → Atomic claim check → Presigned R2 GET URL (READY → CONSUMED)
  4. GET <presigned-get-url>     → Downloads file directly to mobile device storage
```

---

## Project Structure

```
mobile/
├── android/                   # Native Android project (configured with storage permissions & deep links)
├── ios/                       # Native iOS project
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios client with dynamic base URL and silent refresh interceptor
│   │   ├── auth.ts            # Register, login, logout, getMe
│   │   ├── transfers.ts       # Create, presigned PUT upload, complete, list, delete
│   │   ├── recipient.ts       # Public info, password verify, atomic one-time claim
│   │   ├── usage.ts           # Storage quota meters
│   │   └── billing.ts         # Plans and checkout sessions
│   ├── components/
│   │   ├── Button.tsx         # Multi-variant button with loading state
│   │   ├── Card.tsx           # Glassmorphism dark themed card
│   │   ├── Header.tsx         # Header with logo, user plan, email, settings
│   │   ├── Input.tsx          # Text input with password toggle & validation
│   │   ├── ProgressBar.tsx    # Animated progress bar with percentage & byte stats
│   │   ├── ShareModal.tsx     # One-tap copy & native Share sheet
│   │   └── StatusBadge.tsx    # Status chip (READY, CONSUMED, EXPIRED, etc.)
│   ├── context/
│   │   └── AuthContext.tsx    # Authentication state & persistent session provider
│   ├── screens/
│   │   ├── AuthScreen.tsx     # Sign-in / register screen with demo auto-fill
│   │   ├── DashboardScreen.tsx# Active transfers, storage meters, quick actions
│   │   ├── UploadScreen.tsx   # Dual-mode file & folder upload with live progress
│   │   ├── ReceiveScreen.tsx  # Token lookup, password unlock, one-time file download
│   │   ├── TransferDetailScreen.tsx # Transfer inspection, share link, delete
│   │   ├── PlansScreen.tsx    # Free vs Pro breakdown & upgrade checkout
│   │   └── SettingsScreen.tsx # Server URL configuration & connection test
│   ├── services/
│   │   ├── fileDownloader.ts  # Downloads claimed files to device storage
│   │   ├── folderPackager.ts  # Compresses folders/multi-files into ZIP archives
│   │   └── storage.ts         # AsyncStorage wrapper for tokens and settings
│   ├── theme/
│   │   └── colors.ts          # Obsidian dark theme color palette
│   ├── types/
│   │   └── index.ts           # Domain models & TypeScript interfaces
│   └── AppNavigator.tsx       # Bottom tab bar and stack navigation
├── App.tsx                    # Root application entry
└── package.json
```

---

## Quick Start

### 1. Start the Backend Server

Ensure your Cloudflare Workers backend is running in the parent directory:

```bash
# In f:\projects\file_shareer
wrangler dev --local --port 8787
```

### 2. Run the Mobile App

Navigate into the `mobile` directory:

```bash
cd mobile

# Start Metro bundler
npm start
```

In another terminal:

#### For Android (Emulator or Connected Device):

```bash
cd mobile
npm run android
```

> **Android Emulator Note**: By default, Android emulators access `localhost` on the host PC via `http://10.0.2.2:8787`. The app is pre-configured to automatically use `http://10.0.2.2:8787` on Android! You can also adjust this in the **Settings** tab at any time.

#### For iOS (macOS only):

```bash
cd mobile/ios && pod install && cd ..
npm run ios
```

---

## Verifying TypeScript Compilation

Run the TypeScript type-checker:

```bash
npm run test # or npx tsc --noEmit
```
