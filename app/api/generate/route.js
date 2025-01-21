import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Helper function to clean JSON content
function cleanJSONContent(content) {
    return content.replace(/```json|```/g, '').trim();
}

export async function POST(req) {
    try {
        const openai = new OpenAI();
        const body = await req.json();
        const { text, count } = body;

        // Validate and limit the count parameter
        const flashcardCount = Math.min(Math.max(count || 12, 1), 100); // Default to 12, minimum 1, maximum 100

        const batchSize = 12; // Generate up to 12 flashcards per batch
        const iterations = Math.ceil(flashcardCount / batchSize); // Calculate number of batches
        const flashcards = [];
        const maxRetries = 3; // Maximum retry attempts for failed batches

        console.log(`Generating ${flashcardCount} flashcards in ${iterations} batch(es).`);

        for (let i = 0; i < iterations; i++) {
            const remainingCount = flashcardCount - flashcards.length; // Remaining flashcards to generate
            const currentBatchSize = Math.min(batchSize, remainingCount);

            let success = false;
            let retries = 0;

            while (!success && retries < maxRetries) {
                try {
                    const systemPrompt = `
You are a flashcard creator. Your task is to generate concise and effective flashcards.

1. Do not ask for clarification or additional input.
2. Assume the topic is "${text}" and generate exactly ${currentBatchSize} flashcards based on this topic.
3. Each flashcard must have a "front" (question or prompt) and a "back" (answer or explanation).
4. If you cannot generate the full ${currentBatchSize} flashcards, generate as many as possible.

You should return in the following JSON format:
{
   "flashcards": [
    { "front": "Question 1", "back": "Answer 1" },
    { "front": "Question 2", "back": "Answer 2" }
  ]
}
                    `;

                    const completion = await openai.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: text },
                        ],
                        model: 'gpt-4o',
                        temperature: 0.7,
                    });

                    console.log(`Generated batch ${i + 1}/${iterations}, attempt ${retries + 1}.`);

                    // Preprocess and parse the response
                    const cleanedContent = cleanJSONContent(completion.choices[0].message.content);
                    const batchFlashcards = JSON.parse(cleanedContent)?.flashcards;

                    if (Array.isArray(batchFlashcards) && batchFlashcards.length > 0) {
                        flashcards.push(...batchFlashcards);
                        success = true; // Exit retry loop on success
                    } else {
                        console.error(`Batch ${i + 1} returned invalid data:`, cleanedContent);
                        retries++;
                    }
                } catch (parseError) {
                    console.error(`Error parsing batch ${i + 1}, attempt ${retries + 1}:`, parseError);
                    retries++;
                }
            }

            // Break if we've reached the desired number of flashcards
            if (flashcards.length >= flashcardCount) {
                console.log(`Reached the desired number of flashcards: ${flashcards.length}`);
                break;
            }
        }

        // Ensure the final response has the correct count
        const finalFlashcards = flashcards.slice(0, flashcardCount);

        console.log(`Returning ${finalFlashcards.length} flashcards.`);
        return NextResponse.json({ flashcards: finalFlashcards });
    } catch (error) {
        console.error('Error generating flashcards:', error);
        return NextResponse.json(
            { error: 'Failed to generate flashcards. Please try again.' },
            { status: 500 }
        );
    }
}


