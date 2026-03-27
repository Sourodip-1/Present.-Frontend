import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Alert } from 'react-native';

export default function OTPScreen({ route, navigation }) {
  const { phone } = route.params; // Get the phone number from the previous screen
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyOTP = async () => {
    if (code.length < 4) {
      Alert.alert('Error', 'Please enter the 4-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://10.189.118.185:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });

      const data = await response.json();
      if (response.ok) {
        if (data.isNewUser) {
          // If it's a first-time user, go to Profile Setup
          navigation.navigate('UserDetails', { phone });
        } else {
          // If they already have a profile, go to their specific Dashboard
          if (data.role === 'teacher') {
            navigation.navigate('TeacherDashboard', { phone });
          } else {
            navigation.navigate('StudentDashboard', { phone });
          }
        }
      } else {
        Alert.alert('Error', data.error || 'Invalid OTP');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Check your server connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm your Phone</Text>
      <Text style={styles.subtitle}>Enter the 4-digit code sent to {phone}</Text>
      
      <TextInput 
        style={styles.input}
        placeholder="4-Digit OTP" 
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={4}
      />

      <Button 
        title={loading ? "Verifying..." : "Verify & Continue"} 
        onPress={verifyOTP} 
        disabled={loading}
      />

      <Text style={styles.footerText}>
        Didn't receive a code? <Text style={{ color: '#007AFF' }}>Resend</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 10
  },
  footerText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666'
  }
});
