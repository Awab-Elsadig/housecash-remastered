import { useEffect } from 'react';
import { useRefresh } from '../contexts/RefreshContext';
import { useLocation } from 'react-router-dom';

/**
 * Hook for pages to register their refresh function with the global refresh system
 * @param {Function} refreshFunction - The function to call when the page needs to refresh
 * @param {string} pageId - Optional page ID, defaults to current pathname
 */
const usePageRefresh = (refreshFunction, pageId = null) => {
  const { registerRefreshFunction, unregisterRefreshFunction } = useRefresh();
  const location = useLocation();
  
  const currentPageId = pageId || location.pathname.replace('/', '') || 'dashboard';

  useEffect(() => {
    if (refreshFunction) {
      registerRefreshFunction(currentPageId, refreshFunction);
    }

    return () => {
      unregisterRefreshFunction(currentPageId);
    };
  }, [refreshFunction, currentPageId, registerRefreshFunction, unregisterRefreshFunction]);
};

export default usePageRefresh;
