import { getLesson } from '@/lib/lessons';
import LearnPageClient from '@/components/learn/LearnPageClient';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const lesson = await getLesson(id);

  if (!lesson) {
    return { title: 'Lesson not found | EduBuilder' };
  }

  const blockCount = lesson.blocks?.length || 0;
  const description = `${blockCount}-block interactive lesson${lesson.subject ? ` on ${lesson.subject}` : ''}. Built with EduBuilder.`;

  return {
    title: `${lesson.title} | EduBuilder`,
    description,
    openGraph: {
      title: lesson.title,
      description,
      type: 'article',
      siteName: 'EduBuilder',
    },
  };
}

export default async function LearnPage({ params }) {
  const { id } = await params;

  return <LearnPageClient id={id} />;
}
