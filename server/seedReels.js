/**
 * Seed script — adds sample reels to the database
 * Run: node server/seedReels.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/social_media_app');
  console.log('✅ MongoDB connected');

  const User = require('./models/User');
  const Reel = require('./models/Reel');

  // Pick the first existing user to be the reel author
  const user = await User.findOne().lean();
  if (!user) {
    console.error('❌ No users found. Please register at least one account first.');
    process.exit(1);
  }
  console.log(`👤 Using author: @${user.username}`);

  // Public domain / free-to-use sample video URLs
  const sampleReels = [
    {
      author: user._id,
      caption: '🌊 Ocean vibes — nothing like the sound of waves 🎶 #nature #chill',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      viewCount: 1240,
      shareCount: 87,
    },
    {
      author: user._id,
      caption: '🌸 Spring is here! Every day is a new beginning ✨ #aesthetic #vibes',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      viewCount: 3400,
      shareCount: 210,
    },
    {
      author: user._id,
      caption: '🏙️ City lights after dark — the city never sleeps 🌃 #citylife #nightvibes',
      videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
      viewCount: 2100,
      shareCount: 143,
    },
    {
      author: user._id,
      caption: '🚀 Dream big, work hard, stay focused 💪 #motivation #grind',
      videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
      viewCount: 5600,
      shareCount: 374,
    },
    {
      author: user._id,
      caption: '☕ Slow mornings hit different 😌 #morningvibes #coffeetime',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      viewCount: 980,
      shareCount: 52,
    },
  ];

  // Remove old seeded reels to avoid duplicates on re-run
  await Reel.deleteMany({ videoUrl: { $in: sampleReels.map(r => r.videoUrl) } });

  const inserted = await Reel.insertMany(sampleReels);
  console.log(`🎬 Inserted ${inserted.length} sample reels!`);

  await mongoose.disconnect();
  console.log('👋 Done. Visit http://localhost:3000/reels.html to see them!');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
