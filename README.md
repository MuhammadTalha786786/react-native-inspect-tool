# ⚡ react-native-inspect-tool

> **In-app Chrome DevTools inspector for React Native.**  
> Monitor **Network API Calls**, catch **Errors & Stack Traces**, inspect **UI Elements & Colors**, and detect **Memory Leaks & Heap Spikes** in real time—directly on your device or simulator.

<p align="center">
  <a href="https://www.npmjs.com/package/react-native-inspect-tool">
    <img src="https://img.shields.io/npm/v/react-native-inspect-tool.svg?style=flat-square&color=blue" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/react-native-inspect-tool">
    <img src="https://img.shields.io/npm/dm/react-native-inspect-tool.svg?style=flat-square&color=orange" alt="npm downloads" />
  </a>
  <img src="https://img.shields.io/badge/React_Native->=0.60.0-61dafb.svg?style=flat-square&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-Go_%26_Bare-black.svg?style=flat-square&logo=expo" alt="Expo Compatible" />
  <img src="https://img.shields.io/badge/Hermes-Optimized-blue.svg?style=flat-square" alt="Hermes Optimized" />
  <img src="https://img.shields.io/badge/Zero_Native_Deps-Yes-success.svg?style=flat-square" alt="Zero Native Dependencies" />
  <img src="https://img.shields.io/badge/License-MIT-purple.svg?style=flat-square" alt="License" />
</p>

---

## ✨ Features

- 🌐 **Network Inspector (API Calls)**
  - Intercepts both `global.fetch` and `global.XMLHttpRequest` (works automatically with **Axios**, **Apollo GraphQL**, etc.).
  - Detailed drill-down for **Request Headers**, **Request Payload**, **Response Headers**, and **Response Body**.
  - **Copy as cURL** with one tap to replay in Terminal, Postman, or Insomnia.
  - Filter by HTTP Status (`All`, `2xx Success`, `4xx Client Error`, `5xx Server Error`, `Pending`) or Search text.
  - Latency/duration benchmarks (ms) and payload size calculation.

- 🚨 **Console & Error Tracker**
  - Intercepts `console.log`, `console.info`, `console.warn`, and `console.error`.
  - Global unhandled JS exception capture via `ErrorUtils` before crashes.
  - Unhandled Promise rejection tracking.
  - Expandable **Call Stacks**, **Component Stacks**, and structured JSON payload viewers.
  - Log level filtering and search.

- 🧠 **Memory Leak & Performance Monitor**
  - **Hermes JS Heap Profiling**: Real-time heap tracking (`js_heap_size`, `allocated_bytes`, `heap_size`).
  - **Live Heap Sparkline**: 60-second visual trend line to spot memory leaks and continuous monotonic growth.
  - **Timer Leak Detector**: Intercepts `setInterval` & `setTimeout` to identify orphaned intervals from unmounted components.
  - **JS Thread FPS Meter**: Monitors `requestAnimationFrame` deltas to detect UI freezing and thread jank.

- 🎯 **UI Elements & Color Inspector (Chrome DevTools Inspect)**
  - **⚡ Screen Scanner**: One-tap scan of the current screen discovering all mounted components: **Buttons**, **Text labels**, **Inputs**, **Images**, and **Containers**.
  - **Screen Color Palette**: Aggregates all unique screen colors into swatches with usage frequency (`4x`), roles (`BG`, `TXT`, `BRD`), 1-tap copy to clipboard, and color filtering.
  - **Accurate Element & Text Inspection**: Correctly identifies `<Text>` elements with full text strings, accurate bounds, and eliminates false button banners for non-buttons.
  - **Functionality & Trigger Detection**: Automatically detects interactive capabilities on every element: `⚡ Tap (onPress)`, `⌨️ Input Change (onChangeText)`, `💭 Placeholder`, `🔒 Disabled State`, accessibility roles, and keyboard types.
  - **Touch-to-Inspect Pointer**: Live interactive overlay to touch any component on screen with exact bounding box highlight.
  - **Color Contrast Checker**: Evaluates foreground vs background luminance and computes WCAG 2.1 contrast ratio (`AAA` / `AA` compliance).
  - **Interactive Box Model**: Chrome DevTools–style nested box diagram showing **Margin**, **Border**, **Padding**, and inner **Content Dimensions**.
  - **Component Hierarchy Tree**: Interactive breadcrumbs navigation (`App > ScrollView > Card > Text`) to inspect parent and child styles.
  - **Computed Styles Table**: Searchable inspector for all layout, spacing, and typography properties.

