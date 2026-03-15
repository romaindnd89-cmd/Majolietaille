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
  app.post('/api/admin/delete-user', async (req, res) => {
    try {
      if (!admin.apps?.length) {
        return res.status(500).json({ error: 'Le serveur n\'est pas correctement configuré avec Firebase Admin.' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Non autorisé' });
      }
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Admin check by email
      const ADMIN_EMAIL = 'Supercrevette89@hotmail.fr';
      if (decodedToken.email !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Accès refusé : droits administrateur requis' });
      }

      const { targetUserId } = req.body;
      if (!targetUserId) {
        return res.status(400).json({ error: 'UID de l\'utilisateur requis.' });
      }

      // Delete user from Auth
      await admin.auth().deleteUser(targetUserId);
      
      // Delete user document from Firestore if it exists
      try {
        await admin.firestore().collection('users').doc(targetUserId).delete();
      } catch (e) {
        console.warn(`Could not delete user document for ${targetUserId}, it might not exist.`);
      }

      console.log(`Successfully deleted user: ${targetUserId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user:', error);
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
