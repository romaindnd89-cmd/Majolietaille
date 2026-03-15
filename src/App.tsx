import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ClientDashboard } from './pages/ClientDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Scissors } from 'lucide-react';

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = undefined;
      }

      if (user) {
        unsubscribeDoc = onSnapshot(
          doc(db, 'users', user.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              setUserRole(docSnap.data().role);
            }
            setLoading(false);
          },
          (error) => {
            // Ignore permission errors if the user is logging out
            if (!auth.currentUser) return;
            handleFirestoreError(error, OperationType.GET, 'users/' + user.uid);
          }
        );
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex justify-center items-center">
        <div className="animate-spin text-rose-500">
          <Scissors size={40} />
        </div>
      </div>
    );
  }

  if (!auth.currentUser) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = userRole === 'admin' || auth.currentUser?.email?.toLowerCase() === 'supercrevette89@hotmail.fr';

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // If client tries to access root, they stay on client dashboard.
  // If admin tries to access root, we should probably redirect them to admin dashboard.
  if (!requireAdmin && isAdmin && location.pathname === '/') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<Layout />}>
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <ClientDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
