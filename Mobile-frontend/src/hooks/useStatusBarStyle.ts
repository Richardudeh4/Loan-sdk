import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';

/**
 * Set the status bar style whenever the calling screen gains focus.
 * Tab screens stay mounted, so a declarative <StatusBar> would fight between
 * tabs — focus-driven is the reliable approach.
 */
export function useStatusBarStyle(style: 'light' | 'dark') {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style, true);
    }, [style]),
  );
}
