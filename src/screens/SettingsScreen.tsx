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
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  backupToGoogleDrive,
  restoreFromGoogleDrive,
  initGoogleSignIn,
} from '../services/googleDrive';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {getUser, saveUser, clearUser, UserProfile} from '../services/user';
import Icon from 'react-native-vector-icons/FontAwesome5';

// Initialize Google Sign-In when module loads
initGoogleSignIn();

const SettingsScreen: React.FC = () => {
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [lastRestore, setLastRestore] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Settings] useEffect: Mounting...');
    try {
      loadUserProfile();
      loadTimestamps();
    } catch (error: any) {
      console.log('[Settings] useEffect: ERROR:', error.message, error.stack);
    }
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

  const loadTimestamps = async () => {
    try {
      console.log('[Settings] loadTimestamps: Starting...');
      const backupTime = await AsyncStorage.getItem('last_backup_time');
      console.log('[Settings] loadTimestamps: backupTime =', backupTime);
      const restoreTime = await AsyncStorage.getItem('last_restore_time');
      console.log('[Settings] loadTimestamps: restoreTime =', restoreTime);
      setLastBackup(backupTime);
      setLastRestore(restoreTime);
      console.log('[Settings] loadTimestamps: Done');
    } catch (error: any) {
      console.log('[Settings] loadTimestamps: ERROR:', error.message, error.stack);
    }
  };

  const handleSignIn = async () => {
    try {
      console.log('[Settings] handleSignIn: Starting...');
      setIsLoading(true);
      console.log('[Settings] handleSignIn: Calling GoogleSignin.signIn()...');
      await GoogleSignin.signIn();
      console.log('[Settings] handleSignIn: Sign in successful, getting current user...');
      const currentUser = await GoogleSignin.getCurrentUser();
      console.log('[Settings] handleSignIn: currentUser =', JSON.stringify(currentUser));
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
      console.log('[Settings] handleSignIn: ERROR =', JSON.stringify(error));
      console.log('[Settings] handleSignIn: ERROR message =', error.message);
      console.log('[Settings] handleSignIn: ERROR code =', error.code);
      setTimeout(() => {
        Alert.alert('Sign In Failed', error.message || 'Unknown error');
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const openBackupModal = () => {
    setIsBackupModalVisible(true);
  };

  const handleBackup = async () => {
    setIsLoading(true);
    try {
      await backupToGoogleDrive();
      await AsyncStorage.setItem('last_backup_time', new Date().toISOString());
      setLastBackup(new Date().toISOString());
      Alert.alert('Success', 'Notes backed up to Google Drive successfully!');
      setIsBackupModalVisible(false);
    } catch (error: any) {
      console.log('[SettingsScreen] Backup error:', error);
      Alert.alert('Backup Failed', error.message || error.code || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

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
      await AsyncStorage.setItem('last_restore_time', new Date().toISOString());
      setLastRestore(new Date().toISOString());
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

      await AsyncStorage.setItem('last_restore_time', new Date().toISOString());
      setLastRestore(new Date().toISOString());
      Alert.alert('Success', 'Notes restored successfully!');
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.card}>
          {signedIn ? (
            <View style={styles.profileContent}>
              <Image
                source={{uri: userProfile?.photo || 'https://via.placeholder.com/80'}}
                style={styles.avatar}
              />
              <Text style={styles.profileName}>{userProfile?.name || 'Guest User'}</Text>
              <Text style={styles.profileEmail}>{userProfile?.email || 'Not signed in'}</Text>
            </View>
          ) : (
            <>
              <View style={{alignItems: 'center', marginTop: 40}}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={{width: 80, height: 80, marginBottom: 20}}
                  resizeMode="contain"
                />
              </View>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleSignIn}
                disabled={isLoading}>
                <Icon name="google" size={20} color="#fff" solid />
                <Text style={styles.signInButtonText}>Sign In with Google</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Quick Actions - Only show when signed in */}
        {signedIn && (
          <>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <TouchableOpacity style={styles.actionCard} onPress={openBackupModal}>
              <View style={styles.actionIconContainer}>
                <Icon name="cloud-upload-alt" size={20} color="#4285F4" solid />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Backup to Drive</Text>
                <Text style={styles.actionSubtitle}>Save encrypted notes to Google Drive</Text>
              </View>
            </TouchableOpacity>
            {lastBackup && (
              <Text style={styles.timestampText}>
                Last backup: {new Date(lastBackup).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}

            <TouchableOpacity style={styles.actionCard} onPress={openRestoreModal}>
              <View style={[styles.actionIconContainer, {backgroundColor: '#e8f5e9'}]}>
                <Icon name="cloud-download-alt" size={20} color="#34A853" solid />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Restore from Drive</Text>
                <Text style={styles.actionSubtitle}>Restore notes from Google Drive backup</Text>
              </View>
            </TouchableOpacity>
            {lastRestore && (
              <Text style={styles.timestampText}>
                Last restore: {new Date(lastRestore).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </>
        )}

        {/* Account Section */}
        {signedIn && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="sign-out-alt" size={18} color="#e74c3c" solid />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Backup</Text>
          <Text style={styles.infoText}>- Your notes are encrypted with your Google account</Text>
          <Text style={styles.infoText}>- Only the encrypted file is stored on Google Drive</Text>
          <Text style={styles.infoText}>- Sign in with the same account to restore</Text>
          <Text style={[styles.infoText, styles.versionText]}>App version: 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Backup Modal */}
      <Modal
        visible={isBackupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBackupModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Backup to Google Drive</Text>
            <Text style={styles.modalSubtitle}>
              Your notes will be encrypted with your Google account and uploaded to your Drive.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsBackupModalVisible(false)}
                disabled={isLoading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, isLoading && styles.disabledButton]}
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

      {/* Restore Modal */}
      <Modal
        visible={isRestoreModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRestoreModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Restore from Google Drive</Text>
            <Text style={styles.modalSubtitle}>
              Sign in with the same Google account you used for backup to restore your notes.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsRestoreModalVisible(false)}
                disabled={isLoading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, isLoading && styles.disabledButton]}
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
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  profileContent: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: '#ddd',
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#777',
  },
  signInButton: {
    flexDirection: 'row',
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#333',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#777',
  },
  timestampText: {
    fontSize: 12,
    color: '#777',
    marginTop: 6,
    marginLeft: 8,
    marginBottom: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e74c3c',
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#e74c3c',
    marginLeft: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#777',
    marginBottom: 8,
    lineHeight: 20,
  },
  versionText: {
    marginTop: 8,
    marginBottom: 0,
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
    fontFamily: 'Roboto-Bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#777',
    marginBottom: 20,
    lineHeight: 20,
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
    fontFamily: 'Roboto-Medium',
  },
  confirmButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Roboto-Medium',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default SettingsScreen;
