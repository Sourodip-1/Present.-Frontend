import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';

export default function ClassHistory({ route, navigation }) {
  const { instanceId, instanceName } = route.params;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`http://10.189.118.185:3000/api/instances/${instanceId}/history`);
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
      <Text style={styles.header}>{instanceName} History</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.sessionCard}
              onPress={() => navigation.navigate('AttendanceReport', { sessionId: item._id })}
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
  header: { fontSize: 24, fontWeight: '900', color: '#1C1C1E', marginBottom: 25, marginTop: 20 },
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
