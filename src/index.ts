// Main UI Component & Provider
export {
  InspectorOverlay,
  InspectorOverlayProps,
  DevLensProvider,
  InspectorProvider,
  DevLensProviderProps,
} from './ui/InspectorOverlay';

// Core Singleton & Interceptors
export { DevLens } from './core/DevLensCore';
export { NetworkStorage } from './core/network/NetworkStorage';
export { networkInterceptor } from './core/network/NetworkInterceptor';
export { ErrorStorage } from './core/error/ErrorStorage';
export { errorInterceptor } from './core/error/ErrorInterceptor';
export { memoryMonitor } from './core/memory/MemoryMonitor';
export { timerTracker } from './core/memory/TimerTracker';
export { fpsMonitor } from './core/memory/FPSMonitor';
export { uiElementInspector } from './core/ui/UIElementInspector';
export { screenScanner, ScreenScannerClass } from './core/ui/ScreenScanner';

// Themes & UI primitives
export { colors, typography } from './ui/theme';
export { Badge, MethodBadge, StatusBadge } from './ui/components/Badge';
export { FloatingBubble } from './ui/components/FloatingBubble';
export { JsonViewer } from './ui/components/JsonViewer';
export { BoxModelViewer } from './ui/components/BoxModelViewer';
export { ColorSwatch } from './ui/components/ColorSwatch';
export { ElementPickerOverlay } from './ui/components/ElementPickerOverlay';
export { FiberAnchor } from './ui/components/FiberAnchor';
export { ErrorBoundary } from './ui/components/ErrorBoundary';
export { ElementsTab } from './ui/tabs/ElementsTab';
export { isValidColor, sanitizeComponentStyle, safeFormatValue } from './core/ui/styleUtils';

// Types
export * from './types';
