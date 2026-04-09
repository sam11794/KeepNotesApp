import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Dimensions,
  SafeAreaView,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {initDB, fetchNotes, addNote, updateNote, deleteNote, Note} from '../db/database';

// Get screen dimensions for layout
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// Props interface for drawer navigation callback
interface NotesScreenProps {
  onOpenDrawer: () => void;
}

const NotesScreen: React.FC<NotesScreenProps> = ({onOpenDrawer}) => {
  // State for note input fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  // State for storing notes list
  const [notes, setNotes] = useState<Note[]>([]);
  // State for loading indicator
  const [isLoading, setIsLoading] = useState(true);
  // State for edit mode - stores note being edited, null if adding new
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  // State for modal visibility (edit dialog)
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Load notes when component mounts
  // fetchNotes() now returns DECRYPTED content automatically
  useEffect(() => {
    const setup = async () => {
      try {
        await initDB();
        const notesList = await fetchNotes(); // Content is decrypted inside fetchNotes()
        setNotes(notesList);
      } catch (error) {
        Alert.alert('Error', 'Failed to initialize database');
      } finally {
        setIsLoading(false);
      }
    };
    setup();
  }, []);

  // Reload notes from database
  const reloadNotes = async () => {
    const notesList = await fetchNotes(); // Content is decrypted inside fetchNotes()
    setNotes(notesList);
  };

  // Handle adding or updating a note
  // addNote() encrypts content automatically before saving
  const handleSaveNote = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Note content is required');
      return;
    }

    try {
      if (editingNote) {
        // Update existing note - updateNote() encrypts before saving
        await updateNote(editingNote.id, title.trim(), content.trim());
      } else {
        // Add new note - addNote() encrypts before saving
        await addNote(title.trim(), content.trim());
      }
      // Clear inputs and reload
      setTitle('');
      setContent('');
      setEditingNote(null);
      setIsModalVisible(false);
      await reloadNotes();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
    }
  };

  // Open edit modal with note data
  const handleEditNote = (note: Note) => {
    setTitle(note.title);
    setContent(note.content); // note.content is already decrypted from fetchNotes()
    setEditingNote(note);
    setIsModalVisible(true);
  };

  // Delete a note
  const handleDeleteNote = (note: Note) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote(note.id);
              await reloadNotes();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  // Cancel edit and clear form
  const handleCancelEdit = () => {
    setTitle('');
    setContent('');
    setEditingNote(null);
    setIsModalVisible(false);
  };

  // Open input for new note
  const handleAddNewNote = () => {
    setTitle('');
    setContent('');
    setEditingNote(null);
    setIsModalVisible(true);
  };

  // Render each note card
  const renderNoteCard = ({item}: {item: Note}) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.title || 'Untitled'}</Text>
      <Text style={styles.cardContent} numberOfLines={4}>{item.content}</Text>
      <Text style={styles.cardDate}>
        {new Date(item.created_at * 1000).toLocaleDateString()}
      </Text>
      {/* Action buttons row */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleEditNote(item)}>
          <Icon name="pen" size={14} color="#f0a500" solid />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleDeleteNote(item)}>
          <Icon name="trash-alt" size={14} color="#e74c3c" solid />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Show loading while initializing
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with hamburger menu */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={onOpenDrawer}>
          <Icon name="bars" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notes</Text>
      </View>

      {/* Notes Grid - 2 columns like Google Keep */}
      <FlatList
        data={notes}
        renderItem={renderNoteCard}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.cardRow}
        contentContainerStyle={styles.notesList}
        ListEmptyComponent={
          <View style={{alignItems: 'center', marginTop: 60}}>
            <Icon name="sticky-note" size={40} color="#ccc" solid />
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={{color: '#aaa', marginTop: 4}}>
              Tap + to create your first note
            </Text>
          </View>
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddNewNote}>
        <Icon name="plus" size={24} color="#fff" solid />
      </TouchableOpacity>

      {/* Edit/Add Note Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 20}}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>
              {editingNote ? 'Edit Note' : 'New Note'}
            </Text>
            <TextInput
              style={styles.inputTitle}
              placeholder="Title"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.inputContent}
              placeholder="Take a note..."
              placeholderTextColor="#999"
              value={content}
              onChangeText={setContent}
              multiline
            />
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveNote}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 22,
    color: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    marginLeft: 16,
    color: '#222',
  },
  // Grid layout for notes
  notesList: {
    paddingHorizontal: 12,
    paddingBottom: 120,
    paddingTop: 12,
  },
  cardRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  // Individual note card
  card: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#111',
    marginBottom: 6,
  },
  cardContent: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 11,
    fontFamily: 'Roboto-Regular',
    color: '#999',
    marginBottom: 6,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 6,
  },
  iconButton: {
    padding: 6,
    marginLeft: 8,
  },
  editIcon: {
    fontSize: 14,
  },
  deleteIcon: {
    fontSize: 14,
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f4b400',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
  },
  // Modal styles for add/edit
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    marginBottom: 16,
    color: '#333',
  },
  inputTitle: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    marginBottom: 12,
  },
  inputContent: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    marginRight: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontFamily: 'Roboto-Medium',
  },
  saveButton: {
    backgroundColor: '#f0a500',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Roboto-Medium',
  },
});

export default NotesScreen;
