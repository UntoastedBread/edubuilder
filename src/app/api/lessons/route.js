import { NextResponse } from 'next/server';
import { createLesson, listLessons } from '@/lib/lessons';

export async function GET() {
  const lessons = await listLessons();
  return NextResponse.json(lessons);
}

export async function POST(request) {
  const body = await request.json();
  const lesson = await createLesson(body);
  return NextResponse.json(lesson, { status: 201 });
}
