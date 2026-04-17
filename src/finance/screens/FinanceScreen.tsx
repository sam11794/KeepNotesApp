import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useFDs} from '../hooks/useFDs';
import {FD} from '../../db/database';

interface FinanceScreenProps {
  onOpenDrawer?: () => void;
  onBack?: () => void;
  onAddFD?: () => void;
  onViewAllFDs?: (fdId?: number) => void;
}

export const FinanceScreen: React.FC<FinanceScreenProps> = ({onOpenDrawer, onBack, onAddFD, onViewAllFDs}) => {
  const {
    fds,
    loadFDs,
    deleteFD,
    totalInvestment,
    totalMaturity,
    totalInterest,
    maturingSoonFDs,
  } = useFDs();

  useEffect(() => {
    loadFDs();
  }, []);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDeleteFD = (fd: FD) => {
    Alert.alert(
      'Delete FD',
      `Are you sure you want to delete FD for ${fd.person_name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: () => deleteFD(fd.id)},
      ]
    );
  };

  const getMaturityLabel = (maturityDate: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diffDays = Math.floor((maturityDate - now) / (24 * 60 * 60));
    if (diffDays < 0) {
      return `Matured ${Math.abs(diffDays)} days ago`;
    } else if (diffDays === 0) {
      return 'Matures today';
    } else {
      return `Matures in ${diffDays} days`;
    }
  };

  const renderMaturingSoonSection = () => {
    if (maturingSoonFDs.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent & Upcoming Maturity</Text>
        {maturingSoonFDs.map(fd => {
          const now = Math.floor(Date.now() / 1000);
          const isMatured = fd.maturity_date < now;
          return (
            <TouchableOpacity
              key={fd.id}
              style={[styles.maturingCard, isMatured && styles.maturingCardMatured]}
              onPress={() => onViewAllFDs?.(fd.id)}>
              <Icon name={isMatured ? 'check-circle' : 'clock'} size={16} color={isMatured ? '#34A853' : '#FBBC04'} solid />
              <View style={styles.maturingInfo}>
                <Text style={styles.maturingName}>{fd.person_name}</Text>
                <Text style={styles.maturingDate}>{getMaturityLabel(fd.maturity_date)}</Text>
              </View>
              <Text style={styles.maturingAmount}>{formatCurrency(fd.maturity_amount)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onOpenDrawer ? (
          <TouchableOpacity style={styles.menuButton} onPress={onOpenDrawer}>
            <Icon name="bars" size={22} color="#202124" />
          </TouchableOpacity>
        ) : onBack ? (
          <TouchableOpacity style={styles.menuButton} onPress={onBack}>
            <Icon name="arrow-left" size={20} color="#202124" />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>Finance</Text>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Icon name="wallet" size={20} color="#FBBC04" solid />
            <Text style={styles.summaryLabel}>Total Investment</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalInvestment)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Icon name="piggy-bank" size={20} color="#34A853" solid />
            <Text style={styles.summaryLabel}>Maturity Value</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalMaturity)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Icon name="percent" size={20} color="#4285F4" solid />
            <Text style={styles.summaryLabel}>Total Interest</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalInterest)}</Text>
          </View>
        </View>

        {/* Maturing Soon Section */}
        {renderMaturingSoonSection()}

        {/* View All FDs Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.viewAllButton} onPress={() => onViewAllFDs?.()} activeOpacity={0.8}>
            <Icon name="list" size={18} color="#202124" solid />
            <Text style={styles.viewAllButtonText}>View All FDs ({fds.length})</Text>
            <Icon name="chevron-right" size={16} color="#5F6368" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={onAddFD}>
        <Icon name="plus" size={24} color="#fff" solid />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flex: 1,
  },
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
    marginTop: 6,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Roboto-Bold',
    color: '#202124',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#5F6368',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  maturingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FBBC04',
  },
  maturingCardMatured: {
    backgroundColor: '#E8F5E9',
    borderLeftColor: '#34A853',
  },
  maturingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  maturingName: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#202124',
  },
  maturingDate: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
    marginTop: 2,
  },
  maturingAmount: {
    fontSize: 14,
    fontFamily: 'Roboto-Bold',
    color: '#202124',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  viewAllButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#202124',
    marginLeft: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FBBC04',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#FBBC04',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
