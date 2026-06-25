'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/* ── Shared form field with label, icon, error, required indicator ── */
export function FormField({ label, required, error, icon: Icon, children, className = '' }: any) {
  return (
    <div className={className}>
      <Label className="text-[13px] font-semibold text-[#333] flex items-center gap-1">
        {label}
        {required && <span className="text-[#cf97fc]">*</span>}
      </Label>
      <div className="relative mt-2">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ccc] pointer-events-none" />}
        {children}
      </div>
      {error && <p className="text-[12px] text-red-500 mt-1.5 flex items-center gap-1">{error}</p>}
    </div>
  );
}

/* ── Phone input with +47 country code prefix ── */
export function PhoneInput({ value, onChange, error, testId }: any) {
  return (
    <FormField label="Telefon" required error={error}>
      <div className={`flex items-center h-[52px] rounded-2xl border bg-white overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-[#cf97fc] ${error ? 'border-red-400 ring-2 ring-red-400' : 'border-[#e0e0e0]'}`}>
        <div className="flex items-center gap-1.5 pl-4 pr-3 h-full border-r border-[#e8e8e8] bg-[#fafafa] shrink-0 select-none">
          <span className="text-[14px]">🇳🇴</span>
          <span className="text-[14px] text-[#555] font-medium">+47</span>
        </div>
        <input
          type="tel"
          value={value}
          onChange={(e: any) => {
            const digits = e.target.value.replace(/[^\d\s]/g, '').slice(0, 11);
            onChange(digits);
          }}
          placeholder="XXX XX XXX"
          className="flex-1 h-full px-3 text-[15px] bg-transparent outline-none placeholder:text-[#737373]"
          data-testid={testId}
          autoComplete="tel-national"
        />
      </div>
    </FormField>
  );
}

/* ── Date picker input ── */
export function DatePickerInput({ label, value, onChange, placeholder, testId, required }: any) {
  return (
    <FormField label={label || 'Dato'} required={required}>
      <input
        type="date"
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        className="w-full h-[52px] px-4 text-[15px] rounded-2xl border border-[#e0e0e0] bg-white outline-none focus:ring-2 focus:ring-[#cf97fc] focus:border-transparent transition-all duration-200 text-[#333] placeholder:text-[#737373]"
        data-testid={testId}
        min={new Date().toISOString().split('T')[0]}
      />
      {!value && (
        <p className="text-[11px] text-[#737373] mt-1.5">{placeholder || 'Velg en dato'}</p>
      )}
    </FormField>
  );
}

/* ── Text input with icon ── */
export function TextInput({ label, required, error, icon: Icon, value, onChange, placeholder, type = 'text', testId, autoFocus, autoComplete, maxLength, inputMode }: any) {
  return (
    <FormField label={label} required={required} error={error} icon={Icon}>
      <Input
        type={type}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`h-[52px] ${Icon ? 'pl-11' : 'pl-4'} rounded-2xl border-[#e0e0e0] text-[15px] focus-visible:ring-[#cf97fc] bg-white ${error ? 'ring-2 ring-red-400' : ''}`}
        data-testid={testId}
      />
    </FormField>
  );
}

