import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, orderBy, addDoc, serverTimestamp, where, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Minus, Plus, Search, User, History, Edit2, Check, X, Eye, MapPin, Phone, Mail, Calendar, Trash2, Key } from 'lucide-react';

export function AdminDashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientVisits, setClientVisits] = useState<any[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setClients(usersData.filter(u => u.role === 'client'));
        setLoading(false);
      },
      (error) => {
        if (!auth.currentUser) return;
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedClient) {
      setClientVisits([]);
      return;
    }
    setLoadingVisits(true);
    const q = query(
      collection(db, 'visits'),
      where('userId', '==', selectedClient.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClientVisits(visits);
      setLoadingVisits(false);
    }, (error) => {
      if (!auth.currentUser) return;
      console.error("Error fetching visits:", error);
      setLoadingVisits(false);
    });
    return () => unsubscribe();
  }, [selectedClient]);

  const updatePoints = async (userId: string, currentPoints: number, change: number) => {
    const newPoints = Math.max(0, currentPoints + change);
    try {
      // Update user points
      await updateDoc(doc(db, 'users', userId), {
        points: newPoints
      });
      
      // Record the visit
      await addDoc(collection(db, 'visits'), {
        userId: userId,
        adminId: auth.currentUser?.uid,
        pointsChange: change,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const saveName = async (userId: string) => {
    try {
      const parts = editNameValue.trim().split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      await updateDoc(doc(db, 'users', userId), {
        displayName: editNameValue.trim(),
        firstName: firstName,
        lastName: lastName
      });
      setEditingUserId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const startEditingName = (client: any) => {
    setEditingUserId(client.id);
    const currentName = client.firstName || client.lastName 
      ? `${client.firstName || ''} ${client.lastName || ''}`.trim() 
      : (client.displayName || '');
    setEditNameValue(currentName);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditNameValue('');
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', clientToDelete.id));
      setClientToDelete(null);
      if (selectedClient?.id === clientToDelete.id) {
        setSelectedClient(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${clientToDelete.id}`);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setTimeout(() => setResetEmailSent(false), 3000);
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      alert("Erreur lors de l'envoi de l'email : " + error.message);
    }
  };

  const handleDirectPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newPassword || newPassword.length < 6) {
      setChangePasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setChangePasswordLoading(true);
    setChangePasswordError('');
    setChangePasswordSuccess(false);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Non authentifié');

      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: selectedClient.id,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du changement de mot de passe');
      }

      setChangePasswordSuccess(true);
      setNewPassword('');
      setTimeout(() => {
        setIsChangingPassword(false);
        setChangePasswordSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error changing password directly:", error);
      setChangePasswordError(error.message);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const filteredClients = clients.filter(client => 
    client.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12 text-stone-500">Chargement des clients...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h2 className="text-3xl font-serif text-stone-800">Gestion des Clients</h2>
        
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-stone-200 rounded-xl leading-5 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 sm:text-sm transition-colors shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white shadow-sm border border-stone-200 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Points
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-stone-500">
                    Aucun client trouvé.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {client.photoURL ? (
                            <img className="h-10 w-10 rounded-full border border-stone-200" src={client.photoURL} alt="" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          {editingUserId === client.id ? (
                            <div className="flex items-center gap-2 mb-1">
                              <input
                                type="text"
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                className="border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveName(client.id);
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                              />
                              <button onClick={() => saveName(client.id)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded">
                                <Check size={16} />
                              </button>
                              <button onClick={cancelEditing} className="text-rose-600 hover:bg-rose-50 p-1 rounded">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-stone-900">
                                {client.firstName || client.lastName ? `${client.firstName || ''} ${client.lastName || ''}` : (client.displayName || 'Sans nom')}
                              </div>
                              <button 
                                onClick={() => startEditingName(client)}
                                className="text-stone-400 hover:text-rose-500 transition-colors"
                                title="Modifier le nom"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          )}
                          <div className="text-sm text-stone-500">{client.email}</div>
                          {(client.city || client.phone) && (
                            <div className="text-xs text-stone-400 mt-0.5">
                              {client.city} {client.city && client.phone ? '•' : ''} {client.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-medium text-sm">
                        {client.points || 0} pts
                      </div>
                      {client.points >= 10 && (
                        <div className="text-xs text-emerald-600 mt-1 font-medium">
                          {Math.floor(client.points / 10)} récompense(s)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                          title="Voir les détails du client"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => updatePoints(client.id, client.points || 0, -1)}
                          disabled={(client.points || 0) <= 0}
                          className="p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Retirer un point"
                        >
                          <Minus size={16} />
                        </button>
                        <button
                          onClick={() => updatePoints(client.id, client.points || 0, 1)}
                          className="p-2 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                          title="Ajouter un point"
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          onClick={() => setClientToDelete(client)}
                          className="p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-rose-100 hover:text-rose-600 transition-colors ml-1"
                          title="Supprimer le client"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif text-stone-800">Détails du client</h3>
              <button onClick={() => setSelectedClient(null)} className="text-stone-400 hover:text-stone-600 p-2 bg-stone-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 space-y-6">
              <div className="bg-stone-50 p-4 rounded-2xl space-y-3 border border-stone-100">
                <div className="flex items-center gap-3 text-stone-700">
                  <User size={18} className="text-rose-500" />
                  <span className="font-medium text-lg">
                    {selectedClient.firstName || selectedClient.lastName 
                      ? `${selectedClient.firstName || ''} ${selectedClient.lastName || ''}`.trim() 
                      : selectedClient.displayName || 'Sans nom'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-stone-600">
                  <Mail size={18} className="text-stone-400" />
                  <span>{selectedClient.email}</span>
                </div>
                <div className="flex items-center gap-3 text-stone-600">
                  <MapPin size={18} className="text-stone-400" />
                  <span>{selectedClient.city || <span className="text-stone-400 italic">Non renseignée</span>}</span>
                </div>
                <div className="flex items-center gap-3 text-stone-600">
                  <Phone size={18} className="text-stone-400" />
                  <span>{selectedClient.phone || <span className="text-stone-400 italic">Non renseigné</span>}</span>
                </div>
                <div className="flex items-center gap-3 text-stone-600">
                  <Calendar size={18} className="text-stone-400" />
                  <span>Inscrit(e) le {selectedClient.createdAt?.toDate().toLocaleDateString('fr-FR') || 'N/A'}</span>
                </div>
              </div>

              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex justify-between items-center">
                <span className="font-medium text-rose-800">Solde de points</span>
                <span className="text-2xl font-serif text-rose-600">{selectedClient.points || 0}</span>
              </div>

              <div>
                <h4 className="font-medium text-stone-800 mb-3 flex items-center gap-2">
                  <History size={18} className="text-stone-500" />
                  Historique des visites
                </h4>
                {loadingVisits ? (
                  <p className="text-sm text-stone-500 text-center py-4">Chargement...</p>
                ) : clientVisits.length === 0 ? (
                  <p className="text-sm text-stone-500 text-center py-4 bg-stone-50 rounded-xl border border-stone-100">Aucune visite enregistrée.</p>
                ) : (
                  <div className="space-y-2">
                    {clientVisits.map(visit => (
                      <div key={visit.id} className="flex justify-between items-center p-3 bg-white border border-stone-100 rounded-xl shadow-sm">
                        <span className="text-sm text-stone-600">
                          {visit.createdAt?.toDate().toLocaleDateString('fr-FR')} à {visit.createdAt?.toDate().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${visit.pointsChange > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {visit.pointsChange > 0 ? '+' : ''}{visit.pointsChange} pt{Math.abs(visit.pointsChange) > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-stone-100">
                <h4 className="font-medium text-stone-800 mb-3 flex items-center gap-2">
                  <Key size={18} className="text-stone-500" />
                  Sécurité
                </h4>
                
                {!isChangingPassword ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      className="w-full py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit2 size={16} />
                      Changer le mot de passe manuellement
                    </button>
                    
                    <button
                      onClick={() => handleResetPassword(selectedClient.email)}
                      disabled={resetEmailSent}
                      className="w-full py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Mail size={16} />
                      {resetEmailSent ? "E-mail envoyé !" : "Envoyer un lien de réinitialisation"}
                    </button>
                    <p className="text-xs text-stone-500 mt-2 text-center">
                      Un e-mail sera envoyé à {selectedClient.email} pour qu'il puisse choisir un nouveau mot de passe.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleDirectPasswordChange} className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                    <h5 className="text-sm font-medium text-stone-800 mb-2">Nouveau mot de passe</h5>
                    
                    {changePasswordError && (
                      <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
                        {changePasswordError}
                      </div>
                    )}
                    
                    {changePasswordSuccess && (
                      <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100 flex items-center gap-1">
                        <Check size={14} /> Mot de passe modifié avec succès !
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Min. 6 caractères"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                      disabled={changePasswordLoading || changePasswordSuccess}
                    />
                    
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingPassword(false);
                          setNewPassword('');
                          setChangePasswordError('');
                        }}
                        className="flex-1 py-2 px-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg font-medium transition-colors text-sm"
                        disabled={changePasswordLoading}
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
                        disabled={changePasswordLoading || changePasswordSuccess || newPassword.length < 6}
                      >
                        {changePasswordLoading ? 'En cours...' : 'Valider'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {clientToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-serif text-stone-800 mb-2">Supprimer le client ?</h3>
            <p className="text-stone-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la carte de <strong>{clientToDelete.firstName || clientToDelete.lastName ? `${clientToDelete.firstName || ''} ${clientToDelete.lastName || ''}` : clientToDelete.displayName}</strong> ? Cette action est irréversible et supprimera son solde de points.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteClient}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
