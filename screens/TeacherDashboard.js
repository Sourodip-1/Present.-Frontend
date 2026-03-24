import React, { useState } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform } from 'react-native';
import BleAdvertiser from 'react-native-ble-advertiser';

export default function TeacherDashboard() {
  const [statusText, setStatusText] = useState('Idle');
  
  // Custom unique session UUID for the class
  const CLASS_UUID = '94f275e7-a7eb-436f-8dc8-0524ba3bbf05';

  const requestAdvertiserPermission = async () => {
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      if (apiLevel >= 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  };

  const startAttendance = async () => {
    const isGranted = await requestAdvertiserPermission();
    if (!isGranted) {
      setStatusText('Error: Please accept Bluetooth Advertising permissions!');
      return;
    }

    try {
      console.log('--- Starting BLE Broadcast ---');
      BleAdvertiser.setCompanyId(0xFF); 
      
      // The Native Java plugin expects EXACTLY 3 arguments, so we must safely pass an empty options object!
      await BleAdvertiser.broadcast(CLASS_UUID, [12, 34], {});
      
      setStatusText('Broadcasting Attendance Signal!');
      console.log('Successfully advertising UUID:', CLASS_UUID);
    } catch (err) {
      console.log('Broadcast Error:', err.message);
      setStatusText('Failed to start broadcaster.');
    }
  };

  const endAttendance = async () => {
    try {
      console.log('--- Stopping BLE Broadcast ---');
      await BleAdvertiser.stopBroadcast();
      setStatusText('Broadcast Stopped - Attendance Closed');
    } catch (err) {
      console.log('Stop Broadcast Error:', err.message);
    }
  };

  return (
    <View>
      <Text>Teacher Dashboard</Text>
      <Button title="Start Attendance" onPress={startAttendance} />
      <Button title="End Attendance" onPress={endAttendance} />
      <Text>{statusText}</Text>
    </View>
  );
}
