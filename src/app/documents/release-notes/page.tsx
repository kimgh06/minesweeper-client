import Document from '@/components/document';

export default function ContributeGuide() {
  const files = ['v0-1-1'];
  return (
    <>
      <Document files={files} endpoint="Contribute Guide" />
    </>
  );
}
