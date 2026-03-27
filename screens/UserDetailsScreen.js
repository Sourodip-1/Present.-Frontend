import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';

const DESIGNATIONS = ['Mr.', 'Ms.', 'Dr.', 'Prof.', 'Asst. Prof.', 'Assoc. Prof.'];

export default function UserDetailsScreen({ route, navigation }) {
  const { phone } = route.params;
  const [role, setRole] = useState(null); // 'student' or 'teacher'
  
  // Common
  const [fullName, setFullName] = useState('');
  
  // Student Specific
  const [universityRoll, setUniversityRoll] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [semester, setSemester] = useState('');
  const [mainClassroom, setMainClassroom] = useState('');

  // Teacher Specific
  const [designation, setDesignation] = useState(DESIGNATIONS[0]);
  const [teacherCode, setTeacherCode] = useState('');

  const submitProfile = async () => {
    // Validation
    if (!fullName) return Alert.alert('Error', 'Full Name is required');
    if (role === 'student') {
      if (!universityRoll || !studentId || !department || !section || !semester || !mainClassroom) {
        return Alert.alert('Error', 'Please fill all student details');
      }
      if (universityRoll.length !== 12) {
        return Alert.alert('Error', 'University Roll No must be exactly 12 digits');
      }
    }
    if (role === 'teacher' && !teacherCode) {
      return Alert.alert('Error', 'Teacher Verification Code is required');
    }

    try {
      const response = await fetch('http://10.189.118.185:3000/api/auth/register-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          role,
          teacherCode, // Only relevant for teacher
          profile: role === 'student' ? {
            fullName, universityRoll, studentId, department, section, semester, mainClassroom
          } : {
            fullName, designation
          }
        })
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', `Welcome, ${fullName}!`);
        navigation.navigate(role === 'student' ? 'StudentDashboard' : 'TeacherDashboard', { phone });
      } else {
        Alert.alert('Error', data.error || 'Failed to save profile');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Check your connection');
    }
  };

  if (!role) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Finish your Setup</Text>
        <Text style={styles.subtitle}>Are you a Student or a Teacher?</Text>
        <TouchableOpacity style={styles.roleButton} onPress={() => setRole('student')}>
          <Text style={styles.roleButtonText}>🎓 I am a Student</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.roleButton, { backgroundColor: '#FF9500' }]} onPress={() => setRole('teacher')}>
          <Text style={styles.roleButtonText}>👨‍🏫 I am a Teacher</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>{role === 'student' ? 'Student Registration' : 'Teacher Registration'}</Text>
      
      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} placeholder="John Doe" value={fullName} onChangeText={setFullName} />

        {role === 'student' ? (
          <>
            <Text style={styles.label}>University Roll No (12 Digits)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 208250060045" 
              value={universityRoll} 
              onChangeText={setUniversityRoll}
              maxLength={12}
              keyboardType="numeric"
            />
            
            <Text style={styles.label}>Student ID</Text>
            <TextInput style={styles.input} placeholder="STU-..." value={studentId} onChangeText={setStudentId} />
            
            <Text style={styles.label}>Department</Text>
            <TextInput style={styles.input} placeholder="Computer Science" value={department} onChangeText={setDepartment} />

            <Text style={styles.label}>Section</Text>
            <TextInput style={styles.input} placeholder="e.g. A, B, or 1" autoCapitalize="characters" maxLength={1} value={section} onChangeText={setSection} />
            
            <Text style={styles.label}>Current Semester</Text>
            <TextInput style={styles.input} placeholder="6th Semester" value={semester} onChangeText={setSemester} />
            
            <Text style={styles.label}>Main Classroom / Room No</Text>
            <TextInput style={styles.input} placeholder="Room 402" value={mainClassroom} onChangeText={setMainClassroom} />
          </>
        ) : (
          <>
            <Text style={styles.label}>Designation</Text>
            <View style={styles.pickerContainer}>
              {DESIGNATIONS.map((d) => (
                <TouchableOpacity 
                  key={d} 
                  style={[styles.chip, designation === d && styles.chipActive]} 
                  onPress={() => setDesignation(d)}
                >
                  <Text style={[styles.chipText, designation === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Secret Teacher Verification Code</Text>
            <TextInput 
              style={[styles.input, { borderColor: '#FF9500' }]} 
              placeholder="Enter Private Code" 
              secureTextEntry
              value={teacherCode} 
              onChangeText={setTeacherCode} 
            />
            <Text style={styles.helper}>* Only faculty members have this code.</Text>
          </>
        )}

        <View style={{ marginTop: 20 }}>
          <Button title="COMPLETE REGISTRATION" onPress={submitProfile} color={role === 'student' ? '#007AFF' : '#FF9500'} />
          <TouchableOpacity onPress={() => setRole(null)}>
            <Text style={styles.backLink}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  scrollContainer: {
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40
  },
  roleButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center'
  },
  roleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  form: {
    marginTop: 20
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    marginTop: 10
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8
  },
  chipActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500'
  },
  chipText: {
    fontSize: 13,
    color: '#666'
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: 'bold'
  },
  helper: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic'
  },
  backLink: {
    marginTop: 20,
    textAlign: 'center',
    color: '#007AFF',
    fontWeight: 'bold'
  }
});
