const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/login` : '/login',
    session: true,
  }),
  (req, res) => {
    const redirectUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL : '/';
    res.redirect(redirectUrl);
  }
);

router.get('/user', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ user: null });
  }

  const { _id, name, email, avatar } = req.user;
  res.json({ user: { _id, name, email, avatar } });
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        return next(destroyErr);
      }
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });
});

module.exports = router;
