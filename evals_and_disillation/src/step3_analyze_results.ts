import fs from 'fs'
import Papa, { ParseConfig } from 'papaparse'
import { createObjectCsvWriter } from 'csv-writer'

// Core interfaces for analyzing wine prediction results
interface WinePredictionRecord {
  recordId: number
  model: string
  prediction: string
  timestamp: string
  winery: string
  variety: string
  actual_variety: string
}

// Analysis results structure containing accuracy metrics and example errors
interface WineAnalysisResult {
  model: string
  totalPredictions: number
  correctPredictions: number
  accuracy: number
  incorrectExamples: Array<{
    winery: string
    predicted: string
    actual: string
    description?: string
  }>
}

// Validates that a record contains all required fields for analysis
// Used to ensure data quality before processing
function validateWinePredictionRecord(
  record: any
): record is WinePredictionRecord {
  const isValid =
    typeof record === 'object' &&
    record !== null &&
    (typeof record.recordId === 'number' ||
      typeof record.recordId === 'string') &&
    typeof record.model === 'string' &&
    typeof record.prediction === 'string' &&
    typeof record.winery === 'string' &&
    typeof record.variety === 'string' &&
    typeof record.actual_variety === 'string'

  return isValid
}

// Calculates accuracy metrics for a set of predictions
// Returns detailed analysis including sample incorrect predictions
function calculateWineAccuracy(
  predictions: WinePredictionRecord[]
): WineAnalysisResult {
  if (!predictions.length) {
    throw new Error('No predictions to analyze')
  }

  let correctPredictions = 0
  const incorrectExamples: WineAnalysisResult['incorrectExamples'] = []

  for (const prediction of predictions) {
    const isCorrect = prediction.prediction === prediction.actual_variety

    if (isCorrect) {
      correctPredictions++
    } else {
      incorrectExamples.push({
        winery: prediction.winery,
        predicted: prediction.prediction,
        actual: prediction.actual_variety,
      })
    }
  }

  return {
    model: predictions[0].model,
    totalPredictions: predictions.length,
    correctPredictions,
    accuracy: correctPredictions / predictions.length,
    incorrectExamples: incorrectExamples.slice(0, 5),
  }
}

// Reads and parses a predictions CSV file
// Handles streaming for memory efficiency with large datasets
async function readPredictionsFile(
  filePath: string
): Promise<WinePredictionRecord[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  return new Promise((resolve, reject) => {
    const validRecords: WinePredictionRecord[] = []
    const fileStream = fs.createReadStream(filePath, 'utf8')

    const parseConfig: ParseConfig = {
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
      transform: (value) => value?.trim(),
    }

    const parseStream = Papa.parse(Papa.NODE_STREAM_INPUT, parseConfig)

    fileStream
      .pipe(parseStream)
      .on('data', (record: any[]) => {
        const timestamp =
          record[3] instanceof Date
            ? record[3].toISOString()
            : String(record[3])

        const mappedRecord = {
          recordId: record[0],
          model: record[1],
          prediction: String(record[2]),
          timestamp: timestamp,
          winery: String(record[4]),
          variety: String(record[5]),
          actual_variety: String(record[6]),
        }

        if (validateWinePredictionRecord(mappedRecord)) {
          validRecords.push(mappedRecord)
        }
      })
      .on('error', (error) => {
        reject(new Error(`Error parsing file: ${error.message}`))
      })
      .on('end', () => {
        if (validRecords.length === 0) {
          reject(new Error(`No valid records found in ${filePath}`))
        } else {
          resolve(validRecords)
        }
      })

    fileStream.on('error', (error) => {
      reject(new Error(`Error reading file: ${error.message}`))
    })
  })
}

// Interface for specifying input files for analysis
interface AnalysisFiles {
  baseModelFile: string
  comparisonModelFile: string
}

// Main analysis function that compares two models' performance
// Generates both console output and CSV report
async function analyzePredictions({
  baseModelFile,
  comparisonModelFile,
}: AnalysisFiles) {
  console.log('Starting analysis...\n')

  try {
    const [baseModelPredictions, comparisonModelPredictions] =
      await Promise.all([
        readPredictionsFile(baseModelFile),
        readPredictionsFile(comparisonModelFile),
      ])

    if (baseModelPredictions.length !== comparisonModelPredictions.length) {
      console.warn(
        `Warning: Different number of predictions between models (Base Model: ${baseModelPredictions.length}, Comparison Model: ${comparisonModelPredictions.length})`
      )
    }

    const baseModelResults = calculateWineAccuracy(baseModelPredictions)
    const comparisonModelResults = calculateWineAccuracy(
      comparisonModelPredictions
    )

    console.log('=== Model Performance Analysis ===\n')

    for (const result of [baseModelResults, comparisonModelResults]) {
      console.log(`\n${result.model} Results:`)
      console.log(`Total Predictions: ${result.totalPredictions}`)
      console.log(`Correct Predictions: ${result.correctPredictions}`)
      console.log(`Accuracy: ${(result.accuracy * 100).toFixed(2)}%\n`)
    }

    console.log('Performance Difference:')
    const accuracyDiff =
      baseModelResults.accuracy - comparisonModelResults.accuracy
    console.log(
      `Base Model outperforms Comparison Model by ${(
        accuracyDiff * 100
      ).toFixed(2)}%\n`
    )

    console.log('=== Sample Incorrect Predictions from Comparison Model ===\n')
    comparisonModelResults.incorrectExamples.forEach((example, index) => {
      console.log(`Example ${index + 1}:`)
      console.log(`Title: ${example.winery}`)
      console.log(`Predicted: ${example.predicted}`)
      console.log(`Actual: ${example.actual}\n`)
    })

    // Save results
    const now = new Date()
    const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(
      now.getMinutes()
    ).padStart(2, '0')}`

    const analysisWriter = createObjectCsvWriter({
      path: `./data/analysis_results_${timestamp}.csv`,
      header: [
        { id: 'model', title: 'Model' },
        { id: 'accuracy', title: 'Accuracy' },
        { id: 'totalPredictions', title: 'Total Predictions' },
        { id: 'correctPredictions', title: 'Correct Predictions' },
      ],
    })

    await analysisWriter.writeRecords([
      {
        model: baseModelResults.model,
        accuracy: baseModelResults.accuracy,
        totalPredictions: baseModelResults.totalPredictions,
        correctPredictions: baseModelResults.correctPredictions,
      },
      {
        model: comparisonModelResults.model,
        accuracy: comparisonModelResults.accuracy,
        totalPredictions: comparisonModelResults.totalPredictions,
        correctPredictions: comparisonModelResults.correctPredictions,
      },
    ])

    console.log(
      `Analysis results saved to data/analysis_results_${timestamp}.csv`
    )
  } catch (error) {
    console.error('Error during analysis:', error)
    throw error
  }
}

export { analyzePredictions, AnalysisFiles }
