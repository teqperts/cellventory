# Cellventory: App Flow and Developer Guide

This guide explains how the app behaves from launch through its main shop workflows, where its data is stored, and why the main tools and services are used. It is intended as a developer handoff; the [architecture reference](./ARCHITECTURE.md) contains additional diagrams and schema detail.

## 1. At a glance

Cellventory is an Android-first, offline-first inventory and repair-management app built with React Native and Expo. Shop records are stored in SQLite on the device. Firebase is used for Google-authenticated identity, access approval, device binding, and cloud backups; it is not a real-time database for everyday shop records.

```text
Google sign-in
      |
Firebase Authentication
      |
Firestore access request -- administrator approves
      |
Firestore device binding -- one installation per account
      |
Home / Inventory / Jobs / Customers
      |
SQLite on this device ---- Firebase Storage backup
```

Google sign-in and the complete access-request flow are currently supported on Android. The app displays an Android-only notice on other platforms.

## 2. Launch, sign-in, and access

### Launch and navigation

1. [`App.js`](../App.js) initializes the SQLite database and subscribes to Firebase Authentication state.
2. A signed-out user sees the welcome screen and Google sign-in. A signed-in user is checked against the registration request and the device binding before the main app is shown.
3. Approved users enter the bottom tabs: **Home**, **Inventory**, **Jobs**, and **Customers**. The root stack also hosts item/customer details, add/edit forms, and the Enquiries screen.
4. When the app returns to the foreground, the access gate is checked again. Active sessions are periodically verified while the app remains open.

### Google identity and access approval

1. On Android, the native Google Credential Manager integration in `react-native-nitro-google-signin` lets the user choose a Google account and returns an ID token.
2. The app exchanges that token with Firebase Authentication. Firebase Auth establishes the app's signed-in identity; Google sign-in itself does not grant shop access.
3. A verified Google account without a registration record is asked for shop name and owner name, with an optional phone number. The app creates `registrationRequests/{uid}` in Firestore with `status: "pending"`.
4. An administrator reviews the request and changes its status in the Firebase console. The exact status that grants access is `approved`; supported statuses are `pending`, `approved`, and `rejected`.
5. On the next access check, an approved user proceeds to device verification. Pending and rejected requests do not enter the main app.

The client creates and reads its own registration request; it cannot approve, edit, or delete it. If a rejected user needs to submit again, an administrator must remove the rejected request so a new request can be created.

### Administrator quick procedure

1. In Firebase Console, open **Firestore Database** and the `registrationRequests` collection.
2. Open the document whose ID is the applicant's Firebase UID and change `status` to exactly `approved` (lowercase). Keep the request document and its other fields.
3. Have the user reopen the app or bring it back to the foreground so the access gate checks the new status. A pending request can similarly be rejected by setting `status` to `rejected`.
4. To authorize a replacement phone, first verify the account owner, then remove `deviceBindings/{uid}`. The new installation can claim the empty binding after approval; an old installation that remembers its prior binding cannot reclaim it.

### One-device binding and session verification

- The first approved installation creates a random installation ID and keeps it in Android SecureStore. The app claims `deviceBindings/{uid}` in Firestore with that ID.
- The same installation can verify the existing binding. A different installation for the same account is blocked; administrators must reset the remote binding when authorizing a replacement device.
- While online, the app verifies the Firebase session, approval, and device binding. The session is checked while active, and the device-binding result can be cached locally for up to one hour.
- After successful online verification, the app allows at most **one hour** of offline use. The grace period is tied to the last verified session and requires the stored approval and device-verification state. A significant device-clock rollback also prevents offline access.

These are access checks, not a way to synchronize business records between devices. The app's local SQLite data remains on the device when a user signs out.

## 3. Shop workflows

