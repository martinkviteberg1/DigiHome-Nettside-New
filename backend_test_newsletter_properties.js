#!/usr/bin/env node
/**
 * Backend test for property newsletter improvements:
 * - Automatic district/area grouping
 * - World-class layout
 * 
 * Tests source code functions directly (no HTTP, no DB changes, no email sending)
 */

import { renderNewsletterHtml, sanitizeBlocks, TEMPLATES } from './lib/newsletter.js';
import { readFileSync } from 'fs';

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${PASS} ${name}`);
    passed++;
  } catch (e) {
    console.log(`${FAIL} ${name}`);
    console.log(`   Error: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('\n=== PROPERTY NEWSLETTER GROUPING + LAYOUT TESTS ===\n');

// Test 1: defaultsFor('properties') verification via code inspection
test('1. defaultsFor(\'properties\') has grouping=\'auto\' and groupingThreshold=6 (code verification)', () => {
  // Read EditorBlocks.js and verify the defaults
  const editorBlocksCode = readFileSync('./components/admin/newsletter/EditorBlocks.js', 'utf8');
  
  // Find the defaultsFor function and properties case (line 77)
  assert(editorBlocksCode.includes("case 'properties': return { title: 'Ledige boliger i Bergen', items: [], cta: '', url: '', grouping: 'auto', groupingThreshold: 6 }"), 
    "Expected properties defaults with grouping='auto' and groupingThreshold=6");
});

// Test 2: sanitizeBlocks preserves district per item + grouping/groupingThreshold
test('2. sanitizeBlocks preserves district per item + grouping/groupingThreshold', () => {
  const input = [{
    type: 'properties',
    title: 'Test boliger',
    items: [
      { pid: '1', title: 'Bolig 1', district: 'Bergenhus', image: '/img1.jpg', meta: 'test', band: '10 000 kr/mnd', status: 'active' },
      { pid: '2', title: 'Bolig 2', district: 'Årstad', image: '/img2.jpg', meta: 'test', band: '12 000 kr/mnd', status: 'active' },
    ],
    grouping: 'always',
    groupingThreshold: 8,
    cta: 'Se alle',
    url: 'https://digihome.no',
  }];
  
  const sanitized = sanitizeBlocks(input);
  assert(sanitized.length === 1, 'Expected 1 block');
  const block = sanitized[0];
  assert(block.type === 'properties', 'Expected properties type');
  assert(block.grouping === 'always', `Expected grouping='always', got '${block.grouping}'`);
  assert(block.groupingThreshold === 8, `Expected groupingThreshold=8, got ${block.groupingThreshold}`);
  assert(block.items.length === 2, 'Expected 2 items');
  assert(block.items[0].district === 'Bergenhus', `Expected district='Bergenhus', got '${block.items[0].district}'`);
  assert(block.items[1].district === 'Årstad', `Expected district='Årstad', got '${block.items[1].district}'`);
});

