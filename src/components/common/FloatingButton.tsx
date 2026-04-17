import React from 'react';
import {TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {notesStyles} from '../../notes/styles/notesStyles';

interface FloatingButtonProps {
  onPress: () => void;
  icon?: string;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({onPress, icon = 'plus'}) => {
  return (
    <TouchableOpacity style={notesStyles.fab} onPress={onPress} activeOpacity={0.8}>
      <Icon name={icon} size={26} color="#fff" solid />
    </TouchableOpacity>
  );
};
