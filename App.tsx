import React, {useState} from 'react';
import {SafeAreaView, StatusBar} from 'react-native';
import {useDrawer} from './src/hooks/useDrawer';
import {NotesScreen} from './src/screens/NotesScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {DrawerLayout} from './src/navigation/DrawerLayout';

type Screen = 'notes' | 'settings';

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('notes');
  const {isDrawerOpen, drawerSlideAnim, overlayAnim, openDrawer, closeDrawer} = useDrawer();

  const navigateTo = (screen: Screen) => {
    setActiveScreen(screen);
    closeDrawer();
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F5F5F5'}}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {activeScreen === 'notes' ? (
        <NotesScreen onOpenDrawer={openDrawer} onEditorVisibleChange={() => {}} />
      ) : (
        <SettingsScreen onBack={() => setActiveScreen('notes')} />
      )}
      <DrawerLayout isOpen={isDrawerOpen} activeScreen={activeScreen} drawerSlideAnim={drawerSlideAnim} overlayAnim={overlayAnim} onClose={closeDrawer} onNavigate={navigateTo} />
    </SafeAreaView>
  );
};

export default App;