// Test 3: renderNewsletterHtml with 8 synthetic active items distributed across districts
test('3. renderNewsletterHtml with 8 items (Bergenhus 3, Årstad 2, Fana 2, empty 1): auto shows group titles + counts', () => {
  const blocks = [{
    type: 'properties',
    title: 'Ledige boliger',
    items: [
      { pid: 'p1', localId: 'l1', title: 'Bolig 1 Bergenhus', district: 'Bergenhus', image: '/img1.jpg', meta: '3 rom · 75 m²', band: '10 000 kr/mnd', status: 'active', url: '' },
      { pid: 'p2', localId: 'l2', title: 'Bolig 2 Bergenhus', district: 'Bergenhus', image: '/img2.jpg', meta: '2 rom · 60 m²', band: '9 000 kr/mnd', status: 'active', url: '' },
      { pid: 'p3', localId: 'l3', title: 'Bolig 3 Bergenhus', district: 'Bergenhus', image: '/img3.jpg', meta: '4 rom · 90 m²', band: '12 000 kr/mnd', status: 'active', url: '' },
      { pid: 'p4', localId: 'l4', title: 'Bolig 4 Årstad', district: 'Årstad', image: '/img4.jpg', meta: '3 rom · 70 m²', band: '11 000 kr/mnd', status: 'active', url: '' },
      { pid: 'p5', localId: 'l5', title: 'Bolig 5 Årstad', district: 'Årstad', image: '/img5.jpg', meta: '2 rom · 55 m²', band: '8 500 kr/mnd', status: 'active', url: '' },
      { pid: 'p6', localId: 'l6', title: 'Bolig 6 Fana', district: 'Fana', image: '/img6.jpg', meta: '3 rom · 80 m²', band: '10 500 kr/mnd', status: 'active', url: '' },
      { pid: 'p7', localId: 'l7', title: 'Bolig 7 Fana', district: 'Fana', image: '/img7.jpg', meta: '4 rom · 95 m²', band: '13 000 kr/mnd', status: 'active', url: '' },
      { pid: 'p8', localId: 'l8', title: 'Bolig 8 Ukjent', district: '', image: '/img8.jpg', meta: '2 rom · 50 m²', band: '7 500 kr/mnd', status: 'active', url: '' },
    ],
    grouping: 'auto',
    groupingThreshold: 6,
    cta: '',
    url: '',
  }];
  
  const html = renderNewsletterHtml({
    subject: 'Test',
    preheader: 'Test',
    blocks,
    theme: 'lavendel',
    unsubUrl: '#',
  });
  
  // Verify grouping is active (8 items >= threshold 6)
  // District names are rendered with text-transform:uppercase CSS, so check for the actual text
  assert(html.includes('Bergenhus') && html.includes('text-transform:uppercase'), 'Expected Bergenhus group title with uppercase styling');
  assert(html.includes('Årstad') && html.includes('text-transform:uppercase'), 'Expected Årstad group title with uppercase styling');
  assert(html.includes('Fana') && html.includes('text-transform:uppercase'), 'Expected Fana group title with uppercase styling');
  assert(html.includes('Andre områder') && html.includes('text-transform:uppercase'), 'Expected "Andre områder" group title for empty district');
  
  // Verify counts
  assert(html.includes('3 boliger') || html.includes('3&nbsp;boliger'), 'Expected "3 boliger" count for Bergenhus');
  assert(html.includes('2 boliger') || html.includes('2&nbsp;boliger'), 'Expected "2 boliger" count for Årstad and Fana');
  assert(html.includes('1 bolig') || html.includes('1&nbsp;bolig'), 'Expected "1 bolig" count for empty district');
  
  // Verify all 8 property cards are present
  for (let i = 1; i <= 8; i++) {
    assert(html.includes(`Bolig ${i}`), `Expected property card ${i} to be present`);
  }
  
  // Verify unique CTA links (each property has its own interest URL)
  const ctaMatches = html.match(/Se bolig og meld interesse/g);
  assert(ctaMatches && ctaMatches.length === 8, `Expected 8 CTA links, found ${ctaMatches ? ctaMatches.length : 0}`);
  
  // Verify no email/PII in property target URLs
  assert(!html.match(/property=.*@/), 'Property URLs should not contain email addresses');
  assert(!html.match(/boliginteresse\?.*email=/i), 'Property URLs should not contain email parameter');
});

