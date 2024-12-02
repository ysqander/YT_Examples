// unstructuredExample.ts
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI()

async function extractUserProfileUnstructured() {
  const messages = [
    {
      role: 'system' as const,
      content:
        'Extract user profile information from the text provided. Please put each of these fields on a separate line: name, email, years of experience, programming languages.',
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

  // Make three separate calls to show inconsistency
  for (let i = 0; i < 3; i++) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
    })

    console.log(`Attempt ${i + 1}:`)
    console.log(completion.choices[0].message.content)
    console.log('---')
  }
}

// Run the example
async function runDemo() {
  try {
    console.log('DEMONSTRATING UNSTRUCTURED OUTPUTS\n')
    await extractUserProfileUnstructured()
  } catch (error) {
    console.error('Error running demo:', error)
  }
}

runDemo()
