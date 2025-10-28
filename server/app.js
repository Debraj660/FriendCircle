const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoute.js');
const userRoutes = require('./routes/userRoute.js');

const { connectDB } = require('./db.js');
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => res.send('FriendCircle'));

module.exports = app;   
