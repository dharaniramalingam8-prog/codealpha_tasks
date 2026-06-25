/**
 * Comprehensive seed script — adds sample users, posts, and reels
 * Run: node server/seedAll.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/social_media_app');
  console.log('✅ MongoDB connected');

  const User  = require('./models/User');
  const Post  = require('./models/Post');
  const Reel  = require('./models/Reel');
  const Follow = require('./models/Follow');

  // ── 1. Create sample users ──────────────────────────────────────────────
  console.log('\n👤 Creating users...');

  const hashedPass = await bcrypt.hash('password123', 10);

  const usersData = [
    {
      username: 'foodie_priya',
      email: 'priya@example.com',
      bio: '🍜 Food lover | Home cook | Exploring one dish at a time 🌶️',
      avatarColor: '#FF6B9D',
      isEmailVerified: true,
    },
    {
      username: 'laugh_with_karan',
      email: 'karan@example.com',
      bio: '😂 Comedy is my superpower | Memes & Reels | Spreading happiness',
      avatarColor: '#FA8231',
      isEmailVerified: true,
    },
    {
      username: 'travel_dev',
      email: 'dev@example.com',
      bio: '✈️ Exploring the world | 40+ countries | Software dev by day, traveler by heart',
      avatarColor: '#00D2FF',
      isEmailVerified: true,
    },
    {
      username: 'fitness_ananya',
      email: 'ananya@example.com',
      bio: '💪 Gym rat | Healthy recipes | Mind & Body transformation',
      avatarColor: '#43E97B',
      isEmailVerified: true,
    },
    {
      username: 'artsy_meera',
      email: 'meera@example.com',
      bio: '🎨 Artist | Illustrator | Colors speak louder than words',
      avatarColor: '#A55EEA',
      isEmailVerified: true,
    },
    {
      username: 'techie_rohan',
      email: 'rohan@example.com',
      bio: '👨‍💻 Full Stack Dev | Open Source | Building cool stuff',
      avatarColor: '#6C63FF',
      isEmailVerified: true,
    },
  ];

  const createdUsers = [];
  for (const ud of usersData) {
    let user = await User.findOne({ email: ud.email });
    if (!user) {
      user = await User.create({ ...ud, password: hashedPass });
      console.log(`  ✅ Created @${user.username}`);
    } else {
      console.log(`  ⏭️  Skipped @${user.username} (already exists)`);
    }
    createdUsers.push(user);
  }

  const [priya, karan, dev, ananya, meera, rohan] = createdUsers;

  // Make users follow each other for a realistic feed
  const followPairs = [
    [priya._id, karan._id], [priya._id, dev._id], [priya._id, ananya._id],
    [karan._id, priya._id], [karan._id, rohan._id],
    [dev._id, priya._id],   [dev._id, ananya._id],
    [ananya._id, priya._id],[ananya._id, meera._id],
    [meera._id, priya._id], [meera._id, dev._id],
    [rohan._id, karan._id], [rohan._id, dev._id],
  ];
  for (const [follower, following] of followPairs) {
    const exists = await Follow.findOne({ follower, following });
    if (!exists) await Follow.create({ follower, following });
  }
  console.log('\n  ✅ Follow relationships created');

  // ── 2. Create sample posts ───────────────────────────────────────────────
  console.log('\n📸 Creating posts...');

  const postsData = [
    {
      author: priya._id,
      content: "Made this creamy butter chicken from scratch tonight! 🧡🍛 The secret is slow-cooking the tomatoes. Recipe in my bio!\n#ButterChicken #HomeCooking #FoodPhotography #IndianFood #Foodie",
      imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80',
      hashtags: ['butterchicken', 'homecooking', 'foodphotography', 'indianfood', 'foodie'],
      shareCount: 34,
    },
    {
      author: priya._id,
      content: "Biryani Sunday is the best Sunday 🍚✨ Layered with saffron, fried onions and love ❤️\n#Biryani #SundayVibes #Foodgasm #IndianFood #Yummy",
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=600&q=80',
      hashtags: ['biryani', 'sundayvibes', 'foodgasm', 'indianfood', 'yummy'],
      shareCount: 62,
    },
    {
      author: priya._id,
      content: "Street-style Pav Bhaji 🔥😋 The smell alone can bring the whole neighbourhood out! Who agrees?\n#PavBhaji #StreetFood #MumbaiFood #Foodie #ComfortFood",
      imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&q=80',
      hashtags: ['pavbhaji', 'streetfood', 'mumbaifood', 'foodie', 'comfortfood'],
      shareCount: 21,
    },
    {
      author: karan._id,
      content: "Me trying to eat healthy vs what actually ends up in my mouth 😂🍕\nMonday motivation: survive until Friday 😭\n#Relatable #FoodMemes #MondayBlues #Funny #Comedy",
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
      hashtags: ['relatable', 'foodmemes', 'mondayblues', 'funny', 'comedy'],
      shareCount: 128,
    },
    {
      author: karan._id,
      content: "My mom: \"Don't eat junk food\"\nAlso my mom at 11pm: 👇\n😂😂 Every Indian household IYKYK\n#MomLife #IndianMoms #Comedy #Relatable #FunnyPost",
      imageUrl: 'https://images.unsplash.com/photo-1548365328-8c6db3220e4c?w=600&q=80',
      hashtags: ['momlife', 'indianmoms', 'comedy', 'relatable', 'funnypost'],
      shareCount: 205,
    },
    {
      author: dev._id,
      content: "Santorini, Greece 🇬🇷 Blue domes, white walls, and pure magic. This view will never leave my soul.\n#Santorini #Greece #TravelPhotography #Wanderlust #Explore",
      imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80',
      hashtags: ['santorini', 'greece', 'travelphotography', 'wanderlust', 'explore'],
      shareCount: 87,
    },
    {
      author: dev._id,
      content: "Bali sunsets are just unreal 🌅❤️ Spending a week here was the best decision of my life.\n#Bali #Sunset #TravelLife #Indonesia #Paradise",
      imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80',
      hashtags: ['bali', 'sunset', 'travellife', 'indonesia', 'paradise'],
      shareCount: 113,
    },
    {
      author: ananya._id,
      content: "Early morning 5AM club. While the world sleeps, we grind 💪 Your future self will thank you!\n#FitLife #MorningWorkout #GymMotivation #Fitness #HealthyLifestyle",
      imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
      hashtags: ['fitlife', 'morningworkout', 'gymmotivation', 'fitness', 'healthylifestyle'],
      shareCount: 56,
    },
    {
      author: ananya._id,
      content: "Post-workout açaí bowl 🫐💜 Packed with protein, antioxidants and topped with granola. Fuel your body right!\n#HealthyEating #AcaiBowl #CleanEating #Nutrition #FitFood",
      imageUrl: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&q=80',
      hashtags: ['healthyeating', 'acaibowl', 'cleaneating', 'nutrition', 'fitfood'],
      shareCount: 44,
    },
    {
      author: meera._id,
      content: "Lost myself in colors again 🎨 This mandala took 6 hours but every minute was worth it ✨\n#ArtWork #Mandala #DrawingTime #IllustrationArt #ArtistsOfInstagram",
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
      hashtags: ['artwork', 'mandala', 'drawingtime', 'illustrationart', 'artistsofinstagram'],
      shareCount: 78,
    },
    {
      author: meera._id,
      content: "Painted the sky tonight 🌅 Watercolors are my happy place. What's yours?\n#WatercolorArt #Painting #ArtTherapy #CreativeMind #ArtCommunity",
      imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&q=80',
      hashtags: ['watercolorart', 'painting', 'arttherapy', 'creativemind', 'artcommunity'],
      shareCount: 93,
    },
    {
      author: rohan._id,
      content: "Just shipped my side project after 3 months of late nights ☕💻 Sometimes the only way out is through. If you're grinding too, keep going 🚀\n#Developer #SideProject #Coding #TechLife #BuildInPublic",
      imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80',
      hashtags: ['developer', 'sideproject', 'coding', 'techlife', 'buildinpublic'],
      shareCount: 41,
    },
    {
      author: rohan._id,
      content: "My desk setup finally looking clean ✨ The triple monitor life was a game changer. What does your setup look like?\n#DeskSetup #WorkFromHome #TechSetup #Developer #ProductivityHacks",
      imageUrl: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&q=80',
      hashtags: ['desksetup', 'workfromhome', 'techsetup', 'developer', 'productivityhacks'],
      shareCount: 67,
    },
  ];

  let postCount = 0;
  for (const pd of postsData) {
    const exists = await Post.findOne({ author: pd.author, content: pd.content });
    if (!exists) {
      await Post.create(pd);
      postCount++;
    }
  }
  console.log(`  ✅ Created ${postCount} new posts`);

  // ── 3. Create food, comedy, fun reels ──────────────────────────────────
  console.log('\n🎬 Creating reels...');

  const reelsData = [
    // Food Reels
    {
      author: priya._id,
      caption: '🍕 Making Margherita pizza from scratch! Crispy base, fresh basil & melted mozzarella 🤤 #FoodReel #Pizza #HomeMade #CookWithMe',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      viewCount: 45200,
      shareCount: 890,
    },
    {
      author: priya._id,
      caption: '🍜 5-minute noodles hack that will change your life! 😱🔥 Save this for when you are too tired to cook! #QuickRecipe #Noodles #FoodHack #Cooking',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      viewCount: 92300,
      shareCount: 4200,
    },
    {
      author: priya._id,
      caption: '🧁 Satisfying cupcake decoration ASMR 🎂✨ Watching frosting swirl is therapy I needed today #BakingReel #Satisfying #ASMR #Cupcakes',
      videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
      viewCount: 67400,
      shareCount: 1560,
    },
    // Comedy Reels
    {
      author: karan._id,
      caption: 'POV: You told your mom you are not hungry and she brings this 5 mins later 😂😭🍛 #IndianMoms #Relatable #Comedy #FunnyReel',
      videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
      viewCount: 234000,
      shareCount: 18700,
    },
    {
      author: karan._id,
      caption: 'When the WiFi goes down and everyone suddenly starts "bonding" 😂📵 #Relatable #Funny #WiFiProblems #Comedy',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      viewCount: 156000,
      shareCount: 9800,
    },
    {
      author: karan._id,
      caption: 'My brain at 3am thinking about that embarrassing thing I did in 2013 💀😭 #Overthinking #Relatable #NightThoughts #Comedy',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      viewCount: 312000,
      shareCount: 24300,
    },
    // Fun / Lifestyle Reels
    {
      author: dev._id,
      caption: '🌊 Cliff diving in Croatia! First time doing this and my legs were absolutely shaking 😭 #Travel #ThrilSeeking #Adventure #Croatia',
      videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
      viewCount: 88700,
      shareCount: 3400,
    },
    {
      author: ananya._id,
      caption: '💪 30-day transformation — what consistent gym + clean eating did to my body! No filters, just hard work ✨ #FitnessReel #Transformation #GymMotivation',
      videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
      viewCount: 445000,
      shareCount: 52000,
    },
    {
      author: meera._id,
      caption: '🎨 Satisfying 60-second painting time-lapse — watch this sunset come alive! 🌅 #ArtReel #Satisfying #PaintingTimelapse #Artist',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      viewCount: 127000,
      shareCount: 8900,
    },
    {
      author: rohan._id,
      caption: '👨‍💻 Building a full-stack app in 60 seconds — From idea to deployment! #Coding #DeveloperLife #TechReel #Productivity',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      viewCount: 78500,
      shareCount: 5600,
    },
  ];

  // Remove old sample reels and re-insert all
  await Reel.deleteMany({ videoUrl: { $in: [
    'https://www.w3schools.com/html/mov_bbb.mp4',
    'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
    'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
    'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
  ]}});

  const insertedReels = await Reel.insertMany(reelsData);
  console.log(`  ✅ Created ${insertedReels.length} reels`);

  console.log('\n🎉 All done!');
  console.log('   Reels → http://localhost:3000/reels.html');
  console.log('   Feed  → http://localhost:3000/feed.html');
  console.log('\n   Test account logins (password: password123)');
  console.log('   - foodie_priya@example.com');
  console.log('   - laugh_with_karan@example.com');
  console.log('   - travel_dev@example.com');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
