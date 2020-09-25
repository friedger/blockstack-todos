import React, { useCallback, useEffect, useState } from 'react';
import { Text } from '@blockstack/ui';
import { TransactionsApi } from '@stacks/blockchain-api-client';

const transcationsApi = new TransactionsApi();

export const Transaction = ({ txId }) => {
  const [transactionDetails, setTransactionDetails] = useState();

  const fetchTransactionDetails = useCallback(async () => {
    if (txId) {
      const txDetails = await transcationsApi.getTransactionById({ txId });
      setTransactionDetails(txDetails);
    }
  }, [txId]);

  useEffect(() => {
    fetchTransactionDetails();
  }, [fetchTransactionDetails]);

  return transactionDetails ? (
    <Text fontWeight="500" display="block" mb={0} fontSize={2}>
      Registration status {transactionDetails.tx_status}
    </Text>
  ) : null;
};
