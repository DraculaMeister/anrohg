export default async function handler(req, res) {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const userRes = await fetch(`https://users.roblox.com/v1/usernames/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username] })
        });
        const userData = await userRes.json();

        if (!userData.data || userData.data.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userData.data[0].id;

        const avatarRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
        const avatarData = await avatarRes.json();

        if (!avatarData.data || avatarData.data.length === 0) {
            return res.status(404).json({ error: 'Avatar not found' });
        }

        return res.status(200).json({ 
            id: userId, 
            avatarUrl: avatarData.data[0].imageUrl 
        });

    } catch (error) {
        console.error("Roblox API Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}