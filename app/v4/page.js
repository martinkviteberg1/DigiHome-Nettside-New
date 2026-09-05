import { redirect } from 'next/navigation';

// /v4 var eksperimentruten for den nye forsiden. Den er nå roten.
export default function V4Page() {
  redirect('/');
}
