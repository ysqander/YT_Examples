# OpenAI Model Evaluation & Distillation Tutorial

This repository demonstrates how to evaluate and compare OpenAI models, specifically focusing on fine-tuning and distilling knowledge from larger models to smaller ones. The example uses wine variety classification as a demonstration case.

## Prerequisites

- Node.js (v16 or higher)
- npm or pnpm
- OpenAI API key
- Git (version 2.25.0 or higher)

## Getting Started

### 1. Clone the Repository

To clone only the evals_and_disillation folder:

```bash
# Clone the repository with sparse checkout
git clone --sparse --filter=blob:none https://github.com/YT_EXAMPLES.git
cd YT_EXAMPLES

# Checkout only the evals_and_disillation folder
git sparse-checkout set evals_and_disillation
cd evals_and_disillation
```

### 2. Install Dependencies

Using npm:
```bash
npm install
npm install dotenv @types/dotenv tsx --save
```

Or using pnpm:
```bash
pnpm install
pnpm add dotenv @types/dotenv tsx
```

### 3. Configure OpenAI API Key

You can either:

1. Set the API key in your environment:
```bash
export OPENAI_API_KEY=your_api_key_here
```

2. Or create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_api_key_here
```

The application will first check for an environment variable, and if not found, will look for the API key in the .env file.

### 4. Project Structure

```
evals_and_disillation/
├── data/
│   ├── winemag_train_dataset.csv
│   └── winemag_validation_dataset.csv
└── src/
    ├── run_evaluation.ts
    ├── step2_get_output.ts
    └── step3_analyze_results.ts
```

### 5. Running the Evaluation

The evaluation process consists of three main steps:

1. **Main Evaluation Script**
```bash
tsx src/run_evaluation.ts <model> <datasets> <numSamples>
```

Example:
```bash
tsx src/run_evaluation.ts gpt-4o-mini train,validation 3
```

Parameters:
- `model`: The comparison model (e.g., 'gpt-4o-mini'). We are alway running gpt-40 and a comparison model either gpt-4o-mini or a distilled version of gpt-4o-mini.
- `datasets`: Comma-separated list of datasets ('train', 'validation', or both)
- `numSamples`: Number of samples to process (-1 for all)

2. **Generate Predictions** (step2_get_output.ts)
This step runs automatically as part of the evaluation process. It:
- Processes wine data
- Generates predictions using both base and comparison models
- Saves results to CSV files

3. **Analyze Results** (step3_analyze_results.ts)
Also runs automatically after predictions are generated. It:
- Compares model performances
- Generates accuracy metrics
- Provides example predictions
- Saves analysis results

### 6. Output Files

The evaluation process generates several files in the `data/` directory:
- `predictions_[model]_[dataset]_[timestamp].csv`: Raw predictions from each model
- `analysis_results_[timestamp].csv`: Comparative analysis results

### 7. Customization

You can modify the evaluation parameters in `run_evaluation.ts`:
- Change the number of samples
- Adjust batch sizes
- Modify rate limiting
- Update prompt engineering in `step2_get_output.ts`

## Notes

- The system implements rate limiting to respect OpenAI's API constraints. This is a rule of thumb and you may have a few prediciton fails but it should not be more than 5-7 on 500. 
- Batch processing is used to handle large datasets efficiently
- Error handling and retries are implemented for API calls
- Progress indicators show evaluation status

## Troubleshooting

If you encounter errors:
1. Verify your OpenAI API key is correct
2. Check API rate limits haven't been exceeded too often. 
3. Ensure all dependencies are installed
4. Verify CSV files are in the correct format

## License

This project is open-source and available under the MIT License.