# OpenAI Structured Outputs Demo with Deno

This repository demonstrates how to use OpenAI's structured outputs feature with Deno 2, showing both structured and unstructured approaches to handling API responses.

## Prerequisites

1. [Install Deno](https://docs.deno.com/runtime/getting_started/installation/)
2. An OpenAI API key

## Setup

1. Clone the repository:

```bash
# Clone the repository with sparse checkout
git clone --sparse --filter=blob:none https://github.com/YT_EXAMPLES.git
cd YT_EXAMPLES

# Checkout only the evals_and_disillation folder
git sparse-checkout set structured_outputs
cd structured_outputs
```

2. Install dependencies:
```bash
# Deno will automatically install dependencies when you run the scripts
# But you can also install them explicitly with:
deno cache --reload deno.json
```

3. Set up your OpenAI API key as an environment variable:

```bash
# On Unix-based systems (Linux/MacOS)
export OPENAI_API_KEY='your-api-key-here'

# On Windows (PowerShell)
$env:OPENAI_API_KEY='your-api-key-here'
```

## Supported Models

The following OpenAI models support structured outputs:

- gpt-4o-mini-2024-07-18 and later versions
- gpt-4o-2024-08-06 and later versions

Both default models `gpt-4o` and `gpt4o-mini` point to these supported versions.

## Running the Demos

The repository contains two example files demonstrating different approaches:

### Unstructured Output Demo
Run the unstructured example with:

```bash
deno run -A unstructured.ts
```

### Structured Output Demo
Run the structured example with:

```bash
deno run -A structured.ts
```

## Project Structure

```
├── deno.json           # Deno configuration file
├── structured.ts       # Structured output example using Zod
├── unstructured.ts     # Unstructured output example
└── z.models.md         # Supported model information
```

## Features

- Demonstrates both structured and unstructured approaches to OpenAI API responses
- Uses Zod for runtime type validation
- Shows consistent output formatting with structured responses
- Includes multiple API calls to demonstrate consistency differences

## Dependencies

The project uses:
- OpenAI API client
- Zod for schema validation
- Built-in Deno features

All dependencies are managed through the `deno.json` configuration file.

## Notes

- Make sure you're using a supported model for structured outputs
- The demos will make multiple API calls to demonstrate consistency
- Remember to keep your API key secure and never commit it to version control

## License

This project is open-source and available under the MIT License.