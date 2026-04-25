import { listLessons } from '@/lib/lessons';
import LearnBrowseClient from '@/components/learn/LearnBrowseClient';

export const metadata = {
  title: 'Browse Lessons | EduBuilder',
  description: 'Browse interactive lessons built with EduBuilder.',
};

export default async function LearnBrowsePage() {
  const all = await listLessons();
  const publicLessons = all.filter((l) => l.visibility === 'public');

  return <LearnBrowseClient lessons={publicLessons} />;
}
