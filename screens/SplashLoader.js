import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator } from 'react-native';

const { width, height } = Dimensions.get('window');

import SafeStorage from '../utils/storage';

export default function SplashLoader({ navigation }) {
  const navigatedRef = useRef(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        const savedEmail = await SafeStorage.getItem('userEmail');
        const savedRole = await SafeStorage.getItem('userRole');
        
        // Add a slight delay just so the splash screen doesn't instantly snap
        await new Promise(r => setTimeout(r, 1500));

        if (navigatedRef.current) return;
        navigatedRef.current = true;

        if (savedEmail && savedRole && savedRole !== 'unknown') {
          const targetScreen = savedRole === 'teacher' ? 'TeacherDashboard' : 'StudentDashboard';
          navigation.replace(targetScreen, { email: savedEmail });
        } else {
          navigation.replace('Login');
        }
      } catch (err) {
        if (navigatedRef.current) return;
        navigatedRef.current = true;
        navigation.replace('Login');
      }
    };

    initApp();
  }, []);

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
