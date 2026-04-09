import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import NotesScreen from './src/screens/NotesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Simple screen types
type Screen = 'notes' | 'settings';

const App: React.FC = () => {
  // Track current active screen
  const [activeScreen, setActiveScreen] = useState<Screen>('notes');
  // Track if drawer is open
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Open drawer
  const openDrawer = () => setIsDrawerOpen(true);
  // Close drawer
  const closeDrawer = () => setIsDrawerOpen(false);

  // Navigate to a screen and close drawer
  const navigateTo = (screen: Screen) => {
    setActiveScreen(screen);
    closeDrawer();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Main content based on active screen */}
      {activeScreen === 'notes' ? (
        <NotesScreen onOpenDrawer={openDrawer} />
      ) : (
        <SettingsScreen />
      )}

      {/* Side Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDrawer}>
        <View style={styles.drawerOverlay}>
          {/* Tap outside to close */}
          <TouchableOpacity
            style={styles.drawerBackdrop}
            onPress={closeDrawer}
            activeOpacity={1}
          />
          {/* Drawer content */}
          <View style={styles.drawerContent}>
            <View style={styles.drawerLogoContainer}>
              <Icon name="sticky-note" size={32} color="#f0a500" solid />
            </View>
            <Text style={styles.drawerTitle}>Menu</Text>
            <TouchableOpacity
              style={[
                styles.drawerItem,
                activeScreen === 'notes' && styles.drawerItemActive,
              ]}
              onPress={() => navigateTo('notes')}>
              <Icon
                name="clipboard"
                size={18}
                color={activeScreen === 'notes' ? '#f0a500' : '#666'}
                solid
              />
              <Text
                style={[
                  styles.drawerText,
                  activeScreen === 'notes' && styles.drawerTextActive,
                ]}>
                Notes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.drawerItem,
                activeScreen === 'settings' && styles.drawerItemActive,
              ]}
              onPress={() => navigateTo('settings')}>
              <Icon
                name="cog"
                size={18}
                color={activeScreen === 'settings' ? '#f0a500' : '#666'}
                solid
              />
              <Text
                style={[
                  styles.drawerText,
                  activeScreen === 'settings' && styles.drawerTextActive,
                ]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveScreen('notes')}>
          <Icon
            name="clipboard"
            size={22}
            color={activeScreen === 'notes' ? '#f0a500' : '#999'}
            solid
          />
          <Text
            style={[
              styles.navText,
              activeScreen === 'notes' && styles.navTextActive,
            ]}>
            Notes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveScreen('settings')}>
          <Icon
            name="cog"
            size={22}
            color={activeScreen === 'settings' ? '#f0a500' : '#999'}
            solid
          />
          <Text
            style={[
              styles.navText,
              activeScreen === 'settings' && styles.navTextActive,
            ]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  // Drawer styles
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContent: {
    width: 250,
    backgroundColor: '#fff',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  drawerLogoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Bold',
    color: '#333',
    marginBottom: 30,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  drawerItemActive: {
    backgroundColor: '#fff3e0',
  },
  drawerText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#333',
    marginLeft: 16,
  },
  drawerTextActive: {
    color: '#f0a500',
    fontWeight: '600',
  },
  // Bottom Navigation styles
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingBottom: 20, // Extra padding for safe area on some devices
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#999',
    marginTop: 4,
  },
  navTextActive: {
    color: '#f0a500',
    fontWeight: '600',
  },
});

export default App;
