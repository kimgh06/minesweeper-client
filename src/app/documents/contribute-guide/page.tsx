import Document from '@/components/document';

export default function ContributeGuide() {
  const files = ['overview', 'about_dashboard', 'about_interactions', 'how_to_render', 'kinds_of_websocket_events'];
  return (
    <>
      <Document files={files} endpoint="Contribute Guide" />
    </>
  );
}
