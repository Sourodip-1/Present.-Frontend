# Present - Smart Bluetooth Attendance System 🚀

This repository contains the front-end code for **Present**, a next-generation smart attendance system being built for our upcoming hackathon. The system uses Bluetooth Low Energy (BLE) to instantly verify student proximity and mark attendance with zero friction.

## 🛠️ Tech Stack (Hackathon MVP)
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation (Native Stack)
- **Hardware Integration**: `react-native-ble-plx` (C++ Native BLE module)
- **Cloud Build**: Expo Application Services (EAS)
- **Backend API**: PostPipe (Custom Express.js Database)

## 📋 Progress Log: Day 1

### 1. Application Infrastructure
- Initialized a blank Expo React Native project.
- Installed and configured `@react-navigation/native` and setup stack-based routing.
- Separated UI into 5 core modular screens (`Login`, `OTP`, `UserDetails`, `StudentDashboard`, `TeacherDashboard`).

### 2. Hardware Permissions & Architecture
- Injected strict Android native hardware permissions (`BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`) into `app.json`.
- Configured `@config-plugins/react-native-ble-plx` to bypass the standard Expo Go sandbox restrictions.
- Analyzed and mitigated theoretical MVP hardware failure points (BLE broadcasting range, RSSI calculation instability, and PIN-code proxy logic). 

### 3. Cloud Compilation & Testing Client
- Authenticated with Expo Cloud Services (EAS).
- Forced `legacy-peer-dependency` resolution to fix React 19 SDK 55 compilation conflicts using an `.npmrc` file.
- Successfully compiled a **Custom Development Build (.apk)** containing all raw C++ and Java native Bluetooth modules.
- Deployed the `.apk` testing client to physical Android devices.
- Configured an `ngrok` tunnel via `npx expo start --tunnel` to bypass Windows Firewall and establish a secure hot-reloading bridge between the Javascript code and the hardware phone client.

### 4. Core BLE Implementation
- Instantiated the `BleManager` inside the `StudentDashboard`.
- Built the core 5-second `startDeviceScan()` lifecycle that listens for nearby hardware UUIDs, logs the physical distance via RSSI (dBm).
- Added an automatic teardown unmounting routine (`manager.stopDeviceScan()`) to prevent battery drain algorithms from closing the app.

## 🚀 Next Steps for Tomorrow (Day 2)
1. **Teacher Broadcaster**: Build the Teacher's BLE Broadcaster using a Foreground Android Service (preventing the phone's battery manager from putting the antenna to sleep during class).
2. **Backend Sync**: Write the API handlers to sync the raw BLE success statuses straight into our PostPipe Backend.
3. **RSSI Tuning**: Fine-tune the dBm distance constraints for our specific presentation room to eliminate false positives.
4. **UI Refinement**: Polish the screen components to look clean and professional for the pitch!
