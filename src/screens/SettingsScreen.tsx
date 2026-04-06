import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {
  backupToGoogleDrive,
  restoreFromGoogleDrive,
  initGoogleSignIn,
} from '../services/googleDrive';

// Initialize Google Sign-In when module loads
initGoogleSignIn();

const SettingsScreen: React.FC = () => {
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ========== BACKUP FUNCTIONS ==========

  const openBackupModal = () => {
    setPassword('');
    setConfirmPassword('');
    setIsBackupModalVisible(true);
  };

  const handleBackup = async () => {
    // Validate password
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      // Backup to Google Drive
      await backupToGoogleDrive(password);

      Alert.alert('Success', 'Notes backed up to Google Drive successfully!');
      setIsBackupModalVisible(false);
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Backup Failed', error.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== RESTORE FUNCTIONS ==========

  const openRestoreModal = () => {
    setPassword('');
    setIsRestoreModalVisible(true);
  };

  const handleRestore = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter the password used during backup');
      return;
    }

    setIsLoading(true);
    try {
      // Restore from Google Drive
      const {notes: restoredNotes, addNoteDirect} =
        await restoreFromGoogleDrive(password);

      if (!restoredNotes || restoredNotes.length === 0) {
        Alert.alert('No Data', 'No notes found in backup');
        setIsRestoreModalVisible(false);
        setIsLoading(false);
        return;
      }

      // Ask user whether to merge or replace
      Alert.alert(
        'Restore Notes',
        `Found ${restoredNotes.length} notes. How would you like to restore?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setIsRestoreModalVisible(false);
              setIsLoading(false);
              setPassword('');
            },
          },
          {
            text: 'Merge',
            onPress: () => mergeNotes(restoredNotes, addNoteDirect),
          },
          {
            text: 'Replace All',
            style: 'destructive',
            onPress: () => replaceAllNotes(restoredNotes, addNoteDirect),
          },
        ]
      );

      setIsRestoreModalVisible(false);
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'Unknown error');
      setIsLoading(false);
    }
  };

  const mergeNotes = async (
    restoredNotes: Array<{
      id: number;
      title: string;
      content: string;
      created_at: number;
    }>,
    addNoteDirect: Function
  ) => {
    try {
      for (const note of restoredNotes) {
        // addNoteDirect bypasses encryption since content is already encrypted
        await addNoteDirect(note.title, note.content, note.created_at);
      }
      Alert.alert('Success', 'Notes merged successfully!');
    } catch (error: any) {
      Alert.alert('Merge Failed', error.message);
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  const replaceAllNotes = async (
    restoredNotes: Array<{
      id: number;
      title: string;
      content: string;
      created_at: number;
    }>,
    addNoteDirect: Function
  ) => {
    try {
      // First delete all existing notes
      const SQLite = require('react-native-sqlite-storage');
      SQLite.enablePromise(true);

      const db = await SQLite.openDatabase({
        name: 'notes.db',
        location: 'default',
      });

      await db.executeSql('DELETE FROM notes');

      // Then add all restored notes
      for (const note of restoredNotes) {
        await addNoteDirect(note.title, note.content, note.created_at);
      }

      Alert.alert('Success', 'Notes restored successfully!');
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message);
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>App version: 1.0.0</Text>

        {/* Backup Button */}
        <TouchableOpacity style={styles.button} onPress={openBackupModal}>
          <Text style={styles.buttonIcon}>☁️</Text>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>Backup to Drive</Text>
            <Text style={styles.buttonDescription}>
              Save encrypted notes to Google Drive
            </Text>
          </View>
        </TouchableOpacity>

        {/* Restore Button */}
        <TouchableOpacity style={styles.button} onPress={openRestoreModal}>
          <Text style={styles.buttonIcon}>📥</Text>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>Restore from Drive</Text>
            <Text style={styles.buttonDescription}>
              Restore notes from Google Drive backup
            </Text>
          </View>
        </TouchableOpacity>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Backup</Text>
          <Text style={styles.infoText}>
            - Your notes are encrypted with your password before uploading
          </Text>
          <Text style={styles.infoText}>
            - Only the encrypted file is stored on Google Drive
          </Text>
          <Text style={styles.infoText}>
            - You need your password to restore notes on any device
          </Text>
        </View>
      </View>

      {/* Backup Password Modal */}
      <Modal
        visible={isBackupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBackupModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Backup Password</Text>
            <Text style={styles.modalSubtitle}>
              This password will be required to restore your notes
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter password (min 6 characters)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsBackupModalVisible(false);
                  setPassword('');
                  setConfirmPassword('');
                }}
                disabled={isLoading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isLoading && styles.disabledButton,
                ]}
                onPress={handleBackup}
                disabled={isLoading}>
                <Text style={styles.confirmButtonText}>
                  {isLoading ? 'Backing up...' : 'Backup'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Restore Password Modal */}
      <Modal
        visible={isRestoreModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRestoreModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Backup Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter the password used when creating the backup
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter backup password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsRestoreModalVisible(false);
                  setPassword('');
                }}
                disabled={isLoading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isLoading && styles.disabledButton,
                ]}
                onPress={handleRestore}
                disabled={isLoading}>
                <Text style={styles.confirmButtonText}>
                  {isLoading ? 'Restoring...' : 'Restore'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 13,
    color: '#666',
  },
  infoSection: {
    marginTop: 30,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#4285f4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default SettingsScreen;
