import {StyleSheet, Dimensions} from 'react-native';
import {colors} from '../../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const notesStyles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: colors.textSecondary,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    marginLeft: 12,
    color: colors.textPrimary,
  },

  // Search Bar styles
  searchContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
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
    width: (SCREEN_WIDTH - 40) / 2,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 16,
    elevation: 1,
    shadowColor: colors.shadow,
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
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 22,
  },
  cardBody: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: colors.textSecondary,
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
    color: colors.textHint,
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
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: colors.textHint,
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Full-screen Editor styles
  editorContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  editorKeyboardView: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  editorBackButton: {
    padding: 10,
  },
  editorRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editorActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
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
    backgroundColor: colors.primary,
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
    color: colors.textPrimary,
    marginBottom: 12,
    paddingVertical: 6,
  },
  editorContent: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    color: colors.textPrimary,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
});
