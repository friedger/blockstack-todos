import React, { useEffect, useState } from 'react';
import { Text } from '@blockstack/ui';
import { useConnect } from '@blockstack/connect';
import { bufferCVFromString } from '@blockstack/stacks-transactions';
import { connectWebSocketClient } from '@stacks/blockchain-api-client';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '../assets/constants';
import { Transaction } from './Transaction';

export const PublicUrlRegistrar = ({ userSession }) => {
  const { doContractCall } = useConnect();
  const { username } = userSession.loadUserData();
  const url = `${document.location.origin}/todos/${username}`;
  const [txId, setTxId] = useState();
  const [success, setSuccess] = useState();

  const register = async () =>
    // do the contract call
    doContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'register',
      functionArgs: [bufferCVFromString(username), bufferCVFromString(url)],
      finished: data => {
        console.log({ data });
        setTxId(data.txId);
      },
    });

  useEffect(() => {
    if (txId) {
      let sub;
      console.log(`subscribing for ${txId}`);
      const subscribe = async txId => {
        try {
          const client = await connectWebSocketClient('wss://stacks-node-api.blockstack.org');
          sub = await client.subscribeTxUpdates(txId, update => {
            console.log({ update });
            const wasSuccessful = update.tx_status === 'success';
            setSuccess(wasSuccessful);
            if (wasSuccessful) {
              sub.unsubscribe();
            }
          });
        } catch (e) {
          console.log(e);
        }
      };
      subscribe(txId);
    }
  }, [txId]);

  return (
    <>
      <Text
        color="blue"
        cursor="pointer"
        fontSize={1}
        fontWeight="500"
        onClick={() => {
          // register the public url
          register();
        }}
      >
        Register on-chain
      </Text>
      {success && <Transaction txId={txId} />}
    </>
  );
};
