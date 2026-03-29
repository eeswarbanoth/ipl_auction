const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { auth, authAdmin } = require('../middleware/auth');

// @route GET /api/teams
router.get('/', auth, async (req, res) => {
  try {
    const teams = await Team.find().populate('players');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/teams
router.post('/', [auth, authAdmin], async (req, res) => {
  const { name, totalPurse, username, password } = req.body;
  try {
    const team = new Team({
      name,
      username,
      totalPurse,
      remainingBudget: totalPurse,
      players: []
    });
    await team.save();

    // Create associated user for login
    if (username && password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newUser = new User({
        username,
        password: hashedPassword,
        role: 'franchise',
        teamId: team._id
      });
      await newUser.save();
    }

    req.io.emit('teams_updated');
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route PUT /api/teams/:id
router.put('/:id', [auth, authAdmin], async (req, res) => {
  const { name, totalPurse, username, password } = req.body;
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Update team fields
    if (name) team.name = name;
    if (totalPurse) {
      const difference = totalPurse - team.totalPurse;
      team.totalPurse = totalPurse;
      team.remainingBudget += difference;
    }
    
    // Update linked user if username changed or password provided
    if (username || password) {
      let user = await User.findOne({ teamId: team._id });
      if (!user) {
        user = new User({ role: 'franchise', teamId: team._id });
      }
      
      if (username) {
        user.username = username;
        team.username = username;
      }
      
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }
      await user.save();
    }

    await team.save();
    req.io.emit('teams_updated');
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route DELETE /api/teams/:id
router.delete('/:id', [auth, authAdmin], async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (team) {
      await User.deleteMany({ teamId: team._id });
      await team.deleteOne();
    }
    req.io.emit('teams_updated');
    res.json({ message: 'Team removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
