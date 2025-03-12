import express, { Request, Response } from 'express';
import { db, adminDb } from '../db';

const router = express.Router();

// Admin login endpoint
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }

  try {
    // Attempt to sign in with Supabase
    const { data: { session }, error } = await db.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    if (!session) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Check if the user is an admin by querying the admin users table
    if (!adminDb) {
      return res.status(500).json({ error: 'Admin functionality not available' });
    }

    const { data: adminUser, error: adminError } = await adminDb
      .from('admin_users')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (adminError || !adminUser) {
      return res.status(403).json({ error: 'User is not an admin' });
    }

    // Return the session token and admin user data
    res.json({
      token: session.access_token,
      user: {
        ...session.user,
        isAdmin: true
      }
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;