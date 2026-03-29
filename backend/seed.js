const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('MongoDB Connected');
  
  // Upsert admin user
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('eeswar@2711', salt);

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    existingAdmin.username = 'eeswar';
    existingAdmin.password = hashedPassword;
    await existingAdmin.save();
    console.log('Admin user updated: eeswar / eeswar@2711');
  } else {
    const adminUser = new User({
      username: 'eeswar',
      password: hashedPassword,
      role: 'admin'
    });
    await adminUser.save();
    console.log('Admin user created: eeswar / eeswar@2711');
  }
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
