import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      res.status(400).json({ success: false, message: 'No credential provided' });
      return;
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ success: false, message: 'Invalid Google token payload' });
      return;
    }

    const { email, name, sub: googleId } = payload;
    
    if (!email || !name) {
      res.status(400).json({ success: false, message: 'Incomplete Google profile' });
      return;
    }

    // Find existing user or create a new one automatically
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // First login: create a new user automatically
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          // role defaults to MEMBER via Prisma schema
        },
      });
    } else if (!user.googleId) {
      // Subsequent login for users previously manually added to DB without googleId
      user = await prisma.user.update({
        where: { email },
        data: { googleId },
      });
    }

    // Issue JWT token (no passwords stored in DB!)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};
