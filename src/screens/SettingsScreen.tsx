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
  BackHandler,
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

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({onBack}) => {
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [lastRestore, setLastRestore] = useState<string | null>(null);

  // Handle system back button
  useEffect(() => {
    const backAction = () => {
      onBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => subscription.remove();
  }, [onBack]);

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
      setIsLoading(true);
      await GoogleSignin.signIn();
      const currentUser = await GoogleSignin.getCurrentUser();
      console.log("TESTING WHERE DATA COMING FROM : ",currentUser);
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
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-left" size={20} color="#202124" solid />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

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
            <View style={styles.loggedOutContent}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.appName}>KeepNotes</Text>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleSignIn}
                disabled={isLoading}>
                <Icon name="google" size={20} color="#fff" solid />
                <Text style={styles.signInButtonText}>Sign In with Google</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions - Only show when signed in */}
        {signedIn && (
          <>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <TouchableOpacity style={styles.actionCard} onPress={openBackupModal}>
              <View style={[styles.actionIconContainer, {backgroundColor: '#FFF8E1'}]}>
                <Icon name="cloud-upload-alt" size={20} color="#FBBC04" solid />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Backup to Drive</Text>
                <Text style={styles.actionSubtitle}>Save encrypted notes to Google Drive</Text>
              </View>
            </TouchableOpacity>
            {lastBackup && (
              <Text style={styles.timestampText}>
                Last backup: {new Date(lastBackup).toLocaleString()}
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
                Last restore: {new Date(lastRestore).toLocaleString()}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  loggedOutContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontFamily: 'Roboto-Bold',
    color: '#202124',
    marginBottom: 24,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 8,
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
    color: '#202124',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
  },
  signInButton: {
    flexDirection: 'row',
    backgroundColor: '#FBBC04',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#FBBC04',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#202124',
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#5F6368',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F0FE',
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
    color: '#202124',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
  },
  timestampText: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#9AA0A6',
    marginTop: 4,
    marginLeft: 4,
    marginBottom: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
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
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#202124',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
    marginBottom: 8,
    lineHeight: 20,
  },
  versionText: {
    marginTop: 12,
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
    borderRadius: 20,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#202124',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
    marginBottom: 24,
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
    borderColor: '#DADCE0',
  },
  cancelButtonText: {
    color: '#5F6368',
    fontWeight: '500',
    fontFamily: 'Roboto-Medium',
  },
  confirmButton: {
    backgroundColor: '#FBBC04',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontFamily: 'Roboto-Medium',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default SettingsScreen;
