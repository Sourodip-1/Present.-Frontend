import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Alert } from 'react-native';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://10.189.118.185:3000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      const data = await response.json();
      if (response.ok) {
        // Navigate to OTP Screen and pass the phone number
        navigation.navigate('OTP', { phone });
      } else {
        Alert.alert('Error', data.error || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Is your server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Present</Text>
      <Text style={styles.subtitle}>Enter your phone number to continue</Text>
      
      <TextInput 
        style={styles.input}
        placeholder="Phone Number (e.g. +91...)" 
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Button 
        title={loading ? "Sending..." : "Send OTP"} 
        onPress={sendOTP} 
        disabled={loading}
      />
      
      {/* Dev Shortcuts */}
      <View style={{ marginTop: 40 }}>
        <Button title="Bypass for Student" onPress={() => navigation.navigate('StudentDashboard')} color="#aaa" />
        <Button title="Bypass for Teacher" onPress={() => navigation.navigate('TeacherDashboard')} color="#aaa" />
      </View>
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
    fontSize: 16
  }
});
