import React, { createContext, useContext, useState } from 'react';

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

  const registerRefreshFunction = (pageId, refreshFn) => {
    setRefreshFunctions(prev => new Map(prev.set(pageId, refreshFn)));
  };

  const unregisterRefreshFunction = (pageId) => {
    setRefreshFunctions(prev => {
      const newMap = new Map(prev);
      newMap.delete(pageId);
      return newMap;
    });
  };

  const triggerRefresh = async (pageId) => {
    const refreshFn = refreshFunctions.get(pageId);
    if (refreshFn) {
      return await refreshFn();
    }
    return Promise.resolve();
  };

  const value = {
    registerRefreshFunction,
    unregisterRefreshFunction,
    triggerRefresh
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};
