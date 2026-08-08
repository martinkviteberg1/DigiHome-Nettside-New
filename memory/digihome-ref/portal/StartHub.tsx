/**
 * StartHub — Action-hub etter signup (B2C).
 *
 * Ultra-minimalistisk 2026 editorial.
 *
 * Rute: /portal/start
 */
import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, FileSignature, ClipboardCheck, Briefcase, Wallet, Eye, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const FONT = "'Plus Jakarta Sans', sans-serif";
const FONT_HEADING = "var(--font-heading)";
const SPRING = { type: 'spring' as const, stiffness: 160, damping: 22, mass: 0.6 };

const INTENT_TO_ACTION: Record<string, string> = {
  'rent-out-one': 'create-ad',
  'multi-property': 'create-ad',
  'has-tenants': 'register-lease',
  'just-browsing': 'browse',
};

type Action = {
  id: string;
  icon: React.ComponentType<any>;
  title: string;
  desc: string;
  to: string;
};

const ACTIONS: Action[] = [
  { id: 'create-ad', icon: Home, title: 'Lag annonse', desc: 'Få inn leietakere med en profesjonell annonse på FINN og DigiHome.', to: '/langtid/lag-annonse' },
  { id: 'create-lease', icon: FileSignature, title: 'Lag leiekontrakt', desc: 'Du har leietaker — lag og signer kontrakt med BankID.', to: '/portal/kontrakter/ny' },
  { id: 'register-lease', icon: ClipboardCheck, title: 'Registrer eksisterende leieforhold', desc: 'Leietakeren bor allerede — legg inn detaljene for å starte med DigiHome.', to: '/portal/leieforhold/registrer-eksisterende' },
  { id: 'invite-manager', icon: Briefcase, title: 'Inviter forvalter', desc: 'La en profesjonell forvalter administrere boligen for deg.', to: '/portal/innboarding/forvalter' },
  { id: 'deposit', icon: Wallet, title: 'Aktiver depositum', desc: 'Opprett depositumskonto hos DNB med BankID på ett minutt.', to: '/portal/depositum' },
  { id: 'browse', icon: Eye, title: 'Bare se rundt', desc: 'Utforsk portalen først. Du kan starte når du er klar.', to: '/portal' },
];

export default function StartHub() {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intent = searchParams.get('intent') || '';
  const recommendedId = INTENT_TO_ACTION[intent] || '';
  const firstName = (user?.name || '').split(' ')[0] || 'der';

  return (
    <div style={{ fontFamily: FONT }} data-testid="start-hub">
      <div className="max-w-[1080px] mx-auto px-5 sm:px-8 py-20 lg:py-28">

        {/* ═══ EDITORIAL HEADER — strippet, ingen eyebrow ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="mb-16 lg:mb-20"
        >
          <h1
            className="font-extralight text-[#0a0a0a] tracking-[-0.04em] leading-[0.96] mb-6"
            style={{
              fontFamily: FONT_HEADING,
              fontSize: 'clamp(40px, 7vw, 76px)',
              maxWidth: '15ch',
            }}
          >
            Hva vil du gjøre nå, <span className="font-extrabold">{firstName}?</span>
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[#7d7468] max-w-[540px] leading-[1.55] font-medium">
            Velg det som passer best. Du kan alltid endre kurs senere.
          </p>
        </motion.div>

        {/* ═══ ACTION CARDS ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {ACTIONS.map((a, i) => {
            const Icon = a.icon;
            const isRecommended = a.id === recommendedId;
            return (
              <motion.button
                key={a.id}
                type="button"
                onClick={() => navigate(a.to)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.12 + i * 0.04 }}
                whileHover={{ y: -2 }}
                className={`group relative text-left p-7 lg:p-8 rounded-[24px] bg-white border transition-all duration-300 ${
                  isRecommended
                    ? 'border-[#0a0a0a] hover:shadow-[0_24px_50px_-20px_rgba(20,20,30,0.16)]'
                    : 'border-[#ece6da] hover:border-[#0a0a0a] hover:shadow-[0_20px_44px_-18px_rgba(20,20,30,0.12)]'
                }`}
                data-testid={`start-hub-action-${a.id}`}
              >
                {isRecommended && (
                  <div className="absolute -top-2.5 left-7 px-2.5 py-0.5 rounded-full bg-[#0a0a0a] text-white text-[9.5px] font-bold uppercase tracking-[0.10em]">
                    Anbefalt
                  </div>
                )}

                <div className="flex items-start justify-between gap-3 mb-7">
                  <div className="w-10 h-10 rounded-xl bg-[#f5f1e9] flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] text-[#0a0a0a]" strokeWidth={1.6} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#cfc6b6] group-hover:text-[#0a0a0a] group-hover:translate-x-0.5 transition-all" strokeWidth={2} />
                </div>

                <p
                  className="text-[20px] sm:text-[22px] font-extrabold text-[#0a0a0a] tracking-[-0.018em] leading-[1.1]"
                  style={{ fontFamily: FONT_HEADING }}
                >
                  {a.title}
                </p>
                <p className="mt-3 text-[13.5px] text-[#7c7466] leading-[1.55] max-w-[340px]">
                  {a.desc}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Skip footer */}
        <div className="mt-16">
          <Link
            to="/portal"
            className="text-[12.5px] text-[#9b9080] hover:text-[#0a0a0a] font-semibold tracking-[-0.005em] transition-colors inline-flex items-center gap-1.5 group"
            data-testid="start-hub-skip"
          >
            Ikke nå — ta meg til portalen
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
