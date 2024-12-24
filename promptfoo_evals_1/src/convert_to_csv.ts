import * as fs from 'fs'
import { races_dataset } from './data'

const convert_jsArray_to_csv = (
  dataset: any[],
  featureName: string,
  GroundTruth: string
) => {
  const csvContent = [
    [featureName, '__expected'],
    ...dataset.map((item) => [item[featureName], item[GroundTruth]]),
  ]
    .map((row) =>
      row
        .map((field) =>
          // Wrap fields containing commas in quotes
          field.includes(',') ? `"${field}"` : field
        )
        .join(',')
    )
    .join('\n')

  fs.writeFileSync('src/data.csv', csvContent)
}

convert_jsArray_to_csv(races_dataset, 'race', 'likely_winner')
