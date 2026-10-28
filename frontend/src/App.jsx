import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Landing from './pages/Landing';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import UploadId from './pages/Auth/UploadId';
import FaceVerify from './pages/Auth/FaceVerify';
import ProfileSetup from './pages/Auth/ProfileSetup';
import BusinessSetup from './pages/Auth/BusinessSetup';
import VerificationComplete from './pages/Auth/VerificationComplete';
import Home from './pages/Home';
import Opportunities from './pages/Opportunities';
import Events from './pages/Events';
import Network from './pages/Network';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Discover from './pages/Discover';
import CreatePost from './pages/CreatePost';
import Settings from './pages/Settings';
import ReferralRewards from './pages/ReferralRewards';
import SmartPromotion from './pages/SmartPromotion';
import InvestmentTrust from './pages/InvestmentTrust';
import { getFlowState, getToken, getUser, setUser, setFlowState, logout } from './utils/flowState';
import { getCurrentUser } from './utils/api';
import { getSettings } from './utils/appData';

function ProtectedStepRoute({ canAccess, redirectTo, children }) {
  if (!canAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

function AppContent() {
  useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Apply global dark mode if enabled in settings
    const currentSettings = getSettings();
    if (currentSettings.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    async function rehydrate() {
      const token = getToken();
      if (token) {
        try {
          const res = await getCurrentUser();
          setUser(res.user);

          if (res.user.identityVerified) {
            setFlowState({
              isAuthenticated: true,
              idVerified: true,
              faceVerified: true,
              role: res.user.role || 'individual',
            });
          } else {
            setFlowState({
              isAuthenticated: true,
              idVerified: false,
              faceVerified: false,
              role: res.user.role || 'individual',
            });
          }
        } catch {
          logout();
        }
      }
      setReady(true);
    }
    rehydrate();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0052ff] border-t-transparent" />
      </div>
    );
  }

  const flowState = getFlowState();
  const user = getUser();
  const isHomeAllowed = 
    (user?.identityVerified) || 
    (flowState.isAuthenticated && flowState.role === 'business') ||
    (flowState.isAuthenticated && flowState.idVerified && flowState.faceVerified);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={isHomeAllowed ? <Navigate to="/home" replace /> : <Login />} />
      <Route path="/signup/:role" element={isHomeAllowed ? <Navigate to="/home" replace /> : <Register />} />
      <Route path="/upload-id" element={isHomeAllowed ? <Navigate to="/home" replace /> : <UploadId />} />
      <Route
        path="/face-verify"
        element={(
          <ProtectedStepRoute canAccess={flowState.idVerified || flowState.isAuthenticated} redirectTo="/signin">
            <FaceVerify />
          </ProtectedStepRoute>
        )}
      />
      <Route path="/setup/profile" element={<ProfileSetup />} />
      <Route path="/verification-complete" element={<VerificationComplete />} />
      <Route path="/setup/business" element={<BusinessSetup />} />
      <Route
        path="/home"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <Home />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/opportunities"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <Opportunities />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/events"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <Events />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/network"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <Network />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/messages"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <Messages />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/notifications"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <Notifications />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/profile"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <Profile />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/discover"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <Discover />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/create-post"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <CreatePost />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/settings"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <Settings />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/referral-rewards"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <ReferralRewards />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/smart-promotion"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <SmartPromotion />
          </ProtectedStepRoute>
        )}
      />
      <Route
        path="/investment-trust"
        element={(
          <ProtectedStepRoute canAccess={isHomeAllowed} redirectTo="/signin">
            <InvestmentTrust />
          </ProtectedStepRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