| Area | How it is used |
|---|---|
| **Home** | Provides the shop overview and entry points into daily work. |
| **Inventory** | Create and edit items, search and filter stock, inspect item details, and make quantity adjustments. Stock-changing operations also record inventory movements so the change has a local history. |
| **Jobs** | Manage repair work separately from the customer/contact profile: record repair details and follow its status through the repair workflow. |
| **Customers** | Maintain customer/contact details and view associated history. Call and WhatsApp shortcuts use the customer's saved phone number. |
| **Enquiries** | Keep unconverted prospects separate from active customer work. An enquiry can be converted into a repair or used to record a purchase. |
| **Sales / purchases** | Record a sale against inventory. Recording a purchase updates the sale, stock movement, and enquiry conversion together in the local database transaction. |
| **Backups and updates** | The shop profile/settings modal includes manual cloud backup, restore, an offline JSON copy, and a manual app-update check. |

Enquiries are stored alongside customer records but remain classified as enquiries until converted. Repair records, customer records, sales, stock items, and stock movements are separate SQLite records with relationships where needed.

## 4. Data and persistence boundaries

### On-device SQLite

[`database/Helper.js`](../database/Helper.js) owns the SQLite schema, migrations, data access, and transaction logic. The main tables are:

- `items` — products, parts, and current stock quantities.
- `customers` — customer/contact information and enquiry conversion state.
- `repairs` — repair-job details and progress.
- `sales` — recorded sales and purchase activity.
- `inventory_movements` — stock changes and their sources.

The app reads and writes operational business data locally. It does not continuously synchronize these tables to Firestore, and changing devices does not automatically transfer the working database.

### Firebase and local key/value storage

| Service or store | What Cellventory keeps there |
|---|---|
| **Firebase Authentication** | Google-backed user identity and persisted sign-in session. It does not store inventory or repair records. |
| **Cloud Firestore** | Access requests in `registrationRequests/{uid}` and one-installation records in `deviceBindings/{uid}`. These records gate app access; they are not the business-data database. |
| **Firebase Storage** | The latest SQLite snapshot at `backups/{uid}/latest_backup.json`. A new upload overwrites the previous snapshot; this is not backup history or live synchronization. |
| **AsyncStorage** | Firebase Auth persistence, cached shop/profile values, and non-sensitive local backup metadata. Session-trust metadata uses SecureStore where supported, with AsyncStorage as a fallback. |
| **Expo SecureStore** | Installation ID, local device-binding state, and verified-session metadata where the platform supports it. |

### Backup and restore

- The app checks for an automatic backup when an approved session becomes active and periodically while the app is in use. It uploads at most once per hour when needed; backup errors are recorded and should not block normal local work.
- A snapshot contains all rows in `items`, `customers`, `repairs`, `sales`, and `inventory_movements`, plus timestamp and count metadata.
- A manual backup is available from the shop profile/settings modal. The same area can restore the latest cloud snapshot or copy the snapshot JSON to the clipboard.
- Restore **replaces the current local database contents** with the downloaded snapshot. Confirm the replacement carefully; it is not a merge.
- Because only `latest_backup.json` is retained, there is no built-in selection of older cloud snapshots.

## 5. Tools and why the app uses them

| Tool / library | Role in Cellventory | Why it is used |
|---|---|---|
| **React Native** | Renders the mobile screens and native interactions. | Provides a shared component model for mobile platforms. |
| **Expo SDK 58** | App framework, native-module integration, platform APIs, and project configuration. | Keeps common mobile development and native configuration in a consistent workflow. |
| **Expo development client / EAS Build** | Builds installable Android applications containing native modules such as Nitro Google Sign-In. | The Google sign-in integration cannot be supplied by a plain Expo Go client; a development or preview build is needed for device testing. |
| **React Navigation** | Root stack and bottom-tab navigation. | Separates the main work areas from detail and form screens. |
| **expo-sqlite** | Local relational database. | Supports offline access and transactional updates to related business records. |
| **Firebase Authentication** | Verifies the Google-backed account and maintains the app session. | Provides a trusted identity for access checks without making Firebase the inventory database. |
| **react-native-nitro-google-signin** | Android-native Google account selection and ID-token retrieval. | Uses the Android Credential Manager flow required by the current sign-in implementation. |
| **Cloud Firestore** | Registration approval and device-binding documents. | Provides a small online control plane for onboarding and access; ordinary shop data stays local. |
| **Firebase Storage** | Stores the latest JSON snapshot of the local database. | Provides a cloud copy for backup and restore, separate from Firestore records. |
| **AsyncStorage** | Firebase Auth persistence and small non-secret app metadata. | Retains session and preferences across app restarts. |
| **Expo SecureStore** | Protected local identifiers and verification state. | Keeps installation and session-verification data in platform-protected storage where available. |
| **expo-updates / EAS Update** | Delivers compatible JavaScript and asset updates to configured channels. | Lets supported app changes reach installed builds without publishing a new native binary. |
| **expo-camera** | Camera access for the app's scanning workflows. | Provides the native camera API used by scanning UI. |
| **Jest** | Unit tests for application and service behavior. | Runs focused checks for database, access, backup, navigation, and UI logic. |

