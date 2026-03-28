import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ClassHistory({ route, navigation }) {
  const { instanceId = 'dm1', instanceName = 'Class' } = route?.params || {};
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`http://10.43.242.77:3000/api/instances/${instanceId}/history`);
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.log('History Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.header}>{instanceName}</Text>
        <View style={{ width: 44 }} />
      </View>
      <Text style={styles.subHeader}>Template History</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.sessionCard}
              onPress={() => navigation.navigate('AttendanceReport', { sessionId: item._id, subjectName: item.subjectName || instanceName })}
            >
              <View>
                <Text style={styles.dateText}>{new Date(item.startTime).toLocaleDateString()}</Text>
                <Text style={styles.timeText}>{new Date(item.startTime).toLocaleTimeString()}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>VIEW REPORT</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No attendance sessions recorded yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: '#F8F9FA' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  header: { fontSize: 24, fontWeight: '900', color: '#1C1C1E' },
  subHeader: { fontSize: 13, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 25, textAlign: 'center' },
  sessionCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    elevation: 2
  },
  dateText: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E' },
  timeText: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  badge: { backgroundColor: '#007AFF15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: '#007AFF', fontWeight: 'bold', fontSize: 11 },
  empty: { textAlign: 'center', color: '#8E8E93', marginTop: 50, fontSize: 16 }
});
