
import { GoogleGenAI, Type } from "@google/genai";

// Get API key from Vite environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY environment variable not set. Using mock data.");
}

const getAi = () => {
    if (!API_KEY) return null;
    return new GoogleGenAI({ apiKey: API_KEY });
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

export const suggestSkillsAndJobsFromHobbies = async (hobbies: string[]): Promise<{ skills: string[], jobs: string[] }> => {
  const ai = getAi();
  if (!ai) {
    return new Promise(resolve => setTimeout(() => resolve({
      skills: ['Project Management', 'Data Analysis', 'Creative Writing', 'Graphic Design', 'Public Speaking'],
      jobs: ['Freelance Writer', 'Graphic Designer', 'Social Media Manager', 'Content Creator', 'Marketing Consultant']
    }), 1000));
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Based on these hobbies: ${hobbies.join(', ')}, suggest 5 professional skills that could be developed from these hobbies, and 5 potential job titles or career paths that align with these hobbies and skills. Focus on practical, marketable skills and realistic job opportunities.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            jobs: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['skills', 'jobs']
        }
      }
    });
    const parsed = JSON.parse(response.text);
    return {
      skills: parsed.skills || [],
      jobs: parsed.jobs || []
    };
  } catch (error) {
    console.error("Error suggesting skills and jobs from hobbies:", error);
    return { skills: [], jobs: [] };
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


export const generateSimulatorSummary = async (
    changesSummary: string,
    originalETA: string,
    newETA: string,
    monthsSaved?: number,
    daysSaved?: number
): Promise<string> => {
    const ai = getAi();
    if (!ai) {
        const savedText = monthsSaved && monthsSaved > 0
            ? `, shaving off ${monthsSaved} month${monthsSaved > 1 ? 's' : ''} (${daysSaved} days)`
            : '';
        return Promise.resolve(`🚀 Amazing! By making these adjustments, you've accelerated your journey to homeownership. You're now on track to reach your goal in ${newETA}${savedText}. Keep up the great work!`);
    }

    try {
        const savedInfo = monthsSaved && monthsSaved > 0
            ? ` This saves you ${monthsSaved} month${monthsSaved > 1 ? 's' : ''} (${daysSaved?.toLocaleString()} days).`
            : '';
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Briefly explain in a friendly and motivational tone how these changes affect the user's home buying timeline: ${changesSummary}. The original ETA was ${originalETA}, and the new ETA is ${newETA}.${savedInfo} Start with a positive emoji. The response should be a single paragraph under 100 words. Be specific about the time saved and encourage the user.`,
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

export const analyzeSpendingCategories = async (spendingData: { category: string; amount: number }[]): Promise<any[]> => {
  const ai = getAi();
  if (!ai || spendingData.length === 0) {
    return Promise.resolve([
      { title: 'Review Subscriptions', description: 'Cancel unused streaming services and memberships', potentialSavings: 50, category: 'Subscriptions' },
      { title: 'Meal Planning', description: 'Cook at home more often instead of dining out', potentialSavings: 200, category: 'Food & Dining' },
      { title: 'Transportation Savings', description: 'Use public transport or carpool when possible', potentialSavings: 100, category: 'Transport' },
    ]);
  }

  try {
    const spendingSummary = spendingData
      .map(item => `${item.category}: $${item.amount}/month`)
      .join(', ');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze these monthly spending categories and provide 5 specific, actionable recommendations to reduce spending for someone saving for a house deposit in Australia: ${spendingSummary}.

For each recommendation:
- Focus on the highest spending categories first
- Provide realistic, practical advice
- Calculate potential monthly savings
- Be specific about what actions to take

Return recommendations as JSON array with title, description, potentialSavings (number), and category fields.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              potentialSavings: { type: Type.NUMBER },
              category: { type: Type.STRING },
            },
            required: ['title', 'description', 'potentialSavings', 'category']
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Error analyzing spending categories:', error);
    return [];
  }
};

export const generateIncomeOpportunitiesFromHobbies = async (hobbies: string[], currentIncome: number): Promise<any[]> => {
  const ai = getAi();
  if (!ai || hobbies.length === 0) {
    return Promise.resolve([
      { title: 'Freelance Side Gig', description: 'Turn your hobby into a weekend income stream', estimatedIncome: 500, type: 'gig' },
      { title: 'Skill Development', description: 'Learn new skills to increase your earning potential', estimatedIncome: 300, type: 'upskill' },
      { title: 'Part-time Consulting', description: 'Offer consulting services in your area of expertise', estimatedIncome: 800, type: 'gig' },
    ]);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on these hobbies: ${hobbies.join(', ')}, and current monthly income of $${currentIncome}, suggest 5 realistic ways to increase income for someone in Australia saving for a house deposit. Include:

1. Gig work opportunities related to their hobbies
2. Potential career changes or job upgrades
3. Side businesses they could start
4. Freelance opportunities
5. Skill monetization strategies

For each suggestion:
- Be specific and actionable
- Estimate realistic monthly income potential
- Specify the type (gig, career_change, side_business, freelance, or upskill)
- Focus on Australian market opportunities

Return as JSON array with title, description, estimatedIncome (number), and type fields.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedIncome: { type: Type.NUMBER },
              type: { type: Type.STRING },
            },
            required: ['title', 'description', 'estimatedIncome', 'type']
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Error generating income opportunities from hobbies:', error);
    return [];
  }
};

export const askHomeBuyingQuestion = async (question: string): Promise<string> => {
  const ai = getAi();
  if (!ai) {
    return Promise.resolve(
      "I'm here to help with home buying questions! However, the AI service is currently unavailable. Please try again later or check that your API key is configured correctly."
    );
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful financial advisor specializing in home buying in Australia. Answer this question concisely and practically: ${question}.
      
      Focus on:
      - Australian property market specifics
      - First home buyer schemes and grants
      - Stamp duty and LMI
      - Savings strategies
      - Mortgage pre-approval
      
      Keep your response under 150 words and actionable.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error asking home buying question:", error);
    return "I'm having trouble processing your question right now. Please try rephrasing it or try again in a moment.";
  }
};
