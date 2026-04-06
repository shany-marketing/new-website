import TasksClient from "./tasks-client";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function StaffTasksPage({ params }: Props) {
  const { token } = await params;
  return <TasksClient token={token} />;
}
