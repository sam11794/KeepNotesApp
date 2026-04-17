import {useState, useRef, useCallback, useEffect} from 'react';
import {Animated} from 'react-native';
import {DRAWER_WIDTH} from '../styles/drawerStyles';

export const useDrawer = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerSlideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDrawerOpen) {
      Animated.parallel([
        Animated.timing(drawerSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isDrawerOpen]);

  const openDrawer = useCallback(() => {
    if (isDrawerOpen) return;
    setIsDrawerOpen(true);
  }, [isDrawerOpen]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerSlideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDrawerOpen(false);
    });
  }, []);

  return {
    isDrawerOpen,
    drawerSlideAnim,
    overlayAnim,
    openDrawer,
    closeDrawer,
  };
};
