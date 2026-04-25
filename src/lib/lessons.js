import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { estimateDuration } from './duration';

const DATA_DIR = path.join(process.cwd(), 'data', 'lessons');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

export async function createLesson(lesson) {
  await ensureDataDir();
  const id = uuidv4();
  const now = new Date().toISOString();
  const full = {
    id,
    title: lesson.title || 'Untitled Lesson',
    subject: lesson.subject || '',
    level: lesson.level || '',
    standard: lesson.standard || '',
    curriculumRef: lesson.curriculumRef || lesson.standard || '',
    audience: lesson.audience || '',
    tags: lesson.tags || [],
    difficulty: lesson.difficulty || '',
    visibility: lesson.visibility || 'private',
    blocks: lesson.blocks || [],
    createdAt: now,
    updatedAt: now,
  };
  const filePath = path.join(DATA_DIR, `${id}.json`);
  await writeFile(filePath, JSON.stringify(full, null, 2));
  return full;
}

export async function getLesson(id) {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  const data = await readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

export async function updateLesson(id, updates) {
  const existing = await getLesson(id);
  if (!existing) return null;
  const updated = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  const filePath = path.join(DATA_DIR, `${id}.json`);
  await writeFile(filePath, JSON.stringify(updated, null, 2));
  return updated;
}

export async function listLessons() {
  await ensureDataDir();
  const files = await readdir(DATA_DIR);
  const lessons = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const data = await readFile(path.join(DATA_DIR, file), 'utf-8');
    const lesson = JSON.parse(data);
    lessons.push({
      id: lesson.id,
      title: lesson.title,
      subject: lesson.subject,
      level: lesson.level,
      visibility: lesson.visibility || 'private',
      updatedAt: lesson.updatedAt,
      blockCount: lesson.blocks?.length || 0,
      blockTypes: lesson.blocks?.map(b => b.type) || [],
      duration: estimateDuration(lesson.blocks || []),
    });
  }
  return lessons.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}
