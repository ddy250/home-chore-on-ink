import { Injectable } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';

export interface DailyTask {
    childName: string;
    taskDescription: string;
    reward?: string;
    isUrgent: boolean;
}

export interface DailyScheduleResponse {
    date: string;
    tasks: DailyTask[];
}

@Injectable()
export class GeminiService {
    private readonly ai: GoogleGenAI;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is missing from environment variables');
        }

        this.ai = new GoogleGenAI({ apiKey });
    }

    private readonly taskResponseSchema = {
        type: Type.OBJECT,
        properties: {
            date: { type: Type.STRING, description: 'The current date in YYYY-MM-DD format' },
            tasks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        childName: { type: Type.STRING },
                        taskDescription: { type: Type.STRING, description: 'Task description in Hebrew' },
                        reward: { type: Type.STRING, description: 'Optional reward description in Hebrew, like Brawl Stars reward' },
                        isUrgent: { type: Type.BOOLEAN },
                    },
                    required: ['childName', 'taskDescription', 'isUrgent'],
                },
            },
        },
        required: ['date', 'tasks'],
    };

    async generateDailyTasks(rawFamilyInput: string): Promise<DailyScheduleResponse> {
        const systemInstruction = `
    You are a smart household manager for a family with three kids: ירדן (Yardan), יובל (Yuval), and רותם (Rotem).
    Your job is to parse the daily or weekly instructions and output a structured list of tasks for today.
    
    Rules:
    - All task descriptions and rewards MUST be written in fluent, friendly Hebrew, suitable for kids.
    - Make sure rewards for games like Brawl Stars are highlighted nicely in the reward string.
    - If a task is critical, set isUrgent to true.
  `;

        const maxRetries = 3;
        let delay = 1000; // תחילת השהייה של שנייה אחת

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Generate tasks based on this input: ${rawFamilyInput}`,
                    config: {
                        systemInstruction,
                        responseMimeType: 'application/json',
                        responseSchema: this.taskResponseSchema,
                        temperature: 0.2,
                    },
                });

                return JSON.parse(response.text) as DailyScheduleResponse;
            } catch (error: any) {
                // אם הגענו לניסיון האחרון או שהשגיאה היא לא שגיאת שרת זמנית (כמו 503 או 429)
                const isTimeOutOrOvertaxed = error?.status === 503 || error?.status === 429 || String(error).includes('503');

                if (attempt === maxRetries || !isTimeOutOrOvertaxed) {
                    console.error(`[GeminiService] Failed finally on attempt ${attempt}:`, error);
                    throw error;
                }

                console.warn(`[GeminiService] Server busy (503). Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2; // מכפילים את זמן ההמתנה בכל פעם (Exponential Backoff)
            }
        }
    }}