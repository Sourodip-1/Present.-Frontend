import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

/**
 * DevBypass Component
 * A hidden development-only menu to navigate between screens.
 * Only renders when __DEV__ is true.
 */
const DevBypass = () => {
  if (!__DEV__) return null;

  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();
  
  // Get all route names from the navigation state if possible
  // Alternatively, we can hardcode them since we know them from App.js
  const screens = [
    { name: 'Login', label: 'Login Screen' },
    { name: 'OTP', label: 'OTP Screen' },
    { name: 'UserDetails', label: 'User Details' },
    { name: 'StudentDashboard', label: 'Student Dashboard' },
    { name: 'TeacherDashboard', label: 'Teacher Dashboard' },
    { name: 'AttendanceReport', label: 'Attendance Report' },
    { name: 'ClassHistory', label: 'Class History' },
  ];

  const handleNavigate = (screenName) => {
    setVisible(false);
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>DEV</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Development Bypass</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.sectionTitle}>Jump to Screen:</Text>
              <View style={styles.grid}>
                {screens.map((screen) => (
                  <TouchableOpacity
                    key={screen.name}
                    style={styles.screenButton}
                    onPress={() => handleNavigate(screen.name)}
                  >
                    <Text style={styles.screenButtonText}>{screen.label}</Text>
                    <Text style={styles.screenRouteText}>{screen.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 9999,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.7,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
    marginLeft: 5,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  screenButton: {
    width: (width - 45) / 2,
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  screenButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  screenRouteText: {
    color: '#22C55E',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default DevBypass;
