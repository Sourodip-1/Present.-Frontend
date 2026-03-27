import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MeshGradient from '../components/MeshGradient';

const { width, height } = Dimensions.get('window');

// Data Stream lines for "tech" look
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
          style={[
            styles.dot, 
            { 
              left: j * dotSpacing + (i % 2 === 0 ? 0 : dotSpacing / 2), 
              top: i * dotSpacing 
            }
          ]} 
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
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 6,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

export default function UserDetailsScreen({ navigation }) {
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [year, setYear] = useState(1);
  const [sem, setSem] = useState(1);
  
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <MeshGradient />
      <DotGrid />
      <View style={styles.bottomFill} />
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView 
          style={styles.flex} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.topSection, { paddingTop: insets.top + 80 }]}>
            <MaterialCommunityIcons name="account-details-outline" size={80} color="#000" />
            <Text style={styles.brandTitle}>USER DETAILS</Text>
            <Text style={styles.brandSubtitle}>Tell us more about yourself</Text>
          </View>

          <View style={[styles.bottomBox, { paddingBottom: insets.bottom + 500, marginBottom: -500 }]}>
            <FormItem delay={600}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </FormItem>

            <FormItem delay={700}>
              <Text style={styles.label}>UNIVERSITY ROLL NO</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="12345678"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  keyboardType="number-pad"
                  value={roll}
                  onChangeText={setRoll}
                />
              </View>
            </FormItem>

            <FormItem delay={800}>
              <Text style={styles.label}>CURRENT YEAR</Text>
              <View style={styles.selectorContainer}>
                {[1, 2, 3, 4].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, year === item && styles.chipActive]}
                    onPress={() => setYear(item)}
                  >
                    <Text style={[styles.chipText, year === item && styles.chipTextActive]}>
                      Yr {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FormItem>

            <FormItem delay={900}>
              <Text style={styles.label}>CURRENT SEMESTER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semScroll}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, styles.semChip, sem === item && styles.chipActive]}
                    onPress={() => setSem(item)}
                  >
                    <Text style={[styles.chipText, sem === item && styles.chipTextActive]}>
                      Sem {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </FormItem>

            <FormItem delay={1100}>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => navigation.navigate('StudentDashboard')}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>Continue</Text>
              </TouchableOpacity>
            </FormItem>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#444cf7',
    opacity: 0.45,
  },
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  brandTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1,
    marginTop: 10,
  },
  brandSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginTop: 5,
    textAlign: 'center',
  },
  bottomBox: {
    flex: 1,
    backgroundColor: '#22C55E', // Consistent Green
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    paddingTop: 40,
    paddingHorizontal: 30,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 5,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 18,
    height: 60,
    paddingHorizontal: 20,
    justifyContent: 'center',
    marginBottom: 20,
  },
  input: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  selectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  semScroll: {
    marginBottom: 25,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  semChip: {
    marginRight: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#22C55E',
  },
  submitButton: {
    backgroundColor: '#000',
    borderRadius: 20,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomFill: {
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: height * 0.2, 
    backgroundColor: '#22C55E',
  }
});
