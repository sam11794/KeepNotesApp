import React from 'react';
import {View, Text, TouchableOpacity, Animated} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Image from 'react-native';
import {drawerStyles} from '../../styles/drawerStyles';

type Screen = 'notes' | 'settings';

interface DrawerContentProps {
  activeScreen: Screen;
  drawerSlideAnim: Animated.Value;
  overlayAnim: Animated.Value;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
}

export const DrawerContent: React.FC<DrawerContentProps> = ({
  activeScreen,
  overlayAnim,
  onClose,
  onNavigate,
}) => {
  return (
    <View style={drawerStyles.drawerOverlay}>
      <Animated.View style={[drawerStyles.drawerBackdrop, {opacity: overlayAnim}]}>
        <TouchableOpacity style={drawerStyles.drawerBackdropTouch} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <View style={drawerStyles.drawerContent}>
        <View style={drawerStyles.drawerProfileSection}>
          <Icon name="sticky-note" size={28} color="#FBBC04" solid style={drawerStyles.drawerLogo as any} />
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
        <TouchableOpacity style={drawerStyles.drawerItem} onPress={() => onNavigate('settings')} activeOpacity={0.7}>
          <View style={[drawerStyles.drawerItemIcon, activeScreen === 'settings' && drawerStyles.drawerItemIconActive]}>
            <Icon name="cog" size={20} color={activeScreen === 'settings' ? '#FBBC04' : '#5F6368'} solid />
          </View>
          <Text style={[drawerStyles.drawerText, activeScreen === 'settings' && drawerStyles.drawerTextActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
