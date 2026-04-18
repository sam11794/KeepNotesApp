import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, TextInput, StyleSheet, SafeAreaView, BackHandler, Alert, TouchableOpacity} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {initDB, Note} from '../../../src/db/database';
import {useNotes} from '../hooks/useNotes';
import {CustomHeader} from '../../components/common/CustomHeader';
import {FloatingButton} from '../../components/common/FloatingButton';
import {NotesGrid} from '../components/NotesGrid';
import {NoteModal} from '../components/NoteModal';
import {notesStyles} from '../styles/notesStyles';

interface NotesScreenProps {
  onOpenDrawer: () => void;
  onEditorVisibleChange: (visible: boolean) => void;
}

export const NotesScreen: React.FC<NotesScreenProps> = ({onOpenDrawer, onEditorVisibleChange}) => {
  const {notes, isLoading, initNotes, handleDeleteNote, reloadNotes} = useNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isFullScreenEditorVisible, setIsFullScreenEditorVisible] = useState(false);
  const [history, setHistory] = useState<{title: string; content: string}[]>([]);
  const [redoStack, setRedoStack] = useState<{title: string; content: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // NEW: hide/view toggle state
  const [isHidden, setIsHidden] = useState(false);

  // NEW: load persisted visibility preference
  useEffect(() => {
    AsyncStorage.getItem('notes_visibility_mode').then(val => {
      if (val !== null) setIsHidden(val === 'hidden');
    });
  }, []);

  useEffect(() => {
    initNotes();
  }, []);

  // NEW: persist visibility preference
  useEffect(() => {
    AsyncStorage.setItem('notes_visibility_mode', isHidden ? 'hidden' : 'visible');
  }, [isHidden]);

  const toggleHidden = () => setIsHidden(prev => !prev);

  useEffect(() => {
    onEditorVisibleChange(isFullScreenEditorVisible);
  }, [isFullScreenEditorVisible, onEditorVisibleChange]);

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
    const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => subscription.remove();
  }, [isFullScreenEditorVisible, title, content]);

  const filteredNotes = notes.filter(note => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query);
  });

  const pushToHistory = useCallback((newTitle: string, newContent: string) => {
    setHistory(prev => [...prev.slice(-20), {title, content}]);
    setRedoStack([]);
  }, [title, content]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setRedoStack(prev => [...prev, {title, content}]);
    setHistory(prev => prev.slice(0, -1));
    setTitle(lastState.title);
    setContent(lastState.content);
  }, [history, title, content]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, {title, content}]);
    setRedoStack(prev => prev.slice(0, -1));
    setTitle(nextState.title);
    setContent(nextState.content);
  }, [redoStack, title, content]);

  const handleSaveNote = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Note content is required');
      return;
    }
    try {
      const {updateNote, addNote} = await import('../../db/database');
      if (editingNote) {
        await updateNote(editingNote.id, title.trim(), content.trim());
      } else {
        await addNote(title.trim(), content.trim());
      }
      handleCancelEdit();
      await reloadNotes();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const handleEditNote = (note: Note) => {
    setTitle(note.title);
    setContent(note.content);
    setHistory([]);
    setRedoStack([]);
    setEditingNote(note);
    setIsFullScreenEditorVisible(true);
  };

  const handleDeleteNoteConfirm = (note: Note) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => handleDeleteNote(note.id)},
    ]);
  };

  const handleCancelEdit = () => {
    setTitle('');
    setContent('');
    setHistory([]);
    setRedoStack([]);
    setEditingNote(null);
    setIsFullScreenEditorVisible(false);
  };

  const handleAddNewNote = () => {
    setTitle('');
    setContent('');
    setHistory([]);
    setRedoStack([]);
    setEditingNote(null);
    setIsFullScreenEditorVisible(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={notesStyles.container}>
        <View style={notesStyles.loadingContainer}>
          <Text style={notesStyles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isFullScreenEditorVisible) {
    return (
      <SafeAreaView style={notesStyles.editorContainer} pointerEvents="box-none">
        <NoteModal
          note={editingNote}
          isVisible={isFullScreenEditorVisible}
          onClose={handleSaveNote}
          onSave={handleSaveNote}
          onDelete={() => { if (editingNote) handleDeleteNoteConfirm(editingNote); handleCancelEdit(); }}
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          history={history}
          redoStack={redoStack}
          onUndo={handleUndo}
          onRedo={handleRedo}
          pushToHistory={pushToHistory}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={notesStyles.container}>
      <CustomHeader title="Notes" onMenuPress={onOpenDrawer} showMenu />
      {/* NEW: hide/view toggle in header area */}
      <View style={notesStyles.toolbar}>
        <View style={notesStyles.searchBarWrap}>
          <TextInput style={notesStyles.searchInput} placeholder="Search notes..." placeholderTextColor="#9AA0A6" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <TouchableOpacity style={notesStyles.visibilityToggle} onPress={toggleHidden}>
          <Icon name={isHidden ? 'eye-slash' : 'eye'} size={18} color={isHidden ? '#EA4335' : '#34A853'} solid />
        </TouchableOpacity>
      </View>
      <NotesGrid notes={filteredNotes} searchQuery={searchQuery} onNotePress={handleEditNote} onNoteDelete={handleDeleteNoteConfirm} isHidden={isHidden} />
      <FloatingButton onPress={handleAddNewNote} />
    </SafeAreaView>
  );
};
