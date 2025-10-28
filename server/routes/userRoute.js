const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware.js');
const {
  searchUsers,
  addFriend,
  getMyFriends,
  getFriendsLocations
} = require('../controllers/userController.js');

router.get('/search', auth, searchUsers);
router.post('/:id/add-friend', auth, addFriend);
router.get('/me/friends', auth, getMyFriends);
router.get('/me/friends/locations', auth, getFriendsLocations);

module.exports = router;
