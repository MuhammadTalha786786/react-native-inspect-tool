import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BoxModel } from '../../types';

interface BoxModelViewerProps {
  boxModel: BoxModel;
}

export const BoxModelViewer: React.FC<BoxModelViewerProps> = ({ boxModel }) => {
  const { margin, border, padding, width, height } = boxModel;

  const formatVal = (val: number | undefined) => (val !== undefined ? Math.round(val) : '-');

  return (
    <View style={styles.container}>
      {/* Margin Outer Box */}
      <View style={styles.marginBox}>
        <Text style={[styles.boxLabel, styles.marginLabel]}>margin</Text>
        <Text style={[styles.posVal, styles.topVal]}>{formatVal(margin.top)}</Text>

        <View style={styles.midRow}>
          <Text style={[styles.posVal, styles.sideVal]}>{formatVal(margin.left)}</Text>

          {/* Border Box */}
          <View style={styles.borderBox}>
            <Text style={[styles.boxLabel, styles.borderLabel]}>border</Text>
            <Text style={[styles.posVal, styles.topVal]}>{formatVal(border.top)}</Text>

            <View style={styles.midRow}>
              <Text style={[styles.posVal, styles.sideVal]}>{formatVal(border.left)}</Text>

              {/* Padding Box */}
              <View style={styles.paddingBox}>
                <Text style={[styles.boxLabel, styles.paddingLabel]}>padding</Text>
                <Text style={[styles.posVal, styles.topVal]}>{formatVal(padding.top)}</Text>

                <View style={styles.midRow}>
                  <Text style={[styles.posVal, styles.sideVal]}>{formatVal(padding.left)}</Text>

                  {/* Content Dimensions Center Box */}
                  <View style={styles.contentBox}>
                    <Text style={styles.contentDimensions}>
                      {Math.round(width)} × {Math.round(height)}
                    </Text>
                  </View>

                  <Text style={[styles.posVal, styles.sideVal]}>{formatVal(padding.right)}</Text>
                </View>

                <Text style={[styles.posVal, styles.botVal]}>{formatVal(padding.bottom)}</Text>
              </View>

              <Text style={[styles.posVal, styles.sideVal]}>{formatVal(border.right)}</Text>
            </View>

            <Text style={[styles.posVal, styles.botVal]}>{formatVal(border.bottom)}</Text>
          </View>

          <Text style={[styles.posVal, styles.sideVal]}>{formatVal(margin.right)}</Text>
        </View>

        <Text style={[styles.posVal, styles.botVal]}>{formatVal(margin.bottom)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  marginBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#f59e0b',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  borderBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.18)',
    borderWidth: 1,
    borderColor: '#eab308',
    borderRadius: 4,
    padding: 6,
    alignItems: 'center',
    flex: 1,
  },
  paddingBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 4,
    padding: 6,
    alignItems: 'center',
    flex: 1,
  },
  contentBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.28)',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 2,
    gap: 4,
  },
  boxLabel: {
    fontSize: 9,
    fontFamily: 'Courier',
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  marginLabel: {
    color: '#f59e0b',
  },
  borderLabel: {
    color: '#eab308',
  },
  paddingLabel: {
    color: '#10b981',
  },
  posVal: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '600',
  },
  topVal: {
    marginBottom: 2,
  },
  botVal: {
    marginTop: 2,
  },
  sideVal: {
    paddingHorizontal: 2,
  },
  contentDimensions: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Courier',
  },
});
