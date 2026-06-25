const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendVerificationEmail = async (email, token) => {
  const url = `http://localhost:${process.env.PORT || 3000}/api/auth/verify/${token}`;
  const mailOptions = {
    from: `"Vibe Social" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your Vibe Social account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Vibe Social!</h2>
        <p>Please click the button below to verify your email address:</p>
        <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #6C63FF; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Alternatively, you can copy and paste this link into your browser:</p>
        <p><a href="${url}">${url}</a></p>
      </div>
    `
  };

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[DEV MODE] Verification email for ${email} would have been sent. Token: ${token}`);
    console.warn(`Verification URL: ${url}`);
    return;
  }

  return transporter.sendMail(mailOptions);
};

exports.sendPasswordResetEmail = async (email, token) => {
  const url = `http://localhost:${process.env.PORT || 3000}/reset-password.html?token=${token}`;
  const mailOptions = {
    from: `"Vibe Social" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset your Vibe Social password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #6C63FF; color: #fff; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  };

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[DEV MODE] Password reset email for ${email} would have been sent. Token: ${token}`);
    console.warn(`Reset URL: ${url}`);
    return;
  }

  return transporter.sendMail(mailOptions);
};
