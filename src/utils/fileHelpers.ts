import { promises as fs } from 'fs';
import path from 'path';

export async function ensureDirExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to ensure directory exists at "${dirPath}": ${message}`);
  }
}

export async function readJSON<T>(filePath: string): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read JSON file "${filePath}": ${message}`);
  }
}

export async function writeJSON(filePath: string, data: unknown): Promise<void> {
  const dirPath = path.dirname(filePath);

  try {
    await ensureDirExists(dirPath);
    const content = `${JSON.stringify(data, null, 2)}\n`;
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write JSON file "${filePath}": ${message}`);
  }
}

export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read text file "${filePath}": ${message}`);
  }
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  const dirPath = path.dirname(filePath);

  try {
    await ensureDirExists(dirPath);
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write text file "${filePath}": ${message}`);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
