import React from 'react';
import { View, Text, Button, TextInput } from 'react-native';

export default function UserDetailsScreen({ navigation }) {
  return (
    <View>
      <Text>User Details Screen</Text>
      <TextInput placeholder="Name" />
      <TextInput placeholder="Student ID" />
      <Button title="Continue" onPress={() => navigation.navigate('StudentDashboard')} />
    </View>
  );
}
