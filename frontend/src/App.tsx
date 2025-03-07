import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MobileCheck from './components/MobileCheck';
import { ConnectWalletPage } from './components/ConnectWalletPage';
import GroupList from './components/GroupList';
import CreateGroup from './components/CreateGroup';
import JoinGroup from './components/JoinGroup';
import { ActivityTracker } from './components/ActivityTracker';
import { Performance } from './components/Performance';
import { CombinedProvider } from './contexts/CombinedProvider';
import { MainLayout } from './components/Layout/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Rewards } from './components/Rewards';

const App: React.FC = () => {
  return (
    <CombinedProvider>
      <BrowserRouter>
        <MobileCheck>
          <Routes>
            <Route path="/" element={<ConnectWalletPage />} />

            <Route element={<MainLayout />}>
              <Route path="/groups" element={<GroupList />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/my-groups" element={<GroupList showMyGroups />} />
                <Route path="/create-group" element={<CreateGroup />} />
                <Route path="/join-group/:groupId" element={<JoinGroup />} />
                <Route path="/activity/:groupId" element={<ActivityTracker />} />
                <Route path="/performance/:groupId" element={<Performance />} />
                <Route path="/rewards" element={<Rewards />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MobileCheck>
      </BrowserRouter>
    </CombinedProvider>
  );
};

export default App;