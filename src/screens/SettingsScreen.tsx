import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, SafeAreaView, Alert, Modal, Image, ScrollView, BackHandler} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {backupToGoogleDrive, restoreFromGoogleDrive, initGoogleSignIn} from '../services/googleDrive';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {getUser, saveUser, clearUser, UserProfile} from '../services/user';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {settingsStyles} from '../styles/globalStyles';

initGoogleSignIn();

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({onBack}) => {
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [lastRestore, setLastRestore] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
    loadTimestamps();
  }, []);

  useEffect(() => {
    const backAction = () => { onBack(); return true; };
    const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => subscription.remove();
  }, [onBack]);

  const loadUserProfile = async () => {
    const user = await getUser();
    if (user) { setUserProfile(user); setSignedIn(true); }
    else {
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser?.user) {
        const profile: UserProfile = { name: currentUser.user.name || 'Guest User', email: currentUser.user.email || '', photo: currentUser.user.photo || undefined };
        setUserProfile(profile); await saveUser(profile); setSignedIn(true);
      } else { setUserProfile(null); setSignedIn(false); }
    }
  };

  const loadTimestamps = async () => {
    try {
      const backupTime = await AsyncStorage.getItem('last_backup_time');
      const restoreTime = await AsyncStorage.getItem('last_restore_time');
      setLastBackup(backupTime); setLastRestore(restoreTime);
    } catch (error) {}
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await GoogleSignin.signIn();
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser?.user) {
        const profile: UserProfile = { name: currentUser.user.name || 'Guest User', email: currentUser.user.email || '', photo: currentUser.user.photo || undefined };
        await saveUser(profile); setUserProfile(profile); setSignedIn(true);
      }
    } catch (error: any) { Alert.alert('Sign In Failed', error.message || 'Unknown error'); }
    finally { setIsLoading(false); }
  };

  const handleBackup = async () => {
    setIsLoading(true);
    try {
      await backupToGoogleDrive();
      await AsyncStorage.setItem('last_backup_time', new Date().toISOString());
      setLastBackup(new Date().toISOString());
      Alert.alert('Success', 'Notes and FDs backed up to Google Drive successfully!');
      setIsBackupModalVisible(false);
    } catch (error: any) { Alert.alert('Backup Failed', error.message || error.code || 'Unknown error'); }
    finally { setIsLoading(false); }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      const {notes: restoredNotes, fds: restoredFDs, addNoteDirect, addFDDirect} = await restoreFromGoogleDrive();

      const notesCount = restoredNotes?.length || 0;
      const fdsCount = restoredFDs?.length || 0;

      if (notesCount === 0 && fdsCount === 0) {
        Alert.alert('No Data', 'No notes or FDs found in backup');
        setIsRestoreModalVisible(false);
        setIsLoading(false);
        return;
      }

      const foundMsg = `Found ${notesCount} notes and ${fdsCount} FDs. How would you like to restore?`;
      Alert.alert('Restore Data', foundMsg, [
        {text: 'Cancel', style: 'cancel', onPress: () => { setIsRestoreModalVisible(false); setIsLoading(false); }},
        {text: 'Merge', onPress: () => mergeAll(restoredNotes, restoredFDs, addNoteDirect, addFDDirect)},
        {text: 'Replace All', style: 'destructive', onPress: () => replaceAll(restoredNotes, restoredFDs, addNoteDirect, addFDDirect)},
      ]);
      setIsRestoreModalVisible(false);
    } catch (error: any) { Alert.alert('Restore Failed', error.message || 'Unknown error'); setIsLoading(false); }
  };

  const mergeAll = async (
    restoredNotes: Array<{id: number; title: string; content: string; created_at: number; updated_at?: number}>,
    restoredFDs: Array<{id: number; person_name: string; bank_name: string; fd_number: string; principal_amount: number; interest_rate: number; start_date: number; maturity_date: number; maturity_amount: number; created_at: number}>,
    addNoteDirect: Function,
    addFDDirect: Function
  ) => {
    try {
      // Merge notes
      for (const note of restoredNotes) {
        await addNoteDirect(note.title, note.content, note.created_at, note.updated_at);
      }

      // Merge FDs
      for (const fd of restoredFDs) {
        await addFDDirect(fd);
      }

      await AsyncStorage.setItem('last_restore_time', new Date().toISOString());
      setLastRestore(new Date().toISOString());
      Alert.alert('Success', 'Notes and FDs merged successfully!');
    } catch (error: any) { Alert.alert('Merge Failed', error.message); }
    finally { setIsLoading(false); }
  };

  const replaceAll = async (
    restoredNotes: Array<{id: number; title: string; content: string; created_at: number; updated_at?: number}>,
    restoredFDs: Array<{id: number; person_name: string; bank_name: string; fd_number: string; principal_amount: number; interest_rate: number; start_date: number; maturity_date: number; maturity_amount: number; created_at: number}>,
    addNoteDirect: Function,
    addFDDirect: Function
  ) => {
    try {
      const SQLite = require('react-native-sqlite-storage');
      SQLite.enablePromise(true);
      const db = await SQLite.openDatabase({name: 'notes.db', location: 'default'});

      // Clear and replace notes
      await db.executeSql('DELETE FROM notes');
      for (const note of restoredNotes) {
        await addNoteDirect(note.title, note.content, note.created_at, note.updated_at);
      }

      // Clear and replace FDs
      await db.executeSql('DELETE FROM fds');
      for (const fd of restoredFDs) {
        await addFDDirect(fd);
      }

      await AsyncStorage.setItem('last_restore_time', new Date().toISOString());
      setLastRestore(new Date().toISOString());
      Alert.alert('Success', 'Notes and FDs restored successfully!');
    } catch (error: any) { Alert.alert('Restore Failed', error.message); }
    finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Sign Out', style: 'destructive', onPress: async () => { try { await GoogleSignin.signOut(); await clearUser(); setUserProfile(null); setSignedIn(false); Alert.alert('Signed out', 'You have been signed out successfully.'); } catch (error) { Alert.alert('Error', 'Failed to sign out. Please try again.'); } }},
    ]);
  };

  return (
    <SafeAreaView style={settingsStyles.container}>
      <View style={settingsStyles.header}>
        <TouchableOpacity style={settingsStyles.backButton} onPress={onBack}><Icon name="arrow-left" size={20} color="#202124" solid /></TouchableOpacity>
        <Text style={settingsStyles.headerTitle}>Settings</Text>
      </View>
      <ScrollView style={settingsStyles.scrollView} contentContainerStyle={settingsStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={settingsStyles.card}>
          {signedIn ? (
            <View style={settingsStyles.profileContent}>
              <Image source={{uri: userProfile?.photo || 'https://via.placeholder.com/80'}} style={settingsStyles.avatar} />
              <Text style={settingsStyles.profileName}>{userProfile?.name || 'Guest User'}</Text>
              <Text style={settingsStyles.profileEmail}>{userProfile?.email || 'Not signed in'}</Text>
            </View>
          ) : (
            <View style={settingsStyles.loggedOutContent}>
              <Image source={require('../../assets/logo.png')} style={settingsStyles.logoImage} resizeMode="contain" />
              <Text style={settingsStyles.appName}>KeepNotes</Text>
              <TouchableOpacity style={settingsStyles.signInButton} onPress={handleSignIn} disabled={isLoading}>
                <Icon name="google" size={20} color="#fff" solid /><Text style={settingsStyles.signInButtonText}>Sign In with Google</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {signedIn && (
          <>
            <Text style={settingsStyles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity style={settingsStyles.actionCard} onPress={() => setIsBackupModalVisible(true)}>
              <View style={[settingsStyles.actionIconContainer, {backgroundColor: '#FFF8E1'}]}><Icon name="cloud-upload-alt" size={20} color="#FBBC04" solid /></View>
              <View style={settingsStyles.actionTextContainer}><Text style={settingsStyles.actionTitle}>Backup to Drive</Text><Text style={settingsStyles.actionSubtitle}>Save encrypted notes to Google Drive</Text></View>
            </TouchableOpacity>
            {lastBackup && <Text style={settingsStyles.timestampText}>Last backup: {new Date(lastBackup).toLocaleString()}</Text>}
            <TouchableOpacity style={settingsStyles.actionCard} onPress={() => setIsRestoreModalVisible(true)}>
              <View style={[settingsStyles.actionIconContainer, {backgroundColor: '#e8f5e9'}]}><Icon name="cloud-download-alt" size={20} color="#34A853" solid /></View>
              <View style={settingsStyles.actionTextContainer}><Text style={settingsStyles.actionTitle}>Restore from Drive</Text><Text style={settingsStyles.actionSubtitle}>Restore notes from Google Drive backup</Text></View>
            </TouchableOpacity>
            {lastRestore && <Text style={settingsStyles.timestampText}>Last restore: {new Date(lastRestore).toLocaleString()}</Text>}
          </>
        )}
        {signedIn && <TouchableOpacity style={settingsStyles.logoutButton} onPress={handleLogout}><Icon name="sign-out-alt" size={18} color="#e74c3c" solid /><Text style={settingsStyles.logoutButtonText}>Sign Out</Text></TouchableOpacity>}
        <View style={settingsStyles.infoCard}>
          <Text style={settingsStyles.infoTitle}>About Backup</Text>
          <Text style={settingsStyles.infoText}>- Your notes and FDs are encrypted with your Google account</Text>
          <Text style={settingsStyles.infoText}>- Only the encrypted file is stored on Google Drive</Text>
          <Text style={settingsStyles.infoText}>- Sign in with the same account to restore</Text>
          <Text style={[settingsStyles.infoText, settingsStyles.versionText]}>App version: 1.0.0</Text>
        </View>
      </ScrollView>
      <Modal visible={isBackupModalVisible} transparent animationType="slide" onRequestClose={() => setIsBackupModalVisible(false)}>
        <View style={settingsStyles.modalOverlay}>
          <View style={settingsStyles.modalContent}>
            <Text style={settingsStyles.modalTitle}>Backup to Google Drive</Text>
            <Text style={settingsStyles.modalSubtitle}>Your notes will be encrypted with your Google account and uploaded to your Drive.</Text>
            <View style={settingsStyles.modalButtons}>
              <TouchableOpacity style={settingsStyles.cancelButton} onPress={() => setIsBackupModalVisible(false)} disabled={isLoading}><Text style={settingsStyles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[settingsStyles.confirmButton, isLoading && settingsStyles.disabledButton]} onPress={handleBackup} disabled={isLoading}><Text style={settingsStyles.confirmButtonText}>{isLoading ? 'Backing up...' : 'Backup'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={isRestoreModalVisible} transparent animationType="slide" onRequestClose={() => setIsRestoreModalVisible(false)}>
        <View style={settingsStyles.modalOverlay}>
          <View style={settingsStyles.modalContent}>
            <Text style={settingsStyles.modalTitle}>Restore from Google Drive</Text>
            <Text style={settingsStyles.modalSubtitle}>Sign in with the same Google account you used for backup to restore your notes and FDs.</Text>
            <View style={settingsStyles.modalButtons}>
              <TouchableOpacity style={settingsStyles.cancelButton} onPress={() => setIsRestoreModalVisible(false)} disabled={isLoading}><Text style={settingsStyles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[settingsStyles.confirmButton, isLoading && settingsStyles.disabledButton]} onPress={handleRestore} disabled={isLoading}><Text style={settingsStyles.confirmButtonText}>{isLoading ? 'Restoring...' : 'Restore'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
