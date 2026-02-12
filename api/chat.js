// api/chat.js
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  // 1. CORS Setup (Taaki tumhara frontend isse baat kar sake)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Security ke liye bad mein domain daal dena
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle Browser Pre-flight check
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 2. Google Sheet Connection Setup
    // Ye 'process.env' wo secret keys hain jo hum Vercel mein dalenge
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Newline fix
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo(); // Sheet connect ho gayi

    const sheet = doc.sheetsByIndex[0]; // Pehla tab (Sheet1)

    // --- 3. MESSAGE SAVE KARNA (POST Request) ---
    if (req.method === 'POST') {
      const { room_id, user_name, message, user_avatar } = req.body;

      if (!room_id || !message) {
        return res.status(400).json({ error: "Room ID and Message are required" });
      }

      // Sheet mein nayi row add karo
      await sheet.addRow({
        room_id: room_id,
        user_name: user_name || 'Anonymous',
        user_avatar: user_avatar || '',
        message: message,
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({ success: true, message: "Message Saved!" });
    }

    // --- 4. MESSAGES PADHNA (GET Request) ---
    if (req.method === 'GET') {
      const { room_id } = req.query;

      if (!room_id) return res.status(400).json({ error: "Room ID missing" });

      const rows = await sheet.getRows();
      
      // Sirf us room ke messages filter karo
      const roomMessages = rows
        .filter(row => row.get('room_id') === room_id)
        .map(row => ({
          user: row.get('user_name'),
          avatar: row.get('user_avatar'),
          text: row.get('message'),
          time: row.get('timestamp')
        }));

      return res.status(200).json(roomMessages);
    }

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ error: "Database connection failed", details: error.message });
  }
}
