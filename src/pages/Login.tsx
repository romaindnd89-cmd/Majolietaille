import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Scissors } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [resetSent, setResetSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !loading) {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0 && mode === 'forgot_password') return;
    
    setLoading(true);
    setError('');
    setResetSent(false);

    try {
      if (mode === 'forgot_password') {
        if (!email) {
          throw new Error('Veuillez entrer votre adresse email.');
        }
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
        setCooldown(60);
        setLoading(false);
        return;
      }

      if (mode === 'register') {
        if (!firstName || !lastName || !city) {
          throw new Error('Veuillez remplir tous les champs obligatoires.');
        }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        const isAdmin = user.email?.toLowerCase() === 'supercrevette89@hotmail.fr';
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          city: city.trim(),
          phone: phone.trim() || null,
          displayName: `${firstName.trim()} ${lastName.trim()}`,
          role: isAdmin ? 'admin' : 'client',
          points: 0,
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà utilisée. Veuillez vous connecter.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("L'authentification par email n'est pas activée. Veuillez l'activer dans la console Firebase (Authentication > Sign-in method).");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Email ou mot de passe incorrect.');
      } else if (err.code === 'auth/weak-password') {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
      } else {
        setError(err.message || 'Une erreur est survenue.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-rose-100 p-4 rounded-full text-rose-600 shadow-sm">
            <Scissors size={40} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-serif font-medium text-stone-900">
          Ma Jolie Taille
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          {mode === 'login' ? 'Connexion à votre espace' : mode === 'register' ? 'Création de votre compte' : 'Réinitialisation du mot de passe'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-stone-100">
          
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {resetSent && mode === 'forgot_password' ? (
            <div className="text-center space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm text-left">
                <p className="font-medium mb-2">Un e-mail de réinitialisation a été envoyé à <strong>{email}</strong>.</p>
                <ul className="list-disc pl-5 space-y-1 text-xs mt-2">
                  <li>Vérifiez vos courriers indésirables (spams).</li>
                  <li><strong>Utilisateurs Hotmail/Outlook :</strong> Si le lien indique qu'il est expiré, cliquez sur <strong>"Répondre"</strong> ou <strong>"Transférer"</strong> dans votre boîte mail. Dans la zone de texte qui s'ouvre, le vrai lien (commençant par https://...) apparaîtra en clair. Copiez-le et collez-le dans votre navigateur.</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetSent(false);
                }}
                className="text-sm text-rose-600 hover:text-rose-500 font-medium"
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Ville *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Téléphone (facultatif)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {mode !== 'forgot_password' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Mot de passe *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setError('');
                    setResetSent(false);
                  }}
                  className="text-sm text-stone-500 hover:text-rose-600 font-medium"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'forgot_password' && cooldown > 0)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 transition-colors mt-6"
            >
              {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : mode === 'register' ? 'Créer mon compte' : cooldown > 0 ? `Patientez ${cooldown}s...` : 'Envoyer le lien'}
            </button>
          </form>
          )}
          
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setResetSent(false);
              }}
              className="text-sm text-rose-600 hover:text-rose-500 font-medium"
            >
              {mode === 'login' || mode === 'forgot_password'
                ? "Vous n'avez pas de compte ? S'inscrire" 
                : "Vous avez déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
