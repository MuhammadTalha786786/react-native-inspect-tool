import { StyleSheet } from 'react-native';
import { BoxModel, BoxModelValues, ElementColorInfo, InspectedElement, ScannedElement } from '../../types';
import { screenScanner } from './ScreenScanner';

type Listener = (element: InspectedElement | null) => void;

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

class UIElementInspectorClass {
  private currentElement: InspectedElement | null = null;
  private listeners: Set<Listener> = new Set();
  private rootViewInstance: any = null;
  private overlayInstance: any = null;
  private fiberAnchorInstance: any = null;

  constructor() {}

  public setFiberAnchor(anchor: any) {
    if (anchor) {
      this.fiberAnchorInstance = anchor;
      screenScanner.setFiberAnchor(anchor);
    }
  }

  public getFiberAnchor(): any {
    return this.fiberAnchorInstance;
  }

  public setRootView(view: any) {
    if (view) {
      this.rootViewInstance = view;
      screenScanner.setRootView(view);
    }
  }

  public getRootView(): any {
    return this.rootViewInstance;
  }

  public setOverlayInstance(instance: any) {
    if (instance) {
      this.overlayInstance = instance;
      screenScanner.setOverlayInstance(instance);
    }
  }

  public getOverlayInstance(): any {
    return this.overlayInstance;
  }

  /**
   * Automatically discovers the root HostComponent by climbing up the Fiber tree from any mounted ref
   */
  public findRootHostComponent(): any {
    if (this.rootViewInstance) return this.rootViewInstance;

    const source = this.fiberAnchorInstance || this.overlayInstance;
    if (!source) return null;

    try {
      const fiber =
        source._reactInternals ||
        source._reactInternalFiber ||
        source._internalFiberInstanceHandleDEV ||
        (source as any)._internalInstanceHandle;
      if (!fiber) return source;

      // Climb to HostRoot (root of fiber tree)
      let curr = fiber;
      while (curr.return) {
        curr = curr.return;
      }

      // Search down for the first HostComponent (tag 5)
      let foundHost: any = null;
      const walk = (node: any) => {
        if (!node || foundHost) return;
        if (node.tag === 5 && node.stateNode && node.stateNode !== source) {
          foundHost = node.stateNode;
          return;
        }
        if (node.child) walk(node.child);
        if (node.sibling) walk(node.sibling);
      };

      walk(curr.child);
      if (foundHost) {
        this.rootViewInstance = foundHost;
        return foundHost;
      }
    } catch {
      // Fallback
    }

    return source;
  }

  public isInspectorAvailable(): boolean {
    return true;
  }

  /**
   * Inspects and selects the element matching a stretched rectangular bounding box.
   */
  public inspectAtBounds(
    left: number,
    top: number,
    width: number,
    height: number,
    onComplete?: (elem: InspectedElement | null) => void
  ) {
    // 1. Try finding best matching element in screenScanner
    const matched = screenScanner.findElementInRegion(left, top, width, height);
    if (matched) {
      const parsed = this.convertScannedToInspected(matched);
      this.setInspectedElement(parsed);
      onComplete?.(parsed);
      return;
    }

    // 2. Fallback to center point inspection
    const centerX = Math.round(left + width / 2);
    const centerY = Math.round(top + height / 2);
    this.inspectAtPoint(centerX, centerY, onComplete);
  }

