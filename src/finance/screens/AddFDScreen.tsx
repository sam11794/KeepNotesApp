import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useFDs} from '../hooks/useFDs';
import {FD, FDInput} from '../../db/database';

interface AddFDScreenProps {
  onBack: () => void;
  fd?: FD;
}

// Date display helper: convert YYYY-MM-DD or DD/MM/YYYY to "DD MMM YYYY"
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.includes('-')
    ? dateStr.split('-')
    : dateStr.split('/');
  if (parts.length !== 3) return dateStr;

  let day: string, month: string, year: string;
  if (dateStr.includes('-')) {
    [year, month, day] = parts;
  } else {
    [day, month, year] = parts;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
};

// Convert timestamp (Unix seconds) to display string DD/MM/YYYY
const timestampToDisplay = (ts: number): string => {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Parse DD/MM/YYYY to Unix timestamp
const parseDisplayToTimestamp = (displayStr: string): number => {
  if (!displayStr) return 0;
  const parts = displayStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    return Math.floor(new Date(year, month - 1, day).getTime() / 1000);
  }
  return 0;
};

// JS-only Calendar Date Picker (no native lib needed)
interface CalendarPickerProps {
  visible: boolean;
  initialDate: string; // DD/MM/YYYY
  onConfirm: (dateStr: string) => void;
  onCancel: () => void;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({visible, initialDate, onConfirm, onCancel}) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getDayOfWeek = (y: number, m: number, d: number) => new Date(y, m, d).getDay();

  // Initialize from DD/MM/YYYY or default to today
  const initParts = initialDate
    ? initialDate.split('/')
    : [String(new Date().getDate()), String(new Date().getMonth() + 1), String(new Date().getFullYear())];

  const [day, setDay] = useState(parseInt(initParts[0]) || 1);
  const [month, setMonth] = useState(parseInt(initParts[1]) - 1 || 0);
  const [year, setYear] = useState(parseInt(initParts[2]) || new Date().getFullYear());

  // Reset when opened with new initialDate
  useEffect(() => {
    if (visible && initialDate) {
      const parts = initialDate.split('/');
      if (parts.length === 3) {
        setDay(parseInt(parts[0]));
        setMonth(parseInt(parts[1]) - 1);
        setYear(parseInt(parts[2]));
      }
    }
  }, [visible, initialDate]);

  const dim = daysInMonth(year, month);
  const firstDayOfWeek = getDayOfWeek(year, month, 1); // 0=Sun, 6=Sat

