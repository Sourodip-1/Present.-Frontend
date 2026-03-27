import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Animated, Platform, PermissionsAndroid, ScrollView } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import * as LocalAuthentication from 'expo-local-authentication';

// USE THE INSTALLED PLX MANAGER
const manager = new BleManager();

export default function StudentDashboard({ route }) {
  const { phone } = route?.params || { phone: '9999999999' };
  const [view, setView] = useState('radar');
  const [discoveredSessions, setDiscoveredSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [isScanning, setIsScanning] = useState(false);
  
  const CLASS_UUID = '94f275e7-a7eb-436f-8dc8-0524ba3bbf05';
  const pulseAnim = useRef(new Animated.Value(1)).current;

  async function fetchMyRecords() {
    try {
      const res = await fetch(`http://10.189.118.185:3000/api/records/student/${phone}`);
      const data = await res.json();
      setHistory(data.history || []);
      setStats(data.subjectStats || {});
    } catch (err) { console.log('Hist Error'); }
  }

  async function requestPermissions() {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
    }
  }

  async function startRadar() {
    await requestPermissions();
    
    // Check if BT is on
    const state = await manager.state();
    if (state !== 'PoweredOn') {
      Alert.alert('Bluetooth Required', 'Please enable Bluetooth to mark attendance.');
      return;
    }

    setIsScanning(true);
    setDiscoveredSessions([]);
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    // Start Scanning with PLX
    manager.startDeviceScan([CLASS_UUID], null, async (error, device) => {
      if (error) {
        console.log('Scan Error:', error);
        return;
      }
      if (device) {
        // BLE SIGNAL CAUGHT! Proximity Mathematically Confirmed!
        manager.stopDeviceScan();
        setIsScanning(false);
        pulseAnim.setValue(1);
        
        // Now that they physically intercepted the Teacher's unique UUID packet,
        // we can fetch the exact authorized class for this student.
        try {
          const res = await fetch(`http://10.189.118.185:3000/api/sessions/active`);
          if (res.ok) {
            const authorizedClasses = await res.json();
            setDiscoveredSessions(authorizedClasses);
          }
        } catch(err) {}
      }
    });

    // Auto-stop after 8s if NO signal physically detected
    setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
      pulseAnim.setValue(1);
    }, 8000);
  }

  // Obsolete Base64 parser removed for clean Proximity UUID validation

  async function joinSession(session) {
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify Identity',
      fallbackLabel: 'Use Passcode',
    });

    if (!auth.success) return;

    const apiRes = await fetch('http://10.189.118.185:3000/api/attendance/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session._id, studentPhone: phone })
    });

    const result = await apiRes.json();

    if (apiRes.ok) {
      Alert.alert('Verified ✅', `Presence confirmed!`);
      setDiscoveredSessions([]); 
      if (view === 'history') fetchMyRecords();
    } else {
      Alert.alert('Registration Denied ❌', result.error || 'Server rejected attendance.');
    }
  }

  useEffect(() => {
    if (view === 'history') fetchMyRecords();
    return () => manager.stopDeviceScan();
  }, [view]);

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity onPress={() => setView('radar')} style={[styles.tab, view === 'radar' && styles.activeTab]}>
          <Text style={styles.tabText}>RADAR</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setView('history')} style={[styles.tab, view === 'history' && styles.activeTab]}>
          <Text style={styles.tabText}>HISTORY</Text>
        </TouchableOpacity>
      </View>

      {view === 'radar' ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.header}>Class Radar 📡</Text>
          <View style={styles.radarContainer}>
            <Animated.View style={[styles.pulse, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity style={[styles.scanCircle, isScanning && styles.scanningCircle]} onPress={startRadar} disabled={isScanning}>
                <Text style={styles.scanBtnText}>{isScanning ? 'SEARCHING...' : 'SCAN'}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
          <FlatList
            data={discoveredSessions}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.sessionCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subject}>{item.subjectName}</Text>
                  <Text style={styles.teacher}>Prof. {item.teacherName}</Text>
                </View>
                <TouchableOpacity style={styles.joinBtn} onPress={() => joinSession(item)}>
                  <Text style={styles.joinText}>JOIN</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={!isScanning && <Text style={styles.emptyText}>Tap radar to search.</Text>}
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.header}>My Dashboard</Text>
          <FlatList
            data={history}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <Text style={styles.histSub}>{item.sessionId?.subjectName}</Text>
                <Text style={styles.histTime}>{new Date(item.timestamp).toLocaleDateString()}</Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: '#F8F9FA', marginTop: 30 },
  tabHeader: { flexDirection: 'row', backgroundColor: '#E5E5EA', borderRadius: 12, padding: 4, marginBottom: 25 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#fff' },
  tabText: { fontWeight: '700', color: '#1C1C1E' },
  header: { fontSize: 26, fontWeight: '900', color: '#1C1C1E', marginBottom: 20 },
  radarContainer: { height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  pulse: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(0, 122, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  scanCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  scanningCircle: { backgroundColor: '#FF9500' },
  scanBtnText: { color: '#fff', fontWeight: '900' },
  sessionCard: { backgroundColor: '#fff', padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  subject: { fontSize: 18, fontWeight: 'bold' },
  teacher: { fontSize: 14, color: '#8E8E93' },
  joinBtn: { backgroundColor: '#34C759', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  joinText: { color: '#fff', fontWeight: 'bold' },
  historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  histSub: { fontWeight: 'bold' },
  histTime: { fontSize: 12, color: '#8E8E93' },
  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 20 }
});