`expo-auth-session` and `expo-web-browser` are present as dependencies, but the current Android Google sign-in path uses the Nitro Credential Manager integration; do not treat those packages as the current sign-in implementation.

## 6. Build, run, test, and update

### Local development

Install dependencies and build/install an Android development client:

```bash
npm install
npx eas build --platform android --profile development
```

Once that development client is installed on an Android device or emulator, start the JavaScript server for it:

```bash
npx expo start --dev-client
```

Expo Go does not include the native Google sign-in module used by this app. A development client or another EAS-built app is required to exercise that flow.

Run the unit tests with:

```bash
npm test
```

### EAS profiles and OTA updates

[`eas.json`](../eas.json) defines three Android release profiles:

- `development` — internal distribution, `development` update channel, APK.
- `preview` — internal distribution, `preview` update channel, APK.
- `production` — `production` update channel and automatic version increment.

An OTA update can publish JavaScript and compatible assets to a channel, for example:

```bash
npx eas update --channel development --message "Describe the update" --platform android
```

The installed app must be built for a compatible runtime and channel. The runtime version follows the app version in `app.json`. OTA cannot add or change native code, native dependencies, permissions, or native configuration; those changes require a new EAS build and installation. The app checks for updates through `expo-updates`, and presents an update prompt when one is available.

## 7. Source-code map

| File or directory | Responsibility |
|---|---|
| [`App.js`](../App.js) | App bootstrap, authentication listener, access gate, foreground checks, root navigation, and backup trigger. |
| [`navigation/TabNavigator.js`](../navigation/TabNavigator.js) | Home, Inventory, Jobs, and Customers tabs. |
| [`screens/`](../screens/) | Main screens and user-facing business workflows. |
| [`database/Helper.js`](../database/Helper.js) | SQLite schema, migrations, queries, and transactional business operations. |
| [`services/RegistrationService.js`](../services/RegistrationService.js) | Google-account requirement and Firestore access-request lifecycle. |
| [`services/DeviceBindingService.js`](../services/DeviceBindingService.js) | Secure installation ID and one-device Firestore binding. |
| [`services/AuthSessionService.js`](../services/AuthSessionService.js) | Online session verification and one-hour offline grace. |
| [`services/BackupService.js`](../services/BackupService.js) | SQLite snapshot, cloud upload/download, restore, and scheduled backup checks. |
| [`context/AppUpdateContext.js`](../context/AppUpdateContext.js) | EAS Update availability checks and update application. |
| [`config/firebase.js`](../config/firebase.js) | Firebase app, Auth, Firestore, and Storage initialization. |
| [`app.json`](../app.json) / [`eas.json`](../eas.json) | Expo native configuration, runtime/update settings, and EAS build profiles. |
| [`auth.test.js`](../__tests__/auth.test.js) | Example Jest test suite; the `__tests__` directory contains the app's tests. |

## 8. Operational considerations

- **Approval is manual.** A user who has signed in is not necessarily authorized; the Firestore request must be `approved`.
- **Accounts are single-installation.** Moving an account requires an administrator to reset its remote device binding before the replacement installation can claim it.
- **Offline access is bounded.** A verified user can work offline for up to one hour; an unverified first sign-in needs network access.
- **Business data is local-first.** There is no live multi-device synchronization. Back up before replacing a device or restoring an older snapshot.
- **Restore is destructive to current local contents.** It replaces the local tables with the snapshot.
- **Native changes need a new build.** Use OTA only for compatible JavaScript and asset changes.

