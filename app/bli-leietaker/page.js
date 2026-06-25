import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import BliLeietakerPage from '@/components/dh/BliLeietakerPage';

export const metadata = {
  title: 'Bli leietaker — DigiHome',
  description: 'Registrer deg som leietaker hos DigiHome. Finn din neste leiebolig i Bergen med profesjonell oppfølging.',
  alternates: { canonical: '/bli-leietaker' },
};

export default function Page() {
  return (
    <>
      <Header />
      <BliLeietakerPage />
      <Footer />
    </>
  );
}
