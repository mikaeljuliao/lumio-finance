import { TransactionModal } from "./TransactionModal";

export function EditTransactionModal({ expense, gasto, ...props }) {
  return <TransactionModal mode="edit" expense={expense || gasto} {...props} />;
}
