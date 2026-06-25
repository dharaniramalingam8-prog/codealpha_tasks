/**
 * seed.js — Sample Data Seeder
 * Creates 3 sample users, follows, posts, comments, and likes
 * 
 * Usage: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User    = require('./server/models/User');
const Post    = require('./server/models/Post');
const Comment = require('./server/models/Comment');
const Follow  = require('./server/models/Follow');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/social_media_app';

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected!');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Follow.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // Create users
  const users = await User.create([
    { username: 'alice', email: 'alice@vibe.com', password: 'password123', bio: 'Design enthusiast & coffee lover ☕', avatarColor: '#6C63FF' },
    { username: 'bob',   email: 'bob@vibe.com',   password: 'password123', bio: 'Full-stack dev | Open source 🚀', avatarColor: '#FF6B9D' },
    { username: 'carol', email: 'carol@vibe.com', password: 'password123', bio: 'Photography & travel 🌍', avatarColor: '#43E97B' },
  ]);
  console.log(`👤 Created ${users.length} users`);

  const [alice, bob, carol] = users;

  // Follows: alice→bob, bob→carol, carol→alice, alice→carol
  await Follow.create([
    { follower: alice._id, following: bob._id   },
    { follower: bob._id,   following: carol._id  },
    { follower: carol._id, following: alice._id  },
    { follower: alice._id, following: carol._id  },
  ]);
  console.log('👥 Created follows');

  // Posts
  const posts = await Post.create([
    { author: alice._id, content: 'Just discovered this amazing coffee shop in the city. The flat white is 🔥', likes: [bob._id, carol._id] },
    { author: alice._id, content: 'Working on a new UI design system. Can\'t wait to share! 🎨', likes: [bob._id] },
    { author: bob._id,   content: 'Shipped a major feature today. Feeling productive 💪 #coding #webdev', likes: [alice._id, carol._id] },
    { author: bob._id,   content: 'Hot take: TypeScript is worth the learning curve. Here\'s why...', likes: [alice._id] },
    { author: carol._id, content: 'Sunrise from the mountains this morning 🌄 Sometimes you need to just unplug.', likes: [alice._id, bob._id] },
    { author: carol._id, content: 'Street photography tips for beginners:\n1. Use natural light\n2. Shoot at eye level\n3. Be patient 📷', likes: [] },
  ]);
  console.log(`📝 Created ${posts.length} posts`);

  // Comments
  await Comment.create([
    { post: posts[0]._id, author: bob._id,   content: 'Which coffee shop? Need to check it out!' },
    { post: posts[0]._id, author: carol._id, content: 'Looks amazing! Saving this for my next visit 🗺️' },
    { post: posts[2]._id, author: alice._id, content: 'Amazing work Bob! Can\'t wait to use the new feature 🎉' },
    { post: posts[2]._id, author: carol._id, content: 'You\'re on a roll! Keep it up 🚀' },
    { post: posts[4]._id, author: alice._id, content: 'This is absolutely stunning 😍 Where is this?' },
    { post: posts[4]._id, author: bob._id,   content: 'Incredible shot! What camera do you use?' },
    { post: posts[5]._id, author: alice._id, content: 'Great tips! I always struggle with patience 😅' },
  ]);
  console.log('💬 Created comments');

  console.log('\n✅ Seed complete!\n');
  console.log('📋 Test Accounts:');
  console.log('   Email: alice@vibe.com | Password: password123');
  console.log('   Email: bob@vibe.com   | Password: password123');
  console.log('   Email: carol@vibe.com | Password: password123');
  console.log('\n🚀 Run: npm start');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
