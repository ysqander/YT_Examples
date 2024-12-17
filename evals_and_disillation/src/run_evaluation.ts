import {
  runPredictions,
  trainDataPath,
  validationDataPath,
} from './step2_get_output'
import { analyzePredictions, AnalysisFiles } from './step3_analyze_results'

// Configuration interface for the evaluation process
interface EvaluationConfig {
  comparisonModel: string // Model to compare against base model
  numSamples?: number // Number of samples to process (-1 for all)
  datasets?: ('train' | 'validation')[] // Which datasets to evaluate
}

// Main evaluation function that coordinates the entire evaluation pipeline
// Handles both prediction generation and result analysis for multiple datasets
async function runEvaluation({
  comparisonModel,
  numSamples = 3,
  datasets = ['train', 'validation'],
}: EvaluationConfig) {
  // Determine if we should store completions (only for training with mini model)
  const storeCompletions =
    comparisonModel === 'gpt-4o-mini' && datasets.includes('train')
  const timestamp = getRunTimestamp()

  // Log configuration for transparency
  console.log(`Starting evaluation with following configuration:`)
  console.log(`- Comparison model: ${comparisonModel}`)
  console.log(`- Storing completions: ${storeCompletions}`)
  console.log(`- Number of samples: ${numSamples}`)
  console.log(`- Datasets: ${datasets.join(', ')}`)
  console.log(`- Timestamp: ${timestamp}\n`)

  // Process each dataset (training and/or validation)
  for (const dataset of datasets) {
    const datasetPath = dataset === 'train' ? trainDataPath : validationDataPath
    const datasetName = dataset === 'train' ? 'Training' : 'Validation'

    console.log(`\n=== Processing ${datasetName} Dataset ===`)

    // Step 2: Generate model predictions
    await runPredictions(
      datasetPath,
      comparisonModel,
      storeCompletions,
      numSamples,
      timestamp
    )

    // Step 3: Compare and analyze results
    const files: AnalysisFiles = {
      baseModelFile: `./data/predictions_gpt-4o_${dataset}_${timestamp}.csv`,
      comparisonModelFile: `./data/predictions_${comparisonModel}_${dataset}_${timestamp}.csv`,
    }

    console.log(`\nAnalyzing ${datasetName} results...`)
    await analyzePredictions(files)
  }
}

// Generates a consistent timestamp format for file naming
// Format: MM-DD-HH-mm (month-day-hour-minute)
function getRunTimestamp(): string {
  const now = new Date()
  return `${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(
    now.getMinutes()
  ).padStart(2, '0')}`
}

// CLI handler for running evaluations from command line
// Usage: ts-node run_evaluation.ts <model> <datasets> <numSamples>
// Example: ts-node run_evaluation.ts gpt-4o-mini train,validation -1
if (import.meta.url === new URL(import.meta.url).href) {
  const model = process.argv[2] || 'gpt-4o-mini'
  const datasetsArg = process.argv[3] || 'train,validation'
  const numSamples = parseInt(process.argv[4]) || 3

  if (!model) {
    console.error('Please provide a comparison model name')
    process.exit(1)
  }

  const datasets = datasetsArg.split(',') as ('train' | 'validation')[]

  runEvaluation({
    comparisonModel: model,
    datasets,
    numSamples,
  }).catch((error) => {
    console.error('Error during evaluation:', error)
    process.exit(1)
  })
}

export { runEvaluation }
