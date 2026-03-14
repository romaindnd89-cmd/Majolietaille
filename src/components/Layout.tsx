import { Outlet, useNavigate } from 'react-router';
import { LogOut, Scissors, User } from 'lucide-react';
import { auth, logout, db } from '../lib/firebase';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

export function Layout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }
    
    let unsubscribe: (() => void) | undefined;
    
    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }, (error) => {
        console.error("Firestore error in Layout:", error);
      });
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = userData?.firstName || userData?.lastName 
    ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() 
    : (user?.displayName || user?.email);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
      <header className="bg-white shadow-sm border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 p-2 rounded-full text-rose-600">
              <Scissors size={20} />
            </div>
            <h1 className="text-xl font-serif font-medium text-stone-800">
              Ma Jolie Taille
            </h1>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-stone-600">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-stone-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500">
                    <User size={16} />
                  </div>
                )}
                <span className="font-medium">{displayName}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                title="Se déconnecter"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      
      <footer className="bg-stone-100 border-t border-stone-200 py-6 text-center text-sm text-stone-500">
        <p>5 Rue Joubert 89000 AUXERRE</p>
        <p className="mt-1">© {new Date().getFullYear()} Ma Jolie Taille - Bar à couture</p>
      </footer>
    </div>
  );
}
