import React from 'react';
import { View, Text, Button, TextInput } from 'react-native';

export default function OTPScreen({ navigation }) {
  return (
    <View>
      <Text>OTP Screen</Text>
      <TextInput placeholder="Enter OTP" />
      <Button title="Verify OTP" onPress={() => navigation.navigate('UserDetails')} />
    </View>
  );
}
