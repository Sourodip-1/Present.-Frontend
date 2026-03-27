import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Dimensions, KeyboardAvoidingView, Platform, StatusBar,
  Image, Keyboard, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MeshGradient from '../components/MeshGradient';
import { mascotFrames } from '../components/MascotFrames';

const { width, height } = Dimensions.get('window');
const BOTTOM_MIN_HEIGHT = height * 0.4;

const DotGrid = () => {
  const dotSpacing = 40;
  const cols = Math.ceil(width / dotSpacing) + 1;
  const rows = Math.ceil(height / dotSpacing) + 1;
  const dots = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      dots.push(
        <View
          key={`${i}-${j}`}
          style={[
            styles.dot,
            {
              left: j * dotSpacing + (i % 2 === 0 ? 0 : dotSpacing / 2),
              top: i * dotSpacing
            }
          ]}
        />
      );
    }
  }
  return <View style={StyleSheet.absoluteFill}>{dots}</View>;
};

const MascotAnimation = React.memo(({ length, isKeyboardVisible }) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameRef = useRef(0);
  const targetRef = useRef(0);
  const requestRef = useRef();

  useEffect(() => {
    targetRef.current = Math.min(89, Math.floor((length / 10) * 89));
    const animate = () => {
      if (frameRef.current !== targetRef.current) {
        let diff = targetRef.current - frameRef.current;
        
        // Easing function for smooth interpolation instead of rigid steps
        let step = diff * 0.15; 
        if (Math.abs(step) < 0.5) step = Math.sign(diff) * 0.5;

        frameRef.current += step;

        if (Math.abs(targetRef.current - frameRef.current) < 0.5) {
          frameRef.current = targetRef.current;
        }
        setCurrentFrame(Math.round(frameRef.current));
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [length]);

  // Pre-loader for the next 3 frames to keep GPU cache warm
  const lookAhead = [1, 2, 3].map(offset => {
    const direction = targetRef.current >= currentFrame ? 1 : -1;
    const next = Math.min(89, Math.max(0, currentFrame + (offset * direction * 2)));
    return (
      <Image
        key={`lookahead-${offset}-${next}`}
        source={mascotFrames[next]}
        style={{ width: 0, height: 0, opacity: 0 }}
        fadeDuration={0}
      />
    );
  });

  return (
    <View style={[styles.mascotContainer, isKeyboardVisible && styles.mascotContainerEnlarged]}>
      {lookAhead}
      <View style={[styles.blueMascotBacking, isKeyboardVisible && styles.blueMascotBackingEnlarged]} />
      <View style={[styles.greenMascotBacking, isKeyboardVisible && styles.greenMascotBackingEnlarged]} />
      <Image
        source={mascotFrames[currentFrame]}
        style={styles.mascotImage}
        resizeMode="contain"
        fadeDuration={0}
      />
    </View>
  );
});

export default function LoginScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendOTP = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit number');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://10.189.118.185:3000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
      });
      const data = await response.json();
      if (response.ok) {
        navigation.navigate('OTP', { phone: phoneNumber });
      } else {
        Alert.alert('Error', data.error || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Check your server connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <MeshGradient />
      <DotGrid />
      <View style={styles.bottomFill} />
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={[styles.topSection, { paddingTop: insets.top }]}>
          <MascotAnimation length={phoneNumber.length} isKeyboardVisible={isKeyboardVisible} />
          {!isKeyboardVisible && (
            <>
              <Text style={styles.brandTitle}>PRESENT</Text>
              <Text style={styles.brandSubtitle}>Smart Attendance Solution</Text>
            </>
          )}
        </View>

        <View style={[styles.bottomBox, { paddingBottom: insets.bottom + 500, marginBottom: -500 }]}>
          <View style={styles.formContainer}>
            <Text style={styles.label}>ENTER MOBILE NUMBER</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="00000 00000"
                placeholderTextColor="rgba(0,0,0,0.4)"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={styles.otpButton}
              onPress={sendOTP}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.otpButtonText}>{loading ? "Sending..." : "Send OTP"}</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>Ready for Attendance? Let's go!</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#444cf7', opacity: 0.45 },
  flex: { flex: 1 },
  topSection: { flex: 2.2, justifyContent: 'center', paddingHorizontal: 40 },
  mascotContainer: { height: 220, aspectRatio: 1.77, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 15, backgroundColor: 'transparent' },
  mascotContainerEnlarged: { height: 270, marginBottom: 0 },
  blueMascotBacking: { position: 'absolute', width: 50, height: 68, backgroundColor: '#FFF', borderRadius: 20, right: '35%', top: '10%' },
  blueMascotBackingEnlarged: { width: 63, height: 100, borderRadius: 30, top: '12%', right: '33%' },
  greenMascotBacking: { position: 'absolute', width: 25, height: 35, backgroundColor: '#FFF', borderRadius: 15, left: '25%', bottom: '13%' },
  greenMascotBackingEnlarged: { width: 36, height: 50, borderRadius: 20, left: '23%', bottom: '15%' },
  mascotImage: { width: '100%', height: '100%', mixBlendMode: 'multiply' },
  brandTitle: { fontSize: 38, fontWeight: '900', color: '#000000', letterSpacing: -1.5, textAlign: 'left', marginTop: -10 },
  brandSubtitle: { fontSize: 18, color: '#666', fontWeight: '500', marginTop: 5 },
  bottomBox: { flex: 1, backgroundColor: '#22C55E', borderTopLeftRadius: 50, borderTopRightRadius: 50, paddingTop: 40, paddingHorizontal: 30, shadowColor: '#22C55E', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20 },
  formContainer: { flex: 1 },
  label: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, height: 65, paddingHorizontal: 20, marginBottom: 20 },
  prefix: { fontSize: 20, fontWeight: '700', color: '#000', marginRight: 10 },
  input: { flex: 1, fontSize: 20, fontWeight: '600', color: '#000' },
  otpButton: { backgroundColor: '#000000', borderRadius: 20, height: 65, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  otpButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  footerText: { textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginTop: 20 },
  bottomFill: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.2, backgroundColor: '#22C55E' }
});
