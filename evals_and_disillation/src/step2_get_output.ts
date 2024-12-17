import fs from 'fs'
import Papa from 'papaparse'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import OpenAI from 'openai'
import pLimit, { LimitFunction } from 'p-limit'
import { setTimeout } from 'timers/promises'
import { createObjectCsvWriter } from 'csv-writer'
import dotenv from 'dotenv'
import path from 'path'

// Configure dotenv to read from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Update the OpenAI client initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Will use environment variable if present, otherwise .env file
})

// Core interfaces for handling wine data and predictions
interface WineRecord {
  winery: string
  province: string
  country: string
  region_1: string
  description: string
  taster_name: string
  points: number
  price: number
  variety: string
}

interface PredictionResult {
  recordId: number
  model: string
  prediction: string
  timestamp: string
  winery: string
  variety: string
  actual_variety: string
}

// Paths to the training and validation datasets
const trainDataPath = './data/winemag_train_dataset.csv'
const validationDataPath = './data/winemag_validation_dataset.csv'

// Generates a prompt for the AI model based on wine details and possible varieties
// This is the core prompt engineering part of the system
function generatePrompt(record: WineRecord, varieties: string[]): string {
  const varietyList = varieties.join(', ')

  return `
Based on this wine review, guess the grape variety:
This wine is produced by ${record.winery} in the ${record.province} region of ${record.country}.
It was grown in ${record.region_1}. It is described as: "${record.description}".
The wine has been reviewed by ${record.taster_name} and received ${record.points} points.
The price is ${record.price}.

Here is a list of possible grape varieties to choose from: ${varietyList}.

What is the likely grape variety? Answer only with the grape variety name or blend from the list.
`
}

// Extracts unique wine varieties from a dataset file
// Used to create the list of possible classifications for the model
async function getUniqueVarieties(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const varieties = new Set<string>()

    fs.createReadStream(filePath)
      .pipe(
        Papa.parse(Papa.NODE_STREAM_INPUT, {
          header: true,
          skipEmptyLines: true,
        })
      )
      .on('data', (record: any) => {
        if (record.variety) {
          varieties.add(record.variety.trim())
        }
      })
      .on('error', reject)
      .on('end', () => {
        resolve(Array.from(varieties))
      })
  })
}

// Makes a single prediction using the OpenAI API
// Includes retry logic and proper error handling
async function getPrediction(
  model: string,
  prompt: string,
  responseFormat: any,
  timestamp: string,
  storeCompletions: boolean = true,
  retries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const isBaseModel = model === 'gpt-4o'
      const shouldStore = isBaseModel && storeCompletions

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content:
            "You're a sommelier expert and you know everything about wine. You answer precisely with the name of the variety/blend.",
        },
        {
          role: 'user',
          content: prompt,
        },
      ]

      type ParsedResponse = {
        variety: string
      }

      const completion = await openai.beta.chat.completions.parse({
        model: model,
        messages: messages,
        response_format: responseFormat,
        store: shouldStore,
        metadata: shouldStore
          ? {
              purpose: 'wine_classification',
              timestamp: timestamp,
            }
          : undefined,
      })
      const message = completion.choices[0].message

      if (message.parsed) {
        console.log('message.parsed', message.parsed)
        return (message.parsed as ParsedResponse).variety
      } else if (message.refusal) {
        throw new Error('Model refused to classify')
      }
      throw new Error('No valid response received')
    } catch (error) {
      if (attempt === retries) throw error
      const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
      await setTimeout(delay)
    }
  }
  throw new Error('All retries failed')
}

// Processes a batch of records in parallel while respecting rate limits
// Returns an array of successful predictions
async function processBatch(
  records: WineRecord[],
  startIdx: number,
  model: string,
  timestamp: string,
  limit: LimitFunction,
  storeCompletions: boolean,
  responseFormat: any
): Promise<PredictionResult[]> {
  const varieties = await getUniqueVarieties(trainDataPath)
  const promises = records.map((record, index) =>
    limit(async () => {
      try {
        const prompt = generatePrompt(record, varieties)
        const prediction = await getPrediction(
          model,
          prompt,
          responseFormat,
          timestamp,
          storeCompletions
        )
        return {
          recordId: startIdx + index,
          model,
          prediction,
          timestamp: new Date().toISOString(),
          winery: record.winery,
          variety: record.variety,
          actual_variety: record.variety,
        }
      } catch (error) {
        console.error(`Error processing record ${startIdx + index}:`, error)
        return null
      }
    })
  )

  const batchResults = await Promise.all(promises)
  return batchResults.filter(
    (result: PredictionResult | null): result is PredictionResult =>
      result !== null
  )
}

// Helper function to determine if we're processing training or validation data
function getDatasetType(datasetPath: string): string {
  return datasetPath.includes('train') ? 'train' : 'validation'
}

