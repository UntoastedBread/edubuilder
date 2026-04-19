import { NextResponse } from 'next/server';
import { getLesson, updateLesson } from '@/lib/lessons';

export async function GET(request, { params }) {
  const { id } = await params;
  const lesson = await getLesson(id);
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }
  return NextResponse.json(lesson);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const lesson = await updateLesson(id, body);
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }
  return NextResponse.json(lesson);
}
