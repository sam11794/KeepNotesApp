import {StyleSheet, Dimensions} from 'react-native';
import {colors} from '../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
export const DRAWER_WIDTH = SCREEN_WIDTH * 0.80;

export const drawerStyles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Drawer Overlay
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  drawerBackdropTouch: {
    flex: 1,
    width: '100%',
  },
  drawerContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surface,
    paddingTop: 48,
    paddingHorizontal: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: {width: 2, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1,
  },

  // Profile Section
  drawerProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  drawerLogo: {
    width: 44,
    height: 44,
  },
  drawerProfileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  drawerUserName: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  drawerUserEmail: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: colors.textSecondary,
  },

  // Divider
  drawerDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 20,
    marginVertical: 8,
  },

  // Menu Items
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 24,
    marginBottom: 4,
  },
  drawerItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  drawerItemIconActive: {
    backgroundColor: colors.primaryLight,
  },
  drawerText: {
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    color: colors.textSecondary,
    marginLeft: 12,
  },
  drawerTextActive: {
    color: colors.textPrimary,
    fontFamily: 'Roboto-Medium',
    fontWeight: '500',
  },
});
