import {useState, useCallback} from 'react';
import {Alert} from 'react-native';
import {Note, fetchNotes, addNote, updateNote, deleteNote} from '../../../src/db/database';

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reloadNotes = useCallback(async () => {
    const notesList = await fetchNotes();
    setNotes(notesList);
  }, []);

  const initNotes = useCallback(async () => {
    try {
      const notesList = await fetchNotes();
      setNotes(notesList);
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddNote = useCallback(async (title: string, content: string) => {
    if (!content.trim()) {
      Alert.alert('Error', 'Note content is required');
      return;
    }
    try {
      await addNote(title.trim(), content.trim());
      await reloadNotes();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
    }
  }, [reloadNotes]);

  const handleUpdateNote = useCallback(async (id: number, title: string, content: string) => {
    if (!content.trim()) {
      Alert.alert('Error', 'Note content is required');
      return;
    }
    try {
      await updateNote(id, title.trim(), content.trim());
      await reloadNotes();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
    }
  }, [reloadNotes]);

  const handleDeleteNote = useCallback(async (id: number) => {
    try {
      await deleteNote(id);
      await reloadNotes();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete note');
    }
  }, [reloadNotes]);

  return {
    notes,
    setNotes,
    isLoading,
    initNotes,
    reloadNotes,
    handleAddNote,
    handleUpdateNote,
    handleDeleteNote,
  };
};
