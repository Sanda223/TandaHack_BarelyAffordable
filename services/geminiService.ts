
import { GoogleGenAI, Type } from "@google/genai";

// Ensure the API key is available. In a real app, this would be handled more robustly.
if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using mock data.");
}

const getAi = () => {
    if (!process.env.API_KEY) return null;
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const suggestSkills = async (jobTitle: string, hobbies: string[]): Promise<string[]> => {
  const ai = getAi();
  if (!ai) {
    return new Promise(resolve => setTimeout(() => resolve(['Project Management', 'Data Analysis', 'Creative Writing', 'Graphic Design', 'Public Speaking']), 1000));
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Based on the job title '${jobTitle}' and hobbies like '${hobbies.join(', ')}', suggest 5 relevant professional skills.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    const parsed = JSON.parse(response.text);
    return parsed.skills || [];
  } catch (error) {
    console.error("Error suggesting skills:", error);
    return [];
  }
};

export const generateIncomeOpportunities = async (skills: string[]) => {
    const ai = getAi();
    if (!ai) {
        return Promise.resolve([
            { title: 'Freelance Writing', description: 'Write blog posts for tech companies.', estimatedIncome: 500 },
            { title: 'Data Visualization Gigs', description: 'Create dashboards for small businesses.', estimatedIncome: 750 },
            { title: 'Tutoring', description: 'Tutor students in your skilled areas.', estimatedIncome: 300 },
        ]);
    }
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on these skills: ${skills.join(', ')}, suggest 3 specific side gig opportunities with an estimated monthly income. Keep descriptions brief.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            estimatedIncome: { type: Type.NUMBER },
                        },
                        required: ['title', 'description', 'estimatedIncome']
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating income opportunities:", error);
        return [];
    }
};

export const generateSpendingSuggestions = async () => {
    const ai = getAi();
    if (!ai) {
        return Promise.resolve([
            { title: 'Lunch Savings', description: 'Pack lunch 3 times a week instead of buying.', potentialSavings: 120 },
            { title: 'Subscription Review', description: 'Cancel one unused streaming service.', potentialSavings: 15 },
            { title: 'Coffee Break', description: 'Make coffee at home on workdays.', potentialSavings: 80 },
        ]);
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on common spending habits like daily coffee, lunch out, and multiple subscriptions, suggest 3 actionable ways to save money for a house deposit.`,
            config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            potentialSavings: { type: Type.NUMBER },
                        },
                         required: ['title', 'description', 'potentialSavings']
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating spending suggestions:", error);
        return [];
    }
};


export const generateSimulatorSummary = async (changesSummary: string, originalETA: string, newETA: string): Promise<string> => {
    const ai = getAi();
    if (!ai) {
        return Promise.resolve(`🚀 Amazing! By making these adjustments, you've accelerated your journey to homeownership. You're now on track to reach your goal in ${newETA}, shaving off significant time from your original ${originalETA} timeline. Keep up the great work!`);
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Briefly explain in a friendly and motivational tone how these changes affect the user's home buying timeline: ${changesSummary}. The original ETA was ${originalETA}, and the new ETA is ${newETA}. Start with a positive emoji. The response should be a single paragraph.`,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating simulator summary:", error);
        return "There was an error generating the summary.";
    }
};

export const analyzePriceFromImage = async (base64Image: string, mimeType: string): Promise<number> => {
    const ai = getAi();
    if (!ai) {
        // Mock response for when API key is not set
        return new Promise(resolve => setTimeout(() => resolve(49.99), 1000));
    }

    try {
        const imagePart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Image,
            },
        };
        const textPart = {
            text: "Analyze this image and extract the total price. Respond with just the number, with no currency symbols or other text. If no price is found, respond with 0."
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        
        const priceText = response.text.trim();
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        return isNaN(price) ? 0 : price;

    } catch (error) {
        console.error("Error analyzing image:", error);
        return 0;
    }
};

export const shortenExpenseNames = async (names: string[]): Promise<Record<string, string>> => {
  const ai = getAi();
  if (!ai) {
    // Fallback: truncate long names locally
    return names.reduce<Record<string, string>>((acc, name) => {
      acc[name] = name.length > 16 ? `${name.slice(0, 13)}...` : name;
      return acc;
    }, {});
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Shorten these merchant/category names to concise labels (max 14 characters) that still convey meaning. Return JSON with original and shortName fields. Names: ${names.join(', ')}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              original: { type: Type.STRING },
              shortName: { type: Type.STRING },
            },
            required: ['original', 'shortName'],
          },
        },
      },
    });
    const parsed = JSON.parse(response.text) as { original: string; shortName: string }[];
    return parsed.reduce<Record<string, string>>((acc, item) => {
      acc[item.original] = item.shortName || item.original;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error shortening expense names:', error);
    return names.reduce<Record<string, string>>((acc, name) => {
      acc[name] = name.length > 16 ? `${name.slice(0, 13)}...` : name;
      return acc;
    }, {});
  }
};
