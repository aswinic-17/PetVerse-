import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Body parser with payload limit for base64 images/videos
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize Google Gemini Client if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Behavioral & Emotion Analyzer API
app.post('/api/gemini/analyze-behavior', async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      petSpecies = 'dog',
      petName = 'Pet',
      petBreed = 'Mixed Breed',
      petAge = 'Adult',
      userObservationNotes = '',
    } = req.body;

    // Check if real Gemini model can be called
    if (ai && apiKey && imageBase64) {
      try {
        const cleanBase64 = imageBase64.includes('base64,')
          ? imageBase64.split('base64,')[1]
          : imageBase64;

        const promptText = `
You are an expert veterinary animal behaviorist and ethologist analyzing a photo or video frame of a pet for an educational pet care web application.
Pet details:
- Name: ${petName}
- Species: ${petSpecies} (dog, cat, bird, or fish)
- Breed/Variety: ${petBreed}
- Life Stage/Age: ${petAge}
- Additional owner context: ${userObservationNotes || 'None provided'}

Analyze the animal's visible physical posture, ear positioning, eye dilation/openness, mouth tension, tail/fin/wing carriage, body language, and environmental context.
Return a STRICT JSON response ONLY with no markdown wrapping, no backticks, adhering to this exact structure:
{
  "classification": "Playful" | "Calm" | "Resting" | "Lethargic" | "Possibly Anxious" | "Curious/Alert" | "Discomfort",
  "energyScore": number between 5 and 100,
  "confidence": number between 60 and 98,
  "primaryMood": string,
  "postureObservations": [
    "string describing ear position, eyes, or head posture",
    "string describing body tension, stance, spine, or tail/fin/wing position",
    "string describing environmental engagement or movement cues"
  ],
  "behavioralExplanation": "Detailed paragraph explaining the ethological cues observed and what they typically indicate in this species.",
  "recommendedActions": [
    "actionable care or enrichment tip 1",
    "actionable care or comfort tip 2",
    "actionable observation or monitoring tip 3"
  ],
  "alertLevel": "normal" | "attention" | "warning",
  "disclaimer": "Behavioral classifications are automated estimates based on visual posture cues and must not replace veterinary assessment or clinical diagnosis."
}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({
            ...parsed,
            isSimulated: false,
          });
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call error, falling back to simulated analysis:', geminiError?.message || geminiError);
      }
    }

    // High quality intelligent simulated behavioral engine fallback
    const simulated = generateSimulatedBehavior(petSpecies, petName, userObservationNotes);
    return res.json(simulated);
  } catch (error: any) {
    console.error('Behavior analysis route error:', error);
    res.status(500).json({ error: 'Failed to complete behavioral analysis' });
  }
});

// Helper for simulated behavioral analysis
function generateSimulatedBehavior(species: string, name: string, notes: string) {
  const s = species.toLowerCase();
  const lowerNotes = notes.toLowerCase();

  let classification = 'Calm';
  let energyScore = 55;
  let confidence = 85;
  let postureObservations: string[] = [];
  let behavioralExplanation = '';
  let recommendedActions: string[] = [];
  let alertLevel: 'normal' | 'attention' | 'warning' = 'normal';

  if (lowerNotes.includes('sleep') || lowerNotes.includes('nap') || lowerNotes.includes('rest')) {
    classification = 'Resting';
    energyScore = 20;
    confidence = 90;
  } else if (lowerNotes.includes('play') || lowerNotes.includes('toy') || lowerNotes.includes('run') || lowerNotes.includes('jump')) {
    classification = 'Playful';
    energyScore = 92;
    confidence = 88;
  } else if (lowerNotes.includes('scared') || lowerNotes.includes('hide') || lowerNotes.includes('shake') || lowerNotes.includes('bark')) {
    classification = 'Possibly Anxious';
    energyScore = 70;
    confidence = 82;
    alertLevel = 'attention';
  } else if (lowerNotes.includes('tired') || lowerNotes.includes('slow') || lowerNotes.includes('sick')) {
    classification = 'Lethargic';
    energyScore = 15;
    confidence = 78;
    alertLevel = 'warning';
  } else {
    // Default dynamic rotation
    const archetypes = ['Playful', 'Calm', 'Curious/Alert', 'Resting'];
    classification = archetypes[Math.floor(Math.random() * archetypes.length)];
    energyScore = classification === 'Playful' ? 88 : classification === 'Curious/Alert' ? 72 : classification === 'Calm' ? 50 : 25;
  }

  if (s === 'dog') {
    postureObservations = [
      classification === 'Playful' ? 'Relaxed open mouth with playful stance and high, loose tail wag' : 'Soft eyes, neutral ear carriage, relaxed muscular composure',
      'Weight distributed evenly over all four paws without guarding posture',
      'Alert sensory response to ambient domestic sounds and owner movements'
    ];
    behavioralExplanation = `${name} exhibits body language typical of a ${classification.toLowerCase()} canine state. Muscular tone is balanced without stiff freezing or stress panting, signaling comfort in the current environment.`;
    recommendedActions = [
      classification === 'Playful' ? 'Engage in a 15-minute fetch or interactive puzzle session' : 'Maintain calm daily routine with scheduled feeding and gentle grooming',
      'Provide fresh water and observe post-activity hydration',
      'Record any sudden posture changes in the PetVerse log'
    ];
  } else if (s === 'cat') {
    postureObservations = [
      classification === 'Playful' ? 'Ears perked forward, pupils slightly dilated in focus, tail tip gently twitching' : 'Relaxed whiskers forward, half-closed content almond eyes',
      'Loafing or comfortable side-lying posture with paws tucked beneath chest',
      'No vocal distress or flattened "airplane" ear angles'
    ];
    behavioralExplanation = `${name} displays feline posture aligned with ${classification.toLowerCase()} engagement. Ear orientation and tail movement indicate relaxed environmental awareness without territorial tension.`;
    recommendedActions = [
      classification === 'Playful' ? 'Introduce a feather wand or laser pointer for safe predatory play' : 'Offer a warm elevated perching spot near natural daylight',
      'Ensure litter box is clean and accessible',
      'Monitor self-grooming frequency over the day'
    ];
  } else if (s === 'bird') {
    postureObservations = [
      'Feathers smoothly preened with slight contour fluffing indicating thermoregulation comfort',
      'Single-leg perch grip or active head tilt surveying surroundings',
      'Calm respiratory rhythm at rest without open-beak breathing or tail-bobbing'
    ];
    behavioralExplanation = `${name} exhibits avian comfort postures consistent with a ${classification.toLowerCase()} disposition. No signs of wing drooping or respiratory distress are visible.`;
    recommendedActions = [
      'Rotate cage foraging toys or offer safe leafy greens (e.g. kale or coriander)',
      'Ensure 10-12 hours of quiet, covered night rest',
      'Spend gentle vocal interaction time near the enclosure'
    ];
  } else {
    // Fish
    postureObservations = [
      'Steady pectoral and caudal fin oscillations without clamping or shimmying',
      'Neutral buoyancy maintenance at mid-water column level',
      'Smooth, rhythmic opercular (gill) movements without surface gasping'
    ];
    behavioralExplanation = `${name} shows aquatic behavior typical of a healthy, ${classification.toLowerCase()} fish. Swimming rhythm and fin expansion suggest adequate water quality and low tank stress.`;
    recommendedActions = [
      'Verify water temperature and test parameters (pH, Ammonia, Nitrite) weekly',
      'Avoid overfeeding; remove uneaten flakes or pellets within 2 minutes',
      'Ensure tank lighting follows a regular 8-10 hour diurnal cycle'
    ];
  }

  return {
    classification,
    energyScore,
    confidence,
    primaryMood: classification,
    postureObservations,
    behavioralExplanation,
    recommendedActions,
    alertLevel,
    isSimulated: true,
    disclaimer: 'Simulated behavioral analysis (prototype mode). Behavioral classifications are algorithmic estimates and must not replace professional veterinary consultation.'
  };
}

// 2. Pet Care Guidance & AI Q&A API
app.post('/api/gemini/pet-care-advice', async (req, res) => {
  try {
    const { petSpecies, petName, petAge, petBreed, query, topic } = req.body;

    if (ai && apiKey) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `
You are a licensed veterinary pet care advisor providing concise, evidence-based care advice for a pet owner.
Pet Details:
- Name: ${petName || 'Pet'}
- Species: ${petSpecies || 'dog'}
- Breed: ${petBreed || 'Domestic'}
- Age/Life Stage: ${petAge || 'Adult'}
- Category/Topic: ${topic || 'General Care'}
- User Question/Topic: ${query}

Provide a well-structured, practical, warm response with:
1. Direct Answer & Life-Stage Specific Context
2. Key Recommendations (bullet points)
3. Nutritional or Environmental Considerations
4. Clinical Warning Signs (when to contact an emergency or local vet)

Format clearly with short headers. Keep the tone helpful, caring, and authoritative.
Always end with a one-sentence disclaimer that this is educational advice and does not replace in-person veterinary medicine.
          `,
        });

        return res.json({
          advice: response.text || 'No advice generated.',
          isSimulated: false,
        });
      } catch (err: any) {
        console.warn('Gemini advice fallback:', err?.message || err);
      }
    }

    // Tailored offline fallback advice
    const fallbackAdvice = `### Care Guidance for ${petName || 'your pet'} (${petSpecies}, ${petAge})\n\n**Direct Recommendation:**\nMaintain consistent daily routines tailored to their ${petSpecies} life stage. Consistent meal timings, clean fresh water, and environmental enrichment support physical and behavioral health.\n\n**Key Care Points:**\n- **Daily Nutrition:** Feed portion-controlled species-appropriate food matching their life stage.\n- **Hygiene & Habitat:** Clean bowls daily and maintain sanitary living quarters.\n- **Preventive Health:** Keep core vaccinations and preventive parasite treatments up-to-date.\n\n**When to Contact a Vet:**\nSeek immediate veterinary attention if you observe appetite loss exceeding 24 hours, persistent lethargy, vomiting, or abnormal breathing.\n\n*Note: Educational guidance only. Always consult your veterinarian for clinical diagnoses.*`;

    res.json({
      advice: fallbackAdvice,
      isSimulated: true,
    });
  } catch (error) {
    console.error('Pet care advice error:', error);
    res.status(500).json({ error: 'Failed to retrieve pet care advice' });
  }
});

// Configure Vite middleware in development or serve static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PetVerse server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
