# CELLVENTORY by teqperts

<p align="center">
  <img src="assets/teqperts-logo.png" alt="Teqperts Logo" width="120" />
</p>

<p align="center">
  <strong>Smart Mobile Inventory & Repair Part Management System</strong>
</p>

<p align="center">
  <a href="docs/APP_FUNCTIONING.md"><strong>Read the App Flow & Developer Guide »</strong></a>
  <br />
  <a href="docs/ARCHITECTURE.md">Architecture diagrams and data model</a>
</p>

---

## 📱 Overview

**Cellventory** is an offline-first inventory and repair-management app built with React Native and Expo SDK 58. Business records are stored locally in SQLite; Firebase provides Google identity, manual shop-access approval, one-device binding, and cloud backups.

### Key Features

- **👥 Customer Management (CRM)**: Mobile-first customer entry (Mobile Number #1 input + Purpose dropdown) with auto-lookup for returning clients, purpose-colored badges, and 1-tap **Call** (`tel:`) and **WhatsApp** (`wa.me`) shortcuts.
- **⚡ 1-Tap Stock Adjustments**: Instant `+` and `-` quantity steppers on item cards and detail views.
- **🏪 Shop Profile Customization**: Interactive shop pill (`🏪 [Shop Name] ▾`) in the header allows store owners to brand their workspace.
- **🔍 Instant Search & Multi-Filter Chips**: Filter by stock health (*All*, *Low Stock*, *Out of Stock*) and categories (*Mobile Phone*, *Accessories*, *Spare Parts*).
- **📴 Offline-First SQLite**: Ultra-fast local relational database powered by `expo-sqlite` with zero network latency.
- **🔐 Secure Firebase Auth**: Persistent session credentials across device restarts via `AsyncStorage`.
- **🎨 Modern Design Tokens**: Clean, unified styling system with custom typography, elevation shadows, and status badges.

---

## 🏛️ System Architecture & App Flow

For the complete user journey and explanations of the services and tools used, see the developer guide. The architecture document provides diagrams and data-model detail:

- **[App Flow & Developer Guide](docs/APP_FUNCTIONING.md)**
- **[Architecture diagrams and data model](docs/ARCHITECTURE.md)**

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                     │
│  Home  |  Inventory  |  Jobs  |  Customers  |  Details  │
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
- An Android device or emulator with a Cellventory development build installed

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
# Start the server for an installed Expo development client
npx expo start --dev-client
```

Expo Go does not include the native Google sign-in module used by Cellventory. See the [developer guide](docs/APP_FUNCTIONING.md) for EAS build and update instructions.

---

## 🧪 Automated Testing

Cellventory uses Jest for unit tests covering app and service behavior:

```bash
npm test
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
