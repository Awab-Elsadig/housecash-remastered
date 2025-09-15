import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const RefreshContext = createContext();

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};

export const RefreshProvider = ({ children }) => {
  const [refreshFunctions, setRefreshFunctions] = useState(new Map());

  const registerRefreshFunction = useCallback((pageId, refreshFn) => {
    setRefreshFunctions(prev => {
      const newMap = new Map(prev);
      newMap.set(pageId, refreshFn);
      return newMap;
    });
  }, []);

  const unregisterRefreshFunction = useCallback((pageId) => {
    setRefreshFunctions(prev => {
      const newMap = new Map(prev);
      newMap.delete(pageId);
      return newMap;
    });
  }, []);

  const triggerRefresh = useCallback(async (pageId) => {
    const refreshFn = refreshFunctions.get(pageId);
    if (refreshFn) {
      return await refreshFn();
    }
    return Promise.resolve();
  }, [refreshFunctions]);

  const value = useMemo(() => ({
    registerRefreshFunction,
    unregisterRefreshFunction,
    triggerRefresh
  }), [registerRefreshFunction, unregisterRefreshFunction, triggerRefresh]);

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};
