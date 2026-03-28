import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashLoader({ navigation }) {
  const navigatedRef = useRef(false);

  useEffect(() => {
    // Pure JS fallback: Just wait 2.5 seconds and navigate
    const fallbackTimer = setTimeout(() => {
      completeSplash();
    }, 2500);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const completeSplash = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={{ color: '#FFF', marginTop: 20, fontWeight: '800' }}>APP LOADING...</Text>
      <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 5, textAlign: 'center', paddingHorizontal: 20 }}>
        (Native Audio/Video requires compiling a Dev Build)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  }
});
