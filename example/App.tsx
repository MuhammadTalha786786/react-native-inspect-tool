import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { InspectorOverlay } from '../src';

export default function App() {
  const [leakingTimerActive, setLeakingTimerActive] = useState(false);
  const [allocatedChunks, setAllocatedChunks] = useState<any[]>([]);
  const leakingIntervalRef = useRef<any>(null);

  // 1. Network Actions
  const handleGetRequest = async () => {
    try {
      await fetch('https://jsonplaceholder.typicode.com/todos/1');
    } catch (e) {
      // Ignored
    }
  };

  const handlePostRequest = async () => {
    try {
      await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'DevLens Demo',
          body: 'Inspecting React Native like Chrome DevTools!',
          userId: 1,
        }),
      });
    } catch (e) {
      // Ignored
    }
  };

  const handle404Request = async () => {
    try {
      await fetch('https://jsonplaceholder.typicode.com/broken-endpoint-404');
    } catch (e) {
      // Ignored
    }
  };

  const handleDelayedRequest = async () => {
    try {
      await fetch('https://httpbin.org/delay/2');
    } catch (e) {
      // Ignored
    }
  };

  // 2. Console & Error Actions
  const handleConsoleLog = () => {
    console.log('⚡ [User Action]', 'User tapped the log trigger button', {
      timestamp: Date.now(),
      screen: 'Home',
      sessionData: { id: 'usr_8921', plan: 'enterprise' },
    });
  };

  const handleConsoleWarn = () => {
    console.warn('⚠️ [Performance Warning]', 'Component rendered 12 times in 100ms. Consider useMemo().');
  };

  const handleConsoleError = () => {
    try {
      throw new Error('PaymentGatewayException: Card token authorization rejected by upstream server');
    } catch (err: any) {
      console.error('🛑 [Payment Service Error]', err);
    }
  };

  const handleUnhandledRejection = () => {
    Promise.reject(new Error('AuthSessionExpired: Refresh token has been revoked by IdentityProvider'));
  };

  // 3. Memory & Leak Simulation Actions
  const handleStartLeakingInterval = () => {
    if (leakingTimerActive) return;
    setLeakingTimerActive(true);

    let tick = 0;
    // Simulating an interval that was never cleared on unmount
    leakingIntervalRef.current = setInterval(() => {
      tick++;
      // Intentional leak activity
      if (tick % 10 === 0) {
        console.log(`[Orphaned Timer Leak] Interval tick #${tick} running...`);
      }
    }, 1000);
  };

  const handleStopLeakingInterval = () => {
    if (leakingIntervalRef.current) {
      clearInterval(leakingIntervalRef.current);
      leakingIntervalRef.current = null;
    }
    setLeakingTimerActive(false);
  };

  const handleAllocateMemory = () => {
    // Allocate ~5MB in arrays to test heap spike tracking
    const chunk = new Array(500000).fill('DevLens-Memory-Stress-Test-String');
    setAllocatedChunks((prev) => [...prev, chunk]);
  };

  const handleClearMemory = () => {
    setAllocatedChunks([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroBadge}>REACT NATIVE DEVTOOLS</Text>
          <Text style={styles.heroTitle}>⚡ DevLens Playground</Text>
          <Text style={styles.heroSubtitle}>
            Tap any button below to trigger requests, logs, or memory allocations, then tap the floating ⚡ bubble to inspect them like Chrome DevTools!
          </Text>
        </View>

        {/* Section 1: Network */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>🌐 1. Network / API Interception</Text>
          <Text style={styles.cardDesc}>
            Intercepts fetch & XMLHttpRequest. Inspect headers, payloads, status codes, and copy as cURL.
          </Text>
          <View style={styles.btnGrid}>
            <TouchableOpacity style={styles.btn} onPress={handleGetRequest}>
              <Text style={styles.btnText}>GET 200 (Todos)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={handlePostRequest}>
              <Text style={styles.btnText}>POST 201 (Post)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnWarn]} onPress={handle404Request}>
              <Text style={styles.btnText}>GET 404 (Broken)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={handleDelayedRequest}>
              <Text style={styles.btnText}>Delayed (2s)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Errors & Console */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>🚨 2. Console & Error Tracking</Text>
          <Text style={styles.cardDesc}>
            Logs, warnings, stack traces, and unhandled promise rejections are captured with full context.
          </Text>
          <View style={styles.btnGrid}>
            <TouchableOpacity style={styles.btn} onPress={handleConsoleLog}>
              <Text style={styles.btnText}>console.log</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnWarn]} onPress={handleConsoleWarn}>
              <Text style={styles.btnText}>console.warn</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleConsoleError}>
              <Text style={styles.btnText}>console.error</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleUnhandledRejection}>
              <Text style={styles.btnText}>Unhandled Promise</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Memory & Leakage */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>🧠 3. Memory Leaks & Heap Monitor</Text>
          <Text style={styles.cardDesc}>
            Monitor Hermes JS Heap, detect runaway timers from unmounted components, and watch FPS.
          </Text>
          <View style={styles.btnGrid}>
            <TouchableOpacity
              style={[styles.btn, leakingTimerActive ? styles.btnDanger : styles.btn]}
              onPress={leakingTimerActive ? handleStopLeakingInterval : handleStartLeakingInterval}
            >
              <Text style={styles.btnText}>
                {leakingTimerActive ? '⏹ Stop Leaking Timer' : '▶ Start Leaking Timer'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={handleAllocateMemory}>
              <Text style={styles.btnText}>
                + Allocate ~5MB ({allocatedChunks.length})
              </Text>
            </TouchableOpacity>
            {allocatedChunks.length > 0 && (
              <TouchableOpacity style={[styles.btn, styles.btnWarn]} onPress={handleClearMemory}>
                <Text style={styles.btnText}>Clear Memory Chunks</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section 4: UI Elements & Colors Playground */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>🎯 4. UI Elements & Color Inspector</Text>
          <Text style={styles.cardDesc}>
            Tap 🎯 in DevLens and touch any of these widgets to inspect their hex colors, box model (padding/margin), and typography!
          </Text>

          <View style={styles.uiDemoContainer}>
            <View style={styles.indigoBadge}>
              <Text style={styles.indigoBadgeText}>Indigo Pill #4f46e5</Text>
            </View>

            <View style={styles.emeraldCard}>
              <Text style={styles.emeraldTitle}>Emerald Theme Card</Text>
              <Text style={styles.emeraldSub}>
                Background: #064e3b • Border: #10b981 (1.5px) • Padding: 12px
              </Text>
            </View>

            <View style={styles.roseRow}>
              <View style={styles.roseBox}>
                <Text style={styles.roseText}>Rose #e11d48</Text>
              </View>
              <View style={styles.amberBox}>
                <Text style={styles.amberText}>Amber #f59e0b</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 5: SociaBea Screen Scanner & Text Inspection Demo */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>📱 5. Screen Scanner & Text Detection (SociaBea)</Text>
          <Text style={styles.cardDesc}>
            Test selecting this heading text & button, or tap "Scan Screen" in DevLens to detect all elements!
          </Text>

          <View style={styles.sociaBeaCard}>
            <Text style={styles.welcomeTitle}>Welcome to SociaBea</Text>
            <Text style={styles.welcomeSub}>Your Space, Your Vibe</Text>

            <TextInput
              style={styles.mobileInput}
              placeholder="Enter Mobile Number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={styles.continueBtn}
              activeOpacity={0.8}
              onPress={() => console.log('Continue button pressed!')}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* The DevLens Floating Inspector */}
      <InspectorOverlay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scroll: {
    padding: 16,
    paddingBottom: 80,
    gap: 16,
  },
  hero: {
    paddingVertical: 12,
  },
  heroBadge: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  btnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnWarn: {
    backgroundColor: '#d97706',
  },
  btnDanger: {
    backgroundColor: '#dc2626',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  uiDemoContainer: {
    gap: 10,
    marginTop: 4,
  },
  indigoBadge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  indigoBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emeraldCard: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
  },
  emeraldTitle: {
    color: '#a7f3d0',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  emeraldSub: {
    color: '#ecfdf5',
    fontSize: 11,
  },
  roseRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roseBox: {
    flex: 1,
    backgroundColor: '#e11d48',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  roseText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  amberBox: {
    flex: 1,
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  amberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sociaBeaCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
    marginTop: 4,
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  welcomeSub: {
    color: '#94a3b8',
    fontSize: 13,
  },
  mobileInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    fontSize: 14,
    marginTop: 6,
  },
  continueBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
