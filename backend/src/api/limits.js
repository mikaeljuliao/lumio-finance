const express = require('express');
const { requireAuth } = require('./middlewares');
const {
  findAllLimits,
  setLimit,
  removeLimit,
} = require('../services/limit.service');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const limits = await findAllLimits(req.userId);
    res.json(limits);
  } catch (err) {
    console.error('[API] Error finding limits:', err);
    res.status(500).json({ error: 'Erro ao buscar limites' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { categoria, valor } = req.body;
    const limit = await setLimit(req.userId, categoria, valor);
    res.json(limit);
  } catch (err) {
    console.error('[API] Error setting limit:', err);
    res.status(500).json({ error: 'Erro ao definir limite' });
  }
});

router.delete('/:categoria', requireAuth, async (req, res) => {
  try {
    const { categoria } = req.params;
    await removeLimit(req.userId, categoria);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Error removing limit:', err);
    res.status(500).json({ error: 'Erro ao remover limite' });
  }
});

module.exports = router;
