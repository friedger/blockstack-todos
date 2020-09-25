import React, { useEffect, useState } from 'react';
import { Text } from '@blockstack/ui';
import { useConnect } from '@blockstack/connect';
import { bufferCVFromString } from '@blockstack/stacks-transactions';
import { connectWebSocketClient } from '@stacks/blockchain-api-client';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '../assets/constants';
import { Transaction } from './Transaction';
import { RecentActivities } from './RecentActivities';

export const PublicUrlRegisterer = ({ userSession }) => {
  const { doContractCall } = useConnect();
  const { username } = userSession.loadUserData();
  const url = `${document.location.origin}/todos/${username}`;
  const [txId, setTxId] = useState();
  const [success, setSuccess] = useState();

  const register = () =>
    doContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'register',
      functionArgs: [bufferCVFromString(username), bufferCVFromString(url)],
      finished: data => {
        console.log(data);
        setTxId(data.txId);
      },
    });

  useEffect(() => {
    let sub;
    const subscribe = async txId => {
      try {
        const client = await connectWebSocketClient(
          'ws://stacks-node-api-latest.krypton.blockstack.xyz/'
        );
        sub = await client.subscribeTxUpdates(txId, update => {
          console.log(update);
          setSuccess(update.tx_status === 'success');
        });
      } catch (e) {
        console.log(e);
      }
    };
    subscribe(txId);
  }, [txId]);

  return (
    <>
      <Text fontWeight="500" display="block" mb={0} fontSize={2}>
        Use the public To-do List Registry
      </Text>
      <Text
        color="blue"
        cursor="pointer"
        fontSize={2}
        fontWeight="500"
        display="inline-block"
        onClick={() => {
          register();
        }}
      >
        Register on-chain
      </Text>
      <Text display="block" fontSize={0}>
        Anyone will be able to find your list
      </Text>
      {success && <Transaction txId={txId} />}
      <RecentActivities />
    </>
  );
};
