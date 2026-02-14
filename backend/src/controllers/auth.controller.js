const authService = require("../services/auth.service");

async function register(req, res) {
    try {
        const result = await authService.register(req.body);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function login(req, res) {
    try {
        const result = await authService.login(req.body);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function me(req, res) {
    try {
        const result = await authService.getMe(req.userId);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

module.exports = {
    register,
    login,
    me
};