/* ── Budget range input ── */
export function BudgetInput({ minValue, maxValue, onMinChange, onMaxChange, minTestId, maxTestId }: any) {
  const formatBudget = (val: any) => {
    const num = val.replace(/\D/g, '');
    if (!num) return '';
    return parseInt(num).toLocaleString('nb-NO');
  };
  const parseBudget = (val: any) => val.replace(/\D/g, '');
  return (
    <div>
      <Label className="text-[13px] font-semibold text-[#333] mb-2 block">Budsjett per måned</Label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-[#737373] font-medium pointer-events-none">kr</span>
            <Input type="text" inputMode="numeric" value={formatBudget(minValue)} onChange={(e: any) => onMinChange(parseBudget(e.target.value))} placeholder="8 000" className="h-[52px] pl-10 rounded-2xl border-[#e0e0e0] text-[15px] focus-visible:ring-[#cf97fc] bg-white" data-testid={minTestId} />
          </div>
          <p className="text-[11px] text-[#737373] mt-1 ml-1">Minimum</p>
        </div>
        <div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-[#737373] font-medium pointer-events-none">kr</span>
            <Input type="text" inputMode="numeric" value={formatBudget(maxValue)} onChange={(e: any) => onMaxChange(parseBudget(e.target.value))} placeholder="18 000" className="h-[52px] pl-10 rounded-2xl border-[#e0e0e0] text-[15px] focus-visible:ring-[#cf97fc] bg-white" data-testid={maxTestId} />
          </div>
          <p className="text-[11px] text-[#737373] mt-1 ml-1">Maksimum</p>
        </div>
      </div>
    </div>
  );
}

/* ── Selectable pill buttons ── */
export function PillSelector({ options, selected, onToggle, multi = false, testIdPrefix }: any) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt: any) => {
        const isSelected = multi ? (selected || []).includes(opt) : selected === opt;
        return (
          <button key={opt} type="button" onClick={() => onToggle(opt)}
            data-testid={`${testIdPrefix}-${opt.toLowerCase().replace(/[åæø\s]/g, '-')}`}
            className={`px-4 py-2.5 rounded-full text-[13px] font-medium border transition-all duration-200 ${isSelected ? 'border-[#cf97fc] bg-[#faf5ff] text-[#8b5fc0]' : 'border-[#e5e5e5] bg-white text-[#666] hover:border-[#ccc] hover:bg-[#fafafa]'}`}>
            {isSelected && <CheckMark />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function CheckMark() {
  return (
    <svg className="w-3 h-3 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/* ── Number selector buttons ── */
export function NumberSelector({ options, selected, onChange, testIdPrefix }: any) {
  return (
    <div className="flex gap-2">
      {options.map((n: any) => {
        const isSelected = selected === n;
        return (
          <button key={n} type="button" onClick={() => onChange(n)} data-testid={`${testIdPrefix}-${n}`}
            className={`w-14 h-14 rounded-2xl text-[15px] font-semibold border-2 transition-all duration-200 ${isSelected ? 'border-[#cf97fc] bg-[#faf5ff] text-[#8b5fc0]' : 'border-[#eee] bg-white text-[#888] hover:border-[#ddd]'}`}>{n}</button>
        );
      })}
    </div>
  );
}

/* ── Icon card selector (property types etc.) ── */
export function IconCardSelector({ options, selected, onChange, testIdPrefix }: any) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
      {options.map((type: any) => {
        const Icon = type.icon;
        const isSelected = selected === type.value;
        return (
          <button key={type.value} type="button" onClick={() => onChange(isSelected ? '' : type.value)} data-testid={`${testIdPrefix}-${type.value}`}
            className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all duration-200 ${isSelected ? 'border-[#cf97fc] bg-[#faf5ff] shadow-[0_0_0_1px_rgba(207,151,252,0.3)]' : 'border-[#eee] bg-white hover:border-[#ddd] hover:bg-[#fafafa]'}`}>
            <Icon className={`w-5 h-5 ${isSelected ? 'text-[#cf97fc]' : 'text-[#737373]'}`} strokeWidth={1.8} />
            <span className={`text-[12px] font-medium ${isSelected ? 'text-[#8b5fc0]' : 'text-[#888]'}`}>{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Toggle chips ── */
export function ToggleChips({ options, values, onChange }: any) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((toggle: any) => (
        <button key={toggle.key} type="button" onClick={() => onChange(toggle.key, !values[toggle.key])} data-testid={`toggle-${toggle.key}`}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 text-[13px] font-medium transition-all duration-200 ${values[toggle.key] ? 'border-[#cf97fc] bg-[#faf5ff] text-[#8b5fc0]' : 'border-[#eee] bg-white text-[#888] hover:border-[#ddd]'}`}>
          <span>{toggle.emoji}</span> {toggle.label}
        </button>
      ))}
    </div>
  );
}

/* ── Summary card ── */
export function SummaryCard({ title, onEdit, testId, children }: any) {
  return (
    <div className="bg-white rounded-2xl border border-[#eee] p-5 hover:border-[#ddd] transition-colors duration-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-semibold text-[#aaa] uppercase tracking-[0.06em]">{title}</h3>
        <button onClick={onEdit} className="text-[12px] text-[#cf97fc] font-semibold hover:underline" data-testid={testId}>Endre</button>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
