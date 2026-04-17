import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {notesStyles} from '../../notes/styles/notesStyles';

interface CustomHeaderProps {
  title: string;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  showMenu?: boolean;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  onMenuPress,
  onBackPress,
  showMenu = true,
}) => {
  return (
    <View style={notesStyles.header}>
      {showMenu ? (
        <TouchableOpacity style={notesStyles.menuButton} onPress={onMenuPress}>
          <Icon name="bars" size={22} color="#202124" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={notesStyles.menuButton} onPress={onBackPress}>
          <Icon name="arrow-left" size={20} color="#202124" />
        </TouchableOpacity>
      )}
      <Text style={notesStyles.headerTitle}>{title}</Text>
    </View>
  );
};
