const User = require('../models/userModel.js');
const Location = require('../models/locationModel.js');

exports.searchUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const users = await User.find({
      $or: [
        { username: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') }
      ]
    })
      .limit(20)
      .select('username name');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addFriend = async (req, res) => {
  try {
    const meId = req.userId;
    const otherId = req.params.id;
    if (meId === otherId) return res.status(400).json({ message: "can't add yourself" });

    const me = await User.findById(meId);
    const other = await User.findById(otherId);
    if (!other) return res.status(404).json({ message: 'user not found' });

    if (!me.friends.includes(other._id)) {
      me.friends.push(other._id);
      await me.save();
    }
    if (!other.friends.includes(me._id)) {
      other.friends.push(me._id);
      await other.save();
    }

    res.json({ message: 'connected', friend: { id: other._id, username: other.username, name: other.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
};

exports.getMyFriends = async (req, res) => {
  try {
    const me = await User.findById(req.userId).populate('friends', 'username name');
    res.status(200).json({success: true,friends: me.friends});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
};

exports.getFriendsLocations = async (req, res) => {
  try {
    const me = await User.findById(req.userId).select('friends');
    console.log(me);
    const friendIds = me.friends || [];
    const locs = await Location.find({ user: { $in: friendIds } }).populate('user', 'username name');
    res.status(200).json({success: true, locs : locs});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
};
