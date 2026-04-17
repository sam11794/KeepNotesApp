import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useFDs} from '../hooks/useFDs';

interface AddFDScreenProps {
  onBack: () => void;
}

export const AddFDScreen: React.FC<AddFDScreenProps> = ({onBack}) => {
  const {addFD} = useFDs();

  const [personName, setPersonName] = useState('');
  const [bankName, setBankName] = useState('');
  const [fdNumber, setFdNumber] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [maturityAmount, setMaturityAmount] = useState('');

  const parseDateToTimestamp = (dateStr: string): number => {
    const cleaned = dateStr.trim();
    const parts = cleaned.split(/[/-]/);
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      const date = new Date(year, month - 1, day);
      return Math.floor(date.getTime() / 1000);
    }
    return 0;
  };

  const handleSave = async () => {
    if (!personName.trim()) {
      Alert.alert('Validation Error', 'Person Name is required');
      return;
    }
    if (!principalAmount.trim()) {
      Alert.alert('Validation Error', 'FD Amount is required');
      return;
    }
    if (!maturityDate.trim()) {
      Alert.alert('Validation Error', 'Maturity Date is required');
      return;
    }

    const amount = parseFloat(principalAmount);
    const interest = parseFloat(interestRate) || 0;
    const maturity = parseFloat(maturityAmount) || 0;

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid FD Amount');
      return;
    }

    const fdData = {
      person_name: personName.trim(),
      bank_name: bankName.trim(),
      fd_number: fdNumber.trim(),
      principal_amount: amount,
      interest_rate: interest,
      start_date: parseDateToTimestamp(startDate),
      maturity_date: parseDateToTimestamp(maturityDate),
      maturity_amount: maturity || amount,
    };

    try {
      await addFD(fdData);
      onBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save FD');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-left" size={20} color="#202124" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add FD</Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Person Name *</Text>
          <TextInput
            style={styles.input}
            value={personName}
            onChangeText={setPersonName}
            placeholder="Enter person name"
            placeholderTextColor="#9AA0A6"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            value={bankName}
            onChangeText={setBankName}
            placeholder="Enter bank name"
            placeholderTextColor="#9AA0A6"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>FD Number</Text>
          <TextInput
            style={styles.input}
            value={fdNumber}
            onChangeText={setFdNumber}
            placeholder="Enter FD number"
            placeholderTextColor="#9AA0A6"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>FD Amount *</Text>
          <TextInput
            style={styles.input}
            value={principalAmount}
            onChangeText={setPrincipalAmount}
            placeholder="Enter FD amount"
            placeholderTextColor="#9AA0A6"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Interest Rate (%)</Text>
          <TextInput
            style={styles.input}
            value={interestRate}
            onChangeText={setInterestRate}
            placeholder="Enter interest rate"
            placeholderTextColor="#9AA0A6"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Date (DD/MM/YYYY)</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#9AA0A6"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Maturity Date * (DD/MM/YYYY)</Text>
          <TextInput
            style={styles.input}
            value={maturityDate}
            onChangeText={setMaturityDate}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#9AA0A6"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Maturity Amount</Text>
          <TextInput
            style={styles.input}
            value={maturityAmount}
            onChangeText={setMaturityAmount}
            placeholder="Enter maturity amount"
            placeholderTextColor="#9AA0A6"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
            <Icon name="save" size={18} color="#fff" solid />
            <Text style={styles.saveButtonText}>Save FD</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    marginLeft: 12,
    color: '#202124',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#5F6368',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#202124',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#5F6368',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#FBBC04',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#202124',
  },
});
