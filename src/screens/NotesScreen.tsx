import React, {useEffect, useState, useCallback} from 'react';
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
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {initDB, fetchNotes, addNote, updateNote, deleteNote, Note} from '../db/database';

// Get screen dimensions for layout
const SCREEN_WIDTH = Dimensions.get('window').width;

// Props interface for drawer navigation callback
interface NotesScreenProps {
  onOpenDrawer: () => void;
  onEditorVisibleChange: (visible: boolean) => void;
}

const NotesScreen: React.FC<NotesScreenProps> = ({onOpenDrawer, onEditorVisibleChange}) => {
  // State for note input fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  // State for storing notes list
  const [notes, setNotes] = useState<Note[]>([]);
  // State for loading indicator
  const [isLoading, setIsLoading] = useState(true);
  // State for edit mode - stores note being edited, null if adding new
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  // State for full-screen editor visibility
  const [isFullScreenEditorVisible, setIsFullScreenEditorVisible] = useState(false);
  // Undo/Redo state
  const [history, setHistory] = useState<{title: string; content: string}[]>([]);
  const [redoStack, setRedoStack] = useState<{title: string; content: string}[]>([]);

  // Load notes when component mounts
  useEffect(() => {
    const setup = async () => {
      try {
        await initDB();
        const notesList = await fetchNotes();
        setNotes(notesList);
      } catch (error) {
        Alert.alert('Error', 'Failed to initialize database');
      } finally {
        setIsLoading(false);
      }
    };
    setup();
  }, []);

  // System back button handling - auto-save when editor is open
  useEffect(() => {
    const backAction = () => {
      if (isFullScreenEditorVisible) {
        if (content.trim()) {
          handleSaveNote();
        } else {
          handleCancelEdit();
        }
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => subscription.remove();
  }, [isFullScreenEditorVisible, title, content]);

  // Notify parent when editor visibility changes
  useEffect(() => {
    onEditorVisibleChange(isFullScreenEditorVisible);
  }, [isFullScreenEditorVisible, onEditorVisibleChange]);

  // Push state to history when text changes
  const pushToHistory = useCallback((newTitle: string, newContent: string) => {
    setHistory(prev => [...prev.slice(-20), {title, content}]);
    setRedoStack([]);
  }, [title, content]);

  // Undo handler
  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setRedoStack(prev => [...prev, {title, content}]);
    setHistory(prev => prev.slice(0, -1));
    setTitle(lastState.title);
    setContent(lastState.content);
  };

  // Redo handler
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, {title, content}]);
    setRedoStack(prev => prev.slice(0, -1));
    setTitle(nextState.title);
    setContent(nextState.content);
  };

  // Reload notes from database
  const reloadNotes = async () => {
    const notesList = await fetchNotes();
    setNotes(notesList);
  };

  // Handle adding or updating a note
  const handleSaveNote = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Note content is required');
      return;
    }

    try {
      if (editingNote) {
        await updateNote(editingNote.id, title.trim(), content.trim());
      } else {
        await addNote(title.trim(), content.trim());
      }
      setTitle('');
      setContent('');
      setHistory([]);
      setRedoStack([]);
      setEditingNote(null);
      setIsFullScreenEditorVisible(false);
      await reloadNotes();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
    }
  };

  // Open full-screen editor in edit mode
  const handleEditNote = (note: Note) => {
    setTitle(note.title);
    setContent(note.content);
    setHistory([]);
    setRedoStack([]);
    setEditingNote(note);
    setIsFullScreenEditorVisible(true);
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
    setHistory([]);
    setRedoStack([]);
    setEditingNote(null);
    setIsFullScreenEditorVisible(false);
  };

  // Open full-screen editor for new note
  const handleAddNewNote = () => {
    setTitle('');
    setContent('');
    setHistory([]);
    setRedoStack([]);
    setEditingNote(null);
    setIsFullScreenEditorVisible(true);
  };

  // Render each note card
  const renderNoteCard = ({item}: {item: Note}) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => handleEditNote(item)}
        activeOpacity={0.7}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={styles.cardBody} numberOfLines={5}>
          {item.content}
        </Text>
      </TouchableOpacity>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          {new Date(item.created_at * 1000).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleDeleteNote(item)}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="trash-alt" size={14} color="#34A853" solid />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Show loading while initializing
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Full-screen editor view
  if (isFullScreenEditorVisible) {
    return (
      <SafeAreaView style={styles.editorContainer} pointerEvents="box-none">
        <KeyboardAvoidingView
          style={styles.editorKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none">
          {/* Editor Header */}
          <View style={styles.editorHeader} pointerEvents="box-none">
            {/* Left side */}
            <TouchableOpacity
              style={styles.editorBackButton}
              onPress={handleSaveNote}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon name="arrow-left" size={20} color="#5F6368" solid />
            </TouchableOpacity>
            {/* Right side */}
            <View style={styles.editorRightActions}>
              <TouchableOpacity
                style={styles.editorActionButton}
                onPress={handleUndo}
                disabled={history.length === 0}
                hitSlop={{top: 10, bottom: 10, left: 6, right: 6}}>
                <Icon
                  name="undo"
                  size={18}
                  color={history.length === 0 ? '#DADCE0' : '#5F6368'}
                  solid
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editorActionButton}
                onPress={handleRedo}
                disabled={redoStack.length === 0}
                hitSlop={{top: 10, bottom: 10, left: 6, right: 6}}>
                <Icon
                  name="redo"
                  size={18}
                  color={redoStack.length === 0 ? '#DADCE0' : '#5F6368'}
                  solid
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editorSaveButton}
                onPress={handleSaveNote}
                hitSlop={{top: 10, bottom: 10, left: 6, right: 6}}>
                <Icon name="check" size={20} color="#fff" solid />
              </TouchableOpacity>
              {editingNote && (
                <TouchableOpacity
                  style={styles.editorActionButton}
                  onPress={() => {
                    handleDeleteNote(editingNote);
                    handleCancelEdit();
                  }}
                  hitSlop={{top: 10, bottom: 10, left: 6, right: 6}}>
                  <Icon name="trash-alt" size={18} color="#34A853" solid />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Editor Body */}
          <View style={styles.editorBody} pointerEvents="box-none">
            <TextInput
              style={styles.editorTitle}
              placeholder="Title"
              placeholderTextColor="#9AA0A6"
              value={title}
              onChangeText={text => {
                pushToHistory(text, content);
                setTitle(text);
              }}
              autoFocus={!editingNote}
            />
            <TextInput
              style={styles.editorContent}
              placeholder="Take a note..."
              placeholderTextColor="#9AA0A6"
              value={content}
              onChangeText={text => {
                pushToHistory(title, text);
                setContent(text);
              }}
              multiline
              textAlignVertical="top"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Main notes list view
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={onOpenDrawer}>
          <Icon name="bars" size={22} color="#202124" />
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
          <View style={styles.emptyContainer}>
            <Icon name="sticky-note" size={48} color="#DADCE0" solid />
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap + to create your first note
            </Text>
          </View>
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddNewNote}>
        <Icon name="plus" size={26} color="#fff" solid />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  menuButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    marginLeft: 12,
    color: '#202124',
  },

  // Grid layout for notes
  notesList: {
    paddingHorizontal: 14,
    paddingBottom: 120,
    paddingTop: 14,
  },
  cardRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  // Individual note card
  card: {
    width: (SCREEN_WIDTH - 40) / 2, // Fixed width for consistent grid
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 12,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Roboto-Medium',
    color: '#202124',
    marginBottom: 6,
    lineHeight: 22,
  },
  cardBody: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  cardDate: {
    fontSize: 11,
    fontFamily: 'Roboto-Regular',
    color: '#9AA0A6',
  },
  cardActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 4,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Medium',
    color: '#5F6368',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#9AA0A6',
    marginTop: 4,
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FBBC04',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FBBC04',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Full-screen Editor styles
  editorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  editorKeyboardView: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  editorBackButton: {
    padding: 8,
  },
  editorRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  editorDeleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginRight: 4,
  },
  editorSaveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FBBC04',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  editorTitle: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#202124',
    marginBottom: 12,
    paddingVertical: 6,
  },
  editorContent: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    color: '#202124',
    lineHeight: 24,
    textAlignVertical: 'top',
  },
});

export default NotesScreen;