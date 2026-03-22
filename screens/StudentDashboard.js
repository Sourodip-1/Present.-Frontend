import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

const bleManager = new BleManager();

export default function StudentDashboard() {
  const [statusText, setStatusText] = useState('Attendance status will appear here');

  const startAttendance = () => {
    setStatusText('Scanning for 5 seconds...');
    console.log('--- Starting BLE scan ---');
    
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('BLE Scan Error:', error.message);
        return;
      }
      
      console.log(`[Found Device] Name: ${device.name || 'Unknown'} | ID: ${device.id} | RSSI: ${device.rssi}`);
    });

    // Stop automatically after 5 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setStatusText('Scan complete');
      console.log('--- BLE scan stopped ---');
    }, 5000);
  };

  useEffect(() => {
    return () => {
      bleManager.stopDeviceScan();
      bleManager.destroy();
    };
  }, []);

  return (
    <View>
      <Text>Student Dashboard</Text>
      <Button title="Mark Attendance" onPress={startAttendance} />
      <Text>{statusText}</Text>
    </View>
  );
}
