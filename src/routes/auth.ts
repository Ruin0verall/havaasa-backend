import express from 'express';
import { db } from '../db';

const router = express.Router();

router.post('/login', async (req, res) => {
  console.log('Login request received:', { ...req.body, password: '[REDACTED]' });
  
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    console.log('Missing required fields');
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }

  try {
    console.log('Attempting Supabase authentication...');
    // Attempt to sign in with Supabase
    const { data: { session }, error } = await db.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error('Supabase auth error:', error);
      return res.status(401).json({ error: error.message });
    }

    if (!session) {
      console.log('Authentication failed - no session');
      return res.status(401).json({ error: 'Authentication failed' });
    }

    console.log('Authentication successful');
    // Return the session token and user data
    res.json({
      token: session.access_token,
      user: session.user,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
router.get('/test', (req, res) => {
  res.json({ status: 'Auth route is working' });
});

export default router; 