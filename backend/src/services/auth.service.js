const bcrypt = require("bcrypt");
const User = require("../models/User");
const { createToken } = require("../utils/token.util");

async function register({ name, email, password }) {
    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = password || "";

    if (!cleanName || !cleanEmail || !cleanPassword) {
        return {
            status: 400,
            body: { message: "name, email, password are required" }
        };
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
        return {
            status: 409,
            body: { message: "Email already in use" }
        };
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);

    const user = await User.create({
        name: cleanName,
        email: cleanEmail,
        passwordHash
    });

    const token = createToken(user._id.toString());

    return {
        status: 201,
        body: {
            token,
            user: { id: user._id, name: user.name, email: user.email }
        }
    };
}

async function login({ email, password }) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = password || "";

    if (!cleanEmail || !cleanPassword) {
        return {
            status: 400,
            body: { message: "email, password are required" }
        };
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
        return {
            status: 401,
            body: { message: "Invalid credentials" }
        };
    }

    const ok = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!ok) {
        return {
            status: 401,
            body: { message: "Invalid credentials" }
        };
    }

    const token = createToken(user._id.toString());

    return {
        status: 200,
        body: {
            message: "Login success",
            token,
            user: { id: user._id, name: user.name, email: user.email }
        }
    };
}

async function getMe(userId) {
    const user = await User.findById(userId).select("_id name email");
    if (!user) {
        return {
            status: 404,
            body: { message: "User not found" }
        };
    }

    return {
        status: 200,
        body: { user }
    };
}

module.exports = {
    register,
    login,
    getMe
};