import React from 'react';
import {View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {notesStyles} from '../../styles/notesStyles';

interface NoteModalProps {
  note: Note | null;
  isVisible: boolean;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
  onDelete?: () => void;
  title: string;
  setTitle: (t: string) => void;
  content: string;
  setContent: (c: string) => void;
  history: {title: string; content: string}[];
  redoStack: {title: string; content: string}[];
  onUndo: () => void;
  onRedo: () => void;
  pushToHistory: (t: string, c: string) => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  note,
  onSave,
  onDelete,
  title,
  setTitle,
  content,
  setContent,
  history,
  redoStack,
  onUndo,
  onRedo,
  pushToHistory,
}) => {
  return (
    <KeyboardAvoidingView style={notesStyles.editorKeyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={notesStyles.editorHeader}>
        <TouchableOpacity style={notesStyles.editorBackButton} onPress={onSave} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color="#5F6368" solid />
        </TouchableOpacity>
        <View style={notesStyles.editorRightActions}>
          <TouchableOpacity style={notesStyles.editorActionButton} onPress={onUndo} disabled={history.length === 0} hitSlop={{top: 10, bottom: 10, left: 6, right: 6}}>
            <Icon name="undo" size={18} color={history.length === 0 ? '#DADCE0' : '#5F6368'} solid />
          </TouchableOpacity>
          <TouchableOpacity style={notesStyles.editorActionButton} onPress={onRedo} disabled={redoStack.length === 0} hitSlop={{top: 10, bottom: 10, left: 6, right: 6}}>
            <Icon name="redo" size={18} color={redoStack.length === 0 ? '#DADCE0' : '#5F6368'} solid />
          </TouchableOpacity>
          <TouchableOpacity style={notesStyles.editorSaveButton} onPress={onSave} hitSlop={{top: 10, bottom: 10, left: 6, right: 6}}>
            <Icon name="check" size={20} color="#fff" solid />
          </TouchableOpacity>
          {note && (
            <TouchableOpacity style={notesStyles.editorActionButton} onPress={onDelete} hitSlop={{top: 10, bottom: 10, left: 6, right: 6}}>
              <Icon name="trash-alt" size={18} color="#34A853" solid />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={notesStyles.editorBody}>
        <TextInput
          style={notesStyles.editorTitle}
          placeholder="Title"
          placeholderTextColor="#9AA0A6"
          value={title}
          onChangeText={text => {pushToHistory(text, content); setTitle(text);}}
          autoFocus={!note}
        />
        <TextInput
          style={notesStyles.editorContent}
          placeholder="Take a note..."
          placeholderTextColor="#9AA0A6"
          value={content}
          onChangeText={text => {pushToHistory(title, text); setContent(text);}}
          multiline
          textAlignVertical="top"
        />
      </View>
    </KeyboardAvoidingView>
  );
};
