import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashLoader from './screens/SplashLoader';
import LoginScreen from './screens/LoginScreen';
import OTPScreen from './screens/OTPScreen';
import UserDetailsScreen from './screens/UserDetailsScreen';
import StudentDashboard from './screens/StudentDashboard';
import TeacherDashboard from './screens/TeacherDashboard';
import AttendanceReport from './screens/AttendanceReport';
import ClassHistory from './screens/ClassHistory';
import DevBypass from './components/DevBypass';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SplashLoader" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SplashLoader" component={SplashLoader} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
        <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
        <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
        <Stack.Screen name="AttendanceReport" component={AttendanceReport} />
        <Stack.Screen name="ClassHistory" component={ClassHistory} />
      </Stack.Navigator>
      <DevBypass />
    </NavigationContainer>
  );
}
