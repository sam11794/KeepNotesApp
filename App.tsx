import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import NotesScreen from './src/screens/NotesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.80; // 80% of screen width

// Simple screen types
type Screen = 'notes' | 'settings';

const App: React.FC = () => {
  // Track current active screen
  const [activeScreen, setActiveScreen] = useState<Screen>('notes');
  // Track if drawer is open
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Track if editor is visible (used by NotesScreen)
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  // Animation values for drawer
  const drawerSlideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Animate drawer open when isDrawerOpen becomes true
  useEffect(() => {
    if (isDrawerOpen) {
      Animated.parallel([
        Animated.timing(drawerSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isDrawerOpen]);

  // Open drawer
  const openDrawer = () => {
    if (isDrawerOpen) return;
    setIsDrawerOpen(true);
  };

  // Close drawer
  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerSlideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDrawerOpen(false);
    });
  };

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
        <NotesScreen onOpenDrawer={openDrawer} onEditorVisibleChange={setIsEditorVisible} />
      ) : (
        <SettingsScreen onBack={() => setActiveScreen('notes')} />
      )}

      {/* Side Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        animationType="none"
        transparent={true}
        onRequestClose={closeDrawer}>
        <View style={styles.drawerOverlay}>
          {/* Tap outside to close */}
          <Animated.View
            style={[styles.drawerBackdrop, {opacity: overlayAnim}]}>
            <TouchableOpacity
              style={styles.drawerBackdropTouch}
              onPress={closeDrawer}
              activeOpacity={1}
            />
          </Animated.View>
          {/* Drawer content */}
          <Animated.View
            style={[
              styles.drawerContent,
              {transform: [{translateX: drawerSlideAnim}]},
            ]}>
            {/* Profile Section */}
            <View style={styles.drawerProfileSection}>
              <Image
                source={require('./assets/logo.png')}
                style={styles.drawerLogo}
                resizeMode="contain"
              />
              <View style={styles.drawerProfileInfo}>
                <Text style={styles.drawerUserName}>KeepNotes</Text>
                <Text style={styles.drawerUserEmail}>Your notes, organized</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.drawerDivider} />

            {/* Menu Items */}
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => navigateTo('notes')}
              activeOpacity={0.7}>
              <View style={[
                styles.drawerItemIcon,
                activeScreen === 'notes' && styles.drawerItemIconActive,
              ]}>
                <Icon
                  name="lightbulb"
                  size={20}
                  color={activeScreen === 'notes' ? '#FBBC04' : '#5F6368'}
                  solid
                />
              </View>
              <Text
                style={[
                  styles.drawerText,
                  activeScreen === 'notes' && styles.drawerTextActive,
                ]}>
                Notes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => navigateTo('settings')}
              activeOpacity={0.7}>
              <View style={[
                styles.drawerItemIcon,
                activeScreen === 'settings' && styles.drawerItemIconActive,
              ]}>
                <Icon
                  name="cog"
                  size={20}
                  color={activeScreen === 'settings' ? '#FBBC04' : '#5F6368'}
                  solid
                />
              </View>
              <Text
                style={[
                  styles.drawerText,
                  activeScreen === 'settings' && styles.drawerTextActive,
                ]}>
                Settings
              </Text>
            </TouchableOpacity>
          </Animated.View>
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
  // Drawer styles
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerBackdropTouch: {
    flex: 1,
    width: '100%',
  },
  drawerContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingHorizontal: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 2, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1,
  },
  // Profile Section
  drawerProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  drawerLogo: {
    width: 44,
    height: 44,
  },
  drawerProfileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  drawerUserName: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#202124',
    marginBottom: 2,
  },
  drawerUserEmail: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
  },
  // Divider
  drawerDivider: {
    height: 1,
    backgroundColor: '#E8EAED',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  // Menu Items
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 24,
    marginBottom: 4,
  },
  drawerItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  drawerItemIconActive: {
    backgroundColor: '#FFF8E1',
  },
  drawerText: {
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
    marginLeft: 12,
  },
  drawerTextActive: {
    color: '#202124',
    fontFamily: 'Roboto-Medium',
    fontWeight: '500',
  },
});

export default App;
