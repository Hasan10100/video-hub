const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("../middleware/auth.middleware");

function createToken(userId) {
    return jwt.sign(
        { sub: userId },                 // payload (who the user is)
        process.env.JWT_SECRET,          // secret key
        { expiresIn: "7d" }              // token expiry
    );
}

router.post("/register", async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "name, email, password are required" });
    }

    // 3) Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
        return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 4) Save user in MongoDB
    const user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash
    });

    const token = createToken(user._id.toString());

    res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email }
    });
});

router.post("/login", async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "email, password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4) Compare password with stored hash
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken(user._id.toString());

    // 5) Success response
    res.json({
        message: "Login success",
        token,
        user: { id: user._id, name: user.name, email: user.email }
    });
})

router.get("/me", requireAuth, async (req, res) => {
    // req.userId was set by middleware
    const user = await User.findById(req.userId).select("_id name email");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
});


module.exports = router;