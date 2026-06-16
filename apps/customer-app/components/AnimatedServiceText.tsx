import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { AppText } from '../src/components/ui';

interface AnimatedServiceTextProps {
  items: string[];
  interval?: number;
}

export function AnimatedServiceText({ items, interval = 2500 }: AnimatedServiceTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const cycleText = () => {
      // Fade out and move up
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(-15, { duration: 300 }, (finished) => {
        if (finished) {
          // Update text
          runOnJS(setCurrentIndex)((currentIndex + 1) % items.length);
          // Move to bottom (invisible)
          translateY.value = 15;
          // Fade in and move to center
          opacity.value = withTiming(1, { duration: 300 });
          translateY.value = withTiming(0, { duration: 300 });
        }
      });
    };

    const timer = setInterval(cycleText, interval);
    return () => clearInterval(timer);
  }, [currentIndex, items, interval]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle}>
        <AppText variant="small" semibold color="secondary" center numberOfLines={1}>
          {items[currentIndex]}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 20, // Fixed height to prevent layout shift during animation
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