  const calendarDays = [];
  // Padding for first week
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= dim; d++) {
    calendarDays.push(d);
  }

  const handleConfirm = () => {
    const d = String(day).padStart(2, '0');
    const m = String(month + 1).padStart(2, '0');
    onConfirm(`${d}/${m}/${year}`);
  };

  const changeMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
    // Adjust day if it exceeds new month's days
    const maxDay = daysInMonth(newYear, newMonth);
    if (day > maxDay) setDay(maxDay);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.container}>
          <Text style={pickerStyles.title}>Select Date</Text>

          {/* Month navigation */}
          <View style={pickerStyles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={pickerStyles.navBtn}>
              <Icon name="chevron-left" size={20} color="#5F6368" />
            </TouchableOpacity>
            <Text style={pickerStyles.monthYearText}>{months[month]} {year}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={pickerStyles.navBtn}>
              <Icon name="chevron-right" size={20} color="#5F6368" />
            </TouchableOpacity>
          </View>

          {/* Day of week headers */}
          <View style={pickerStyles.weekRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
              <Text key={i} style={pickerStyles.weekDayText}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={pickerStyles.calendarGrid}>
            {calendarDays.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  pickerStyles.dayCell,
                  d === null && pickerStyles.emptyCell,
                  d === day && pickerStyles.selectedDay,
                ]}
                onPress={() => d !== null && setDay(d)}
                disabled={d === null}
              >
                {d !== null && (
                  <Text style={[
                    pickerStyles.dayText,
                    d === day && pickerStyles.selectedDayText,
                  ]}>
                    {d}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={pickerStyles.buttonRow}>
            <TouchableOpacity style={pickerStyles.cancelBtn} onPress={onCancel}>
              <Text style={pickerStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pickerStyles.confirmBtn} onPress={handleConfirm}>
              <Text style={pickerStyles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const pickerStyles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'},
  container: {backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '85%', maxWidth: 340},
  title: {fontSize: 18, fontFamily: 'Roboto-Bold', color: '#202124', textAlign: 'center', marginBottom: 16},
  monthNav: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  navBtn: {padding: 8, backgroundColor: '#F5F5F5', borderRadius: 8},
  monthYearText: {fontSize: 16, fontFamily: 'Roboto-Bold', color: '#202124'},
  weekRow: {flexDirection: 'row', marginBottom: 4},
  weekDayText: {flex: 1, textAlign: 'center', fontSize: 12, fontFamily: 'Roboto-Medium', color: '#9AA0A6'},
  calendarGrid: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16},
  dayCell: {width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8},
  emptyCell: {},
  selectedDay: {backgroundColor: '#FBBC04'},
  dayText: {fontSize: 14, fontFamily: 'Roboto-Regular', color: '#202124'},
  selectedDayText: {fontFamily: 'Roboto-Bold', color: '#202124'},
  buttonRow: {flexDirection: 'row', gap: 12},
  cancelBtn: {flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E8EAED', alignItems: 'center'},
  cancelBtnText: {fontSize: 16, fontFamily: 'Roboto-Medium', color: '#5F6368'},
  confirmBtn: {flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#FBBC04', alignItems: 'center'},
  confirmBtnText: {fontSize: 16, fontFamily: 'Roboto-Bold', color: '#202124'},
});

export const AddFDScreen: React.FC<AddFDScreenProps> = ({onBack, fd}) => {
  const {addFD, updateFD} = useFDs();
  const isEdit = !!fd;

  const [personName, setPersonName] = useState('');
  const [bankName, setBankName] = useState('');
  const [fdNumber, setFdNumber] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState(''); // DD/MM/YYYY
  const [maturityDate, setMaturityDate] = useState(''); // DD/MM/YYYY
  const [maturityAmount, setMaturityAmount] = useState('');

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showMaturityDatePicker, setShowMaturityDatePicker] = useState(false);

  useEffect(() => {
    if (isEdit && fd) {
      setPersonName(fd.person_name || '');
      setBankName(fd.bank_name || '');
      setFdNumber(fd.fd_number || '');
      setPrincipalAmount(fd.principal_amount?.toString() || '');
      setInterestRate(fd.interest_rate?.toString() || '');
      setStartDate(timestampToDisplay(fd.start_date));
      setMaturityDate(timestampToDisplay(fd.maturity_date));
      setMaturityAmount(fd.maturity_amount?.toString() || '');
    }
  }, [isEdit, fd]);

  const handleSave = async () => {
    if (!personName.trim()) {
      Alert.alert('Validation Error', 'Person Name is required');
      return;
    }
    if (!principalAmount.trim()) {
      Alert.alert('Validation Error', 'FD Amount is required');
      return;
    }
    if (!maturityDate) {
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

    const fdData: FDInput = {
      person_name: personName.trim(),
      bank_name: bankName.trim(),
      fd_number: fdNumber.trim(),
      principal_amount: amount,
      interest_rate: interest,
      start_date: parseDisplayToTimestamp(startDate),
      maturity_date: parseDisplayToTimestamp(maturityDate),
      maturity_amount: maturity || amount,
    };

    try {
      if (isEdit && fd) {
        await updateFD(fd.id, fdData);
      } else {
        await addFD(fdData);
      }
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit FD' : 'Add FD'}</Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Person Name *</Text>
          <TextInput style={styles.input} value={personName} onChangeText={setPersonName} placeholder="Enter person name" placeholderTextColor="#9AA0A6" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bank Name</Text>
          <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="Enter bank name" placeholderTextColor="#9AA0A6" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>FD Number</Text>
          <TextInput style={styles.input} value={fdNumber} onChangeText={setFdNumber} placeholder="Enter FD number" placeholderTextColor="#9AA0A6" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>FD Amount *</Text>
          <TextInput style={styles.input} value={principalAmount} onChangeText={setPrincipalAmount} placeholder="Enter FD amount" placeholderTextColor="#9AA0A6" keyboardType="numeric" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Interest Rate (%)</Text>
          <TextInput style={styles.input} value={interestRate} onChangeText={setInterestRate} placeholder="Enter interest rate" placeholderTextColor="#9AA0A6" keyboardType="numeric" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartDatePicker(true)}>
            <Icon name="calendar" size={16} color="#5F6368" />
            <Text style={startDate ? styles.dateText : styles.datePlaceholder}>
              {startDate ? formatDisplayDate(startDate) : 'Select date'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Maturity Date *</Text>
          <TouchableOpacity style={[styles.dateInput, !maturityDate && styles.dateInputPlaceholder]} onPress={() => setShowMaturityDatePicker(true)}>
            <Icon name="calendar" size={16} color="#5F6368" />
            <Text style={maturityDate ? styles.dateText : styles.datePlaceholder}>
              {maturityDate ? formatDisplayDate(maturityDate) : 'Select date'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Maturity Amount</Text>
          <TextInput style={styles.input} value={maturityAmount} onChangeText={setMaturityAmount} placeholder="Enter maturity amount" placeholderTextColor="#9AA0A6" keyboardType="numeric" />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
            <Icon name="save" size={18} color="#fff" solid />
            <Text style={styles.saveButtonText}>{isEdit ? 'Update FD' : 'Save FD'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CalendarPicker
        visible={showStartDatePicker}
        initialDate={startDate}
        onConfirm={(dateStr) => { setStartDate(dateStr); setShowStartDatePicker(false); }}
        onCancel={() => setShowStartDatePicker(false)}
      />
      <CalendarPicker
        visible={showMaturityDatePicker}
        initialDate={maturityDate}
        onConfirm={(dateStr) => { setMaturityDate(dateStr); setShowMaturityDatePicker(false); }}
        onCancel={() => setShowMaturityDatePicker(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F5F5'},
  header: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E8EAED'},
  backButton: {padding: 8, marginLeft: -8},
  headerTitle: {fontSize: 24, fontFamily: 'Roboto-Bold', marginLeft: 12, color: '#202124'},
  form: {flex: 1, padding: 16},
  inputGroup: {marginBottom: 16},
  label: {fontSize: 14, fontFamily: 'Roboto-Medium', color: '#5F6368', marginBottom: 8},
  input: {backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, fontFamily: 'Roboto-Regular', color: '#202124', borderWidth: 1, borderColor: '#E8EAED'},
  dateInput: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E8EAED'},
  dateInputPlaceholder: {borderStyle: 'dashed'},
  dateText: {fontSize: 16, fontFamily: 'Roboto-Regular', color: '#202124'},
  datePlaceholder: {fontSize: 16, fontFamily: 'Roboto-Regular', color: '#9AA0A6'},
  buttonContainer: {flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40},
  cancelButton: {flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E8EAED'},
  cancelButtonText: {fontSize: 16, fontFamily: 'Roboto-Medium', color: '#5F6368'},
  saveButton: {flex: 2, flexDirection: 'row', backgroundColor: '#FBBC04', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8},
  saveButtonText: {fontSize: 16, fontFamily: 'Roboto-Bold', color: '#202124'},
});