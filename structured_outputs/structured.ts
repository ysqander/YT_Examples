// structuredExample.ts
import OpenAI from 'openai'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

// Initialize OpenAI client
const openai = new OpenAI()

// Define the exact structure we want using Zod schema
const UserProfile = z.object({
  fullName: z.string().describe("User's full name"),
  location: z.string().describe("User's city or location"),
  yearsOfExperience: z.number().describe('Years of coding experience'),
  programmingLanguages: z
    .array(z.string())
    .describe('Programming languages the user knows'),
  email: z.string().describe("User's email address"),
  githubUsername: z
    .string()
    .describe("User's GitHub username without @ symbol"),
})

// Type inference from the Zod schema
type UserProfileType = z.infer<typeof UserProfile>

async function extractUserProfileStructured() {
  const messages = [
    {
      role: 'system' as const,
      content:
        'Extract user profile information into a structured format. Ensure all fields match the specified schema.',
    },
    {
      role: 'user' as const,
      content: `
        Hi! I'm Jane Smith, a software developer from Seattle.
        I've been coding for 5 years, mainly in JavaScript and Python.
        You can reach me at jane.smith@email.com
        Github: @janedev
      `,
    },
  ]

  // Make three calls to show consistency
  // WATCH OUT openia.beta.chat!!!

  for (let i = 0; i < 3; i++) {
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o',
      messages,
      response_format: zodResponseFormat(UserProfile, 'user_profile'),
    })

    const profile: UserProfileType = completion.choices[0].message.parsed!

    console.log(`Attempt ${i + 1}:`)
    console.log(JSON.stringify(profile, null, 2))
    console.log('---')
  }
}

// Run the example
async function runDemo() {
  try {
    console.log('DEMONSTRATING STRUCTURED OUTPUTS\n')
    await extractUserProfileStructured()
  } catch (error) {
    console.error('Error running demo:', error)
  }
}

runDemo()
