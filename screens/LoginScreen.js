import React from 'react';
import { View, Text, Button, TextInput } from 'react-native';

export default function LoginScreen({ navigation }) {
  return (
    <View>
      <Text>Login Screen</Text>
      <TextInput placeholder="Phone Number" />
      <Button title="Send OTP" onPress={() => navigation.navigate('OTP')} />
      <Button title="Go to Teacher Dashboard" onPress={() => navigation.navigate('TeacherDashboard')} />
    </View>
  );
}
