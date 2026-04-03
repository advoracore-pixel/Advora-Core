// api/solve.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { solverSystemPrompt } from '../prompts/systemPrompt.js'; // Prompt import kiya

// CORS setup taaki local frontend se request aa sake
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Only POST allowed' });
  }

  try {
    const { prompt, imageBase64, mimeType } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: 'API key is missing' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Model initialize karte waqt hum System Prompt aur JSON format force karenge
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: solverSystemPrompt, // Pre-defined prompt inject kiya
      generationConfig: {
        responseMimeType: "application/json", // AI ko force kiya ki strictly JSON de
      }
    });

    let result;
    const userMessage = prompt || "Please solve this problem.";

    // Image + Text hai toh
    if (imageBase64) {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || 'image/jpeg'
        }
      };
      result = await model.generateContent([userMessage, imagePart]);
    } 
    // Sirf Text hai toh
    else {
      result = await model.generateContent(userMessage);
    }

    // AI ka response nikalna (Ye stringified JSON hoga kyunki humne force kiya hai)
    const responseText = result.response.text();
    
    // JSON parse karke frontend ko bhejna taaki format bilkul clean rahe
    const jsonResponse = JSON.parse(responseText);

    return res.status(200).json({ 
      success: true, 
      data: jsonResponse 
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export default allowCors(handler);
