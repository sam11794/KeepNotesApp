import {useState, useCallback, useMemo} from 'react';
import {Alert} from 'react-native';
import {FD, FDInput, getAllFDs, addFD as dbAddFD, updateFD as dbUpdateFD, deleteFD as dbDeleteFD} from '../../db/database';

export const useFDs = () => {
  const [fds, setFDs] = useState<FD[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFDs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllFDs();
      setFDs(data);
    } catch (error) {
      console.error('FDs load error:', error);
      Alert.alert('Error', 'Failed to load FDs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addFD = useCallback(async (fd: FDInput) => {
    try {
      await dbAddFD(fd);
      await loadFDs();
    } catch (error) {
      Alert.alert('Error', 'Failed to add FD');
    }
  }, [loadFDs]);

  const updateFD = useCallback(async (id: number, fd: FDInput) => {
    try {
      await dbUpdateFD(id, fd);
      await loadFDs();
    } catch (error) {
      Alert.alert('Error', 'Failed to update FD');
    }
  }, [loadFDs]);

  const deleteFD = useCallback(async (id: number) => {
    try {
      await dbDeleteFD(id);
      await loadFDs();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete FD');
    }
  }, [loadFDs]);

  // Computed values
  const totalInvestment = useMemo(() => {
    return fds.reduce((sum, fd) => sum + fd.principal_amount, 0);
  }, [fds]);

  const totalMaturity = useMemo(() => {
    return fds.reduce((sum, fd) => sum + fd.maturity_amount, 0);
  }, [fds]);

  const totalInterest = useMemo(() => {
    return fds.reduce((sum, fd) => sum + (fd.maturity_amount - fd.principal_amount), 0);
  }, [fds]);

  const maturingSoonFDs = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const twentyDaysLater = now + (20 * 24 * 60 * 60);
    // Show ALL matured FDs (any past date) + upcoming within 20 days
    return fds.filter(fd => fd.maturity_date <= twentyDaysLater);
  }, [fds]);

  return {
    fds,
    isLoading,
    loadFDs,
    addFD,
    updateFD,
    deleteFD,
    totalInvestment,
    totalMaturity,
    totalInterest,
    maturingSoonFDs,
  };
};
