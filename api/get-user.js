export default async function handler(req, res) {
    const { username } = req.query;

    const userRes = await fetch(`https://users.roblox.com/v1/usernames/users`, {
        method: 'POST',
        body: JSON.stringify({ usernames: [username] })
    });
    const userData = await userRes.json();
    const userId = userData.data[0].id;

    const avatarRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png`);
    const avatarData = await avatarRes.json();

    res.status(200).json({ 
        id: userId, 
        avatarUrl: avatarData.data[0].imageUrl 
    });
}