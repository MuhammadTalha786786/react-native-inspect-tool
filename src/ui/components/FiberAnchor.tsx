import React from 'react';
import { View } from 'react-native';
import { screenScanner } from '../../core/ui/ScreenScanner';
import { uiElementInspector } from '../../core/ui/UIElementInspector';

/**
 * FiberAnchor: A lightweight React Class Component rendered inside DevLens.
 * In React Native, every mounted React Class Component instance has `this._reactInternals`
 * (or `this._reactInternalFiber`) attached by React Reconciler.
 * Climbing `curr.return` to the top reaches the application's `HostRoot` FiberNode,
 * enabling complete, 100% reliable discovery of all screen elements, text, styles, and colors.
 */
export class FiberAnchor extends React.Component {
  componentDidMount() {
    this.register();
  }

  componentDidUpdate() {
    this.register();
  }

  private register() {
    try {
      screenScanner.setFiberAnchor(this);
      uiElementInspector.setFiberAnchor(this);
    } catch {
      // Ignore
    }
  }

  render() {
    return (
      <View
        collapsable={false}
        pointerEvents="none"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0.01 }}
      />
    );
  }
}
