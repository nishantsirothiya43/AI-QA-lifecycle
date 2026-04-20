import inquirer from 'inquirer';

import { TestCase } from '../types';
import { readJSON, writeJSON } from '../utils/fileHelpers';

const REVIEWED_OUTPUT_PATH = 'data/output/reviewed-test-cases.json';

type ReviewAction = 'approved' | 'rejected' | 'edited';

export async function reviewTestCases(filePath: string): Promise<TestCase[]> {
  const testCases = await readJSON<TestCase[]>(filePath);

  for (const testCase of testCases) {
    console.log('\n----------------------------------------');
    console.log(`Title: ${testCase.title}`);
    console.log(`Description: ${testCase.description}`);

    const { action } = await inquirer.prompt<{ action: ReviewAction }>([
      {
        type: 'list',
        name: 'action',
        message: 'Choose review action:',
        choices: [
          { name: 'Approve', value: 'approved' },
          { name: 'Reject', value: 'rejected' },
          { name: 'Edit title', value: 'edited' },
        ],
      },
    ]);

    if (action === 'edited') {
      const { title } = await inquirer.prompt<{ title: string }>([
        {
          type: 'input',
          name: 'title',
          message: 'Enter updated title:',
          default: testCase.title,
        },
      ]);

      testCase.title = title.trim() || testCase.title;
      testCase.reviewStatus = 'edited';
    } else {
      testCase.reviewStatus = action;
    }
  }

  await writeJSON(REVIEWED_OUTPUT_PATH, testCases);
  return testCases;
}
