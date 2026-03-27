import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const Blob = ({ color, startPos, duration }) => {
  const anim = useRef(new Animated.ValueXY(startPos)).current;

  useEffect(() => {
    const move = () => {
      Animated.sequence([
        Animated.timing(anim, {
          toValue: {
            x: Math.random() * width,
            y: Math.random() * height,
          },
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: startPos,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => move());
    };
    move();
  }, []);

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          backgroundColor: color,
          transform: anim.getTranslateTransform(),
        },
      ]}
    />
  );
};

export default function MeshGradient() {
  return (
    <View style={styles.container}>
      <Blob color="#DBEAFE" startPos={{ x: 0, y: 0 }} duration={10000} />
      <Blob color="#DCFCE7" startPos={{ x: width, y: 0 }} duration={12000} />
      <Blob color="#FDFCF0" startPos={{ x: 0, y: height }} duration={15000} />
      <Blob color="#FFEDD5" startPos={{ x: width, y: height }} duration={18000} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAF9F6',
    zIndex: -1,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: (width * 1.5) / 2,
    opacity: 0.3,
    // Blur simulation using large size and low opacity
  },
});
