# Evaluations Tutorial

This repository demonstrates how to evaluate AI models using the open-source library [promptfoo](https://promptfoo.dev/).

## Prerequisites

- Node.js (v16 or higher)
- npm or pnpm
- OpenAI API key

## Getting Started

### 1. Clone the Repository

To clone only the evals_and_disillation folder:

```bash
# Clone the repository with sparse checkout
git clone --sparse --filter=blob:none https://github.com/YT_EXAMPLES.git
cd YT_EXAMPLES

# Checkout only the promptfoo_evals_1 folder
git sparse-checkout set promptfoo_evals_1
cd promptfoo_evals_1
```

### 2. Install Dependencies

Using npm:
```bash
npm install
npm install tsx --save
```

Or using pnpm:
```bash
pnpm install
pnpm add tsx
```

To get started, set your OPENAI_API_KEY environment variable, or other required keys for the providers you selected.

Next, edit promptfooconfig.yaml.

Then run:
```
promptfoo eval
```

Afterwards, you can view the results by running `promptfoo view`
