import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  GestureResponderEvent,
} from 'react-native';
import { InspectedElement } from '../../types';
import { uiElementInspector } from '../../core/ui/UIElementInspector';
import { screenScanner } from '../../core/ui/ScreenScanner';
import { colors } from '../theme';

interface ElementPickerOverlayProps {
  visible: boolean;
  onClose: () => void;
  onOpenDetails: (element: InspectedElement) => void;
  onScanScreen?: () => void;
}

type DragType = 'tl' | 'tr' | 'bl' | 'br' | 'top' | 'bottom' | 'left' | 'right' | 'move' | null;

interface BoxFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const ElementPickerOverlay: React.FC<ElementPickerOverlayProps> = ({
  visible,
  onClose,
  onOpenDetails,
  onScanScreen,
}) => {
  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);
  const [boxFrame, setBoxFrame] = useState<BoxFrame | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const dragTypeRef = useRef<DragType>(null);
  const startTouchRef = useRef<{ x: number; y: number } | null>(null);
  const startFrameRef = useRef<BoxFrame | null>(null);
  const latestFrameRef = useRef<BoxFrame | null>(null);

  const containerStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerDidDragRef = useRef(false);

  // Pre-scan the screen when picker overlay becomes visible
  useEffect(() => {
    if (visible) {
      screenScanner.scan().catch(() => {});
    }
  }, [visible]);

  // Sync boxFrame whenever inspectedElement updates from outside (unless user is actively dragging)
  useEffect(() => {
    if (inspectedElement && !isResizing) {
      const f: BoxFrame = {
        left: Math.round(inspectedElement.frame.left),
        top: Math.round(inspectedElement.frame.top),
        width: Math.max(24, Math.round(inspectedElement.frame.width)),
        height: Math.max(24, Math.round(inspectedElement.frame.height)),
      };
      setBoxFrame(f);
      latestFrameRef.current = f;
    }
  }, [inspectedElement, isResizing]);

  if (!visible) return null;

  // Query element matching the stretched rectangular region
  const handleCommitRegion = (frameToInspect: BoxFrame) => {
    setIsResizing(false);
    dragTypeRef.current = null;

    uiElementInspector.inspectAtBounds(
      frameToInspect.left,
      frameToInspect.top,
      frameToInspect.width,
      frameToInspect.height,
      (elem) => {
        if (elem) {
          setInspectedElement(elem);
          if (elem.frame.width > 20 && elem.frame.height > 20) {
            const nextFrame: BoxFrame = {
              left: Math.round(elem.frame.left),
              top: Math.round(elem.frame.top),
              width: Math.max(24, Math.round(elem.frame.width)),
              height: Math.max(24, Math.round(elem.frame.height)),
            };
            setBoxFrame(nextFrame);
            latestFrameRef.current = nextFrame;
          }
        }
      }
    );
  };

  // Helper to create responder props for resize handles
  const createHandleResponder = (type: DragType) => {
    return {
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderTerminationRequest: () => false,
      onResponderGrant: (e: GestureResponderEvent) => {
        const { pageX, pageY } = e.nativeEvent;
        dragTypeRef.current = type;
        startTouchRef.current = { x: pageX, y: pageY };
        startFrameRef.current = boxFrame ? { ...boxFrame } : null;
        setIsResizing(true);
      },
      onResponderMove: (e: GestureResponderEvent) => {
        const { pageX, pageY } = e.nativeEvent;
        const start = startTouchRef.current;
        const s = startFrameRef.current;
        if (!start || !s) return;

        const dx = pageX - start.x;
        const dy = pageY - start.y;
        let next: BoxFrame = { ...s };

        switch (type) {
          case 'br': {
            next.width = Math.max(24, s.width + dx);
            next.height = Math.max(24, s.height + dy);
            break;
          }
          case 'bl': {
            const newLeft = Math.min(s.left + s.width - 24, s.left + dx);
            next.left = newLeft;
            next.width = Math.max(24, s.width - (newLeft - s.left));
            next.height = Math.max(24, s.height + dy);
            break;
          }
          case 'tr': {
            const newTop = Math.min(s.top + s.height - 24, s.top + dy);
            next.top = newTop;
            next.width = Math.max(24, s.width + dx);
            next.height = Math.max(24, s.height - (newTop - s.top));
            break;
          }
          case 'tl': {
            const newLeft = Math.min(s.left + s.width - 24, s.left + dx);
            const newTop = Math.min(s.top + s.height - 24, s.top + dy);
            next.left = newLeft;
            next.top = newTop;
            next.width = Math.max(24, s.width - (newLeft - s.left));
            next.height = Math.max(24, s.height - (newTop - s.top));
            break;
          }
          case 'top': {
            const newTop = Math.min(s.top + s.height - 24, s.top + dy);
            next.top = newTop;
            next.height = Math.max(24, s.height - (newTop - s.top));
            break;
          }
          case 'bottom': {
            next.height = Math.max(24, s.height + dy);
            break;
          }
          case 'left': {
            const newLeft = Math.min(s.left + s.width - 24, s.left + dx);
            next.left = newLeft;
            next.width = Math.max(24, s.width - (newLeft - s.left));
            break;
          }
          case 'right': {
            next.width = Math.max(24, s.width + dx);
            break;
          }
          case 'move': {
            next.left = Math.max(0, s.left + dx);
            next.top = Math.max(0, s.top + dy);
            break;
          }
        }

        setBoxFrame(next);
        latestFrameRef.current = next;
      },
      onResponderRelease: () => {
        if (latestFrameRef.current) {
          handleCommitRegion(latestFrameRef.current);
        } else {
          setIsResizing(false);
          dragTypeRef.current = null;
        }
      },
    };
  };

  // Background container responder (tap to inspect or drag-to-stretch selection)
  const handleContainerGrant = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    containerStartRef.current = { x: pageX, y: pageY };
    containerDidDragRef.current = false;
  };

  const handleContainerMove = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    const start = containerStartRef.current;
    if (!start) return;

    const dist = Math.hypot(pageX - start.x, pageY - start.y);
    if (dist > 10) {
      containerDidDragRef.current = true;
      setIsResizing(true);
      const l = Math.min(start.x, pageX);
      const t = Math.min(start.y, pageY);
      const w = Math.max(24, Math.abs(pageX - start.x));
      const h = Math.max(24, Math.abs(pageY - start.y));
      const drawn: BoxFrame = { left: l, top: t, width: w, height: h };
      setBoxFrame(drawn);
      latestFrameRef.current = drawn;
    }
  };

  const handleContainerRelease = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    if (!containerDidDragRef.current) {
      // Tap selection: query exact point
      uiElementInspector.inspectAtPoint(pageX, pageY, (elem) => {
        if (elem) {
          setInspectedElement(elem);
          const f: BoxFrame = {
            left: Math.round(elem.frame.left),
            top: Math.round(elem.frame.top),
            width: Math.max(24, Math.round(elem.frame.width)),
            height: Math.max(24, Math.round(elem.frame.height)),
          };
          setBoxFrame(f);
          latestFrameRef.current = f;
        }
      });
    } else {
      // Drag-to-select finished
      if (latestFrameRef.current) {
        handleCommitRegion(latestFrameRef.current);
      }
    }
    containerStartRef.current = null;
    containerDidDragRef.current = false;
  };

  const handleSelectHierarchyIndex = (targetIndex: number) => {
    if (!inspectedElement) return;
    const hierarchy = inspectedElement.hierarchy;
    if (targetIndex < 0 || targetIndex >= hierarchy.length) return;

    uiElementInspector.measureHierarchyIndex(hierarchy, targetIndex, (frame, props) => {
      const parsed = uiElementInspector.parseViewData(
        {
          hierarchy,
          props,
          frame,
          selectedIndex: targetIndex,
        },
        frame.left + frame.width / 2,
        frame.top + frame.height / 2
      );
      setInspectedElement(parsed);
      uiElementInspector.setInspectedElement(parsed);
    });
  };

  const primaryBg = inspectedElement?.colors.find((c) => c.type === 'backgroundColor')?.value;
  const primaryText = inspectedElement?.colors.find((c) => c.type === 'color')?.value;
  const firstChildText = inspectedElement?.childrenInfo?.find((c) => c.text)?.text || inspectedElement?.textContent;

  const hasParent = inspectedElement && inspectedElement.selectedIndex < inspectedElement.hierarchy.length - 1;
  const hasChild = inspectedElement && inspectedElement.selectedIndex > 0;
  const hasParentButton =
    inspectedElement &&
    inspectedElement.parentButtonIndex !== undefined &&
    inspectedElement.parentButtonIndex !== inspectedElement.selectedIndex;

  const isBoxBigEnoughForMove = boxFrame && boxFrame.width >= 60 && boxFrame.height >= 40;

  return (
    <View
      style={styles.container}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleContainerGrant}
      onResponderMove={handleContainerMove}
      onResponderRelease={handleContainerRelease}
    >
      {/* Stretchable / Resizable Target Element Highlight Box */}
      {boxFrame && (
        <View
          pointerEvents="box-none"
          style={[
            styles.highlightBox,
            {
              left: Math.max(0, boxFrame.left),
              top: Math.max(0, boxFrame.top),
              width: Math.max(24, boxFrame.width),
              height: Math.max(24, boxFrame.height),
            },
          ]}
        >
          {/* Tooltip Badge */}
          <View pointerEvents="none" style={styles.tooltip}>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipName}>&lt;{inspectedElement?.name || 'Selection'}&gt;</Text>
              <Text style={styles.tooltipDim}>
                {Math.round(boxFrame.width)} × {Math.round(boxFrame.height)} px
              </Text>
            </View>
            {firstChildText ? (
              <Text style={styles.tooltipText} numberOfLines={1}>
                &ldquo;{firstChildText}&rdquo;
              </Text>
            ) : null}
            <Text style={styles.tooltipHint}>↔ Stretch handles to select & enter UI</Text>
          </View>

          {/* Center Move Grip Handle */}
          {isBoxBigEnoughForMove && (
            <View style={styles.centerMoveGrip} {...createHandleResponder('move')}>
              <Text style={styles.centerMoveGripText}>✥ Move</Text>
            </View>
          )}

          {/* 4 Corner Resize Knobs */}
          <View style={[styles.cornerHandle, styles.handleTL]} {...createHandleResponder('tl')}>
            <View style={styles.handleDot} />
          </View>

          <View style={[styles.cornerHandle, styles.handleTR]} {...createHandleResponder('tr')}>
            <View style={styles.handleDot} />
          </View>

          <View style={[styles.cornerHandle, styles.handleBL]} {...createHandleResponder('bl')}>
            <View style={styles.handleDot} />
          </View>

          <View style={[styles.cornerHandle, styles.handleBR]} {...createHandleResponder('br')}>
            <View style={styles.handleDot} />
          </View>

          {/* 4 Edge Resize Bars */}
          <View style={[styles.edgeHandleH, styles.handleTop]} {...createHandleResponder('top')}>
            <View style={styles.edgeBarH} />
          </View>

          <View style={[styles.edgeHandleH, styles.handleBottom]} {...createHandleResponder('bottom')}>
            <View style={styles.edgeBarH} />
          </View>

          <View style={[styles.edgeHandleV, styles.handleLeft]} {...createHandleResponder('left')}>
            <View style={styles.edgeBarV} />
          </View>

          <View style={[styles.edgeHandleV, styles.handleRight]} {...createHandleResponder('right')}>
            <View style={styles.edgeBarV} />
          </View>
        </View>
      )}

      {/* Floating Bottom Toolbar */}
      <SafeAreaView style={styles.toolbarWrapper}>
        {/* Quick Select Full Button Banner if touched inside a button */}
        {hasParentButton && inspectedElement?.parentButtonIndex !== undefined && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelectHierarchyIndex(inspectedElement.parentButtonIndex!)}
            style={styles.parentButtonBanner}
          >
            <Text style={styles.parentButtonIcon}>🟩</Text>
            <Text style={styles.parentButtonText}>
              Select Entire Button (&lt;{inspectedElement.parentButtonName}&gt;)
            </Text>
            <Text style={styles.parentButtonAction}>Select ➔</Text>
          </TouchableOpacity>
        )}

        <View style={styles.toolbar}>
          <View style={styles.toolLeft}>
            <Text style={styles.toolIcon}>🎯</Text>
            <View style={styles.toolInfo}>
              <View style={styles.toolTitleRow}>
                <Text style={styles.toolTitle}>
                  {inspectedElement ? `<${inspectedElement.name}>` : 'Touch or Stretch Selection'}
                </Text>
                {/* Hierarchy Steppers: Parent / Child */}
                {inspectedElement && (
                  <View style={styles.stepperRow}>
                    {hasParent && (
                      <TouchableOpacity
                        onPress={() => handleSelectHierarchyIndex(inspectedElement.selectedIndex + 1)}
                        style={styles.stepBtn}
                      >
                        <Text style={styles.stepBtnText}>▲ Parent</Text>
                      </TouchableOpacity>
                    )}
                    {hasChild && (
                      <TouchableOpacity
                        onPress={() => handleSelectHierarchyIndex(inspectedElement.selectedIndex - 1)}
                        style={styles.stepBtn}
                      >
                        <Text style={styles.stepBtnText}>▼ Child</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <Text style={styles.toolSub} numberOfLines={1}>
                {inspectedElement
                  ? `${Math.round(boxFrame?.width || 0)}×${Math.round(boxFrame?.height || 0)}px ${primaryBg ? `• bg: ${primaryBg}` : ''} ${primaryText ? `• text: ${primaryText}` : ''} ${firstChildText ? `• "${firstChildText}"` : ''}`
                  : 'Tap or drag handles to stretch box across any UI element'}
              </Text>
            </View>
          </View>

          <View style={styles.toolActions}>
            <TouchableOpacity
              onPress={() => {
                onScanScreen?.();
                onClose();
              }}
              style={styles.scanBtn}
            >
              <Text style={styles.scanBtnText}>⚡ Scan</Text>
            </TouchableOpacity>

            {inspectedElement && (
              <TouchableOpacity
                onPress={() => {
                  onOpenDetails(inspectedElement);
                  onClose();
                }}
                style={styles.detailBtn}
              >
                <Text style={styles.detailBtnText}>Inspect Details ↗</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    zIndex: 999999,
    elevation: 999999,
  },
  highlightBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderRadius: 4,
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    backgroundColor: '#0f172a',
    borderColor: '#38bdf8',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 12,
    maxWidth: 320,
    gap: 2,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipName: {
    color: '#38bdf8',
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '800',
  },
  tooltipDim: {
    color: '#cbd5e1',
    fontSize: 10,
    fontFamily: 'Courier',
  },
  tooltipText: {
    color: '#facc15',
    fontSize: 10,
    fontStyle: 'italic',
    maxWidth: 240,
  },
  tooltipHint: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.9,
  },
  centerMoveGrip: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -11,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: '#38bdf8',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 4,
  },
  centerMoveGripText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  // 4 Corner Knobs
  cornerHandle: {
    position: 'absolute',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  handleTL: {
    top: -16,
    left: -16,
  },
  handleTR: {
    top: -16,
    right: -16,
  },
  handleBL: {
    bottom: -16,
    left: -16,
  },
  handleBR: {
    bottom: -16,
    right: -16,
  },
  handleDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#38bdf8',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 8,
  },
  // 4 Edge Bars
  edgeHandleH: {
    position: 'absolute',
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9,
  },
  handleTop: {
    top: -10,
  },
  handleBottom: {
    bottom: -10,
  },
  edgeBarH: {
    width: 24,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#38bdf8',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 6,
  },
  edgeHandleV: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9,
  },
  handleLeft: {
    left: -10,
  },
  handleRight: {
    right: -10,
  },
  edgeBarV: {
    width: 5,
    height: 24,
    borderRadius: 2.5,
    backgroundColor: '#38bdf8',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 6,
  },
  toolbarWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 14,
    right: 14,
    gap: 8,
  },
  parentButtonBanner: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
  },
  parentButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  parentButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  parentButtonAction: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '800',
  },
  toolbar: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 15,
    gap: 8,
  },
  toolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toolIcon: {
    fontSize: 22,
  },
  toolInfo: {
    flex: 1,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 4,
  },
  stepBtn: {
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepBtnText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '700',
  },
  toolSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  toolActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanBtn: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  scanBtnText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '800',
  },
  detailBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  detailBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});
