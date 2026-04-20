import chalk from 'chalk';
import ora, { Ora } from 'ora';

export function logInfo(message: string): void {
  console.log(chalk.blue(message));
}

export function logSuccess(message: string): void {
  console.log(chalk.green(message));
}

export function logError(message: string): void {
  console.error(chalk.red(message));
}

export function logWarning(message: string): void {
  console.log(chalk.yellow(message));
}

export function startSpinner(message: string): Ora {
  return ora(message).start();
}

export function stopSpinnerSuccess(spinner: Ora, message: string): void {
  spinner.succeed(message);
}

export function stopSpinnerFail(spinner: Ora, message: string): void {
  spinner.fail(message);
}