- 📱 **App / Device Info & Quick Simulators**
  - Device dimensions, OS version, Hermes engine detection.
  - Built-in simulation triggers (test GET/POST, simulate 404, throw test error, launch test intervals).

- 🪶 **Zero Native Dependencies**
  - Written in 100% pure TypeScript / React Native primitives.
  - Works out-of-the-box in **Expo Go**, **Expo Prebuild**, and **Bare React Native**—no `pod install` required!

---

## 📦 Installation

```bash
npm install react-native-inspect-tool
# or
yarn add react-native-inspect-tool
# or
pnpm add react-native-inspect-tool
# or
bun add react-native-inspect-tool
```

---

## 🚀 Quick Start

Add `<InspectorOverlay />` at the root of your application (usually `App.tsx` or `index.js`). Recommended inside `__DEV__` guard:

```tsx
import React from 'react';
import { View } from 'react-native';
import { InspectorOverlay } from 'react-native-inspect-tool';

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      {/* Your regular app content */}
      <MainNavigator />

      {/* DevLens Floating Bubble & DevTools Drawer */}
      {__DEV__ && <InspectorOverlay />}
    </View>
  );
}
```

That's it! A draggable floating badge `⚡` will appear on screen. Tap it anytime to open the full Chrome DevTools inspector.

---

## ⚙️ Configuration Options

You can customize DevLens behavior by passing props to `<InspectorOverlay>`:

```tsx
<InspectorOverlay
  config={{
    // Maximum requests to store in the circular buffer (default: 200)
    maxNetworkRequests: 200,

    // Maximum logs to keep in memory (default: 200)
    maxLogs: 200,

    // Sample interval for memory monitor in ms (default: 1000)
    memorySampleIntervalMs: 1000,

    // Initial position for the floating bubble
    bubbleInitialPosition: { x: 20, y: 150 },

    // Toggle specific collectors
    enableNetwork: true,
    enableErrors: true,
    enableMemory: true,
  }}
/>
```

---

## 🔧 Imperative API

You can also control DevLens programmatically in your code:

```ts
import { DevLens, NetworkStorage, ErrorStorage } from 'react-native-inspect-tool';

// Initialize manually (if not using <InspectorOverlay />)
DevLens.init({ maxNetworkRequests: 300 });

// Clear all logged data
DevLens.clearAll();

// Access stored requests
const requests = NetworkStorage.getRequests();

// Access stored console logs
const logs = ErrorStorage.getLogs();

// Generate cURL for any intercepted request
const curl = NetworkStorage.toCurl(requests[0]);
```

---

## 📱 How It Works Under the Hood

### 1. Network Interception
DevLens wraps `global.fetch` and `global.XMLHttpRequest`. When a request is triggered:
- The request URL, headers, and body are captured into a bounded ring buffer.
- Response streams are non-destructively cloned (`response.clone().text()`) so your application code receives unaltered streams.
- Latencies and statuses are recorded when the request resolves or rejects.

### 2. Error Interception
DevLens intercepts:
- `console.error`, `console.warn`, `console.log`, `console.info` while forwarding calls to the original methods so terminal/Metro output remains intact.
- `global.ErrorUtils.setGlobalHandler` to capture fatal/non-fatal exceptions with stack traces.
- `global.onunhandledrejection` for unhandled Promise rejections.

### 3. Memory & Leak Detection
- **Hermes**: DevLens inspects `global.HermesInternal.getInstrumentedStats()` every second to extract exact JS heap size and allocated bytes.
- **Timer Tracking**: DevLens wraps `setInterval` and `clearInterval`, tracking the creation time and call stack of every active timer. If an interval exceeds 60 seconds with dozens of ticks without being cleared, DevLens triggers a **Potential Timer Leak** alert.
- **Heap Growth Analysis**: If heap memory increases monotonically over consecutive samples without garbage collection release, a **Continuous Memory Growth** alert is flagged.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to open an issue or pull request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
