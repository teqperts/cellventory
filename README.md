# CELLVENTORY by teqperts

<p align="center">
  <img src="assets/teqperts-logo.png" alt="Teqperts Logo" width="120" />
</p>

<p align="center">
  <strong>Smart Mobile Inventory & Repair Part Management System</strong>
</p>

<p align="center">
  <a href="docs/ARCHITECTURE.md"><strong>Read Architecture & App Flow Documentation »</strong></a>
</p>

---

## 📱 Overview

**Cellventory** is an offline-first mobile inventory management solution built with React Native and Expo SDK 58. Designed specifically for retail shops, repair technicians, and small businesses, Cellventory enables real-time stock tracking, 1-tap quantity steppers, customizable shop profiles, and comprehensive item detail inspection.

### Key Features

- **⚡ 1-Tap Stock Adjustments**: Instant `+` and `-` quantity steppers on item cards and detail views.
- **🏪 Shop Profile Customization**: Interactive shop pill (`🏪 [Shop Name] ▾`) in the header allows store owners to brand their workspace.
- **🔍 Instant Search & Multi-Filter Chips**: Filter by stock health (*All*, *Low Stock*, *Out of Stock*) and categories (*Mobile Phone*, *Accessories*, *Spare Parts*).
- **📴 Offline-First SQLite**: Ultra-fast local relational database powered by `expo-sqlite` with zero network latency.
- **🔐 Secure Firebase Auth**: Persistent session credentials across device restarts via `AsyncStorage`.
- **🎨 Modern Design Tokens**: Clean, unified styling system with custom typography, elevation shadows, and status badges.

---

## 🏛️ System Architecture & App Flow

For a complete breakdown of app flow diagrams, navigation hierarchy, SQLite schema, and tools/SDKs used, see:

👉 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                     │
│  Home  |  Inventory  |  Add Item  |  Details  |  BrandedUI  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                       Navigation Layer                      │
│     Native Stack (App.js)  +  Bottom Tabs (TabNavigator)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Persistence & Services                   │
│   Expo SQLite (cellventory.db)  │  AsyncStorage  │  Firebase │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (`npm@11.6.0` recommended)
- [Expo Go](https://expo.dev/go) or an Android device for APK testing

### Installation

```bash
# Clone the repository
git clone https://github.com/teqperts/cellventory.git
cd cellventory

# Install dependencies
npm install
```

### Running Locally

```bash
# Start Expo development server
npx expo start
```

---

## 🧪 Automated Testing

Cellventory has 100% passing unit tests covering database operations, auth validation, forms, and shop context state:

```bash
npm test
```

```text
PASS __tests__/shopContext.test.js
PASS __tests__/database.test.js
PASS __tests__/auth.test.js
PASS __tests__/forms.test.js

Test Suites: 4 passed, 4 total
Tests:       31 passed, 31 total
```

---

## 📦 Standalone Android APK

Native Android release APKs are compiled using Expo Application Services (EAS) under the `@teqperts` organization:

- **EAS Project**: `@teqperts/cellventory`
- **Latest Standalone Build**: `c374f1b4-65b2-497c-b34c-51b5de934ea0`
- **Direct APK Download**: [Download Cellventory v1.0.0 APK](https://expo.dev/artifacts/eas/jCI9w4I8fr0D4EuydwTBcOipEh9OJgm-xcIcgrdVaag.apk)

To build a fresh APK via EAS:

```bash
npx eas build -p android --profile preview
```

---

## 📄 License & Credits

Built and maintained by **teqperts**.  
Copyright © 2026 Teqperts. All rights reserved.
