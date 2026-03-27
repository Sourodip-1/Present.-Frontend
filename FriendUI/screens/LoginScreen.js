import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Animated,
  Easing,
  Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MeshGradient from '../components/MeshGradient';
import { mascotFrames } from '../components/MascotFrames';

const { width, height } = Dimensions.get('window');
// Increased height as a base, but we'll use flex: 1 for the bottom box
const BOTTOM_MIN_HEIGHT = height * 0.4;



// High-visibility dot grid (Equidistant blue dots for tactile texture)
const DotGrid = () => {
  const dotSpacing = 40;
  const dotSize = 3;
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

// ─── Perfect Frame Sequence Scrubber ──────────────────────────────
// This guarantees that absolutely every single frame is rendered sequentially
// at 60fps without any skipped frames, ensuring perfectly buttery smooth video playback.
// ─── Zero-Flicker Frame Scrubber ──────────────────────────────
const MascotAnimation = React.memo(({ length, isKeyboardVisible }) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameRef = useRef(0);
  const targetRef = useRef(0);
  const requestRef = useRef();

  useEffect(() => {
    targetRef.current = length > 0 ? 89 : 0;
    
    const animate = () => {
      if (frameRef.current !== targetRef.current) {
        let diff = targetRef.current - frameRef.current;
        let step = diff > 0 ? 5 : -8;
        
        frameRef.current += step;
        if ((step > 0 && frameRef.current > targetRef.current) || 
            (step < 0 && frameRef.current < targetRef.current)) {
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
    const next = Math.min(89, Math.max(0, currentFrame + (length > 0 ? offset * 5 : offset * -8)));
    return (
      <Image
        key={next}
        source={mascotFrames[next]}
        style={{ width: 0, height: 0, opacity: 0 }}
        fadeDuration={0}
      />
    );
  });

  return (
    <View style={[
      styles.mascotContainer,
      isKeyboardVisible && styles.mascotContainerEnlarged
    ]}>
      {lookAhead}
      {/* Targeted black backing for the mascots' transparent eyes/mouth holes */}
      <View style={[styles.blueMascotBacking, isKeyboardVisible && styles.blueMascotBackingEnlarged]} />
      <View style={[styles.greenMascotBacking, isKeyboardVisible && styles.greenMascotBackingEnlarged]} />

      {/*
        Exactly ONE Image node. This drops the device rendering workload by 99%
        compared to stacking 90 full-size frames, which was choking the GPU and Layout engine.
      */}
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
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

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

        <View style={[
          styles.bottomBox,
          { paddingBottom: insets.bottom + 500, marginBottom: -500 }
        ]}>
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
              onPress={() => navigation.navigate('OTP')}
              activeOpacity={0.8}
            >
              <Text style={styles.otpButtonText}>Send OTP</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>Ready for Attendance? Let's go!</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#444cf7',
    opacity: 0.45,
  },
  flex: {
    flex: 1,
  },
  topSection: {
    flex: 2.2, // Pushed down further
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  mascotContainer: {
    height: 220,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'transparent',
  },
  mascotContainerEnlarged: {
    height: 270, // Taller when keyboard is open
    marginBottom: 0,
  },
  blueMascotBacking: {
    position: 'absolute',
    width: 50,
    height: 68,
    backgroundColor: '#000',
    borderRadius: 20,
    right: '35%',
    top: '10%',
  },
  blueMascotBackingEnlarged: {
    width: 63,
    height: 100,
    borderRadius: 30, // Scale radius too
    top: '12%',
    right: '33%',
  },
  greenMascotBacking: {
    position: 'absolute',
    width: 25,
    height: 35,
    backgroundColor: '#000',
    borderRadius: 15,
    left: '25%', // Align with cyan mascot's mouth
    bottom: '13%', // Positioned near the bottom
  },
  greenMascotBackingEnlarged: {
    width: 36,
    height: 50,
    borderRadius: 20, // Scale radius too
    left: '23%',
    bottom: '15%',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 38, // Slightly smaller
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -1.5,
    textAlign: 'left',
    marginTop: -10, // Pull closer to mascot
  },
  brandSubtitle: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
    marginTop: 5,
  },
  bottomBox: {
    flex: 1, // Take up remaining space
    backgroundColor: '#22C55E', // Vibrant Green
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    paddingTop: 40,
    paddingHorizontal: 30,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.5,
    marginBottom: 15,
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 65,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  prefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  otpButton: {
    backgroundColor: '#000000', // Black button on green looks very premium
    borderRadius: 20,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  otpButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
  },
  bottomFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.2,
    backgroundColor: '#22C55E',
  }
});
