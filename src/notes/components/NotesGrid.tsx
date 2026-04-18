import React from 'react';
import {FlatList, View, Text} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {Note} from '../../../src/db/database';
import {NoteCard} from './NoteCard';
import {notesStyles} from '../styles/notesStyles';

interface NotesGridProps {
  notes: Note[];
  searchQuery: string;
  onNotePress: (note: Note) => void;
  onNoteDelete: (note: Note) => void;
  // NEW: hide/view toggle
  isHidden?: boolean;
}

export const NotesGrid: React.FC<NotesGridProps> = ({
  notes,
  searchQuery,
  onNotePress,
  onNoteDelete,
  isHidden = false,
}) => {
  const renderItem = ({item}: {item: Note}) => (
    <NoteCard note={item} onPress={onNotePress} onDelete={onNoteDelete} isHidden={isHidden} />
  );

  return (
    <FlatList
      data={notes}
      renderItem={renderItem}
      keyExtractor={item => item.id.toString()}
      numColumns={2}
      columnWrapperStyle={notesStyles.cardRow}
      contentContainerStyle={notesStyles.notesList}
      ListEmptyComponent={
        <View style={notesStyles.emptyContainer}>
          <Icon name={searchQuery ? 'search' : 'sticky-note'} size={48} color="#DADCE0" solid />
          <Text style={notesStyles.emptyTitle}>{searchQuery ? 'No notes found' : 'No notes yet'}</Text>
          <Text style={notesStyles.emptySubtitle}>
            {searchQuery ? 'Try a different search term' : 'Tap + to create your first note'}
          </Text>
        </View>
      }
    />
  );
};