  public inspectAtPoint(x: number, y: number, onComplete?: (elem: InspectedElement | null) => void) {
    // Strategy 1: Instant match against already scanned elements (exact or nearest leaf)
    const immediateMatch = screenScanner.findElementAtPoint(x, y);
    if (immediateMatch) {
      const parsed = this.convertScannedToInspected(immediateMatch);
      this.setInspectedElement(parsed);
      onComplete?.(parsed);
      return;
    }

    // Strategy 2: Region match around touch coordinates (50x50px box)
    const regionMatch = screenScanner.findElementInRegion(x - 25, y - 25, 50, 50);
    if (regionMatch) {
      const parsed = this.convertScannedToInspected(regionMatch);
      this.setInspectedElement(parsed);
      onComplete?.(parsed);
      return;
    }

    // Strategy 3: Dynamic screen scan ONLY if scanner has no elements yet or initial tap
    const hostView = this.findRootHostComponent();
    screenScanner
      .scan(hostView)
      .then((scanResult) => {
        const matched =
          screenScanner.findElementAtPoint(x, y, scanResult.elements) ||
          screenScanner.findElementInRegion(x - 25, y - 25, 50, 50, scanResult.elements);

        if (matched) {
          const parsed = this.convertScannedToInspected(matched);
          this.setInspectedElement(parsed);
          onComplete?.(parsed);
          return;
        }

        const fallback = this.createFallbackElement(x, y);
        this.setInspectedElement(fallback);
        onComplete?.(fallback);
      })
      .catch(() => {
        const fallback = this.createFallbackElement(x, y);
        this.setInspectedElement(fallback);
        onComplete?.(fallback);
      });
  }

  public setInspectedElement(elem: InspectedElement | null) {
    this.currentElement = elem;
    this.notify();
  }

