const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');

const JWT_SECRET = process.env.JWT_SECRET || 'Debraj';

exports.register = async (req, res) => {
  try {
    const { username, password, name, email } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: 'username and password required' });

    const existing = await User.findOne({ username });
    if (existing)
      return res.status(400).json({ message: 'username taken' });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      passwordHash: hash,
      name,
      email,
    });

    const token = jwt.sign(
      { sub: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: 'username and password required' });

    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ message: 'invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(400).json({ message: 'invalid credentials' });

    const token = jwt.sign(
      { sub: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
};
