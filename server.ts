import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import admin from 'firebase-admin';
import path from 'path';

// Initialize Firebase Admin
try {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountStr) {
    const serviceAccount = JSON.parse(serviceAccountStr);
    if (!admin.apps?.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully');
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is missing.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/admin/change-password', async (req, res) => {
    try {
      if (!admin.apps?.length) {
        return res.status(500).json({ error: 'Le serveur n\'est pas correctement configuré avec Firebase Admin. Vérifiez la clé FIREBASE_SERVICE_ACCOUNT dans les paramètres.' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Non autorisé' });
      }
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Verify admin status from Firestore
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        return res.status(403).json({ error: 'Accès refusé : droits administrateur requis' });
      }

      const { targetUserId, newPassword } = req.body;
      if (!targetUserId || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Données invalides. Le mot de passe doit faire au moins 6 caractères.' });
      }

      await admin.auth().updateUser(targetUserId, {
        password: newPassword
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: error.message || 'Erreur interne du serveur' });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