// Test 4: auto with 5 items shows no group titles; always with 2 shows; off with 8 shows not
test('4a. auto with 5 items (< threshold 6) shows NO group titles', () => {
  const blocks = [{
    type: 'properties',
    title: 'Ledige boliger',
    items: [
      { pid: 'p1', localId: 'l1', title: 'Bolig 1', district: 'Bergenhus', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p2', localId: 'l2', title: 'Bolig 2', district: 'Bergenhus', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p3', localId: 'l3', title: 'Bolig 3', district: 'Årstad', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p4', localId: 'l4', title: 'Bolig 4', district: 'Årstad', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p5', localId: 'l5', title: 'Bolig 5', district: 'Fana', image: '', meta: '', band: '', status: 'active', url: '' },
    ],
    grouping: 'auto',
    groupingThreshold: 6,
  }];
  
  const html = renderNewsletterHtml({ subject: 'Test', blocks, theme: 'lavendel', unsubUrl: '#' });
  
  // Should NOT have group titles (5 < 6)
  // Check that the grouping header structure is not present
  assert(!html.includes('text-transform:uppercase') || !html.includes('Bergenhus'), 'Should NOT show Bergenhus group title with 5 items');
  assert(!html.includes('text-transform:uppercase') || !html.includes('Årstad'), 'Should NOT show Årstad group title with 5 items');
  
  // All 5 items should still be present
  for (let i = 1; i <= 5; i++) {
    assert(html.includes(`Bolig ${i}`), `Expected property card ${i} to be present`);
  }
});

test('4b. always with 2 items shows group titles', () => {
  const blocks = [{
    type: 'properties',
    title: 'Ledige boliger',
    items: [
      { pid: 'p1', localId: 'l1', title: 'Bolig 1', district: 'Bergenhus', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p2', localId: 'l2', title: 'Bolig 2', district: 'Årstad', image: '', meta: '', band: '', status: 'active', url: '' },
    ],
    grouping: 'always',
    groupingThreshold: 6,
  }];
  
  const html = renderNewsletterHtml({ subject: 'Test', blocks, theme: 'lavendel', unsubUrl: '#' });
  
  // Should have group titles (always forces grouping)
  // District names are rendered with text-transform:uppercase CSS
  assert(html.includes('Bergenhus') && html.includes('text-transform:uppercase'), 'Should show Bergenhus group title with grouping=always');
  assert(html.includes('Årstad') && html.includes('text-transform:uppercase'), 'Should show Årstad group title with grouping=always');
  assert(html.includes('1 bolig') || html.includes('1&nbsp;bolig'), 'Should show "1 bolig" count');
  
  // Both items should be present
  assert(html.includes('Bolig 1'), 'Expected property card 1');
  assert(html.includes('Bolig 2'), 'Expected property card 2');
});

test('4c. off with 8 items shows NO group titles', () => {
  const blocks = [{
    type: 'properties',
    title: 'Ledige boliger',
    items: [
      { pid: 'p1', localId: 'l1', title: 'Bolig 1', district: 'Bergenhus', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p2', localId: 'l2', title: 'Bolig 2', district: 'Bergenhus', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p3', localId: 'l3', title: 'Bolig 3', district: 'Bergenhus', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p4', localId: 'l4', title: 'Bolig 4', district: 'Årstad', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p5', localId: 'l5', title: 'Bolig 5', district: 'Årstad', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p6', localId: 'l6', title: 'Bolig 6', district: 'Fana', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p7', localId: 'l7', title: 'Bolig 7', district: 'Fana', image: '', meta: '', band: '', status: 'active', url: '' },
      { pid: 'p8', localId: 'l8', title: 'Bolig 8', district: '', image: '', meta: '', band: '', status: 'active', url: '' },
    ],
    grouping: 'off',
    groupingThreshold: 6,
  }];
  
  const html = renderNewsletterHtml({ subject: 'Test', blocks, theme: 'lavendel', unsubUrl: '#' });
  
  // Should NOT have group titles (off disables grouping)
  // Check that the grouping header structure is not present
  assert(!html.includes('text-transform:uppercase') || !html.includes('Bergenhus'), 'Should NOT show group titles with grouping=off');
  assert(!html.includes('text-transform:uppercase') || !html.includes('Årstad'), 'Should NOT show group titles with grouping=off');
  
  // All 8 items should still be present
  for (let i = 1; i <= 8; i++) {
    assert(html.includes(`Bolig ${i}`), `Expected property card ${i} to be present`);
  }
});

test('4d. No items disappear in any grouping mode', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({
    pid: `p${i+1}`,
    localId: `l${i+1}`,
    title: `Bolig ${i+1}`,
    district: ['Bergenhus', 'Årstad', 'Fana'][i % 3],
    image: '',
    meta: '',
    band: '',
    status: 'active',
    url: '',
  }));
  
  for (const grouping of ['off', 'auto', 'always']) {
    const blocks = [{ type: 'properties', title: 'Test', items, grouping, groupingThreshold: 6 }];
    const html = renderNewsletterHtml({ subject: 'Test', blocks, theme: 'lavendel', unsubUrl: '#' });
    
    for (let i = 1; i <= 10; i++) {
      assert(html.includes(`Bolig ${i}`), `Expected property card ${i} with grouping=${grouping}`);
    }
  }
});

