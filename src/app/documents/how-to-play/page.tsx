import Document from '@/components/document';

export default function ContributeGuide() {
  const files = ['rules_of_pung'];
  return (
    <>
      <Document files={files} endpoint="Contribute Guide" />
    </>
  );
}
