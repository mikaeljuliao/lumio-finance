const test = require('node:test');
const assert = require('node:assert/strict');
const { detectIntent, detectIntentLocally, parseAmountFromText, parseExpenseFollowUp, normalizeCategoryChoice, CATEGORY_OPTIONS } = require('./ai.service');

test('routes a greeting to the unrecognized response without calling Gemini', async () => {
  assert.deepEqual(await detectIntent('Opa!'), { intencao: 'NAO_ENTENDIDA' });
});

test('classifies standalone greetings as unrecognized instead of expenses', () => {
  assert.deepEqual(detectIntentLocally('Opa!'), { intencao: 'NAO_ENTENDIDA' });
});

test('does not turn unrelated messages into expenses', () => {
  assert.deepEqual(detectIntentLocally('Como está o tempo hoje?'), { intencao: 'NAO_ENTENDIDA' });
});

test('keeps an incomplete expense as an expense with no amount', () => {
  assert.deepEqual(detectIntentLocally('Gastei no almoço'), {
    intencao: 'REGISTRAR_GASTO',
    valor: null
  });
});

test('keeps an incomplete limit request with no amount', () => {
  assert.deepEqual(detectIntentLocally('Quero definir limite de lazer'), {
    intencao: 'DEFINIR_LIMITE',
    valor: null,
    categoria: 'lazer'
  });
});

test('recognizes limit queries', () => {
  assert.deepEqual(detectIntentLocally('Quais são meus limites?'), {
    intencao: 'VER_LIMITES'
  });
});

test('parses Brazilian currency values in local fallback', () => {
  assert.equal(parseAmountFromText('limite de R$ 1.500,50 em lazer'), 1500.5);
  assert.equal(parseAmountFromText('gastei 1.500 no mercado'), 1500);
  assert.equal(parseAmountFromText('paguei R$ 45.90 no almoço'), 45.9);
  assert.equal(parseAmountFromText('opa'), null);
});

test('parses value and date from a single follow-up message', () => {
  const followUp = parseExpenseFollowUp('R$ 80, 05/10');
  const expectedYear = new Date().getFullYear();

  assert.deepEqual(followUp, {
    valor: 80,
    data: `${expectedYear}-10-05`
  });
});

test('uses today when a follow-up message includes value but no explicit date', () => {
  const followUp = parseExpenseFollowUp('R$ 45,90');
  const today = new Date();
  const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  assert.deepEqual(followUp, {
    valor: 45.9,
    data: expected
  });
});

test('normalizes user category selections to known categories', () => {
  assert.equal(normalizeCategoryChoice('mercado'), 'mercado');
  assert.equal(normalizeCategoryChoice('supermercado e feira'), 'mercado');
  assert.equal(normalizeCategoryChoice('saude'), 'saúde');
  assert.equal(normalizeCategoryChoice('coisa aleatoria'), 'outros');
});

test('exposes a category list for uncertain expense registration', () => {
  assert.ok(CATEGORY_OPTIONS.includes('mercado'));
  assert.ok(CATEGORY_OPTIONS.includes('alimentação'));
  assert.ok(CATEGORY_OPTIONS.includes('transporte'));
  assert.ok(CATEGORY_OPTIONS.includes('outros'));
});