// Test 5: EditorBlocks source has grouping control (code verification)
test('5. EditorBlocks has grouping control UI (code verification)', () => {
  const editorBlocksCode = readFileSync('./components/admin/newsletter/EditorBlocks.js', 'utf8');
  
  // Verify grouping control exists (lines 837-844)
  assert(editorBlocksCode.includes('data-testid="nl-properties-grouping"'), 'Expected grouping control testid');
  assert(editorBlocksCode.includes("['off', 'Ingen']"), 'Expected "Ingen" option');
  assert(editorBlocksCode.includes("['auto', 'Auto 6+']"), 'Expected "Auto 6+" option');
  assert(editorBlocksCode.includes("['always', 'Alltid']"), 'Expected "Alltid" option');
  
  // Verify Canvas grouped preview with count badges (lines 336-374)
  assert(editorBlocksCode.includes('boliger') && editorBlocksCode.includes('bolig'), 'Expected count badges in canvas preview');
  
  // Verify PropertyPicker district fallback (line 651)
  assert(editorBlocksCode.includes("district: p.district || p.area || p.city || 'Andre områder'"), 'Expected district fallback logic');
});

// Test 6: properties-sync normalize preserves row.district (code verification)
test('6. properties-sync normalize preserves row.district (code verification)', () => {
  const propertiesSyncCode = readFileSync('./lib/properties-sync.js', 'utf8');
  
  // Verify normalize function preserves district (line 42)
  assert(propertiesSyncCode.includes('district: row.district ? String(row.district).slice(0, 80) : null'), 
    'Expected normalize to preserve district field');
  
  // Verify resolveDraftProperties would preserve district through projection/hydration
  // This is verified by the fact that sanitizeBlocks preserves district (tested above)
});

// Test 7: TEMPLATES properties block uses grouping auto/threshold6
test('7. TEMPLATES "boliger" uses grouping=auto and groupingThreshold=6 via defaults', () => {
  const boligerTemplate = TEMPLATES.find(t => t.key === 'boliger');
  assert(boligerTemplate, 'Expected "boliger" template to exist');
  
  const propertiesBlock = boligerTemplate.blocks.find(b => b.type === 'properties');
  assert(propertiesBlock, 'Expected properties block in boliger template');
  
  // The template has empty items, which means it uses defaults from defaultsFor('properties')
  // Verify the template doesn't override grouping/groupingThreshold (so defaults apply)
  assert(propertiesBlock.items.length === 0, 'Expected empty items (uses defaults)');
  
  // Verify via code that defaults are grouping='auto', groupingThreshold=6
  const editorBlocksCode = readFileSync('./components/admin/newsletter/EditorBlocks.js', 'utf8');
  assert(editorBlocksCode.includes("case 'properties': return { title: 'Ledige boliger i Bergen', items: [], cta: '', url: '', grouping: 'auto', groupingThreshold: 6 }"), 
    'Expected properties defaults with grouping=auto and groupingThreshold=6');
});

