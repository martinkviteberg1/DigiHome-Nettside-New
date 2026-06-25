import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import BliUtleierPage from '@/components/dh/BliUtleierPage';

export const metadata = {
  title: 'Bli utleier — DigiHome',
  description: 'Registrer eiendommen din hos DigiHome. Profesjonell eiendomsforvaltning med AI-drevet teknologi i Bergen.',
  alternates: { canonical: '/bli-utleier' },
};

export default function Page() {
  return (
    <>
      <Header />
      <BliUtleierPage />
      <Footer />
    </>
  );
}
