import React from 'react';
import { useRefresh } from '../../contexts/RefreshContext';
import useSwipeRefresh from '../../hooks/useSwipeRefresh';
import classes from './SwipeRefreshWrapper.module.css';

const SwipeRefreshWrapper = ({ children, enabled = true, className = '' }) => {
  const { triggerRefresh } = useRefresh();
  
  const handleRefresh = async () => {
    const currentPath = window.location.pathname;
    const pageId = currentPath.replace('/', '') || 'dashboard';
    await triggerRefresh(pageId);
  };

  const { 
    isRefreshing, 
    pullDistance, 
    pullProgress, 
    elementRef, 
    isPulling 
  } = useSwipeRefresh(handleRefresh, { enabled });

  return (
    <div 
      ref={elementRef}
      className={`${classes.swipeRefreshContainer} ${className}`}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullDistance * 0.3, 20)}px)` : 'none',
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull indicator */}
      {isPulling && (
        <div 
          className={classes.pullIndicator}
          style={{
            opacity: pullProgress,
            transform: `scale(${0.5 + pullProgress * 0.5})`
          }}
        >
          <div className={classes.pullIcon}>
            {pullProgress >= 1 ? '↻' : '↓'}
          </div>
          <div className={classes.pullText}>
            {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isRefreshing && (
        <div className={classes.refreshIndicator}>
          <div className={classes.refreshSpinner}></div>
          <div className={classes.refreshText}>Refreshing...</div>
        </div>
      )}

      {/* Main content */}
      <div className={classes.content}>
        {children}
      </div>
    </div>
  );
};

export default SwipeRefreshWrapper;
