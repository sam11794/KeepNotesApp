import React from 'react';
import {View, Modal, Animated, Text, TouchableOpacity, Image} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {drawerStyles} from '../styles/drawerStyles';

type Screen = 'notes' | 'settings' | 'finance';

interface DrawerLayoutProps {
  isOpen: boolean;
  activeScreen: Screen;
  drawerSlideAnim: Animated.Value;
  overlayAnim: Animated.Value;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
}

export const DrawerLayout: React.FC<DrawerLayoutProps> = ({
  isOpen,
  activeScreen,
  drawerSlideAnim,
  overlayAnim,
  onClose,
  onNavigate,
}) => {
  return (
    <Modal visible={isOpen} animationType="none" transparent onRequestClose={onClose}>
      <View style={drawerStyles.drawerOverlay}>
        <Animated.View style={[drawerStyles.drawerBackdrop, {opacity: overlayAnim}]}>
          <TouchableOpacity style={drawerStyles.drawerBackdropTouch} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={[drawerStyles.drawerContent, {transform: [{translateX: drawerSlideAnim}]}]}>
          <View style={drawerStyles.drawerProfileSection}>
            <Image source={require('../../assets/logo.png')} style={drawerStyles.drawerLogo} resizeMode="contain" />
            <View style={drawerStyles.drawerProfileInfo}>
              <Text style={drawerStyles.drawerUserName}>KeepNotes</Text>
              <Text style={drawerStyles.drawerUserEmail}>Your notes, organized</Text>
            </View>
          </View>
          <View style={drawerStyles.drawerDivider} />
          <TouchableOpacity style={drawerStyles.drawerItem} onPress={() => onNavigate('notes')} activeOpacity={0.7}>
            <View style={[drawerStyles.drawerItemIcon, activeScreen === 'notes' && drawerStyles.drawerItemIconActive]}>
              <Icon name="lightbulb" size={20} color={activeScreen === 'notes' ? '#FBBC04' : '#5F6368'} solid />
            </View>
            <Text style={[drawerStyles.drawerText, activeScreen === 'notes' && drawerStyles.drawerTextActive]}>Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={drawerStyles.drawerItem} onPress={() => onNavigate('finance')} activeOpacity={0.7}>
            <View style={[drawerStyles.drawerItemIcon, activeScreen === 'finance' && drawerStyles.drawerItemIconActive]}>
              <Icon name="landmark" size={20} color={activeScreen === 'finance' ? '#FBBC04' : '#5F6368'} solid />
            </View>
            <Text style={[drawerStyles.drawerText, activeScreen === 'finance' && drawerStyles.drawerTextActive]}>Finance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={drawerStyles.drawerItem} onPress={() => onNavigate('settings')} activeOpacity={0.7}>
            <View style={[drawerStyles.drawerItemIcon, activeScreen === 'settings' && drawerStyles.drawerItemIconActive]}>
              <Icon name="cog" size={20} color={activeScreen === 'settings' ? '#FBBC04' : '#5F6368'} solid />
            </View>
            <Text style={[drawerStyles.drawerText, activeScreen === 'settings' && drawerStyles.drawerTextActive]}>Settings</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};
