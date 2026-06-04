import { Controller, Get, Query } from '@nestjs/common';
import { GeminiService } from './gemini/gemini.service';

@Controller('tasks')
export class AppController {
    // הזרקת הסרביס דרך ה-Constructor (Dependency Injection)
    constructor(private readonly geminiService: GeminiService) {}

    @Get('generate')
    async generate(@Query('prompt') prompt: string) {
        const defaultPrompt =
            "היום יום רביעי. ירדן צריך לפנות את המדיח, יובל מקבל 50 סטאר דרופס בברול סטארס אם הוא מסיים שיעורים, ורותם חייב להוציא את הכלב לטיול ארוך כי הוא בקושי יצא בבוקר.";

        const input = prompt || defaultPrompt;

        return [
            { id: 1, title: "Clean the kitchen" },
            { id: 2, title: "Walk the dog" }
        ];

        return await this.geminiService.generateDailyTasks(input);
    }
}