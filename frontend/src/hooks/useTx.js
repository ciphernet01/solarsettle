import { useState, useCallback } from 'react';

/**
 * Small wrapper around contract write transactions: pending state,
 * success/error messaging, and a toast that auto-dismisses.
 */
export default function useTx() {
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState(null);

  const run = useCallback(async (action, successMsg) => {
    setPending(true);
    setToast({ kind: 'pending', text: '⏳ Waiting for confirmation in MetaMask…' });
    try {
      const tx = await action();
      setToast({ kind: 'pending', text: '⏳ Transaction submitted — waiting for confirmation…' });
      await tx.wait();
      setToast({ kind: 'ok', text: successMsg });
      setTimeout(() => setToast(null), 6000);
      setPending(false);
      return true;
    } catch (e) {
      const reason = e?.info?.error?.message || e?.reason || e?.shortMessage || e?.message;
      setToast({
        kind: 'err',
        text: `❌ ${e?.code === 4001 ? 'Transaction rejected in MetaMask.' : reason || 'Transaction failed'}`,
      });
      setTimeout(() => setToast(null), 8000);
      setPending(false);
      return false;
    }
  }, []);

  return { pending, toast, run, setToast };
}
