'use client';

// ---------------------------------------------------------------------------
// DATOFELT MED KALENDER
//
// Bakgrunn: «Ledig fra» var et fritekstfelt. Plattformen skriver ISO
// («2026-10-01»), mens et menneske skriver «01.10.2026» — og new Date() tolker
// det siste som 10. JANUAR. En bolig ledig 1. oktober ble altså annonsert som
// ledig 10. januar. Feilen var usynlig fordi begge ser ut som gyldige datoer.
//
// Løsningen er å fjerne muligheten for å skrive feil: du velger dato, aldri
// skriver den. Verdien som lagres er alltid ISO.
//
// HURTIGVALG ØVERST er ikke pynt — i praksis er «Ledig nå» og «1. i neste
// måned» de tre svarene som dekker nesten alle boliger. Da er kalenderen noe
// du sjelden trenger å åpne.
// ---------------------------------------------------------------------------
import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, X, Check } from 'lucide-react';
import { nb } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toIsoDate, formatNoDate, AVAILABLE_NOW } from '@/lib/listings';

const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function firstOfMonth(offset) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

export default function DateField({ value, onChange, testId, placeholder = 'Velg dato' }) {
  const [open, setOpen] = useState(false);

  const iso = toIsoDate(value);
  const isText = !iso && !!String(value || '').trim();
  const label = iso ? formatNoDate(iso) : (isText ? String(value) : '');

  // Kalenderen jobber i lokal tid; ISO-verdien er dato uten tidssone. Vi lager
  // datoen med eksplisitte tall for å unngå at den hopper en dag.
  const selected = useMemo(() => {
    if (!iso) return undefined;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [iso]);

  const quick = [
    { label: AVAILABLE_NOW, value: AVAILABLE_NOW },
    { label: `1. ${firstOfMonth(1).toLocaleDateString('nb-NO', { month: 'long' })}`, value: isoOf(firstOfMonth(1)) },
    { label: `1. ${firstOfMonth(2).toLocaleDateString('nb-NO', { month: 'long' })}`, value: isoOf(firstOfMonth(2)) },
  ];

  const pick = (v) => { onChange(v); setOpen(false); };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" data-testid={testId}
            className={`inline-flex h-10 min-w-[190px] flex-1 items-center gap-2 rounded-lg bg-white px-3 text-left text-[13px] ring-1 ring-inset ring-black/[0.09] outline-none transition-shadow focus:ring-2 focus:ring-[#7c3aed] ${label ? 'text-[#1f1f1f]' : 'text-[#c4bfb8]'}`}>
            <CalendarIcon className="h-4 w-4 shrink-0 text-[#a8a29a]" />
            <span className="truncate">{label || placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
          <div className="flex flex-wrap gap-1.5 border-b border-black/[0.06] p-2.5">
            {quick.map((qv) => (
              <button key={qv.value} type="button" onClick={() => pick(qv.value)}
                data-testid={`${testId}-quick-${qv.value === AVAILABLE_NOW ? 'now' : qv.value}`}
                className={`inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold transition-colors ${
                  String(value) === qv.value ? 'bg-[#7c3aed] text-white' : 'bg-[#f5f5f4] text-[#3f3f3f] hover:bg-[#ebebe9]'
                }`}>
                {String(value) === qv.value && <Check className="mr-1 h-3 w-3" />}
                {qv.label}
              </button>
            ))}
          </div>
          <Calendar
            mode="single"
            locale={nb}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected || new Date()}
            captionLayout="dropdown"
            startMonth={new Date(new Date().getFullYear() - 1, 0)}
            endMonth={new Date(new Date().getFullYear() + 4, 11)}
            onSelect={(d) => { if (d) pick(isoOf(d)); }}
          />
        </PopoverContent>
      </Popover>
      {label && (
        <button type="button" onClick={() => onChange('')} data-testid={`${testId}-clear`}
          className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold text-[#8d867d] hover:bg-[#f5f5f4] hover:text-[#0a0a0a]">
          <X className="h-3 w-3" /> Tøm
        </button>
      )}
    </div>
  );
}
