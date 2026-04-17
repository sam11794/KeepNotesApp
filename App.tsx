import React, {useState} from 'react';
import {SafeAreaView, StatusBar} from 'react-native';
import {useDrawer} from './src/hooks/useDrawer';
import {NotesScreen} from './src/notes/screens/NotesScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {FinanceScreen} from './src/finance/screens/FinanceScreen';
import {AddFDScreen} from './src/finance/screens/AddFDScreen';
import {FDListScreen} from './src/finance/screens/FDListScreen';
import {DrawerLayout} from './src/navigation/DrawerLayout';

type Screen = 'notes' | 'settings' | 'finance' | 'addfd' | 'fdlist';

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('notes');
  const [selectedFDId, setSelectedFDId] = useState<number | undefined>(undefined);
  const {isDrawerOpen, drawerSlideAnim, overlayAnim, openDrawer, closeDrawer} = useDrawer();

  const navigateTo = (screen: Screen) => {
    setActiveScreen(screen);
    closeDrawer();
  };

  const handleViewAllFDs = (fdId?: number) => {
    setSelectedFDId(fdId);
    setActiveScreen('fdlist');
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F5F5F5'}}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {activeScreen === 'notes' ? (
        <NotesScreen onOpenDrawer={openDrawer} onEditorVisibleChange={() => {}} />
      ) : activeScreen === 'finance' ? (
        <FinanceScreen onOpenDrawer={openDrawer} onAddFD={() => setActiveScreen('addfd')} onViewAllFDs={handleViewAllFDs} />
      ) : activeScreen === 'addfd' ? (
        <AddFDScreen onBack={() => setActiveScreen('finance')} />
      ) : activeScreen === 'fdlist' ? (
        <FDListScreen onBack={() => setActiveScreen('finance')} initialFDId={selectedFDId} />
      ) : (
        <SettingsScreen onBack={() => setActiveScreen('notes')} />
      )}
      <DrawerLayout isOpen={isDrawerOpen} activeScreen={activeScreen} drawerSlideAnim={drawerSlideAnim} overlayAnim={overlayAnim} onClose={closeDrawer} onNavigate={navigateTo} />
    </SafeAreaView>
  );
};

export default App;
