import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  Image,
} from 'react-native';
import {
  backupToGoogleDrive,
  restoreFromGoogleDrive,
  initGoogleSignIn,
} from '../services/googleDrive';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {getUser, saveUser, clearUser, UserProfile} from '../services/user';

// Initialize Google Sign-In when module loads
initGoogleSignIn();

const SettingsScreen: React.FC = () => {
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  // Reload user when screen mounts (App.tsx remounts this component on screen switch)
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const user = await getUser();
    if (user) {
      setUserProfile(user);
      setSignedIn(true);
    } else {
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser?.user) {
        const profile: UserProfile = {
          name: currentUser.user.name || 'Guest User',
          email: currentUser.user.email || '',
          photo: currentUser.user.photo || undefined,
        };
        setUserProfile(profile);
        await saveUser(profile);
        setSignedIn(true);
      } else {
        setUserProfile(null);
        setSignedIn(false);
      }
    }
  };

  // ========== SIGN IN FUNCTION ==========
  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await GoogleSignin.signIn();
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser?.user) {
        const profile: UserProfile = {
          name: currentUser.user.name || 'Guest User',
          email: currentUser.user.email || '',
          photo: currentUser.user.photo || undefined,
        };
        await saveUser(profile);
        setUserProfile(profile);
        setSignedIn(true);
      }
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== BACKUP FUNCTIONS ==========

  const openBackupModal = () => {
    setIsBackupModalVisible(true);
  };

  const handleBackup = async () => {
    setIsLoading(true);
    try {
      await backupToGoogleDrive();
      Alert.alert('Success', 'Notes backed up to Google Drive successfully!');
      setIsBackupModalVisible(false);
    } catch (error: any) {
      console.log('[SettingsScreen] Backup error:', error);
      Alert.alert('Backup Failed', error.message || error.code || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== RESTORE FUNCTIONS ==========

  const openRestoreModal = () => {
    setIsRestoreModalVisible(true);
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      const {notes: restoredNotes, addNoteDirect} =
        await restoreFromGoogleDrive();

      if (!restoredNotes || restoredNotes.length === 0) {
        Alert.alert('No Data', 'No notes found in backup');
        setIsRestoreModalVisible(false);
        setIsLoading(false);
        return;
      }

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
        await addNoteDirect(note.title, note.content, note.created_at);
      }
      Alert.alert('Success', 'Notes merged successfully!');
    } catch (error: any) {
      Alert.alert('Merge Failed', error.message);
    } finally {
      setIsLoading(false);
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
      const SQLite = require('react-native-sqlite-storage');
      SQLite.enablePromise(true);

      const db = await SQLite.openDatabase({
        name: 'notes.db',
        location: 'default',
      });

      await db.executeSql('DELETE FROM notes');

      for (const note of restoredNotes) {
        await addNoteDirect(note.title, note.content, note.created_at);
      }

      Alert.alert('Success', 'Notes restored successfully!');
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ========== LOGOUT FUNCTION ==========

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await GoogleSignin.signOut();
              await clearUser();
              setUserProfile(null);
              setSignedIn(false);
              Alert.alert('Signed out', 'You have been signed out successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Conditional: Signed In = Show Profile, Not Signed In = Show Sign In Button */}
        {signedIn ? (
          <>
            {/* Profile Section - Shown when signed in */}
            <View style={styles.profileSection}>
              <Image
                source={{uri: userProfile?.photo || 'https://via.placeholder.com/80'}}
                style={styles.avatar}
              />
              <Text style={styles.userName}>{userProfile?.name || 'Guest User'}</Text>
              <Text style={styles.userEmail}>{userProfile?.email || 'Not signed in'}</Text>
            </View>
            <View style={styles.profileDivider} />
          </>
        ) : (
          <>
            {/* Sign In Button - Shown when not signed in */}
            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn} disabled={isLoading}>
              <Text style={styles.signInButtonText}>🔐 Sign In with Google</Text>
            </TouchableOpacity>
            <View style={styles.profileDivider} />
          </>
        )}

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

        {/* Conditional: Show Logout button only when signed in */}
        {signedIn && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Backup</Text>
          <Text style={styles.infoText}>
            - Your notes are encrypted with your Google account
          </Text>
          <Text style={styles.infoText}>
            - Only the encrypted file is stored on Google Drive
          </Text>
          <Text style={styles.infoText}>
            - Sign in with the same account to restore
          </Text>
        </View>
      </View>

      {/* Backup Confirmation Modal */}
      <Modal
        visible={isBackupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBackupModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Backup to Google Drive</Text>
            <Text style={styles.modalSubtitle}>
              Your notes will be encrypted with your Google account and uploaded
              to your Drive.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsBackupModalVisible(false)}
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

      {/* Restore Confirmation Modal */}
      <Modal
        visible={isRestoreModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRestoreModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Restore from Google Drive</Text>
            <Text style={styles.modalSubtitle}>
              Sign in with the same Google account you used for backup to restore
              your notes.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsRestoreModalVisible(false)}
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
  // Profile section styles
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: '#ddd',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 16,
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
  signInButton: {
    backgroundColor: '#4285f4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
  infoSection: {
    marginTop: 10,
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
