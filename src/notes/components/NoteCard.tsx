import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {Note} from '../../../src/db/database';
import {notesStyles} from '../styles/notesStyles';

interface NoteCardProps {
  note: Note;
  onPress: (note: Note) => void;
  onDelete: (note: Note) => void;
  // NEW: hide content toggle
  isHidden?: boolean;
}

export const NoteCard: React.FC<NoteCardProps> = ({note, onPress, onDelete, isHidden = false}) => {
  const formatDate = (ts: number) => {
    const d = new Date(ts * 1000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
  };

  const displayTime = note.updated_at > note.created_at ? note.updated_at : note.created_at;

  return (
    <View style={notesStyles.card}>
      <TouchableOpacity style={notesStyles.cardContent} onPress={() => onPress(note)} activeOpacity={0.7}>
        <Text style={notesStyles.cardTitle} numberOfLines={2}>
          {note.title || 'Untitled'}
        </Text>
        <Text style={notesStyles.cardBody} numberOfLines={5}>
          {isHidden ? '• • • • • • • •' : note.content}
        </Text>
      </TouchableOpacity>
      <View style={notesStyles.cardFooter}>
        <Text style={notesStyles.cardDate}>{formatDate(displayTime)}</Text>
        <TouchableOpacity style={notesStyles.iconButton} onPress={() => onDelete(note)} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="trash-alt" size={14} color="#34A853" solid />
        </TouchableOpacity>
      </View>
    </View>
  );
};
