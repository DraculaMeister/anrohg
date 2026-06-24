import express from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'DEIN_SUPER_GEHEIMER_KEY_HIER';

const app = express();
app.use(cookieParser());
const PORT = 3000;

const checkAuth = (req) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) {
            console.log("DEBUG: Kein Token gefunden.");
            return null;
        }
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        console.log("DEBUG: Token-Verifizierung fehlgeschlagen: ", e.message);
        return null;
    }
};

app.get('/menu.html', async (req, res) => {
    if (req.query.code) return res.redirect(`/api/auth?code=${req.query.code}`);
    
    const user = checkAuth(req);
    if (user) return res.sendFile(path.join(__dirname, '../', 'menu.html'));
    
    res.redirect('/');
});

app.get('/documents.html', (req, res) => {
    const user = checkAuth(req);
    if (user) return res.sendFile(path.join(__dirname, '../', 'documents.html'));
    res.redirect('/');
});

app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../', 'index.html'));
});

app.get('/api/auth', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        const user = checkAuth(req);
        if (user) return res.json({ authorized: true, username: user.username });
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
                scope: 'identify guilds guilds.members.read'
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    
        const tokenData = await tokenResponse.json();
        if (tokenData.error) return res.status(400).json({ authorized: false, error: 'Discord failed.'});

        const userResponse = await fetch(`https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();

        const allowedRoles = process.env.DISCORD_ALLOWED_ROLES.split(',').map(r => r.trim());
        if (!userData.roles || !userData.roles.some(r => allowedRoles.includes(r))) {
            return res.status(403).json({ authorized: false, error: 'Access denied.' });
        }

        const robloxName = userData.nick ? userData.nick.replace(/^\[.*?\]\s*/, '') : (userData.user?.username || "Guardsman");

        const token = jwt.sign({ username: robloxName }, JWT_SECRET, { expiresIn: '30d' });
        res.cookie('auth_token', token, { 
            httpOnly: true, 
            secure: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000 
        });

        return res.status(200).json({ status: "success", message: "Login successful" });

    } catch (error) {
        res.status(500).json({ authorized: false, error: 'Server Error.' });
    } 
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running at http://127.0.0.1:${PORT}`));
}

export default app;