import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Gift, Scissors, Star, Calendar, ArrowUpRight, ArrowDownRight, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { getBadge, BADGE_THRESHOLDS, getCustomerNumber } from '../constants';

export function ClientDashboard() {
  const [userData, setUserData] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideGift, setHideGift] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeUser = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      },
      (error) => {
        if (!auth.currentUser) return;
        handleFirestoreError(error, OperationType.GET, 'users/' + auth.currentUser?.uid);
      }
    );

    const visitsQuery = query(
      collection(db, 'visits'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeVisits = onSnapshot(
      visitsQuery,
      (snapshot) => {
        const visitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVisits(visitsData);
        setLoading(false);
      },
      (error) => {
        if (!auth.currentUser) return;
        handleFirestoreError(error, OperationType.LIST, 'visits');
      }
    );

    return () => {
      unsubscribeUser();
      unsubscribeVisits();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin text-rose-500">
          <Scissors size={32} />
        </div>
      </div>
    );
  }

  if (!userData) {
    return <div className="text-center text-stone-500">Profil introuvable.</div>;
  }

  if (userData.archived) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-3xl shadow-sm border border-stone-100">
        <h2 className="text-2xl font-serif text-stone-800 mb-4">Compte archivé</h2>
        <p className="text-stone-500">
          Votre compte a été archivé. Veuillez contacter l'administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>
      </div>
    );
  }

  const MAX_POINTS = 10;
  const currentPoints = userData.points || 0;
  const filledPoints = currentPoints % MAX_POINTS;
  const completedCards = Math.floor(currentPoints / MAX_POINTS);

  const currentBadge = getBadge(currentPoints);
  const nextBadge = [...BADGE_THRESHOLDS].find(b => b.minPoints > currentPoints);
  
  let progressPercent = 100;
  if (nextBadge) {
    const pointsInCurrentLevel = currentPoints - currentBadge.minPoints;
    const pointsNeededForNextLevel = nextBadge.minPoints - currentBadge.minPoints;
    progressPercent = Math.max(0, Math.min(100, (pointsInCurrentLevel / pointsNeededForNextLevel) * 100));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Progression Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-100">
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-2xl ${currentBadge.color.split(' ')[0]} bg-opacity-10 text-stone-800`}>
            <Trophy size={28} className={currentBadge.color.replace('bg-', 'text-').split(' ')[0]} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Votre Grade Actuel</h3>
            <p className="text-2xl font-serif text-stone-800">{currentBadge.name}</p>
          </div>
        </div>

        {nextBadge ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">{currentPoints} pts</span>
              <span className="text-stone-500 font-medium">Prochain grade : {nextBadge.name} ({nextBadge.minPoints} pts)</span>
            </div>
            <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${currentBadge.color.split(' ')[0]}`}
              />
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-center font-medium border border-amber-100">
            🎉 Félicitations ! Vous avez atteint le grade suprême !
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-300 via-rose-400 to-rose-300"></div>
        
        <h2 className="text-3xl font-serif text-stone-800 mb-2">Votre Carte de Fidélité</h2>
        <p className="text-stone-500 mb-8">
          {MAX_POINTS - filledPoints} point{MAX_POINTS - filledPoints > 1 ? 's' : ''} avant votre prochaine récompense !
        </p>

        <div className="grid grid-cols-5 gap-4 sm:gap-6 max-w-md mx-auto mb-8">
          {Array.from({ length: MAX_POINTS }).map((_, i) => {
            const isFilled = i < filledPoints;
            return (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isFilled 
                    ? 'bg-rose-100 border-rose-400 text-rose-600 shadow-inner' 
                    : 'bg-stone-50 border-stone-200 text-stone-300'
                }`}
              >
                {i === MAX_POINTS - 1 ? (
                  <Gift size={24} className={isFilled ? 'animate-pulse' : ''} />
                ) : (
                  <Star size={20} className={isFilled ? 'fill-current' : ''} />
                )}
              </motion.div>
            );
          })}
        </div>

        {completedCards > 0 && !hideGift && (
          <div 
            onClick={() => setHideGift(true)}
            className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center justify-center gap-3 cursor-pointer hover:bg-emerald-100 transition-colors"
            title="Cliquez pour masquer"
          >
            <Gift size={24} />
            <span className="font-medium">
              Vous avez {completedCards} récompense{completedCards > 1 ? 's' : ''} en attente !
            </span>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
          <h3 className="font-serif text-xl text-stone-800 mb-4">Vos Informations</h3>
          <div className="space-y-3 text-sm text-stone-600">
            <p><strong className="text-stone-900">Prénom :</strong> {userData.firstName || 'Non renseigné'}</p>
            <p><strong className="text-stone-900">Nom :</strong> {userData.lastName || 'Non renseigné'}</p>
            <p><strong className="text-stone-900">Ville :</strong> {userData.city || 'Non renseignée'}</p>
            {userData.phone && <p><strong className="text-stone-900">Téléphone :</strong> {userData.phone}</p>}
            <p><strong className="text-stone-900">Email :</strong> {userData.email}</p>
            <p><strong className="text-stone-900">Points totaux :</strong> {currentPoints}</p>
          </div>
        </div>
        
        <div className="bg-stone-800 text-stone-100 p-6 rounded-3xl shadow-sm flex flex-col justify-center items-center text-center">
          <h3 className="font-serif text-xl mb-2 text-rose-300">Votre Numéro Client</h3>
          <p className="text-sm text-stone-400 mb-6">
            Lors de votre passage à l'atelier, donnez ce numéro ou votre nom/prénom à Tiffany pour cumuler vos points.
          </p>
          <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/20">
            <span className="font-mono text-4xl tracking-widest font-bold text-white">
              {getCustomerNumber({ ...userData, id: auth.currentUser?.uid })}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-rose-50 p-2 rounded-xl text-rose-500">
            <Calendar size={20} />
          </div>
          <h3 className="font-serif text-xl text-stone-800">Historique des visites</h3>
        </div>

        {visits.length === 0 ? (
          <p className="text-stone-500 text-center py-6">Aucune visite enregistrée pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {visits.map((visit) => (
              <div key={visit.id} className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${visit.pointsChange > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {visit.pointsChange > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div>
                    <p className="font-medium text-stone-800">
                      {visit.pointsChange > 0 ? 'Points ajoutés' : 'Points retirés'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {visit.createdAt ? new Date(visit.createdAt.toDate()).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'À l\'instant'}
                    </p>
                  </div>
                </div>
                <div className={`font-medium ${visit.pointsChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {visit.pointsChange > 0 ? '+' : ''}{visit.pointsChange}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