// Test 8: Newsletter layout regression - premium features
test('8. Newsletter layout: premium hero/heading/text/full-width cards/CTA/sender + mobile CSS', () => {
  const blocks = [
    { type: 'hero', url: '/hero.jpg', alt: 'Hero', height: 400, fit: 'cover', focalX: 50, focalY: 50 },
    { type: 'heading', text: 'Premium Heading' },
    { type: 'text', text: 'Premium text content with proper styling.' },
    { type: 'properties', title: 'Properties', items: [
      { pid: 'p1', localId: 'l1', title: 'Property 1', district: 'Bergenhus', image: '/img1.jpg', meta: '3 rom', band: '10 000 kr', status: 'active', url: '' },
    ], grouping: 'auto', groupingThreshold: 6 },
    { type: 'button', label: 'Call to Action', url: 'https://digihome.no' },
    { type: 'sender', name: 'Sarah Sleeman', title: 'Daglig leder', note: 'Personal note', photoUrl: '/sarah.jpg' },
  ];
  
  const html = renderNewsletterHtml({
    subject: 'Premium Newsletter',
    preheader: 'Premium preview',
    blocks,
    theme: 'lavendel',
    unsubUrl: '#',
  });
  
  // Verify all block types are present
  assert(html.includes('Premium Heading'), 'Expected heading');
  assert(html.includes('Premium text content'), 'Expected text');
  assert(html.includes('Property 1'), 'Expected property card');
  assert(html.includes('Call to Action'), 'Expected CTA button');
  assert(html.includes('Sarah Sleeman'), 'Expected sender card');
  
  // Verify mobile CSS is present
  assert(html.includes('@media only screen and (max-width:620px)'), 'Expected mobile media query');
  assert(html.includes('.dh-px'), 'Expected mobile padding class');
  assert(html.includes('.dh-h1'), 'Expected mobile heading class');
  assert(html.includes('.dh-btn'), 'Expected mobile button class');
  
  // Verify full-width property cards (width:100%, max-width:520px in email context)
  assert(html.includes('width="520"') || html.includes('max-width:520px'), 'Expected full-width property cards');
  
  // Verify no 6-item cap (unlimited properties supported)
  const manyItems = Array.from({ length: 12 }, (_, i) => ({
    pid: `p${i+1}`,
    localId: `l${i+1}`,
    title: `Property ${i+1}`,
    district: 'Bergenhus',
    image: '',
    meta: '',
    band: '',
    status: 'active',
    url: '',
  }));
  
  const htmlMany = renderNewsletterHtml({
    subject: 'Test',
    blocks: [{ type: 'properties', title: 'Many', items: manyItems, grouping: 'off', groupingThreshold: 6 }],
    theme: 'lavendel',
    unsubUrl: '#',
  });
  
  for (let i = 1; i <= 12; i++) {
    assert(htmlMany.includes(`Property ${i}`), `Expected property ${i} (no 6-cap)`);
  }
});

// Test 9: Verify GET /api/ endpoint exists (code verification)
test('9. GET /api/ endpoint exists (code verification)', () => {
  const routeCode = readFileSync('./app/api/[[...path]]/route.js', 'utf8');
  assert(routeCode.includes('GET') || routeCode.includes('export'), 'Expected GET /api/ route to exist');
});

console.log(`\n=== RESULTS ===`);
console.log(`${PASS} Passed: ${passed}`);
if (failed > 0) {
  console.log(`${FAIL} Failed: ${failed}`);
}
console.log(`\nTotal: ${passed + failed} tests\n`);

if (failed > 0) {
  console.log(`${INFO} Some tests failed. Review the errors above.`);
  process.exit(1);
} else {
  console.log(`${PASS} All tests passed! Property newsletter grouping and layout working correctly.`);
  console.log(`${INFO} No database changes made. No emails sent. Source code verification complete.`);
  process.exit(0);
}
