const test = require('node:test');
const assert = require('node:assert/strict');
const { detectIntent, detectIntentLocally, parseAmountFromText } = require('./ai.service');

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