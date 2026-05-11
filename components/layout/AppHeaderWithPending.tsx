import React, { memo } from 'react';
import { AppHeader, type AppHeaderProps } from './AppHeader';
import { usePendingUsersNotifier } from '../../hooks/usePendingUsersNotifier';

export type AppHeaderWithPendingProps = Omit<AppHeaderProps, 'pendingUsersCount'> & {
  /** Toast “Xem” — mở dashboard admin (giữ stable `useCallback` từ App). */
  onPendingToastOpen: () => void;
};

function AppHeaderWithPendingInner({
  onPendingToastOpen,
  ...headerProps
}: AppHeaderWithPendingProps) {
  const pendingUsersCount = usePendingUsersNotifier(
    headerProps.userProfile?.role === 'admin',
    onPendingToastOpen
  );

  return <AppHeader {...headerProps} pendingUsersCount={pendingUsersCount} />;
}

export const AppHeaderWithPending = memo(AppHeaderWithPendingInner);
