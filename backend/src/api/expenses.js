const express = require('express');
const { requireAuth } = require('./middlewares');
const {
  createExpense,
  findAllExpenses,
  findExpensesByMonth,
  updateExpense,
  deleteExpense,
  clearExpensesByMonth,
} = require('../services/expense.service');
const { getSocketIo } = require('../socket'); // We will define this to get IO instance

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const month = req.query.mes ? parseInt(req.query.mes) : null;
    const year = req.query.ano ? parseInt(req.query.ano) : null;
    let expenses;
    if (month && year) {
      expenses = await findExpensesByMonth(req.userId, month, year);
    } else {
      expenses = await findAllExpenses(req.userId);
    }
    res.json(expenses);
  } catch (err) {
    console.error('[API] Error finding expenses:', err);
    res.status(500).json({ error: 'Erro ao buscar gastos' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { valor, categoria, descricao, data } = req.body;
    if (!valor) {
      return res.status(400).json({ error: 'Valor é obrigatório' });
    }
    const expense = await createExpense(req.userId, { valor, categoria, descricao, data });

    const payload = {
      id: expense.id,
      valor: Number(expense.valor),
      categoria: expense.categoria,
      descricao: expense.descricao,
      data: expense.data ? String(expense.data).split('T')[0] : new Date().toISOString().split('T')[0],
      created_at: expense.criadoEm.toISOString(),
    };

    const io = getSocketIo();
    if (io) {
      io.to(`user:${req.userId}`).emit('novo_gasto', payload);
    }
    res.json(payload);
  } catch (err) {
    console.error('[API] Error creating expense:', err);
    res.status(500).json({ error: 'Erro ao criar gasto' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { valor, categoria, descricao, data } = req.body;
    await updateExpense(req.userId, id, { valor, categoria, descricao, data });
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Error updating expense:', err);
    res.status(500).json({ error: 'Erro ao atualizar gasto' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteExpense(req.userId, id);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Error deleting expense:', err);
    res.status(500).json({ error: 'Erro ao deletar gasto' });
  }
});

router.delete('/', requireAuth, async (req, res) => {
  try {
    const month = req.query.mes ? parseInt(req.query.mes) : null;
    const year = req.query.ano ? parseInt(req.query.ano) : null;
    if (month && year) {
      await clearExpensesByMonth(req.userId, month, year);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Error clearing expenses:', err);
    res.status(500).json({ error: 'Erro ao limpar gastos' });
  }
});

module.exports = router;
