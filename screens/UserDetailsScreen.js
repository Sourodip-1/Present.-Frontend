import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Dimensions, KeyboardAvoidingView, Platform, StatusBar,
  ScrollView, Animated, Alert, Modal, FlatList, TouchableWithoutFeedback
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MeshGradient from '../components/MeshGradient';

const { width, height } = Dimensions.get('window');

const DotGrid = () => {
  const dotSpacing = 40;
  const cols = Math.ceil(width / dotSpacing) + 1;
  const rows = Math.ceil(height / dotSpacing) + 1;
  const dots = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      dots.push(
        <View 
          key={`${i}-${j}`} 
          style={[styles.dot, { left: j * dotSpacing + (i % 2 === 0 ? 0 : dotSpacing / 2), top: i * dotSpacing }]} 
        />
      );
    }
  }
  return <View style={StyleSheet.absoluteFill}>{dots}</View>;
};

const FormItem = ({ children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 6, tension: 40, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>{children}</Animated.View>;
};

export default function UserDetailsScreen({ route, navigation }) {
  const { phone } = route?.params || { phone: '' };
  
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [year, setYear] = useState(1);
  const [sem, setSem] = useState(1);
  const [dept, setDept] = useState('');
  const [desig, setDesig] = useState('Professor');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [showDesigDropdown, setShowDesigDropdown] = useState(false);
  
  const designations = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Assoc. Prof.', 'Asst. Prof.', 'Guest Lecturer', 'HOD', 'Dean', 'Director', 'Lab Asst.'];
  
  const insets = useSafeAreaInsets();

  const handleRegister = async () => {
    if (role === 'student' && (!name.trim() || !roll.trim())) {
      Alert.alert('Missing Info', 'Please provide your full name and Roll Number.');
      return;
    }

    if (role === 'teacher' && (!name.trim() || !dept.trim())) {
      Alert.alert('Missing Info', 'Please provide your full name and Department.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        phone: phone,
        role: role,
        teacherCode: role === 'teacher' ? 'PRES-TEACH-2026' : undefined,
        profile: role === 'student' ? {
          fullName: name.trim(),
          universityRoll: roll.trim().toUpperCase(),
          year: year,
          semester: sem
        } : {
          fullName: name.trim(),
          department: dept.trim(),
          designation: desig
        }
      };

      const response = await fetch('http://10.189.118.185:3000/api/auth/register-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        if (role === 'teacher') {
          navigation.navigate('TeacherDashboard', { phone });
        } else {
          navigation.navigate('StudentDashboard', { phone });
        }
      } else {
        Alert.alert('Registration Failed', data.error || 'Server error.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <MeshGradient />
      <DotGrid />
      <View style={styles.bottomFill} />
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.topSection, { paddingTop: insets.top + 50 }]}>
            <MaterialCommunityIcons name="account-details-outline" size={80} color="#000" />
            <Text style={styles.brandTitle}>USER DETAILS</Text>
            <Text style={styles.brandSubtitle}>Tell us more about yourself</Text>
          </View>

          <View style={[styles.bottomBox, { paddingBottom: insets.bottom + 500, marginBottom: -500 }]}>
            
            <FormItem delay={400}>
              <Text style={styles.label}>I AM A</Text>
              <View style={styles.selectorContainer}>
                <TouchableOpacity style={[styles.chip, { flex: 1, marginRight: 10 }, role === 'student' && styles.chipActive]} onPress={() => setRole('student')}>
                  <Text style={[styles.chipText, role === 'student' && styles.chipTextActive]}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, { flex: 1 }, role === 'teacher' && styles.chipActive]} onPress={() => setRole('teacher')}>
                  <Text style={[styles.chipText, role === 'teacher' && styles.chipTextActive]}>Teacher</Text>
                </TouchableOpacity>
              </View>
            </FormItem>

            <FormItem delay={600}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor="rgba(0,0,0,0.3)" value={name} onChangeText={setName} />
              </View>
            </FormItem>

            {role === 'student' ? (
              <>
                <FormItem delay={700}>
                  <Text style={styles.label}>UNIVERSITY ROLL NO</Text>
                  <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholder="12345678" placeholderTextColor="rgba(0,0,0,0.3)" value={roll} onChangeText={setRoll} autoCapitalize="characters" />
                  </View>
                </FormItem>

                <FormItem delay={800}>
                  <Text style={styles.label}>CURRENT YEAR</Text>
                  <View style={styles.selectorContainer}>
                    {[1, 2, 3, 4].map((item) => (
                      <TouchableOpacity key={item} style={[styles.chip, year === item && styles.chipActive]} onPress={() => setYear(item)}>
                        <Text style={[styles.chipText, year === item && styles.chipTextActive]}>Yr {item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </FormItem>

                <FormItem delay={900}>
                  <Text style={styles.label}>CURRENT SEMESTER</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semScroll}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                      <TouchableOpacity key={item} style={[styles.chip, styles.semChip, sem === item && styles.chipActive]} onPress={() => setSem(item)}>
                        <Text style={[styles.chipText, sem === item && styles.chipTextActive]}>Sem {item}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </FormItem>
              </>
            ) : (
              <>
                <FormItem delay={700}>
                  <Text style={styles.label}>DEPARTMENT</Text>
                  <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholder="Computer Science" placeholderTextColor="rgba(0,0,0,0.3)" value={dept} onChangeText={setDept} />
                  </View>
                </FormItem>

                <FormItem delay={800}>
                  <Text style={styles.label}>FACULTY DESIGNATION</Text>
                  <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDesigDropdown(true)} activeOpacity={0.8}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: desig ? '#000' : 'rgba(0,0,0,0.3)' }}>
                      {desig || 'Select Title...'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={24} color="#000" style={{ position: 'absolute', right: 20 }} />
                  </TouchableOpacity>
                </FormItem>
              </>
            )}

            <FormItem delay={1100}>
              <TouchableOpacity style={styles.submitButton} onPress={handleRegister} activeOpacity={0.8} disabled={loading}>
                <Text style={styles.submitButtonText}>{loading ? 'CREATING...' : 'Continue'}</Text>
              </TouchableOpacity>
            </FormItem>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Designation Dropdown Modal */}
      <Modal visible={showDesigDropdown} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowDesigDropdown(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.dropdownBox, { paddingBottom: insets.bottom + 20 }]}>
                <Text style={styles.dropdownTitle}>Select Title</Text>
                <FlatList
                  data={designations}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[styles.dropdownItem, desig === item && styles.dropdownItemActive]} 
                      onPress={() => { setDesig(item); setShowDesigDropdown(false); }}
                    >
                      <Text style={[styles.dropdownItemText, desig === item && styles.dropdownItemTextActive]}>{item}</Text>
                      {desig === item && <MaterialCommunityIcons name="check" size={20} color="#22C55E" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#444cf7', opacity: 0.45 },
  topSection: { alignItems: 'center', paddingHorizontal: 40, paddingBottom: 30 },
  brandTitle: { fontSize: 40, fontWeight: '900', color: '#000', letterSpacing: -1, marginTop: 10 },
  brandSubtitle: { fontSize: 16, color: '#666', fontWeight: '500', marginTop: 5, textAlign: 'center' },
  bottomBox: { flex: 1, backgroundColor: '#22C55E', borderTopLeftRadius: 50, borderTopRightRadius: 50, paddingTop: 35, paddingHorizontal: 30, shadowColor: '#22C55E', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20 },
  label: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 1, marginBottom: 10, marginLeft: 5 },
  inputContainer: { backgroundColor: '#fff', borderRadius: 18, height: 60, paddingHorizontal: 20, justifyContent: 'center', marginBottom: 20 },
  input: { fontSize: 18, fontWeight: '600', color: '#000' },
  selectorContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  semScroll: { marginBottom: 25 },
  chip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  semChip: { marginRight: 10, minWidth: 70 },
  chipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chipTextActive: { color: '#22C55E' },
  submitButton: { backgroundColor: '#000', borderRadius: 20, height: 65, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5, marginBottom: 40 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  bottomFill: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.2, backgroundColor: '#22C55E' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dropdownBox: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: height * 0.7 },
  dropdownTitle: { fontSize: 20, fontWeight: '800', color: '#000', marginBottom: 20, textAlign: 'center' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemActive: { backgroundColor: '#F0FDF4', paddingHorizontal: 15, borderRadius: 15, borderBottomWidth: 0 },
  dropdownItemText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  dropdownItemTextActive: { color: '#22C55E', fontWeight: '800' }
});
