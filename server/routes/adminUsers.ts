import { Router } from 'express';
import { db, auth } from '../firebaseAdmin';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { emailForAdminUsername, normalizeAdminUsername } from '../../utils/authCredentials';
const router = Router();

router.post('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, password, displayName, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedUsername = normalizeAdminUsername(String(username));
    if (!normalizedUsername) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const email = emailForAdminUsername(normalizedUsername);
    const validRoles = ['admin', 'editor', 'advice'];
    const userRole = validRoles.includes(role) ? role : 'editor';

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || normalizedUsername,
    });

    const userData = {
      uid: userRecord.uid,
      email,
      username: normalizedUsername,
      displayName: userRecord.displayName,
      photoURL: null,
      role: userRole,
      status: 'approved',
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    res.status(201).json(userData);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('Error creating user:', err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
    }
    if (err.code === 'auth/invalid-password') {
      return res.status(400).json({ error: 'Mật khẩu không hợp lệ (tối thiểu 6 ký tự).' });
    }
    if (err.code === 'app/invalid-credential' || /credential|ENOENT|service account/i.test(err.message ?? '')) {
      return res.status(503).json({
        error:
          'Server chưa cấu hình Firebase Admin. Đặt GOOGLE_APPLICATION_CREDENTIALS hoặc file service-account.json ở thư mục gốc project.',
      });
    }
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

router.post('/api/admin/users/reset-password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { uid, newPassword } = req.body;

    if (!uid || !newPassword) {
      return res.status(400).json({ error: 'uid and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    await auth.updateUser(uid, { password: newPassword });
    res.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('Error resetting password:', err);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

export { router as adminUsersRouter };
