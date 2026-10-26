import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActiveTimer,
  ConsoleLog,
  DevLensConfig,
  InspectedElement,
  MemoryLeakAlert,
  MemorySample,
  NetworkRequest,
  TabType,
} from '../types';
import { DevLens } from '../core/DevLensCore';
import { NetworkStorage } from '../core/network/NetworkStorage';
import { ErrorStorage } from '../core/error/ErrorStorage';
import { memoryMonitor } from '../core/memory/MemoryMonitor';
import { uiElementInspector } from '../core/ui/UIElementInspector';
import { colors } from './theme';
import { FloatingBubble } from './components/FloatingBubble';
import { Header } from './components/Header';
import { NetworkTab } from './tabs/NetworkTab';
import { ConsoleTab } from './tabs/ConsoleTab';
import { MemoryTab } from './tabs/MemoryTab';
import { ElementsTab } from './tabs/ElementsTab';
import { AppInfoTab } from './tabs/AppInfoTab';
import { ElementPickerOverlay } from './components/ElementPickerOverlay';
import { FiberAnchor } from './components/FiberAnchor';

export interface InspectorOverlayProps {
  config?: DevLensConfig;
}

export const InspectorOverlay: React.FC<InspectorOverlayProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>('network');

  const anchorRef = useRef<View>(null);

  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [currentSample, setCurrentSample] = useState<MemorySample | null>(null);
  const [alerts, setAlerts] = useState<MemoryLeakAlert[]>([]);
  const [history, setHistory] = useState<MemorySample[]>([]);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);
  const [elementsInitialMode, setElementsInitialMode] = useState<'details' | 'scanner'>('scanner');

  useEffect(() => {
    // Initialize DevLens
    DevLens.init(config);

    if (anchorRef.current) {
      uiElementInspector.setOverlayInstance(anchorRef.current);
    }

    // Subscribe to Network
    const unsubNetwork = NetworkStorage.subscribe((reqs) => {
      setRequests(reqs);
    });

    // Subscribe to Errors
    const unsubErrors = ErrorStorage.subscribe((allLogs) => {
      setLogs(allLogs);
    });

    // Subscribe to Memory
    const unsubMemory = memoryMonitor.subscribe((sample, currentAlerts) => {
      setCurrentSample(sample);
      setAlerts(currentAlerts);
      setHistory(memoryMonitor.getHistory());
      setActiveTimers(memoryMonitor.getActiveTimers());
    });

    // Subscribe to UI Element Inspector
    const unsubElement = uiElementInspector.subscribe((elem) => {
      setInspectedElement(elem);
    });

    return () => {
      unsubNetwork();
      unsubErrors();
      unsubMemory();
      unsubElement();
    };
  }, [config]);

  // Compute counts for badges
  const networkErrorCount = useMemo(() => {
    return requests.filter((r) => !r.isPending && (r.status >= 400 || r.status === 0)).length;
  }, [requests]);

  const consoleErrorCount = useMemo(() => {
    return logs.filter((l) => l.level === 'error').length;
  }, [logs]);

  const handleClear = () => {
    if (currentTab === 'network') {
      NetworkStorage.clear();
    } else if (currentTab === 'console') {
      ErrorStorage.clear();
    } else if (currentTab === 'memory') {
      memoryMonitor.clearAlerts();
    } else if (currentTab === 'elements') {
      uiElementInspector.setInspectedElement(null);
    } else {
      DevLens.clearAll();
    }
  };

  const handleStartTouchInspect = () => {
    setIsOpen(false);
    setIsPickerActive(true);
  };

  const handleSelectHierarchyIndex = (idx: number) => {
    if (!inspectedElement) return;
    const hierarchy = inspectedElement.hierarchy;
    if (idx < 0 || idx >= hierarchy.length) return;

    uiElementInspector.measureHierarchyIndex(hierarchy, idx, (frame, props) => {
      const updated = uiElementInspector.parseViewData(
        {
          hierarchy,
          props,
          frame,
          selectedIndex: idx,
        },
        frame.left + frame.width / 2,
        frame.top + frame.height / 2
      );
      uiElementInspector.setInspectedElement(updated);
    });
  };

  const isHermes = memoryMonitor.isHermesAvailable();

  return (
    <>
      {/* Invisible anchor view and React Class FiberAnchor to discover root host component & Fiber tree */}
      <FiberAnchor />
      <View
        ref={anchorRef}
        collapsable={false}
        pointerEvents="none"
        style={styles.anchorView}
        onLayout={() => {
          if (anchorRef.current) {
            uiElementInspector.setOverlayInstance(anchorRef.current);
          }
        }}
      />

      {/* Draggable Floating Bubble */}
      {!isPickerActive && (
        <FloatingBubble
          onPress={() => setIsOpen(true)}
          errorCount={consoleErrorCount}
          networkErrorCount={networkErrorCount}
          currentFPS={currentSample?.fps}
          initialPosition={config?.bubbleInitialPosition}
        />
      )}

      {/* Touch-to-Inspect Element Overlay */}
      <ElementPickerOverlay
        visible={isPickerActive}
        onClose={() => setIsPickerActive(false)}
        onOpenDetails={(elem) => {
          setIsPickerActive(false);
          setInspectedElement(elem);
          setElementsInitialMode('details');
          setCurrentTab('elements');
          setIsOpen(true);
        }}
        onScanScreen={() => {
          setIsPickerActive(false);
          setElementsInitialMode('scanner');
          setCurrentTab('elements');
          setIsOpen(true);
        }}
      />

      {/* Main DevTools Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContent}>
            <Header
              currentTab={currentTab}
              onSelectTab={setCurrentTab}
              onClear={handleClear}
              onClose={() => setIsOpen(false)}
              onStartTouchInspect={handleStartTouchInspect}
              networkErrorCount={networkErrorCount}
              consoleErrorCount={consoleErrorCount}
              leakAlertCount={alerts.length}
            />

            <View style={styles.tabContainer}>
              {currentTab === 'network' && <NetworkTab requests={requests} />}
              {currentTab === 'console' && <ConsoleTab logs={logs} />}
              {currentTab === 'memory' && (
                <MemoryTab
                  currentSample={currentSample}
                  history={history}
                  alerts={alerts}
                  activeTimers={activeTimers}
                  isHermes={isHermes}
                  onClearAlerts={() => memoryMonitor.clearAlerts()}
                />
              )}
              {currentTab === 'elements' && (
                <ElementsTab
                  inspectedElement={inspectedElement}
                  initialMode={elementsInitialMode}
                  onStartTouchInspect={handleStartTouchInspect}
                  onSelectHierarchyIndex={handleSelectHierarchyIndex}
                />
              )}
              {currentTab === 'info' && <AppInfoTab onClearAll={() => DevLens.clearAll()} />}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

export interface DevLensProviderProps {
  children: React.ReactNode;
  config?: DevLensConfig;
}

/**
 * DevLensProvider: Wraps your app container to provide 100% accurate element inspection & color capture
 */
export const DevLensProvider: React.FC<DevLensProviderProps> = ({ children, config }) => {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (containerRef.current) {
      uiElementInspector.setRootView(containerRef.current);
    }
  });

  return (
    <View
      ref={containerRef}
      collapsable={false}
      style={styles.providerContainer}
      onLayout={() => {
        if (containerRef.current) {
          uiElementInspector.setRootView(containerRef.current);
        }
      }}
    >
      <FiberAnchor />
      {children}
      <InspectorOverlay config={config} />
    </View>
  );
};

export const InspectorProvider = DevLensProvider;

const styles = StyleSheet.create({
  anchorView: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    opacity: 0,
  },
  providerContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabContainer: {
    flex: 1,
  },
});
