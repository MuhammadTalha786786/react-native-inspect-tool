export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface NetworkHeader {
  [key: string]: string;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: HttpMethod | string;
  status: number; // 0 for pending or failed
  statusText?: string;
  requestHeaders: NetworkHeader;
  requestBody?: any;
  responseHeaders?: NetworkHeader;
  responseBody?: any;
  responseType?: string;
  startTime: number;
  endTime?: number;
  duration?: number; // in milliseconds
  error?: string;
  size?: number; // bytes
  isPending: boolean;
}

export type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface ConsoleLog {
  id: string;
  level: LogLevel;
  message: string;
  args?: any[];
  stack?: string;
  componentStack?: string;
  timestamp: number;
  isUnhandled?: boolean;
}

export interface HermesStats {
  js_heap_size?: number;
  allocated_bytes?: number;
  heap_size?: number;
  num_allocations?: number;
  gc_cpu_time?: number;
  gc_wall_time?: number;
  [key: string]: any;
}

export interface MemorySample {
  timestamp: number;
  jsHeapSizeMB: number;
  allocatedBytesMB: number;
  totalHeapMB?: number;
  activeTimersCount: number;
  fps: number;
}

export interface ActiveTimer {
  id: number | string;
  type: 'interval' | 'timeout';
  delay: number;
  createdAt: number;
  stack?: string;
  callCount: number;
}

export interface MemoryLeakAlert {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  type: 'runaway_timer' | 'heap_spike' | 'rapid_growth';
  details?: any;
}

export interface DevLensConfig {
  maxNetworkRequests?: number;
  maxLogs?: number;
  maxMemorySamples?: number;
  enableNetwork?: boolean;
  enableErrors?: boolean;
  enableMemory?: boolean;
  memorySampleIntervalMs?: number;
  bubbleInitialPosition?: { x: number; y: number };
}

export type TabType = 'network' | 'console' | 'memory' | 'elements' | 'info';

export interface BoxModelValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxModel {
  margin: BoxModelValues;
  padding: BoxModelValues;
  border: BoxModelValues;
  width: number;
  height: number;
}

export interface ElementColorInfo {
  type: 'backgroundColor' | 'color' | 'borderColor' | 'shadowColor' | 'tintColor';
  value: string;
}

export interface ChildElementInfo {
  name: string;
  text?: string;
  style?: Record<string, any>;
  colors?: ElementColorInfo[];
}

export interface HierarchyItem {
  name: string;
  getInspectorData?: (findNodeHandle: any) => any;
  props?: Record<string, any>;
}

export type ElementCategory = 'button' | 'text' | 'input' | 'image' | 'container' | 'other';

export interface ScannedElement {
  id: string;
  name: string;
  category: ElementCategory;
  text?: string;
  functionality: string[];
  colors: ElementColorInfo[];
  style: Record<string, any>;
  props: Record<string, any>;
  bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  hierarchy: HierarchyItem[];
  depth: number;
  parentButtonIndex?: number;
  parentButtonName?: string;
  fiberRef?: any;
}

export interface ScreenColorPaletteItem {
  hex: string;
  count: number;
  types: ('backgroundColor' | 'color' | 'borderColor' | 'shadowColor' | 'tintColor')[];
  elementsCount: number;
  sampleElements: string[];
}

export interface ScreenScanResult {
  elements: ScannedElement[];
  palette: ScreenColorPaletteItem[];
  stats: {
    total: number;
    buttons: number;
    texts: number;
    inputs: number;
    images: number;
    containers: number;
  };
  timestamp: number;
}

export interface InspectedElement {
  name: string;
  hierarchy: HierarchyItem[];
  selectedIndex: number;
  frame: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  style: Record<string, any>;
  props: Record<string, any>;
  colors: ElementColorInfo[];
  boxModel: BoxModel;
  textContent?: string;
  childrenInfo?: ChildElementInfo[];
  parentButtonIndex?: number;
  parentButtonName?: string;
  functionality?: string[];
  category?: ElementCategory;
}

