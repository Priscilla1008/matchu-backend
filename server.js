const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error('MongoDB connection error:', err));

// User schema
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    isVerified: { type: Boolean, default: false },
    verificationCode: String,
});
const User = mongoose.model('User', UserSchema);

// Email setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Routes
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!email.endsWith('.edu')) {
            return res.status(400).json({ error: 'Only .edu emails allowed' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser = new User({ name, email, password: hashedPassword, verificationCode });
        await newUser.save();

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Verify your email',
            text: `Your verification code is: ${verificationCode}`,
        };

        // Send email and handle success or failure
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ error: 'Error sending verification email' });
            }
            console.log('Email sent:', info.response);
            res.status(201).json({ message: 'User created, verification email sent' });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