// Main function that orchestrates the prediction pipeline
// Handles data loading, batching, and saving results
async function main(
  datasetPath: string,
  comparisonModel: string = 'gpt-4o-mini',
  storeCompletions: boolean = true,
  numSamples: number = -1,
  timestamp: string
): Promise<void> {
  const varieties = await getUniqueVarieties(trainDataPath)

  // Define the schema using zod with descriptions
  const wineVarietySchema = z.object({
    variety: z
      .enum(varieties as [string, ...string[]])
      .describe('The grape variety or blend from the provided list'),
  })

  // Create response format using the zodResponseFormat helper
  const responseFormat = zodResponseFormat(
    wineVarietySchema,
    'wine_variety_prediction'
  )

  return new Promise((resolve, reject) => {
    const validRecords: WineRecord[] = []
    const fileStream = fs.createReadStream(datasetPath, 'utf8')

    const parseConfig: Papa.ParseConfig = {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transform: (value) => value?.trim(),
    }

    const parseStream = Papa.parse(Papa.NODE_STREAM_INPUT, parseConfig)

    // Handle stream errors
    fileStream.on('error', (error) => {
      reject(new Error(`File stream error: ${error.message}`))
    })

    parseStream.on('error', (error) => {
      reject(new Error(`Parse stream error: ${error.message}`))
    })

    // Read the file using streaming
    fileStream
      .pipe(parseStream)
      .on('data', (record: any) => {
        if (record.winery && record.variety && record.description) {
          validRecords.push({
            winery: record.winery,
            province: record.province,
            country: record.country,
            region_1: record.region_1,
            description: record.description,
            taster_name: record.taster_name,
            points: record.points,
            price: record.price,
            variety: record.variety,
          })
        }
      })
      .on('error', (error) => {
        reject(new Error(`Processing error: ${error.message}`))
      })
      .on('end', async () => {
        try {
          console.log('Parsing Stats:', {
            totalValid: validRecords.length,
          })

          function sampleRecords(records: WineRecord[], numSamples: number) {
            return numSamples === -1
              ? records.slice(0) // Return all records if numSamples is -1
              : records.slice(0, numSamples) // Return a sample of records if numSamples is a positive number
          }

          const sampledRecords = sampleRecords(validRecords, numSamples)

          // Create rate limiter - 3 requests per second (conservative rate limiting)
          const limit = pLimit(3)

          // Process models sequentially
          for (const model of ['gpt-4o', comparisonModel]) {
            console.log(`\n Starting processing with model: ${model}`)
            let totalProcessed = 0

            for (let i = 0; i < sampledRecords.length; i += BATCH_SIZE) {
              const batchRecords = sampledRecords.slice(i, i + BATCH_SIZE)

              const batchNumber = Math.floor(i / BATCH_SIZE) + 1
              const totalBatches = Math.ceil(sampledRecords.length / BATCH_SIZE)

              console.log(
                `\n🔄 Processing batch ${batchNumber}/${totalBatches}...`
              )

              const batchStartTime = Date.now()
              const batchResults = await processBatch(
                batchRecords,
                i,
                model,
                timestamp,
                limit,
                storeCompletions,
                responseFormat
              )

              totalProcessed += batchResults.length
              const percentComplete = (
                ((i + batchRecords.length) / sampledRecords.length) *
                100
              ).toFixed(1)
              const batchDuration = (
                (Date.now() - batchStartTime) /
                1000
              ).toFixed(1)

              // Save batch results
              await saveResults(batchResults, model, timestamp, datasetPath)

              console.log(
                `✓ Batch ${batchNumber} completed in ${batchDuration}s`
              )
              console.log(
                `📈 Progress: ${percentComplete}% (${totalProcessed}/${sampledRecords.length} records processed)`
              )

              if (i + BATCH_SIZE < sampledRecords.length) {
                console.log('⏳ Waiting 30 seconds before next batch...')
                await setTimeout(30000)
              }
            }

            console.log(
              `\n✅ Completed processing for model ${model}: ${totalProcessed} records processed\n`
            )
          }

          resolve()
        } catch (error) {
          reject(error)
        }
      })
  })
}

// Constants for rate limiting
const REQUESTS_PER_MINUTE = 200
const BATCH_SIZE = Math.floor(REQUESTS_PER_MINUTE / 4)

// Saves batch results to a CSV file with proper dataset labeling
async function saveResults(
  results: PredictionResult[],
  model: string,
  timestamp: string,
  datasetPath: string
) {
  if (results.length === 0) return

  const datasetType = getDatasetType(datasetPath)
  const csvWriter = createCsvWriter(model, timestamp, datasetType)
  await csvWriter.writeRecords(results)
  console.log(
    `✓ Saved ${results.length} new results for model ${model} (${datasetType} dataset)`
  )
}

// Creates a CSV writer with the correct headers and file path
function createCsvWriter(
  model: string,
  timestamp: string,
  datasetType: string
) {
  return createObjectCsvWriter({
    path: `./data/predictions_${model}_${datasetType}_${timestamp}.csv`,
    header: [
      { id: 'recordId', title: 'Record ID' },
      { id: 'model', title: 'Model' },
      { id: 'prediction', title: 'Prediction' },
      { id: 'timestamp', title: 'Timestamp' },
      { id: 'winery', title: 'Winery' },
      { id: 'variety', title: 'Original Variety' },
      { id: 'actual_variety', title: 'Actual Variety' },
    ],
    append: true,
  })
}

// Update the export
export { main as runPredictions, trainDataPath, validationDataPath }
