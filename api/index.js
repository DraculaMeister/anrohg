const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(session({
    secret: 'honor_guard_secure_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

app.get('/menu.html', async (req, res) => {
    if (req.query.code) {
        return res.redirect(`/api/auth?code=${req.query.code}`);
    }
    
    if (req.session && req.session.authorized) {
        return res.sendFile(path.join(__dirname, '../', 'menu.html'))
    }
    
    res.redirect('/');
});

app.get('/documents.html', (req, res) => {
    if (req.session && req.session.authorized) {
        return res.sendFile(path.join(__dirname, '../', 'documents.html'));
    }
    res.redirect('/');
});

app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../', 'index.html'));
});

app.get('/api/auth', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        if (req.session && req.session.authorized) {
            return res.json({ authorized: true, username: req.session.username });
        }
        return res.status(401).json({ authorized: false, error: 'Not logged in.'});
    }

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.DISCORD_REDIRECT_URI,
                scope: 'identify guilds  guilds.members.read'
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error("Discord Token Error:", tokenData);
            return res.status(400).json({ authorized: false, error: 'Discord Verification failed.'});
        }

        const userResponse = await fetch(`https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();

        if (userData.message) {
            console.error("Discord API Error:", userData.message);
            return res.status(400).json({ authorized: false, error: 'Could not retrieve server data.'});
        }

        const allowedRoles = process.env.DISCORD_ALLOWED_ROLES.split(',').map(role => role.trim());
        const userRoles = userData.roles || [];

        const hasPermission = userRoles.some(roleId => allowedRoles.includes(roleId));

        if (!hasPermission) {
            console.warn(`Access denied for user (Roles: ${userRoles.join(', ')})`);
            return res.status(403).json({
                authorized: false,
                error: 'Access denied: You do not have the necessary role.'
            });
        }

        let robloxName = "Unknown Guardsman";

        if (userData.nick) {
            robloxName = userData.nick.replace(/^\[.*?\]\s*/, '')
        } else if (userData.user && userData.user.username) {
            robloxName = userData.user.username;
        }

        req.session.authorized = true;
        req.session.username = robloxName;

        if (code) {
            return res.redirect('/menu.html');
        }

        res.json({
            authorized: true,
            username: robloxName
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ authorized: false, error: 'Internal Server Error.' });
    } 
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
         console.log(`Server running at http://127.0.0.1:${PORT}`)
    });
}

module.exports = app;