# Vibe Social

Developed a full-stack Social Media Platform using Express.js, MongoDB, HTML, CSS, and JavaScript. Implemented user authentication, profiles, posts, comments, likes, follow system, image uploads, real-time notifications, direct messaging, stories, hashtag support, and responsive UI with MongoDB database integration.

## 🚀 Features

- **Authentication & Security:** Secure JWT-based login/signup, email verification, and password reset flows using Nodemailer.
- **Dynamic Feed & Profiles:** Create and interact with posts, upload images, and manage personal profiles with an interactive follow system.
- **Engagement & Interactions:** Like, comment, save/bookmark, and share posts. Create and participate in real-time **Polls**.
- **Reels & Stories:** Instagram-style disappearing stories and a dedicated TikTok-style vertical scrolling video feed for Reels.
- **Real-Time Communication:** Direct messaging with live typing indicators and instant notifications powered by Socket.IO.
- **Discovery:** Global search across users, posts, and hashtags with trending analytics.
- **Admin & Moderation:** Comprehensive admin dashboard to manage users, report content, and view platform analytics.
- **Media Storage:** Integrated with Cloudinary for seamless image and video handling, with robust local storage fallbacks.

## 🛠️ Tech Stack

- **Frontend:** HTML5, Vanilla CSS (Glassmorphism UI), JavaScript (ES6 Modules)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Real-Time:** Socket.IO
- **File Storage:** Multer, Cloudinary

## ⚙️ Installation & Setup

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Environment Variables:** Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGO_URI=mongodb://127.0.0.1:27017/social_media_app
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=7d
   
   # Optional: Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Optional: SMTP for Email Verification
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```
4. **Start the server:**
   ```bash
   npm start
   ```
5. **Visit:** `http://localhost:3000`
6. ## CodeAlpha Tasks

### Task 1 - Social Media Platform
https://github.com/dharaniramalingam8-prog/social-media-platform

### Task 2 - Management Tool
(Paste your Management Tool GitHub repo link here)

### Task 3 - Ecommerce Project
(Paste your Ecommerce Project GitHub repo link here)
