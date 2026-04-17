import React from 'react';
import {TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

interface IconButtonProps {
  name: string;
  size?: number;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
  solid?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  size = 20,
  color = '#5F6368',
  onPress,
  disabled = false,
  solid = true,
}) => {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      <Icon name={name} size={size} color={disabled ? '#DADCE0' : color} solid={solid} />
    </TouchableOpacity>
  );
};
