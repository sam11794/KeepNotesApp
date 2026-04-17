import React, {useEffect, useState, useRef, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useFDs} from '../hooks/useFDs';
import {FD} from '../../db/database';

interface FDListScreenProps {
  onOpenDrawer?: () => void;
  onBack?: () => void;
  initialFDId?: number;
}

type FilterType = 'all' | 'active' | 'matured';
type SortType = 'maturity' | 'amount' | 'interest';

export const FDListScreen: React.FC<FDListScreenProps> = ({onOpenDrawer, onBack, initialFDId}) => {
  const {
    fds,
    loadFDs,
    deleteFD,
    maturingSoonFDs,
  } = useFDs();

  const [highlightedFDId, setHighlightedFDId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedSort, setSelectedSort] = useState<SortType>('maturity');
  // NEW: dropdown filter state
  const [selectedPerson, setSelectedPerson] = useState<string>('All');
  const [selectedBank, setSelectedBank] = useState<string>('All');
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const hasScrolled = useRef(false);

  // NEW: derived unique persons and banks from fds
  const uniquePersons = useMemo(() => {
    const persons = [...new Set(fds.map(fd => fd.person_name))].sort();
    return ['All', ...persons];
  }, [fds]);

  // NEW: dependent banks - only show banks for selected person
  const availableBanks = useMemo(() => {
    let banks: string[];
    if (selectedPerson === 'All') {
      banks = [...new Set(fds.map(fd => fd.bank_name))];
    } else {
      banks = [...new Set(fds.filter(fd => fd.person_name === selectedPerson).map(fd => fd.bank_name))];
    }
    return ['All', ...banks.sort()];
  }, [fds, selectedPerson]);

  // NEW: handle person change - reset bank when person changes
  const handlePersonChange = (person: string) => {
    setSelectedPerson(person);
    setSelectedBank('All');
    setShowPersonDropdown(false);
  };

  useEffect(() => {
    loadFDs();
  }, []);

  useEffect(() => {
    if (initialFDId && fds.length > 0 && !hasScrolled.current) {
      const index = filteredFDs.findIndex(f => f.id === initialFDId);
      if (index !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({index, animated: true});
          setHighlightedFDId(initialFDId);
          setTimeout(() => setHighlightedFDId(null), 1500);
        }, 300);
        hasScrolled.current = true;
      }
    }
  }, [initialFDId, fds]);

  const now = Math.floor(Date.now() / 1000);
  const TWENTY_DAYS = 20 * 24 * 60 * 60;

  // NEW: styling helper - returns 'matured' | 'maturing' | 'default'
  const getFDStatus = (maturityDate: number): 'matured' | 'maturing' | 'default' => {
    if (maturityDate < now) return 'matured';
    if (maturityDate <= now + TWENTY_DAYS) return 'maturing';
    return 'default';
  };

  const filteredFDs = useMemo(() => {
    let result = [...fds];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(fd =>
        fd.person_name.toLowerCase().includes(query) ||
        fd.bank_name.toLowerCase().includes(query) ||
        fd.fd_number.toLowerCase().includes(query)
      );
    }

    // NEW: Apply person filter
    if (selectedPerson !== 'All') {
      result = result.filter(fd => fd.person_name === selectedPerson);
    }

    // NEW: Apply bank filter
    if (selectedBank !== 'All') {
      result = result.filter(fd => fd.bank_name === selectedBank);
    }

    // Apply status filter (Active / Matured)
    if (selectedFilter === 'active') {
      result = result.filter(fd => fd.maturity_date >= now);
    } else if (selectedFilter === 'matured') {
      result = result.filter(fd => fd.maturity_date < now);
    }

    // Apply sort
    result.sort((a, b) => {
      if (selectedSort === 'maturity') {
        return a.maturity_date - b.maturity_date;
      } else if (selectedSort === 'amount') {
        return b.principal_amount - a.principal_amount;
      } else {
        return b.interest_rate - a.interest_rate;
      }
    });

    return result;
  }, [fds, searchQuery, selectedPerson, selectedBank, selectedFilter, selectedSort, now]);

  // NEW: filtered totals - calculated from final filtered+sorted data
  const filteredTotals = useMemo(() => {
    return {
      totalInvestment: filteredFDs.reduce((sum, fd) => sum + fd.principal_amount, 0),
      totalMaturity: filteredFDs.reduce((sum, fd) => sum + fd.maturity_amount, 0),
    };
  }, [filteredFDs]);

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

  const exportToCSV = () => {
    const headers = ['Person Name', 'Bank Name', 'FD Number', 'Principal Amount', 'Interest Rate', 'Start Date', 'Maturity Date', 'Maturity Amount'];
    const rows = filteredFDs.map(fd => [
      fd.person_name,
      fd.bank_name,
      fd.fd_number,
      fd.principal_amount.toString(),
      fd.interest_rate.toString(),
      formatDate(fd.start_date),
      formatDate(fd.maturity_date),
      fd.maturity_amount.toString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    console.log('=== FD EXPORT (CSV) ===');
    console.log(csvContent);
    console.log('======================');
    Alert.alert('Export Complete', `CSV logged to console.\n\nFiltered count: ${filteredFDs.length} of ${fds.length}`);
  };

  const renderFDItem = ({item}: {item: FD}) => {
    // NEW: 3-state styling based on maturity
    const fdStatus = getFDStatus(item.maturity_date);
    return (
      <View style={[
        styles.fdCard,
        fdStatus === 'matured' && styles.fdCardMatured,
        fdStatus === 'maturing' && styles.fdCardMaturing,
        item.id === highlightedFDId && styles.fdCardHighlight
      ]}>
        <View style={styles.fdCardHeader}>
          <View>
            <Text style={styles.fdPersonName}>{item.person_name}</Text>
            <Text style={styles.fdBankName}>{item.bank_name}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteFD(item)} style={styles.deleteBtn}>
            <Icon name="trash-alt" size={16} color="#EA4335" solid />
          </TouchableOpacity>
        </View>
        <View style={styles.fdCardDetails}>
          <View style={styles.fdRow}>
            <Text style={styles.fdLabel}>Amount:</Text>
            <Text style={styles.fdValue}>{formatCurrency(item.principal_amount)}</Text>
          </View>
          <View style={styles.fdRow}>
            <Text style={styles.fdLabel}>Interest:</Text>
            <Text style={styles.fdValue}>{item.interest_rate}%</Text>
          </View>
          <View style={styles.fdRow}>
            <Text style={styles.fdLabel}>Start:</Text>
            <Text style={styles.fdValue}>{formatDate(item.start_date)}</Text>
          </View>
          <View style={styles.fdRow}>
            <Text style={styles.fdLabel}>Maturity:</Text>
            <Text style={[styles.fdValue, fdStatus === 'matured' && styles.maturedText]}>
              {formatDate(item.maturity_date)}
            </Text>
          </View>
          <View style={styles.fdRow}>
            <Text style={styles.fdLabel}>Maturity Amt:</Text>
            <Text style={[styles.fdValue, styles.maturityAmount]}>
              {formatCurrency(item.maturity_amount)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity style={styles.menuButton} onPress={onBack}>
            <Icon name="arrow-left" size={20} color="#202124" />
          </TouchableOpacity>
        ) : onOpenDrawer ? (
          <TouchableOpacity style={styles.menuButton} onPress={onOpenDrawer}>
            <Icon name="bars" size={22} color="#202124" />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>All Fixed Deposits</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={exportToCSV}>
          <Icon name="file-export" size={18} color="#5F6368" solid />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color="#9AA0A6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, bank, FD number..."
            placeholderTextColor="#9AA0A6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="times-circle" size={16} color="#9AA0A6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* NEW: Dropdown Filters */}
      <View style={styles.dropdownContainer}>
        {/* Person Dropdown */}
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => {
            setShowPersonDropdown(!showPersonDropdown);
            setShowBankDropdown(false);
          }}>
          <Icon name="user" size={14} color="#5F6368" />
          <Text style={styles.dropdownText}>{selectedPerson}</Text>
          <Icon name={showPersonDropdown ? 'chevron-up' : 'chevron-down'} size={12} color="#5F6368" />
        </TouchableOpacity>

        {/* Bank Dropdown */}
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => {
            setShowBankDropdown(!showBankDropdown);
            setShowPersonDropdown(false);
          }}>
          <Icon name="university" size={14} color="#5F6368" />
          <Text style={styles.dropdownText}>{selectedBank}</Text>
          <Icon name={showBankDropdown ? 'chevron-up' : 'chevron-down'} size={12} color="#5F6368" />
        </TouchableOpacity>
      </View>

      {/* NEW: Person Dropdown List */}
      {showPersonDropdown && (
        <View style={styles.dropdownList}>
          {uniquePersons.map(person => (
            <TouchableOpacity
              key={person}
              style={[styles.dropdownItem, selectedPerson === person && styles.dropdownItemSelected]}
              onPress={() => handlePersonChange(person)}>
              <Text style={[styles.dropdownItemText, selectedPerson === person && styles.dropdownItemTextSelected]}>
                {person}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* NEW: Bank Dropdown List */}
      {showBankDropdown && (
        <View style={styles.dropdownList}>
          {availableBanks.map(bank => (
            <TouchableOpacity
              key={bank}
              style={[styles.dropdownItem, selectedBank === bank && styles.dropdownItemSelected]}
              onPress={() => {
                setSelectedBank(bank);
                setShowBankDropdown(false);
              }}>
              <Text style={[styles.dropdownItemText, selectedBank === bank && styles.dropdownItemTextSelected]}>
                {bank}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filter & Sort Row */}
      <View style={styles.filterSortContainer}>
        <View style={styles.filterGroup}>
          {(['all', 'active', 'matured'] as FilterType[]).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterBtn, selectedFilter === filter && styles.filterBtnActive]}
              onPress={() => setSelectedFilter(filter)}>
              <Text style={[styles.filterBtnText, selectedFilter === filter && styles.filterBtnTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sortGroup}>
          <Text style={styles.sortLabel}>Sort:</Text>
          <TouchableOpacity
            style={[styles.sortBtn, selectedSort === 'maturity' && styles.sortBtnActive]}
            onPress={() => setSelectedSort('maturity')}>
            <Text style={[styles.sortBtnText, selectedSort === 'maturity' && styles.sortBtnTextActive]}>Date</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortBtn, selectedSort === 'amount' && styles.sortBtnActive]}
            onPress={() => setSelectedSort('amount')}>
            <Text style={[styles.sortBtnText, selectedSort === 'amount' && styles.sortBtnTextActive]}>Amount</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortBtn, selectedSort === 'interest' && styles.sortBtnActive]}
            onPress={() => setSelectedSort('interest')}>
            <Text style={[styles.sortBtnText, selectedSort === 'interest' && styles.sortBtnTextActive]}>Rate</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results count */}
      <View style={styles.resultsCount}>
        <Text style={styles.resultsCountText}>
          Showing {filteredFDs.length} of {fds.length} FDs
        </Text>
      </View>

      {/* FD List */}
      <FlatList
        ref={flatListRef}
        data={filteredFDs}
        renderItem={renderFDItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
        ListHeaderComponent={
          // NEW: Filtered totals header
          filteredFDs.length > 0 ? (
            <View style={styles.totalsHeader}>
              <View style={styles.totalCard}>
                <Icon name="wallet" size={20} color="#FBBC04" solid />
                <Text style={styles.totalLabel}>Total Investment</Text>
                <Text style={styles.totalValue}>{formatCurrency(filteredTotals.totalInvestment)}</Text>
              </View>
              <View style={styles.totalCard}>
                <Icon name="piggy-bank" size={20} color="#34A853" solid />
                <Text style={styles.totalLabel}>Maturity Value</Text>
                <Text style={styles.totalValue}>{formatCurrency(filteredTotals.totalMaturity)}</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="search" size={48} color="#DADCE0" solid />
            <Text style={styles.emptyTitle}>No FDs found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    flex: 1,
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    marginLeft: 12,
    color: '#202124',
  },
  exportBtn: {
    padding: 8,
  },
  searchContainer: {
    padding: 14,
    paddingBottom: 8,
  },
  // NEW: dropdown styles
  dropdownContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 10,
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#202124',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 14,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  dropdownItemSelected: {
    backgroundColor: '#E8F0FE',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#202124',
  },
  dropdownItemTextSelected: {
    color: '#4285F4',
    fontFamily: 'Roboto-Medium',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    color: '#202124',
  },
  filterSortContainer: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  filterBtnActive: {
    backgroundColor: '#202124',
    borderColor: '#202124',
  },
  filterBtnText: {
    fontSize: 13,
    fontFamily: 'Roboto-Medium',
    color: '#5F6368',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  sortGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortLabel: {
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    color: '#5F6368',
    marginRight: 4,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  sortBtnActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#4285F4',
  },
  sortBtnText: {
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    color: '#5F6368',
  },
  sortBtnTextActive: {
    color: '#4285F4',
  },
  resultsCount: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  resultsCountText: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#9AA0A6',
  },
  // NEW: filtered totals header styles
  // FIX: stats layout - proper 2-column layout with equal width
  totalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  totalCard: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
    marginTop: 6,
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 15,
    fontFamily: 'Roboto-Bold',
    color: '#202124',
    marginTop: 4,
    textAlign: 'center',
  },
  listContent: {
    padding: 14,
    paddingTop: 6,
    paddingBottom: 100,
  },
  // NEW: card background fix - white card with better shadow for contrast
  fdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  // NEW: matured border styling - green for matured FDs
  fdCardMatured: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',  // Green for matured
  },
  // NEW: maturing soon styling
  fdCardMaturing: {
    borderLeftWidth: 4,
    borderLeftColor: '#FBBC04',
  },
  fdCardHighlight: {
    backgroundColor: '#E8F0FE',
    borderWidth: 2,
    borderColor: '#4285F4',
  },
  fdCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  fdPersonName: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#202124',
  },
  fdBankName: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  fdCardDetails: {},
  fdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },
  fdLabel: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#5F6368',
  },
  fdValue: {
    fontSize: 13,
    fontFamily: 'Roboto-Medium',
    color: '#202124',
  },
  maturedText: {
    color: '#EA4335',
  },
  maturityAmount: {
    fontFamily: 'Roboto-Bold',
    color: '#34A853',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
});
