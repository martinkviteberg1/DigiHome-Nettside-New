import { redirect } from 'next/navigation';

// /v4/bedrift var eksperimentruten. Den er nå /bedrift.
export default function V4BedriftPage() {
  redirect('/bedrift');
}
