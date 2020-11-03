import React, { useCallback, useEffect, useState } from 'react';
import { Text } from '@blockstack/ui';
import { TransactionsApi } from '@stacks/blockchain-api-client';

const transcationsApi = new TransactionsApi();

export const TransactionStatus = ({ txId }) => {
  const [transactionStatus, setTransactionStatus] = useState();

  const fetchTransactionStatus = useCallback(async () => {
    if (txId) {
      const txStatus = await transcationsApi.getTransactionById({ txId });
      setTransactionStatus(txStatus);
    }
  }, [txId]);

  useEffect(() => {
    void fetchTransactionStatus();
  }, [fetchTransactionStatus]);

  return transactionStatus ? (
    <Text fontWeight="500" display="block" mb={0} fontSize={2}>
      Registration status {transactionStatus.tx_status}
    </Text>
  ) : null;
};