  public getInspectedElement(): InspectedElement | null {
    return this.currentElement;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.currentElement);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentElement);
      } catch {
        // Suppress
      }
    });
  }

  public convertScannedToInspected(scanned: ScannedElement): InspectedElement {
    const frame = {
      left: scanned.bounds.left,
      top: scanned.bounds.top,
      width: Math.max(10, scanned.bounds.width),
      height: Math.max(10, scanned.bounds.height),
    };
    const boxModel = this.extractBoxModel(scanned.style, frame);
    const childrenInfo = this.extractChildrenDetails(scanned.props);

    return {
      name: scanned.name,
      hierarchy: scanned.hierarchy,
      selectedIndex: Math.max(0, scanned.hierarchy.length - 1),
      frame,
      style: scanned.style,
      props: scanned.props,
      colors: scanned.colors,
      boxModel,
      textContent: scanned.text,
      childrenInfo,
      parentButtonIndex: scanned.parentButtonIndex,
      parentButtonName: scanned.parentButtonName,
      functionality: scanned.functionality,
      category: scanned.category,
    };
  }

  public parseViewData(viewData: any, touchX: number, touchY: number): InspectedElement {
    const { hierarchy = [], props = {}, frame = { left: touchX - 25, top: touchY - 25, width: 50, height: 50 }, selectedIndex = 0 } = viewData;

    const flattenedStyle = StyleSheet.flatten(props.style) || {};
    let name = hierarchy[selectedIndex]?.name || hierarchy[hierarchy.length - 1]?.name || 'View';

    let textContent: string | undefined = undefined;
    if (typeof props.children === 'string') {
      textContent = props.children;
    } else if (typeof props.children === 'number') {
      textContent = String(props.children);
    } else if (Array.isArray(props.children)) {
      const strings = props.children.filter((c: any) => typeof c === 'string' || typeof c === 'number');
      if (strings.length > 0) textContent = strings.join('');
    }

    if (!textContent && props.placeholder && typeof props.placeholder === 'string') {
      textContent = props.placeholder;
    }
    if (!textContent && props.value && typeof props.value === 'string') {
      textContent = props.value;
    }
    if (!textContent && props.title && typeof props.title === 'string') {
      textContent = props.title;
    }

    // Normalize native host component names
    if (name === 'RCTText' || name === 'Paragraph' || name === 'RCTVirtualText') {
      name = 'Text';
    } else if (name === 'RCTView' && textContent) {
      name = 'Text';
    } else if (name === 'RCTView') {
      name = 'View';
    } else if (name === 'RCTImageView') {
      name = 'Image';
    } else if (name === 'AndroidTextInput' || name === 'RCTTextInput') {
      name = 'TextInput';
    }

    // 1. Extract colors from element itself
    let colors = this.extractColors(flattenedStyle, props);

    // 2. Hierarchical color inheritance: If element is Text or lacks background, check parent containers!
    const hasBg = colors.some((c) => c.type === 'backgroundColor');
    const hasText = colors.some((c) => c.type === 'color');

    if (!hasBg || !hasText) {
      for (let i = hierarchy.length - 1; i >= 0; i--) {
        const item = hierarchy[i];
        const itemProps = item?.props || {};
        const itemStyle = StyleSheet.flatten(itemProps.style) || {};
        const parentColors = this.extractColors(itemStyle, itemProps);

        if (!hasBg) {
          const parentBg = parentColors.find((c) => c.type === 'backgroundColor');
          if (parentBg && !colors.some((c) => c.type === 'backgroundColor')) {
            colors.push(parentBg);
          }
        }

        if (!hasText) {
          const parentText = parentColors.find((c) => c.type === 'color');
          if (parentText && !colors.some((c) => c.type === 'color')) {
            colors.push(parentText);
          }
        }

        // Also inherit border color if missing
        const parentBorder = parentColors.find((c) => c.type === 'borderColor');
        if (parentBorder && !colors.some((c) => c.type === 'borderColor')) {
          colors.push(parentBorder);
        }
      }
    }

    const BUTTON_NAMES = new Set([
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

    // Only detect as parent button if:
    // 1. It is an immediate parent (distance <= 2 in hierarchy)
    // 2. It is NOT the currently selected element itself
    // 3. It actually has an onPress prop or is an interactive button
    let parentButtonIndex: number | undefined = undefined;
    let parentButtonName: string | undefined = undefined;

    const startIdx = Math.max(0, selectedIndex - 2);
    for (let i = selectedIndex - 1; i >= startIdx; i--) {
      const item = hierarchy[i];
      if (!item) continue;
      const isButtonType = BUTTON_NAMES.has(item.name);
      const hasInteractiveProp = Boolean(
        item.props?.onPress ||
        item.props?.onPressIn ||
        item.props?.onLongPress ||
        item.props?.accessibilityRole === 'button'
      );

      if (isButtonType || hasInteractiveProp) {
        parentButtonIndex = i;
        parentButtonName = item.name;
        break;
      }
    }

    // Extract children elements & text properties
    let childrenInfo = this.extractChildrenDetails(props);
    if (childrenInfo.length === 0 && parentButtonIndex !== undefined) {
      const buttonProps = hierarchy[parentButtonIndex]?.props;
      if (buttonProps) {
        childrenInfo = this.extractChildrenDetails(buttonProps);
      }
    }

    const boxModel = this.extractBoxModel(flattenedStyle, frame);

    return {
      name,
      hierarchy,
      selectedIndex,
      frame: {
        left: frame.left ?? touchX - 25,
        top: frame.top ?? touchY - 25,
        width: Math.max(10, frame.width ?? 50),
        height: Math.max(10, frame.height ?? 50),
      },
      style: flattenedStyle,
      props,
      colors,
      boxModel,
      textContent,
      childrenInfo,
      parentButtonIndex,
      parentButtonName,
    };
  }

  public extractChildrenDetails(props: any): any[] {
    const results: any[] = [];
    if (!props) return results;

    const walk = (node: any) => {
      if (!node) return;
      if (typeof node === 'string' || typeof node === 'number') {
        results.push({
          name: 'Text',
          text: String(node),
        });
        return;
      }

      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }

      if (typeof node === 'object' && node.props) {
        const childProps = node.props;
        const childStyle = StyleSheet.flatten(childProps.style) || {};
        const childColors = this.extractColors(childStyle, childProps);
        const childName =
          node.type?.displayName ||
          node.type?.name ||
          (typeof node.type === 'string' ? node.type : 'Component');

        let text: string | undefined = undefined;
        if (typeof childProps.children === 'string' || typeof childProps.children === 'number') {
          text = String(childProps.children);
        } else if (Array.isArray(childProps.children)) {
          const strParts = childProps.children.filter(
            (c: any) => typeof c === 'string' || typeof c === 'number'
          );
          if (strParts.length > 0) text = strParts.join('');
        }

        results.push({
          name: childName,
          text,
          style: childStyle,
          colors: childColors,
        });

        if (childProps.children && typeof childProps.children !== 'string') {
          walk(childProps.children);
        }
      }
    };

    walk(props.children);
    return results;
  }

  public measureHierarchyIndex(
    hierarchy: any[],
    index: number,
    cb: (frame: { left: number; top: number; width: number; height: number }, props: any) => void
  ) {
    const item = hierarchy[index];
    if (!item) return;

    const props = item.props || {};
    const style = StyleSheet.flatten(props.style) || {};

    const currentElem = this.currentElement;
    const currentFrame = currentElem ? currentElem.frame : { left: 0, top: 0, width: 200, height: 50 };

    const width = typeof style.width === 'number' && style.width > 0 ? style.width : currentFrame.width;
    const height = typeof style.height === 'number' && style.height > 0 ? style.height : currentFrame.height;
    const left = typeof style.left === 'number' ? style.left : currentFrame.left;
    const top = typeof style.top === 'number' ? style.top : currentFrame.top;

    cb(
      {
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(width),
        height: Math.round(height),
      },
      props
    );
  }

  private createFallbackElement(x: number, y: number): InspectedElement {
    const frame = { left: Math.max(0, x - 50), top: Math.max(0, y - 25), width: 100, height: 50 };
    const style: Record<string, any> = {
      backgroundColor: '#3b82f6',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    };

    return {
      name: 'TouchedElement',
      hierarchy: [{ name: 'App' }, { name: 'View' }, { name: 'TouchedElement' }],
      selectedIndex: 2,
      frame,
      style,
      props: {},
      colors: this.extractColors(style),
      boxModel: this.extractBoxModel(style, frame),
      textContent: undefined,
    };
  }

  public extractColors(style: Record<string, any>, props?: Record<string, any>): ElementColorInfo[] {
    const colors: ElementColorInfo[] = [];

    const normalizeColor = (val: any): string | null => {
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
      const normalized = normalizeColor(val);
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

  public extractBoxModel(style: Record<string, any>, frame: { width?: number; height?: number }): BoxModel {
    const resolve = (prefix: 'margin' | 'padding'): BoxModelValues => {
      const all = style[prefix] ?? 0;
      const vertical = style[`${prefix}Vertical`] ?? all;
      const horizontal = style[`${prefix}Horizontal`] ?? all;

      return {
        top: style[`${prefix}Top`] ?? vertical,
        right: style[`${prefix}Right`] ?? horizontal,
        bottom: style[`${prefix}Bottom`] ?? vertical,
        left: style[`${prefix}Left`] ?? horizontal,
      };
    };

    const borderAll = style.borderWidth ?? 0;
    const border: BoxModelValues = {
      top: style.borderTopWidth ?? borderAll,
      right: style.borderRightWidth ?? borderAll,
      bottom: style.borderBottomWidth ?? borderAll,
      left: style.borderLeftWidth ?? borderAll,
    };

    return {
      margin: resolve('margin'),
      padding: resolve('padding'),
      border,
      width: frame.width || style.width || 0,
      height: frame.height || style.height || 0,
    };
  }

  public getContrastRatio(fgHex: string, bgHex: string): { ratio: number; rating: 'AAA' | 'AA' | 'FAIL' } {
    const getLuminance = (hex: string): number => {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map((char) => char + char).join('');
      if (c.length < 6) return 0.5;

      const r = parseInt(c.substring(0, 2), 16) / 255;
      const g = parseInt(c.substring(2, 4), 16) / 255;
      const b = parseInt(c.substring(4, 6), 16) / 255;

      const sRGB = [r, g, b].map((val) => {
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    try {
      const l1 = getLuminance(fgHex);
      const l2 = getLuminance(bgHex);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      const ratio = Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));

      let rating: 'AAA' | 'AA' | 'FAIL' = 'FAIL';
      if (ratio >= 7.0) rating = 'AAA';
      else if (ratio >= 4.5) rating = 'AA';

      return { ratio, rating };
    } catch {
      return { ratio: 1, rating: 'FAIL' };
    }
  }
}

export const uiElementInspector = new UIElementInspectorClass();
