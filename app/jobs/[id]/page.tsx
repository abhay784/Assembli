import { AssemblyWorkspace } from "@/components/assembly/AssemblyWorkspace";

type PageProps = { params: Promise<{ id: string }> };

export default async function JobAssemblyPage({ params }: PageProps) {
  const { id } = await params;
  return <AssemblyWorkspace jobId={id} />;
}
