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
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MeshGradient from '../components/MeshGradient';

const { width, height } = Dimensions.get('window');
const BOTTOM_MIN_HEIGHT = height * 0.4;


// High-visibility dot grid
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

const DecryptedText = ({ text, style, delay = 0 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const chars = 'RSTUVWXYZ0123456789!@#$%^&*()_+?><';

  useEffect(() => {
    let iteration = 0;
    let interval = null;

    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setDisplayedText(text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration) {
              return text[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
        );

        if (iteration >= text.length) {
          clearInterval(interval);
        }

        iteration += 1 / 3;
      }, 30);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, delay]);

  return (
    <Text 
      style={style} 
      numberOfLines={2} 
      ellipsizeMode="tail"
    >
      {displayedText}
    </Text>
  );
};

export default function OTPScreen({ navigation }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <MeshGradient />
      <DotGrid />
      <View style={styles.bottomFill} />
      <StatusBar barStyle="dark-content" />
      <View style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={[styles.topSection, { paddingTop: insets.top }]}>
            <View style={styles.vectorContainer}>
              <MaterialCommunityIcons name="shield-lock-outline" size={180} color="rgba(0,0,0,0.05)" style={styles.bgIcon} />
              <MaterialCommunityIcons name="lock-check" size={80} color="#000" />
            </View>
            <DecryptedText text="VERIFY OTP" style={styles.brandTitle} />
            <DecryptedText text="Enter the 6-digit code sent to you" style={styles.brandSubtitle} delay={500} />
          </View>

          {/* Green Action Box - Now fills the bottom */}
          <View style={[
            styles.bottomBox,
            { paddingBottom: insets.bottom + 500, marginBottom: -500 }
          ]}>
            <View style={styles.formContainer}>
              <Text style={styles.label}>ENTER 6-DIGIT CODE</Text>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.verifyButton}
                onPress={() => navigation.navigate('UserDetails')}
                activeOpacity={0.8}
              >
                <Text style={styles.verifyButtonText}>Verify Account</Text>
              </TouchableOpacity>

              <Text style={styles.footerText}>Didn't receive code? Resend in 30s</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
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
    alignItems: 'center',
  },
  vectorContainer: {
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgIcon: {
    position: 'absolute',
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -2,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 16, // Slightly smaller to prevent wrapping
    color: '#666',
    fontWeight: '500',
    marginTop: 5,
    textAlign: 'center',
    width: width * 0.8, // Ensure it has enough space
    minHeight: 45, // Fixed height to prevent layout shift
  },
  bottomBox: {
    flex: 1,
    backgroundColor: '#22C55E',
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  verifyButton: {
    backgroundColor: '#000000',
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
  verifyButtonText: {
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
