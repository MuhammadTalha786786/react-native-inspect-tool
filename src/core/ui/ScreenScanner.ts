import { StyleSheet } from 'react-native';
import {
  ElementCategory,
  ElementColorInfo,
  HierarchyItem,
  ScannedElement,
  ScreenColorPaletteItem,
  ScreenScanResult,
} from '../../types';
import { sanitizeComponentStyle } from './styleUtils';
const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  cyan: '#00ffff',
  yellow: '#ffff00',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  gray: '#808080',
  grey: '#808080',
  lightgray: '#d3d3d3',
  darkgray: '#a9a9a9',
  pink: '#ffc0cb',
  teal: '#008080',
  navy: '#000080',
  indigo: '#4b0082',
  transparent: 'transparent',
};

function extractColors(style: Record<string, any>, props?: Record<string, any>): ElementColorInfo[] {
  const colors: ElementColorInfo[] = [];

  const normalize = (val: any): string | null => {
    if (typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (NAMED_COLORS[lower]) {
      return NAMED_COLORS[lower];
    }
    return trimmed;
  };

  const addColor = (key: string, type: ElementColorInfo['type']) => {
    const val = style[key] ?? props?.[key];
    const normalized = normalize(val);
    if (normalized && !colors.some((c) => c.type === type && c.value === normalized)) {
      colors.push({ type, value: normalized });
    }
  };

  addColor('backgroundColor', 'backgroundColor');
  addColor('color', 'color');
  addColor('borderColor', 'borderColor');
  addColor('borderTopColor', 'borderColor');
  addColor('shadowColor', 'shadowColor');
  addColor('tintColor', 'tintColor');

  return colors;
}

const DEVLENS_INTERNAL_NAMES = new Set([
  'InspectorOverlay',
  'FloatingBubble',
  'ElementPickerOverlay',
  'ElementsTab',
  'NetworkTab',
  'ConsoleTab',
  'MemoryTab',
  'AppInfoTab',
  'DevLensModal',
  'Header',
  'BoxModelViewer',
  'ColorSwatch',
  'NetworkDetailModal',
  'SearchBar',
  'Badge',
  'JsonViewer',
]);

const BUTTON_COMPONENT_NAMES = new Set([
  'TouchableOpacity',
  'TouchableHighlight',
  'TouchableWithoutFeedback',
  'TouchableNativeFeedback',
  'Pressable',
  'Button',
  'TouchableBounce',
  'PressableButton',
  'PrimaryButton',
  'SecondaryButton',
  'ActionButton',
  'IconButton',
]);

const TEXT_COMPONENT_NAMES = new Set([
  'Text',
  'RCTText',
  'Paragraph',
  'RCTVirtualText',
  'Heading',
  'Title',
  'SubTitle',
  'Label',
  'Typography',
  'Caption',
]);

const INPUT_COMPONENT_NAMES = new Set([
  'TextInput',
  'AndroidTextInput',
  'RCTTextInput',
  'SearchInput',
  'InputField',
]);

const IMAGE_COMPONENT_NAMES = new Set([
  'Image',
  'RCTImageView',
  'FastImage',
  'ImageBackground',
  'Avatar',
]);

type ScanListener = (result: ScreenScanResult) => void;

export class ScreenScannerClass {
  private latestResult: ScreenScanResult | null = null;
  private listeners: Set<ScanListener> = new Set();
  private isScanning = false;
  private activeScanPromise: Promise<ScreenScanResult> | null = null;
  private rootViewInstance: any = null;
  private overlayInstance: any = null;
  private fiberAnchorInstance: any = null;
  private fiberAnchors: Set<any> = new Set();
  private boundsCache = new Map<string, { left: number; top: number; width: number; height: number }>();
  private fiberBoundsCache = new WeakMap<any, { left: number; top: number; width: number; height: number }>();

  private getElementCacheKey(elem: ScannedElement): string {
    const hierarchyPath = (elem.hierarchy || [])
      .map((h) => (h && typeof h.name === 'string' ? h.name : 'View'))
      .join('/');
    return `${hierarchyPath}__${elem.name || 'View'}__${elem.depth || 0}__${elem.text || ''}__${elem.parentButtonName || ''}`;
  }

  public setFiberAnchor(anchor: any) {
    if (anchor) {
      this.fiberAnchors.add(anchor);
      this.fiberAnchorInstance = anchor;
    }
  }

  public getFiberAnchor(): any {
    return this.fiberAnchorInstance;
  }

  public setRootView(view: any) {
    if (view) this.rootViewInstance = view;
  }

  public getRootView(): any {
    return this.rootViewInstance;
  }

  public setOverlayInstance(instance: any) {
    if (instance) this.overlayInstance = instance;
  }

  public getOverlayInstance(): any {
    return this.overlayInstance;
  }

  public subscribe(listener: ScanListener): () => void {
    this.listeners.add(listener);
    if (this.latestResult) {
      listener(this.latestResult);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(result: ScreenScanResult) {
    this.listeners.forEach((listener) => {
      try {
        listener(result);
      } catch {
        // Ignore
      }
    });
  }

  public getLatestResult(): ScreenScanResult | null {
    return this.latestResult;
  }

  /**
   * Scans the current screen to discover all mounted elements, text, colors, and functionality.
   * Concurrency-guarded to prevent duplicate scans and bridge callback congestion.
   */
  public async scan(sourceView?: any): Promise<ScreenScanResult> {
    if (this.activeScanPromise) {
      return this.activeScanPromise;
    }
    // Rate limit: if already scanned within the last 1000ms, reuse cached result immediately
    if (
      this.latestResult &&
      this.latestResult.elements.length > 0 &&
      Date.now() - this.latestResult.timestamp < 1000
    ) {
      return this.latestResult;
    }

    this.activeScanPromise = this.performScan(sourceView);
    try {
      const res = await this.activeScanPromise;
      return res;
    } finally {
      this.activeScanPromise = null;
    }
  }

  private async performScan(sourceView?: any): Promise<ScreenScanResult> {
    this.isScanning = true;

    try {
      const source =
        sourceView ||
        this.fiberAnchorInstance ||
        this.rootViewInstance ||
        this.overlayInstance;

      const rootFibers = this.findAllRootFibers(source);
      let rawElements: ScannedElement[] = [];

      const visited = new Set<any>();
      for (const rootFiber of rootFibers) {
        this.traverseFiberTree(rootFiber, rawElements, visited, 0, []);
      }

      // If this scan found 0 elements, but we already have a previous scan with elements:
      // PRESERVE the previous scan result so the screen elements NEVER disappear!
      if (rawElements.length === 0) {
        if (this.latestResult && this.latestResult.elements.length > 0) {
          return this.latestResult;
        }
        const empty = this.createEmptyResult();
        this.latestResult = empty;
        return empty;
      }

      // Measure layout bounds of discovered elements (capped, sequential, lightweight)
      const measuredElements = await this.measureElements(rawElements);

      // Extract screen color palette
      const palette = this.extractPalette(measuredElements);

      // Compute element counts
      const stats = this.computeStats(measuredElements);

      const result: ScreenScanResult = {
        elements: measuredElements,
        palette,
        stats,
        timestamp: Date.now(),
      };

      this.latestResult = result;
      this.notify(result);
      return result;
    } catch {
      if (this.latestResult && this.latestResult.elements.length > 0) {
        return this.latestResult;
      }
      const empty = this.createEmptyResult();
      this.latestResult = empty;
      return empty;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Traverses the Fiber tree recursively, skipping DevLens internal UI.
   */
  private traverseFiberTree(
    fiber: any,
    elements: ScannedElement[],
    visited: Set<any>,
    depth: number,
    ancestors: HierarchyItem[]
  ) {
    if (!fiber || visited.has(fiber)) return;
    visited.add(fiber);

    const name = this.getCleanComponentName(fiber);

    // If it's DevLensProvider wrapper, traverse its children directly (the app)
    if (name === 'DevLensProvider' || name === 'InspectorProvider') {
      if (fiber.child) {
        this.traverseFiberTree(fiber.child, elements, visited, depth, ancestors);
      }
      if (fiber.sibling) {
        this.traverseFiberTree(fiber.sibling, elements, visited, depth, ancestors);
      }
      return;
    }

    // Skip DevLens internal inspector/overlay UI subtrees completely, but ALWAYS continue traversing siblings!
    const isDevLensInternal =
      (DEVLENS_INTERNAL_NAMES.has(name) ||
        name === 'DevLensModal' ||
        name.includes('InspectorOverlay') ||
        name.includes('ElementPickerOverlay') ||
        name.includes('FloatingBubble') ||
        name === 'FiberAnchor') &&
      name !== 'DevLensProvider' &&
      name !== 'InspectorProvider';

    if (isDevLensInternal) {
      if (fiber.sibling) {
        this.traverseFiberTree(fiber.sibling, elements, visited, depth, ancestors);
      }
      return;
    }

    const props = fiber.memoizedProps || {};
    const currentItem: HierarchyItem = {
      name: name || 'View',
      props,
    };
    const currentAncestors = name ? [...ancestors, currentItem] : ancestors;

    // Check if this fiber represents a meaningful element to inspect
    const category = this.categorizeFiber(fiber, name, props);
    const isHostComponent = fiber.tag === 5;
    const isCompositeComponent = fiber.tag === 0 || fiber.tag === 1;

    if (name && (category !== 'other' || isHostComponent || (isCompositeComponent && props.style))) {
      const style = sanitizeComponentStyle(props.style);
      const colors = this.extractElementColors(style, props, currentAncestors);
      const functionality = this.extractFunctionality(props);
      const text = this.extractTextContent(fiber, props);

      // Check if element has an immediate button ancestor (within 2 levels)
      let parentButtonIndex: number | undefined = undefined;
      let parentButtonName: string | undefined = undefined;

      if (category !== 'button') {
        const len = currentAncestors.length;
        for (let i = len - 2; i >= Math.max(0, len - 3); i--) {
          const anc = currentAncestors[i];
          if (anc && (BUTTON_COMPONENT_NAMES.has(anc.name) || Boolean(anc.props?.onPress))) {
            parentButtonIndex = i;
            parentButtonName = anc.name;
            break;
          }
        }
      }

      // Avoid duplicate Text entry when RN creates both composite <Text> and host <RCTText>/<Paragraph>
      const isDuplicateTextChild =
        (category === 'text' || name === 'Text') &&
        ancestors.length > 0 &&
        ancestors[ancestors.length - 1].name === 'Text';

      // Meaningful element filtering:
      // Filter out empty, intermediate structural wrappers (e.g. <View style={{ flex: 1 }}>, <GestureHandlerRootView>)
      // that have no text, no interactive handlers, and no distinctive visual styles (colors, borders, or explicit sizes)
      const hasDirectText = Boolean(text && text.trim().length > 0);
      const hasInteractiveFunc = functionality.length > 0;
      const isInteractiveOrMedia =
        category === 'button' ||
        category === 'input' ||
        category === 'image';

      const hasOwnVisualStyling = Boolean(
        (style.backgroundColor && style.backgroundColor !== 'transparent') ||
        (style.borderWidth && Number(style.borderWidth) > 0) ||
        (style.borderColor && style.borderColor !== 'transparent') ||
        (style.borderRadius && Number(style.borderRadius) > 0) ||
        (style.elevation && Number(style.elevation) > 0) ||
        (style.shadowOpacity && Number(style.shadowOpacity) > 0) ||
        (typeof style.width === 'number' && style.width > 0 && typeof style.height === 'number' && style.height > 0)
      );

      const hasContent =
        !isDuplicateTextChild &&
        (hasDirectText || hasInteractiveFunc || isInteractiveOrMedia || hasOwnVisualStyling);

      if (hasContent) {
        const elementId = `elem_${elements.length}_${name}`;

        let w = typeof style.width === 'number' && style.width > 0 ? style.width : 0;
        let h = typeof style.height === 'number' && style.height > 0 ? style.height : 0;
        const l = typeof style.left === 'number' ? style.left : 0;
        const t = typeof style.top === 'number' ? style.top : 0;

        // Provide non-zero fallback dimensions so elements can be hit-tested immediately
        if (w <= 0 || h <= 0) {
          if (category === 'button') {
            w = w > 0 ? w : 180;
            h = h > 0 ? h : 44;
          } else if (category === 'input') {
            w = w > 0 ? w : 220;
            h = h > 0 ? h : 44;
          } else if (category === 'image') {
            w = w > 0 ? w : 48;
            h = h > 0 ? h : 48;
          } else if (text && text.trim().length > 0) {
            w = Math.min(320, Math.max(40, text.length * 8));
            h = 22;
          } else {
            w = 120;
            h = 36;
          }
        }

        elements.push({
          id: elementId,
          name,
          category,
          text,
          functionality,
          colors,
          style,
          props,
          bounds: {
            left: l,
            top: t,
            width: w,
            height: h,
          },
          hierarchy: currentAncestors,
          depth,
          parentButtonIndex,
          parentButtonName,
          fiberRef: fiber,
        });
      }
    }

    // Traverse children
    if (fiber.child) {
      this.traverseFiberTree(fiber.child, elements, visited, depth + 1, currentAncestors);
    }

    // Traverse siblings
    if (fiber.sibling) {
      this.traverseFiberTree(fiber.sibling, elements, visited, depth, ancestors);
    }
  }

  /**
   * Resolves the component category (button, text, input, image, container, other).
   */
  public categorizeFiber(fiber: any, name: string, props: any): ElementCategory {
    // 1. Buttons & Clickable Elements
    if (
      BUTTON_COMPONENT_NAMES.has(name) ||
      typeof props?.onPress === 'function' ||
      typeof props?.onLongPress === 'function' ||
      props?.accessibilityRole === 'button'
    ) {
      return 'button';
    }

    // 2. Input Fields
    if (
      INPUT_COMPONENT_NAMES.has(name) ||
      typeof props?.onChangeText === 'function' ||
      props?.placeholder !== undefined
    ) {
      return 'input';
    }

    // 3. Images
    if (
      IMAGE_COMPONENT_NAMES.has(name) ||
      props?.source !== undefined ||
      fiber.type === 'RCTImageView'
    ) {
      return 'image';
    }

    // 4. Text Nodes
    if (
      TEXT_COMPONENT_NAMES.has(name) ||
      typeof props?.children === 'string' ||
      fiber.type === 'RCTText' ||
      fiber.type === 'Paragraph'
    ) {
      return 'text';
    }

    // 5. Layout Containers
    if (
      name === 'View' ||
      name === 'ScrollView' ||
      name === 'SafeAreaView' ||
      name === 'FlatList' ||
      name === 'SectionList' ||
      name === 'KeyboardAvoidingView' ||
      fiber.type === 'RCTView'
    ) {
      return 'container';
    }

    return 'other';
  }

  /**
   * Extracts clean, readable component name from Fiber node.
   */
  public getCleanComponentName(fiber: any): string {
    if (!fiber || !fiber.type) return '';

    if (typeof fiber.type === 'string') {
      if (fiber.type === 'RCTText' || fiber.type === 'Paragraph' || fiber.type === 'RCTVirtualText') return 'Text';
      if (fiber.type === 'RCTView') return 'View';
      if (fiber.type === 'RCTImageView') return 'Image';
      if (fiber.type === 'AndroidTextInput' || fiber.type === 'RCTTextInput') return 'TextInput';
      if (fiber.type === 'RCTScrollView') return 'ScrollView';
      return fiber.type;
    }

    if (typeof fiber.type === 'function') {
      return fiber.type.displayName || fiber.type.name || 'Component';
    }

    if (typeof fiber.type === 'object') {
      if (fiber.type.displayName) return fiber.type.displayName;
      if (fiber.type.render?.displayName) return fiber.type.render.displayName;
      if (fiber.type.render?.name) return fiber.type.render.name;
      if (fiber.type.type?.displayName) return fiber.type.type.displayName;
      if (fiber.type.type?.name) return fiber.type.type.name;
    }

    return '';
  }

  /**
   * Extracts complete text string from element or nested children.
   */
  public extractTextContent(fiber: any, props: any): string | undefined {
    if (!props) return undefined;

    // Direct children text
    const textFromChildren = this.extractStringFromValue(props.children);
    if (textFromChildren) return textFromChildren;

    // TextInput value or placeholder
    if (typeof props.value === 'string' && props.value.trim().length > 0) return props.value;
    if (typeof props.placeholder === 'string' && props.placeholder.trim().length > 0) return props.placeholder;
    if (typeof props.defaultValue === 'string' && props.defaultValue.trim().length > 0) return props.defaultValue;

    // Native Button title
    if (typeof props.title === 'string' && props.title.trim().length > 0) return props.title;

    // If composite element, check immediate child HostText (tag 6) or Text component
    if (fiber.child) {
      let childNode = fiber.child;
      let depth = 0;
      while (childNode && depth < 4) {
        if (childNode.tag === 6 && typeof childNode.memoizedProps === 'string') {
          return childNode.memoizedProps;
        }
        if (childNode.memoizedProps?.children) {
          const str = this.extractStringFromValue(childNode.memoizedProps.children);
          if (str) return str;
        }
        childNode = childNode.child;
        depth++;
      }
    }

    return undefined;
  }

  private extractStringFromValue(val: any): string | undefined {
    if (typeof val === 'string' && val.trim().length > 0) return val;
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) {
      const parts = val.map((v) => this.extractStringFromValue(v)).filter(Boolean);
      if (parts.length > 0) return parts.join('');
    }
    if (val && typeof val === 'object' && val.props?.children) {
      return this.extractStringFromValue(val.props.children);
    }
    return undefined;
  }

  /**
   * Extracts interactive functionality & event handlers.
   */
  public extractFunctionality(props: any): string[] {
    if (!props) return [];
    const funcs: string[] = [];

    if (typeof props.onPress === 'function') funcs.push('⚡ Tap (onPress)');
    if (typeof props.onLongPress === 'function') funcs.push('⏱ Long Press (onLongPress)');
    if (typeof props.onPressIn === 'function') funcs.push('👆 Press In');
    if (typeof props.onPressOut === 'function') funcs.push('👋 Press Out');
    if (typeof props.onChangeText === 'function') funcs.push('⌨️ Input Change (onChangeText)');
    if (typeof props.onSubmitEditing === 'function') funcs.push('↵ Submit Action');
    if (typeof props.onFocus === 'function') funcs.push('🎯 Focus Event');
    if (typeof props.onBlur === 'function') funcs.push('👓 Blur Event');
    if (typeof props.onScroll === 'function') funcs.push('📜 Scroll Event');
    if (props.disabled === true) funcs.push('🔒 Disabled State');
    if (props.accessibilityRole) funcs.push(`♿ Role: ${props.accessibilityRole}`);
    if (props.accessibilityLabel) funcs.push(`🏷 Label: "${props.accessibilityLabel}"`);
    if (props.placeholder) funcs.push(`💭 Placeholder: "${props.placeholder}"`);
    if (props.secureTextEntry) funcs.push('🔒 Password Hidden');
    if (props.keyboardType) funcs.push(`📱 Keyboard: ${props.keyboardType}`);
    if (props.autoFocus) funcs.push('⚡ Auto Focus');
    if (props.multiline) funcs.push('📝 Multiline');

    return funcs;
  }

  /**
   * Extracts colors with hierarchical inheritance.
   */
  public extractElementColors(
    style: Record<string, any>,
    props: any,
    ancestors: HierarchyItem[]
  ): ElementColorInfo[] {
    let colors = extractColors(style, props);

    const hasBg = colors.some((c) => c.type === 'backgroundColor');
    const hasText = colors.some((c) => c.type === 'color');

    if (!hasBg || !hasText) {
      for (let i = ancestors.length - 2; i >= 0; i--) {
        const anc = ancestors[i];
        const ancProps = anc?.props || {};
        const ancStyle = sanitizeComponentStyle(ancProps.style);
        const ancColors = extractColors(ancStyle, ancProps);

        if (!hasBg) {
          const parentBg = ancColors.find((c) => c.type === 'backgroundColor');
          if (parentBg && !colors.some((c) => c.type === 'backgroundColor')) {
            colors.push(parentBg);
          }
        }

        if (!hasText) {
          const parentText = ancColors.find((c) => c.type === 'color');
          if (parentText && !colors.some((c) => c.type === 'color')) {
            colors.push(parentText);
          }
        }
      }
    }

    return colors;
  }

  /**
   * Measures layout bounds for scanned elements with caching, prioritization, and bridge throttling.
   * Prevents bridge callback flooding ("Excessive number of pending callbacks") on Android.
   */
  public async measureElements(elements: ScannedElement[]): Promise<ScannedElement[]> {
    const results: ScannedElement[] = [];
    const elementsToMeasure: ScannedElement[] = [];
    const elementsResolved: Map<string, ScannedElement> = new Map();

    // 1. Check cached bounds or explicit style bounds first
    for (const elem of elements) {
      const cacheKey = this.getElementCacheKey(elem);
      const cachedFiberBounds = elem.fiberRef ? this.fiberBoundsCache.get(elem.fiberRef) : null;
      const cachedStringBounds = this.boundsCache.get(cacheKey);
      const cachedBounds = cachedFiberBounds || cachedStringBounds;

      if (cachedBounds && cachedBounds.width > 0 && cachedBounds.height > 0) {
        elementsResolved.set(elem.id, { ...elem, bounds: cachedBounds });
      } else {
        elementsToMeasure.push(elem);
      }
    }

    // 2. Prioritize elements: buttons, inputs, images, and text before plain containers
    elementsToMeasure.sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        button: 0,
        input: 1,
        image: 2,
        text: 3,
        container: 4,
        other: 5,
      };
      return (priorityOrder[a.category] ?? 5) - (priorityOrder[b.category] ?? 5);
    });

    // 3. Measure sequentially at most 10 priority elements to strictly ensure at most 1 bridge callback at a time
    const maxNativeMeasures = 10;
    const toMeasure = elementsToMeasure.slice(0, maxNativeMeasures);
    const unmeasured = elementsToMeasure.slice(maxNativeMeasures);

    for (const elem of toMeasure) {
      const cacheKey = this.getElementCacheKey(elem);
      const host = this.findHostInstance(elem.fiberRef);
      if (host) {
        const bounds = await this.measureHostNode(host);
        if (bounds && bounds.width > 0 && bounds.height > 0) {
          if (elem.fiberRef) {
            this.fiberBoundsCache.set(elem.fiberRef, bounds);
          }
          this.boundsCache.set(cacheKey, bounds);
          elementsResolved.set(elem.id, { ...elem, bounds });
          continue;
        }
      }
      elementsResolved.set(elem.id, elem);
    }

    // Elements beyond maxNativeMeasures retain style/fallback bounds
    for (const elem of unmeasured) {
      elementsResolved.set(elem.id, elem);
    }

    // Preserve original elements ordering
    for (const elem of elements) {
      results.push(elementsResolved.get(elem.id) || elem);
    }

    return results;
  }

  public findHostInstance(fiber: any): any {
    if (!fiber) return null;
    if (fiber.tag === 5 && fiber.stateNode) return fiber.stateNode;

    // Breadth-first search down child and sibling fibers
    const queue = [fiber.child];
    let count = 0;
    while (queue.length > 0 && count < 60) {
      count++;
      const node = queue.shift();
      if (!node) continue;
      if (node.tag === 5 && node.stateNode) {
        return node.stateNode;
      }
      if (node.child) queue.push(node.child);
      if (node.sibling) queue.push(node.sibling);
    }
    return null;
  }

  public measureHostNode(host: any): Promise<{ left: number; top: number; width: number; height: number } | null> {
    return new Promise((resolve) => {
      if (!host || typeof host.measureInWindow !== 'function') {
        resolve(null);
        return;
      }

      let settled = false;
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 60);

      try {
        host.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            if (width > 0 && height > 0) {
              resolve({ left: Math.round(x), top: Math.round(y), width: Math.round(width), height: Math.round(height) });
            } else {
              resolve(null);
            }
          }
        });
      } catch {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve(null);
        }
      }
    });
  }

  /**
   * Aggregates screen color palette from scanned elements.
   */
  public extractPalette(elements: ScannedElement[]): ScreenColorPaletteItem[] {
    const colorMap = new Map<
      string,
      {
        count: number;
        types: Set<ElementColorInfo['type']>;
        elementNames: Set<string>;
      }
    >();

    for (const elem of elements) {
      for (const col of elem.colors) {
        const normalized = this.normalizeHex(col.value);
        if (!normalized || normalized === 'TRANSPARENT') continue;

        if (!colorMap.has(normalized)) {
          colorMap.set(normalized, {
            count: 0,
            types: new Set(),
            elementNames: new Set(),
          });
        }

        const entry = colorMap.get(normalized)!;
        entry.count += 1;
        entry.types.add(col.type);
        entry.elementNames.add(elem.name);
      }
    }

    const palette: ScreenColorPaletteItem[] = [];
    colorMap.forEach((data, hex) => {
      palette.push({
        hex,
        count: data.count,
        types: Array.from(data.types),
        elementsCount: data.elementNames.size,
        sampleElements: Array.from(data.elementNames).slice(0, 3),
      });
    });

    // Sort dominant colors first
    palette.sort((a, b) => b.count - a.count);
    return palette;
  }

  /**
   * Normalizes color string to uppercase HEX (e.g. #3B82F6).
   */
  public normalizeHex(colorStr: string): string | null {
    if (!colorStr || typeof colorStr !== 'string') return null;
    let s = colorStr.trim();
    if (s.toLowerCase() === 'transparent') return 'TRANSPARENT';

    // 3-digit hex (#abc -> #AABBCC)
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      const r = s[1];
      const g = s[2];
      const b = s[3];
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }

    // 6-digit hex
    if (/^#[0-9a-fA-F]{6}$/.test(s)) {
      return s.toUpperCase();
    }

    // 8-digit hex (#rrggbbaa -> #RRGGBB)
    if (/^#[0-9a-fA-F]{8}$/.test(s)) {
      return s.substring(0, 7).toUpperCase();
    }

    // rgb/rgba string
    const rgbMatch = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
      const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
      const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }

    return s.toUpperCase();
  }

  private computeStats(elements: ScannedElement[]) {
    return {
      total: elements.length,
      buttons: elements.filter((e) => e.category === 'button').length,
      texts: elements.filter((e) => e.category === 'text').length,
      inputs: elements.filter((e) => e.category === 'input').length,
      images: elements.filter((e) => e.category === 'image').length,
      containers: elements.filter((e) => e.category === 'container').length,
    };
  }

  private createEmptyResult(): ScreenScanResult {
    return {
      elements: [],
      palette: [],
      stats: { total: 0, buttons: 0, texts: 0, inputs: 0, images: 0, containers: 0 },
      timestamp: Date.now(),
    };
  }

  public findAllRootFibers(source?: any): any[] {
    const rootSet = new Set<any>();

    const candidates = [
      ...Array.from(this.fiberAnchors),
      this.fiberAnchorInstance,
      source,
      this.rootViewInstance,
      this.overlayInstance,
    ].filter(Boolean);

    // Strategy 1: Climb to HostRoot from every registered candidate
    for (const inst of candidates) {
      try {
        let fiber =
          inst._reactInternals ||
          inst._reactInternalFiber ||
          inst._internalFiberInstanceHandleDEV ||
          inst.__internalInstanceHandle ||
          inst._internalInstanceHandle ||
          inst._fiber ||
          inst.__reactFiber$;

        if (fiber) {
          while (fiber && fiber.return) {
            fiber = fiber.return;
          }
          if (fiber && fiber.stateNode && fiber.stateNode.current) {
            rootSet.add(fiber.stateNode.current);
          } else if (fiber) {
            rootSet.add(fiber);
          }
        }
      } catch {
        // Continue to next candidate
      }
    }

    // Strategy 2: DevTools Global Hook fiber roots across all renderers
    try {
      const hook = (global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook && typeof hook.getFiberRoots === 'function') {
        const renderers = hook.renderers;
        if (renderers) {
          const rendererList = Array.from(renderers.keys ? renderers.keys() : Object.keys(renderers));
          for (const rendererID of rendererList) {
            const roots = hook.getFiberRoots(rendererID);
            if (roots) {
              const rootArray = Array.from(roots.values ? roots.values() : roots);
              for (const root of rootArray as any[]) {
                if (root && root.current) {
                  rootSet.add(root.current);
                }
              }
            }
          }
        }
      }
    } catch {
      // Fall through
    }

    // Strategy 3: React Secret Internals (ReactCurrentOwner)
    try {
      const ReactAny = require('react');
      const secret = ReactAny?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
      const owner = secret?.ReactCurrentOwner?.current;
      if (owner) {
        let curr = owner;
        while (curr && curr.return) curr = curr.return;
        if (curr && curr.stateNode && curr.stateNode.current) {
          rootSet.add(curr.stateNode.current);
        } else if (curr) {
          rootSet.add(curr);
        }
      }
    } catch {
      // Ignore
    }

    return Array.from(rootSet);
  }

  public findRootFiber(source?: any): any {
    const roots = this.findAllRootFibers(source);
    return roots.length > 0 ? roots[0] : null;
  }


  /**
   * Finds the element that best fits or intersects a stretched rectangular bounding box.
   */
  public findElementInRegion(
    left: number,
    top: number,
    width: number,
    height: number,
    elements?: ScannedElement[]
  ): ScannedElement | null {
    const candidateList = elements || this.latestResult?.elements || [];
    if (candidateList.length === 0) return null;

    const boxRight = left + width;
    const boxBottom = top + height;
    const boxArea = width * height;

    type ScoredCandidate = {
      elem: ScannedElement;
      score: number;
    };

    const scored: ScoredCandidate[] = [];

    for (const elem of candidateList) {
      const e = elem.bounds;
      if (e.width <= 0 || e.height <= 0) continue;

      const eRight = e.left + e.width;
      const eBottom = e.top + e.height;
      const eArea = e.width * e.height;

      // Overlap rectangle
      const xOverlap = Math.max(0, Math.min(boxRight, eRight) - Math.max(left, e.left));
      const yOverlap = Math.max(0, Math.min(boxBottom, eBottom) - Math.max(top, e.top));
      const overlapArea = xOverlap * yOverlap;

      if (overlapArea <= 0) continue;

      // Intersection over Union (IoU)
      const unionArea = boxArea + eArea - overlapArea;
      const iou = unionArea > 0 ? overlapArea / unionArea : 0;

      // Containment ratio: how much of the element is inside the stretched box
      const elemContainedRatio = overlapArea / eArea;

      // Box coverage ratio: how much of the box is filled by this element
      const boxCoveredRatio = overlapArea / boxArea;

      // Priority boost for buttons, inputs, text, images
      let categoryBoost = 1.0;
      if (elem.category === 'button') categoryBoost = 1.35;
      else if (elem.category === 'input') categoryBoost = 1.3;
      else if (elem.category === 'text') categoryBoost = 1.15;
      else if (elem.category === 'image') categoryBoost = 1.1;

      const score = (iou * 0.5 + elemContainedRatio * 0.3 + boxCoveredRatio * 0.2) * categoryBoost;
      scored.push({ elem, score });
    }

    if (scored.length === 0) return null;

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored[0].elem;
  }

  /**
   * Finds the best matching element at (x, y) coordinates.
   * Prioritizes leaf elements (smallest bounding box), with proximity fallback.
   */
  public findElementAtPoint(x: number, y: number, elements?: ScannedElement[]): ScannedElement | null {
    const candidateList = elements || this.latestResult?.elements || [];
    if (candidateList.length === 0) return null;

    const matches = candidateList.filter((elem) => {
      const { left, top, width, height } = elem.bounds;
      if (width <= 0 || height <= 0) return false;
      return x >= left && x <= left + width && y >= top && y <= top + height;
    });

    if (matches.length > 0) {
      // Sort by bounding box area ascending (innermost leaf node first)
      matches.sort((a, b) => {
        const areaA = a.bounds.width * a.bounds.height;
        const areaB = b.bounds.width * b.bounds.height;
        return areaA - areaB;
      });
      return matches[0];
    }

    // Proximity fallback: within 25px distance
    const nearby = candidateList
      .map((elem) => {
        const { left, top, width, height } = elem.bounds;
        if (width <= 0 || height <= 0) return { elem, dist: Infinity };
        const cx = left + width / 2;
        const cy = top + height / 2;
        const dist = Math.hypot(x - cx, y - cy);
        return { elem, dist };
      })
      .filter((item) => item.dist <= 40)
      .sort((a, b) => a.dist - b.dist);

    return nearby.length > 0 ? nearby[0].elem : null;
  }
}

export const screenScanner = new ScreenScannerClass();
