import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  ElementCategory,
  InspectedElement,
  ScannedElement,
  ScreenScanResult,
} from '../../types';
import { uiElementInspector } from '../../core/ui/UIElementInspector';
import { screenScanner } from '../../core/ui/ScreenScanner';
import { colors } from '../theme';
import { BoxModelViewer } from '../components/BoxModelViewer';
import { ColorSwatch } from '../components/ColorSwatch';
import { FiberAnchor } from '../components/FiberAnchor';

const normalizeHex = (colorStr: string): string => {
  if (!colorStr) return '';
  let s = colorStr.trim().toUpperCase();
  if (/^#[0-9A-F]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return s.substring(0, 7);
};

interface ElementsTabProps {
  inspectedElement: InspectedElement | null;
  onStartTouchInspect: () => void;
  onSelectHierarchyIndex: (index: number) => void;
  initialMode?: 'details' | 'scanner';
}

export const ElementsTab: React.FC<ElementsTabProps> = ({
  inspectedElement,
  onStartTouchInspect,
  onSelectHierarchyIndex,
  initialMode,
}) => {
  // Navigation / Mode state
  const [viewMode, setViewMode] = useState<'details' | 'scanner'>(
    initialMode || (inspectedElement ? 'details' : 'scanner')
  );

  useEffect(() => {
    if (initialMode) {
      setViewMode(initialMode);
    }
  }, [initialMode]);

  // Scanner state
  const [scanResult, setScanResult] = useState<ScreenScanResult | null>(() => {
    try {
      return screenScanner?.getLatestResult ? screenScanner.getLatestResult() : null;
    } catch {
      return null;
    }
  });
  const [isScanning, setIsScanning] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | ElementCategory>('all');
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedColorFeedback, setCopiedColorFeedback] = useState<string | null>(null);

  // Details inspector state
  const [styleFilter, setStyleFilter] = useState('');

  // Auto-subscribe to ScreenScanner
  useEffect(() => {
    let unsub: (() => void) | undefined = undefined;
    try {
      if (screenScanner && typeof screenScanner.subscribe === 'function') {
        unsub = screenScanner.subscribe((res) => {
          if (res && res.elements.length > 0) {
            setScanResult(res);
          }
        });
      }
      const current = screenScanner?.getLatestResult ? screenScanner.getLatestResult() : null;
      if (current && current.elements.length > 0) {
        setScanResult(current);
      } else {
        handleScanScreen();
      }
    } catch {
      // Safe fallback
    }
    return () => {
      unsub?.();
    };
  }, []);

  // When inspectedElement changes from outside (e.g. touch inspector), switch to details ONLY if not forced to scanner
  useEffect(() => {
    if (inspectedElement && initialMode !== 'scanner') {
      setViewMode('details');
    }
  }, [inspectedElement, initialMode]);

  const handleScanScreen = async () => {
    if (!screenScanner || typeof screenScanner.scan !== 'function') return;
    setIsScanning(true);
    setViewMode('scanner');
    try {
      const res = await screenScanner.scan();
      if (res && res.elements.length > 0) {
        setScanResult(res);
      } else {
        const cached = screenScanner.getLatestResult();
        if (cached && cached.elements.length > 0) {
          setScanResult(cached);
        } else if (res) {
          setScanResult(res);
        }
      }
      setViewMode('scanner');
    } catch {
      // Fallback
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectScannedElement = (elem: ScannedElement) => {
    const inspected = uiElementInspector.convertScannedToInspected(elem);
    uiElementInspector.setInspectedElement(inspected);
    setViewMode('details');
  };

  const handleCopyColor = (hex: string) => {
    setCopiedColorFeedback(hex);
    setTimeout(() => {
      setCopiedColorFeedback(null);
    }, 1800);
  };

  const handleToggleColorFilter = (hex: string) => {
    if (colorFilter === hex) {
      setColorFilter(null);
    } else {
      setColorFilter(hex);
      setViewMode('scanner');
    }
  };

  // Filter scanned elements
  const allElements = scanResult?.elements || [];
  const filteredElements = allElements.filter((elem) => {
    // 1. Category filter
    if (categoryFilter !== 'all' && elem.category !== categoryFilter) {
      return false;
    }

    // 2. Color filter
    if (colorFilter) {
      const hasColor = elem.colors.some(
        (c) => normalizeHex(c.value) === colorFilter
      );
      if (!hasColor) return false;
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = elem.name.toLowerCase().includes(q);
      const matchText = elem.text?.toLowerCase().includes(q);
      const matchFunc = elem.functionality.some((f) => f.toLowerCase().includes(q));
      if (!matchName && !matchText && !matchFunc) return false;
    }

    return true;
  });

  // Calculate contrast for inspected element
  const frame = inspectedElement?.frame;
  const style = inspectedElement?.style || {};
  const extractedColors = inspectedElement?.colors || [];
  const bgColor = extractedColors.find((c) => c.type === 'backgroundColor')?.value;
  const textColor = extractedColors.find((c) => c.type === 'color')?.value;
  let contrastInfo: { ratio: number; rating: 'AAA' | 'AA' | 'FAIL' } | null = null;
  if (bgColor && textColor && bgColor.startsWith('#') && textColor.startsWith('#')) {
    contrastInfo = uiElementInspector.getContrastRatio(textColor, bgColor);
  }

  // Filter styles in details
  const styleEntries = Object.entries(style).filter(([k]) => {
    if (!styleFilter.trim()) return true;
    return k.toLowerCase().includes(styleFilter.toLowerCase());
  });

  const renderCommonHeader = () => (
    <>
      <FiberAnchor />
      {/* Top Action Bar: Touch Inspector & Scan Screen */}
      <View style={styles.topActionsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onStartTouchInspect}
          style={styles.touchInspectBtn}
        >
          <Text style={styles.actionBtnIcon}>🎯</Text>
          <View style={styles.actionBtnTextCol}>
            <Text style={styles.actionBtnTitle}>Touch Inspector</Text>
            <Text style={styles.actionBtnSub}>Tap any UI element</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleScanScreen}
          disabled={isScanning}
          style={[styles.scanScreenBtn, isScanning && styles.btnDisabled]}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#ffffff" style={styles.spinner} />
          ) : (
            <Text style={styles.actionBtnIcon}>⚡</Text>
          )}
          <View style={styles.actionBtnTextCol}>
            <Text style={styles.actionBtnTitle}>
              {isScanning ? 'Scanning...' : 'Scan Screen'}
            </Text>
            <Text style={styles.actionBtnSub}>
              {scanResult ? `${scanResult.elements.length} elements` : 'Detect all UI'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Screen Color Palette Section */}
      {scanResult && scanResult.palette.length > 0 && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleWithIcon}>
              <Text style={styles.sectionIcon}>🎨</Text>
              <Text style={styles.cardTitle}>
                Screen Color Palette ({scanResult.palette.length})
              </Text>
            </View>
            {colorFilter && (
              <TouchableOpacity
                onPress={() => setColorFilter(null)}
                style={styles.clearFilterBtn}
              >
                <Text style={styles.clearFilterText}>Clear Filter ✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.cardDesc}>
            Aggregated colors across the current screen. Tap to filter elements or copy HEX code:
          </Text>

          {copiedColorFeedback && (
            <View style={styles.copiedBanner}>
              <Text style={styles.copiedBannerText}>
                ✓ Copied {copiedColorFeedback} to clipboard!
              </Text>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paletteScroll}>
            {scanResult.palette.map((p) => {
              const isSelected = colorFilter === p.hex;
              return (
                <TouchableOpacity
                  key={p.hex}
                  activeOpacity={0.7}
                  onPress={() => {
                    handleCopyColor(p.hex);
                    handleToggleColorFilter(p.hex);
                  }}
                  style={[
                    styles.paletteChip,
                    isSelected && styles.paletteChipActive,
                  ]}
                >
                  <View style={[styles.paletteColorBox, { backgroundColor: p.hex }]} />
                  <View style={styles.paletteInfo}>
                    <Text style={styles.paletteHex}>{p.hex}</Text>
                    <View style={styles.paletteMetaRow}>
                      <Text style={styles.paletteCount}>{p.count}×</Text>
                      {p.types.slice(0, 1).map((t) => (
                        <Text key={t} style={styles.paletteTypeBadge}>
                          {t === 'backgroundColor' ? 'BG' : t === 'color' ? 'TXT' : 'BRD'}
                        </Text>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* View Mode Switcher Segment */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          onPress={() => setViewMode('scanner')}
          style={[styles.segmentBtn, viewMode === 'scanner' && styles.segmentBtnActive]}
        >
          <Text
            style={[
              styles.segmentBtnText,
              viewMode === 'scanner' && styles.segmentBtnTextActive,
            ]}
          >
            📱 Scanned Screen Elements ({allElements.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setViewMode('details')}
          style={[styles.segmentBtn, viewMode === 'details' && styles.segmentBtnActive]}
        >
          <Text
            style={[
              styles.segmentBtnText,
              viewMode === 'details' && styles.segmentBtnTextActive,
            ]}
          >
            🎯 Element Details {inspectedElement ? `(<${inspectedElement.name}>)` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const scannerHeader = (
    <View style={styles.scannerHeaderWrapper}>
      {renderCommonHeader()}

      {/* Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <TouchableOpacity
          onPress={() => setCategoryFilter('all')}
          style={[styles.catChip, categoryFilter === 'all' && styles.catChipActive]}
        >
          <Text style={[styles.catChipText, categoryFilter === 'all' && styles.catChipTextActive]}>
            All ({allElements.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCategoryFilter('button')}
          style={[styles.catChip, categoryFilter === 'button' && styles.catChipActive]}
        >
          <Text style={[styles.catChipText, categoryFilter === 'button' && styles.catChipTextActive]}>
            Buttons ({scanResult?.stats.buttons ?? 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCategoryFilter('text')}
          style={[styles.catChip, categoryFilter === 'text' && styles.catChipActive]}
        >
          <Text style={[styles.catChipText, categoryFilter === 'text' && styles.catChipTextActive]}>
            Text ({scanResult?.stats.texts ?? 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCategoryFilter('input')}
          style={[styles.catChip, categoryFilter === 'input' && styles.catChipActive]}
        >
          <Text style={[styles.catChipText, categoryFilter === 'input' && styles.catChipTextActive]}>
            Inputs ({scanResult?.stats.inputs ?? 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCategoryFilter('image')}
          style={[styles.catChip, categoryFilter === 'image' && styles.catChipActive]}
        >
          <Text style={[styles.catChipText, categoryFilter === 'image' && styles.catChipTextActive]}>
            Images ({scanResult?.stats.images ?? 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCategoryFilter('container')}
          style={[styles.catChip, categoryFilter === 'container' && styles.catChipActive]}
        >
          <Text style={[styles.catChipText, categoryFilter === 'container' && styles.catChipTextActive]}>
            Containers ({scanResult?.stats.containers ?? 0})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Search Box */}
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search elements by text, component, or functionality..."
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {colorFilter && (
        <View style={styles.activeFilterNotice}>
          <View style={[styles.activeFilterDot, { backgroundColor: colorFilter }]} />
          <Text style={styles.activeFilterText}>
            Showing elements using color <Text style={styles.activeFilterCode}>{colorFilter}</Text> ({filteredElements.length})
          </Text>
          <TouchableOpacity onPress={() => setColorFilter(null)}>
            <Text style={styles.activeFilterClear}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderScannedElementItem = ({ item }: { item: ScannedElement }) => {
    const isButton = item.category === 'button';
    const isText = item.category === 'text';
    const isInput = item.category === 'input';
    const isImage = item.category === 'image';

    return (
      <View style={styles.elementCard}>
        {/* Card Header: Category Badge + Component Name + Bounds */}
        <View style={styles.elementCardHeader}>
          <View style={styles.elementCardHeaderLeft}>
            <View
              style={[
                styles.categoryPill,
                isButton && styles.pillButton,
                isText && styles.pillText,
                isInput && styles.pillInput,
                isImage && styles.pillImage,
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  isButton && styles.pillTextButton,
                  isText && styles.pillTextText,
                  isInput && styles.pillTextInput,
                  isImage && styles.pillTextImage,
                ]}
              >
                {item.category.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.elementComponentName}>&lt;{item.name}&gt;</Text>
          </View>

          {item.bounds.width > 0 && item.bounds.height > 0 && (
            <Text style={styles.elementBoundsText}>
              {Math.round(item.bounds.width)} × {Math.round(item.bounds.height)} px
            </Text>
          )}
        </View>

        {/* Text Content Preview */}
        {item.text ? (
          <View style={styles.elementTextPreviewBox}>
            <Text style={styles.elementTextPreview} selectable>
              &ldquo;{item.text}&rdquo;
            </Text>
          </View>
        ) : null}

        {/* Functionality & Triggers */}
        {item.functionality.length > 0 && (
          <View style={styles.functionalityRow}>
            {item.functionality.map((func, fIdx) => (
              <View key={fIdx} style={styles.funcBadge}>
                <Text style={styles.funcBadgeText}>{func}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Element Colors Swatches */}
        {item.colors.length > 0 && (
          <View style={styles.elemColorsRow}>
            <Text style={styles.elemColorsLabel}>Colors:</Text>
            {item.colors.map((c, cIdx) => (
              <View key={cIdx} style={styles.elemMiniSwatch}>
                <View
                  style={[
                    styles.elemMiniColorDot,
                    { backgroundColor: c.value === 'transparent' ? 'transparent' : c.value },
                  ]}
                />
                <Text style={styles.elemMiniColorCode}>{c.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Card Actions */}
        <View style={styles.elementCardActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelectScannedElement(item)}
            style={styles.inspectElementBtn}
          >
            <Text style={styles.inspectElementBtnText}>Inspect Details ➔</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderScannerEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>
        {allElements.length === 0 ? 'Screen Not Scanned Yet' : 'No Elements Found'}
      </Text>
      <Text style={styles.emptyText}>
        {allElements.length === 0
          ? 'Scan the current screen to automatically detect buttons, text, inputs, colors, and layout.'
          : 'No elements match your current filters. Try resetting the category or search query.'}
      </Text>
      {allElements.length === 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleScanScreen}
          disabled={isScanning}
          style={styles.scanNowActionBtn}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.scanNowActionBtnText}>⚡ Scan Screen Now</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  if (viewMode === 'scanner') {
    return (
      <FlatList
        data={filteredElements}
        keyExtractor={(item) => item.id}
        renderItem={renderScannedElementItem}
        ListHeaderComponent={scannerHeader}
        ListEmptyComponent={renderScannerEmpty}
        style={styles.container}
        contentContainerStyle={styles.content}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderCommonHeader()}

      {/* MODE 2: INSPECTED ELEMENT DETAILS */}
      {inspectedElement ? (
            <>
              {/* Component Info Card */}
              <View style={styles.card}>
                <View style={styles.elementHeader}>
                  <View style={styles.namePill}>
                    <Text style={styles.namePillText}>&lt;{inspectedElement.name}&gt;</Text>
                  </View>
                  <View style={styles.elementHeaderRight}>
                    {frame && (
                      <Text style={styles.frameText}>
                        {Math.round(frame.width)} × {Math.round(frame.height)} px
                      </Text>
                    )}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setViewMode('scanner')}
                      style={styles.backToScannerChip}
                    >
                      <Text style={styles.backToScannerChipText}>← All Elements ({allElements.length})</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Hierarchy Breadcrumbs */}
                {inspectedElement.hierarchy.length > 0 && (
                  <View style={styles.breadcrumbContainer}>
                    <Text style={styles.breadcrumbLabel}>Hierarchy Tree:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbScroll}>
                      {inspectedElement.hierarchy.map((item, idx) => {
                        const isSelected = idx === inspectedElement.selectedIndex;
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => onSelectHierarchyIndex(idx)}
                            style={[styles.breadItem, isSelected && styles.breadItemActive]}
                          >
                            <Text style={[styles.breadItemText, isSelected && styles.breadItemTextActive]}>
                              {item.name}
                            </Text>
                            {idx < inspectedElement.hierarchy.length - 1 && (
                              <Text style={styles.breadSep}>›</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Text Node Content */}
                {inspectedElement.textContent && (
                  <View style={styles.textContentBox}>
                    <Text style={styles.textContentLabel}>Text Content:</Text>
                    <Text style={styles.textContentValue} selectable>
                      &ldquo;{inspectedElement.textContent}&rdquo;
                    </Text>
                  </View>
                )}

                {/* Functionality if detected */}
                {inspectedElement.functionality && inspectedElement.functionality.length > 0 && (
                  <View style={styles.functionalitySection}>
                    <Text style={styles.breadcrumbLabel}>Functionality & Handlers:</Text>
                    <View style={styles.functionalityRow}>
                      {inspectedElement.functionality.map((func, fIdx) => (
                        <View key={fIdx} style={styles.funcBadge}>
                          <Text style={styles.funcBadgeText}>{func}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Child Elements & Text Properties Card */}
              {inspectedElement.childrenInfo && inspectedElement.childrenInfo.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.cardTitle}>Child Elements & Text Properties</Text>
                    <Text style={styles.cardBadge}>{inspectedElement.childrenInfo.length} found</Text>
                  </View>

                  {inspectedElement.childrenInfo.map((child, idx) => (
                    <View key={idx} style={styles.childBox}>
                      <View style={styles.childHeader}>
                        <View style={styles.childPill}>
                          <Text style={styles.childPillText}>&lt;{child.name}&gt;</Text>
                        </View>
                        {child.text && (
                          <Text style={styles.childTextPreview} selectable numberOfLines={2}>
                            &ldquo;{child.text}&rdquo;
                          </Text>
                        )}
                      </View>

                      {/* Child Colors */}
                      {child.colors && child.colors.length > 0 && (
                        <View style={styles.childColorsSection}>
                          <Text style={styles.childSubHeading}>Child Colors:</Text>
                          {child.colors.map((c, cIdx) => (
                            <ColorSwatch key={cIdx} colorInfo={c} />
                          ))}
                        </View>
                      )}

                      {/* Child Styles */}
                      {child.style && Object.keys(child.style).length > 0 && (
                        <View style={styles.childStyleSection}>
                          <Text style={styles.childSubHeading}>Child Typography & Styles:</Text>
                          <View style={styles.childStyleGrid}>
                            {Object.entries(child.style).map(([k, v]) => (
                              <View key={k} style={styles.childStyleRow}>
                                <Text style={styles.childStyleKey}>{k}:</Text>
                                <Text style={styles.childStyleVal} selectable>
                                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Colors & Accessibility Card */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.cardTitle}>Colors & Accessibility</Text>
                  <Text style={styles.cardBadge}>{extractedColors.length} detected</Text>
                </View>

                {extractedColors.length > 0 ? (
                  extractedColors.map((colorInfo, idx) => (
                    <ColorSwatch key={idx} colorInfo={colorInfo} />
                  ))
                ) : (
                  <Text style={styles.emptyNotice}>
                    No explicit color properties defined on this element (inherits transparent/default).
                  </Text>
                )}

                {/* Contrast Ratio */}
                {contrastInfo && (
                  <View style={styles.contrastBox}>
                    <View style={styles.contrastHeader}>
                      <Text style={styles.contrastTitle}>Text / Background Contrast</Text>
                      <View
                        style={[
                          styles.ratingPill,
                          contrastInfo.rating === 'FAIL' ? styles.ratingFail : styles.ratingPass,
                        ]}
                      >
                        <Text style={styles.ratingText}>
                          {contrastInfo.rating === 'FAIL' ? 'FAIL' : `${contrastInfo.rating} PASS`}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.contrastSub}>
                      Ratio: <Text style={styles.contrastRatio}>{contrastInfo.ratio}:1</Text> (WCAG AA requires 4.5:1)
                    </Text>
                  </View>
                )}
              </View>

              {/* Box Model Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Box Model</Text>
                <Text style={styles.cardDesc}>
                  Margin (orange), Border (yellow), Padding (green), Content (blue)
                </Text>
                <BoxModelViewer boxModel={inspectedElement.boxModel} />
              </View>

              {/* Computed Styles Card */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.cardTitle}>Computed Styles ({styleEntries.length})</Text>
                </View>

                <TextInput
                  style={styles.searchStyleInput}
                  value={styleFilter}
                  onChangeText={setStyleFilter}
                  placeholder="Search styles (e.g. font, padding, border)..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View style={styles.styleTable}>
                  {styleEntries.length > 0 ? (
                    styleEntries.map(([key, value]) => {
                      let formattedValue = '';
                      if (typeof value === 'object' && value !== null) {
                        formattedValue = JSON.stringify(value);
                      } else {
                        formattedValue = String(value);
                      }

                      const isColorKey = key.toLowerCase().includes('color');

                      return (
                        <View key={key} style={styles.styleRow}>
                          <Text style={styles.styleKey} selectable>{key}:</Text>
                          <View style={styles.styleValWrapper}>
                            {isColorKey && (
                              <View style={[styles.inlineColorDot, { backgroundColor: formattedValue }]} />
                            )}
                            <Text style={styles.styleValue} selectable>
                              {formattedValue}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyNotice}>No styles match filter &ldquo;{styleFilter}&rdquo;</Text>
                  )}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Element Selected</Text>
              <Text style={styles.emptyText}>
                Use the &ldquo;Touch Inspector&rdquo; button above to tap any element, or switch to the &ldquo;Scanned Screen Elements&rdquo; tab to choose from detected elements.
              </Text>
            </View>
          )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 12,
    paddingBottom: 40,
    gap: 12,
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  touchInspectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  scanScreenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  actionBtnIcon: {
    fontSize: 22,
  },
  spinner: {
    marginRight: 4,
  },
  actionBtnTextCol: {
    flex: 1,
  },
  actionBtnTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  actionBtnSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIcon: {
    fontSize: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  cardBadge: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  cardDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 15,
  },
  clearFilterBtn: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearFilterText: {
    color: colors.error,
    fontSize: 10,
    fontWeight: '700',
  },
  copiedBanner: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  copiedBannerText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  paletteScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  paletteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    marginRight: 8,
  },
  paletteChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#312e81',
  },
  paletteColorBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  paletteInfo: {
    gap: 2,
  },
  paletteHex: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '700',
  },
  paletteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paletteCount: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: 'Courier',
  },
  paletteTypeBadge: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '800',
    backgroundColor: '#1e293b',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardSecondary,
    borderRadius: 8,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  scannerWrapper: {
    gap: 10,
  },
  scannerHeaderWrapper: {
    gap: 10,
    marginBottom: 6,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  catChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 6,
  },
  catChipActive: {
    backgroundColor: '#3730a3',
    borderColor: colors.primary,
  },
  catChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    color: colors.text,
    fontSize: 12,
  },
  activeFilterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  activeFilterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  activeFilterText: {
    color: '#ffffff',
    fontSize: 11,
    flex: 1,
  },
  activeFilterCode: {
    color: '#facc15',
    fontFamily: 'Courier',
    fontWeight: '700',
  },
  activeFilterClear: {
    color: colors.error,
    fontSize: 11,
    fontWeight: '800',
  },
  elementCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  elementCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  elementCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  pillButton: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  pillText: {
    backgroundColor: '#312e81',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  pillInput: {
    backgroundColor: '#581c87',
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  pillImage: {
    backgroundColor: '#7c2d12',
    borderWidth: 1,
    borderColor: '#f97316',
  },
  categoryPillText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'Courier',
  },
  pillTextButton: {
    color: '#6ee7b7',
  },
  pillTextText: {
    color: '#a5b4fc',
  },
  pillTextInput: {
    color: '#e9d5ff',
  },
  pillTextImage: {
    color: '#fdba74',
  },
  elementComponentName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Courier',
  },
  elementBoundsText: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  elementTextPreviewBox: {
    backgroundColor: '#121214',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elementTextPreview: {
    color: '#facc15',
    fontSize: 13,
    fontWeight: '600',
  },
  functionalityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  funcBadge: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  funcBadgeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  elemColorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  elemColorsLabel: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  elemMiniSwatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  elemMiniColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  elemMiniColorCode: {
    color: '#cbd5e1',
    fontSize: 9,
    fontFamily: 'Courier',
  },
  elementCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  inspectElementBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inspectElementBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  elementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  namePill: {
    backgroundColor: '#312e81',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  namePillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Courier',
  },
  frameText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Courier',
  },
  elementHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backToScannerChip: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  backToScannerChipText: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '700',
  },
  breadcrumbContainer: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breadcrumbLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  breadcrumbScroll: {
    flexDirection: 'row',
  },
  breadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  breadItemActive: {
    backgroundColor: colors.cardSecondary,
  },
  breadItemText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Courier',
  },
  breadItemTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  breadSep: {
    color: colors.textMuted,
    marginHorizontal: 4,
    fontSize: 12,
  },
  textContentBox: {
    backgroundColor: '#121214',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textContentLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  textContentValue: {
    color: '#e2e8f0',
    fontSize: 12,
    fontStyle: 'italic',
  },
  functionalitySection: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyNotice: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginVertical: 4,
  },
  contrastBox: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contrastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contrastTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  ratingPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingPass: {
    backgroundColor: '#14532d',
  },
  ratingFail: {
    backgroundColor: '#7f1d1d',
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  contrastSub: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  contrastRatio: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  searchStyleInput: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 34,
    color: colors.text,
    fontSize: 12,
    marginVertical: 8,
  },
  styleTable: {
    gap: 4,
  },
  styleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b34',
  },
  styleKey: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '600',
  },
  styleValWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  styleValue: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Courier',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  scanNowActionBtn: {
    marginTop: 14,
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  scanNowActionBtnText: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '800',
  },
  childBox: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  childPill: {
    backgroundColor: '#312e81',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  childPillText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Courier',
  },
  childTextPreview: {
    color: '#facc15',
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
  childColorsSection: {
    marginTop: 6,
  },
  childSubHeading: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  childStyleSection: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  childStyleGrid: {
    gap: 3,
  },
  childStyleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  childStyleKey: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Courier',
  },
  childStyleVal: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '600',
  },
});
