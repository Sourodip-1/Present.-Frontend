import React, { useState, useEffect } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, FlatList, StyleSheet } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

const bleManager = new BleManager();

export default function StudentDashboard() {
  const [statusText, setStatusText] = useState('Press to find teacher');
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState([]);

  // Pseudo-distance formula based on physics of BLE waves
  const calculateDistance = (rssi) => {
    if (rssi === 0) return -1.0;
    const txPower = -59; // Hardcoded expected RSSI power at 1 meter
    const ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
      return Math.pow(ratio, 10).toFixed(1);
    } else {
      const distance = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
      return distance.toFixed(1);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ]);
        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }
    return true;
  };

  const startAttendance = async () => {
    const isGranted = await requestPermissions();
    if (!isGranted) {
      setStatusText('Error: Please accept Bluetooth permissions!');
      return;
    }

    setDevices([]); // clear old devices
    setIsScanning(true);
    setStatusText('Scanning room for 5 seconds...');
    console.log('--- Starting BLE scan ---');

    try {
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log('BLE Scan Error:', error.message);
          return;
        }

        const deviceName = device.name || device.localName || 'Unknown Device';

        setDevices((prevDevices) => {
          // Check if device already in the UI array to prevent duplicates
          if (!prevDevices.find(d => d.id === device.id)) {
            return [...prevDevices, {
              id: device.id,
              name: deviceName,
              rssi: device.rssi,
              distance: calculateDistance(device.rssi)
            }];
          }
          return prevDevices;
        });
      });

      // Stop automatically after 5 seconds
      setTimeout(() => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        setStatusText('Scan complete! Check devices below.');
        console.log('--- BLE scan stopped ---');
      }, 5000);
    } catch (err) {
      console.log('Throw error:', err.message);
      setStatusText('Failed to start scanner.');
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      bleManager.stopDeviceScan();
    };
  }, []);

  const renderDevice = ({ item }) => {
    // Math logic: If the signal indicates they are closer than 3.0 meters, they are in the classroom!
    const isClose = item.distance < 3.0;

    return (
      <View style={[styles.deviceCard, { borderLeftColor: isClose ? '#4CAF50' : '#F44336' }]}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={{ color: isClose ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
          {isClose ? '🟢 Inside Room' : '🔴 Too Far (Proxy)'} - {item.distance}m away
        </Text>
        <Text style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>ID: {item.id} | RSSI: {item.rssi}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Proximity Radar</Text>

      <View style={{ marginVertical: 20, width: '100%' }}>
        <Button
          title={isScanning ? "Scanning..." : "Mark Attendance"}
          onPress={startAttendance}
          disabled={isScanning}
        />
      </View>

      <Text style={styles.status}>{statusText}</Text>

      <FlatList
        data={devices.sort((a, b) => a.distance - b.distance)}
        keyExtractor={(item) => item.id}
        renderItem={renderDevice}
        style={{ width: '100%', marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10
  },
  deviceCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 6,
    marginBottom: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333'
  }
});
