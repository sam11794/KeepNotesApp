import React, {useState} from 'react';
import {SafeAreaView, StatusBar} from 'react-native';
import {useDrawer} from './src/hooks/useDrawer';
import {NotesScreen} from './src/notes/screens/NotesScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {FinanceScreen} from './src/finance/screens/FinanceScreen';
import {AddFDScreen} from './src/finance/screens/AddFDScreen';
import {FDListScreen} from './src/finance/screens/FDListScreen';
import {DrawerLayout} from './src/navigation/DrawerLayout';
import {FD} from './src/db/database';

type Screen = 'notes' | 'settings' | 'finance' | 'addfd' | 'fdlist';

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('notes');
  const [selectedFDId, setSelectedFDId] = useState<number | undefined>(undefined);
  // NEW: selected FD for edit mode
  const [selectedFD, setSelectedFD] = useState<FD | undefined>(undefined);
  const {isDrawerOpen, drawerSlideAnim, overlayAnim, openDrawer, closeDrawer} = useDrawer();

  const navigateTo = (screen: Screen) => {
    setActiveScreen(screen);
    closeDrawer();
  };

  const handleViewAllFDs = (fdId?: number) => {
    setSelectedFDId(fdId);
    setActiveScreen('fdlist');
  };

  // NEW: handle edit FD from FDListScreen
  const handleEditFD = (fd: FD) => {
    setSelectedFD(fd);
    setActiveScreen('addfd');
  };

  const handleAddFD = () => {
    setSelectedFD(undefined); // Clear any previous edit
    setActiveScreen('addfd');
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F5F5F5'}}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {activeScreen === 'notes' ? (
        <NotesScreen onOpenDrawer={openDrawer} onEditorVisibleChange={() => {}} />
      ) : activeScreen === 'finance' ? (
        <FinanceScreen onOpenDrawer={openDrawer} onAddFD={handleAddFD} onViewAllFDs={handleViewAllFDs} />
      ) : activeScreen === 'addfd' ? (
        <AddFDScreen onBack={() => { setSelectedFD(undefined); setActiveScreen('finance'); }} fd={selectedFD} />
      ) : activeScreen === 'fdlist' ? (
        <FDListScreen onBack={() => setActiveScreen('finance')} initialFDId={selectedFDId} onEditFD={handleEditFD} />
      ) : (
        <SettingsScreen onBack={() => setActiveScreen('notes')} />
      )}
      <DrawerLayout isOpen={isDrawerOpen} activeScreen={activeScreen} drawerSlideAnim={drawerSlideAnim} overlayAnim={overlayAnim} onClose={closeDrawer} onNavigate={navigateTo} />
    </SafeAreaView>
  );
};

export default App;
