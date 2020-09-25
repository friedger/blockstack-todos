import React, { useCallback, useEffect, useState } from 'react';
import { Text } from '@blockstack/ui';
import {
  AccountsApi,
  ReadOnlyFunctionArgsFromJSON,
  SmartContractsApi,
} from '@stacks/blockchain-api-client';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '../assets/constants';
import {
  cvToString,
  deserializeCV,
  serializeCV,
  tupleCV,
  uintCV,
} from '@blockstack/stacks-transactions';

const accountsApi = new AccountsApi();
const smartContractsApi = new SmartContractsApi();

export const RecentActivities = () => {
  const [activities, setActivities] = useState();
  const [newestRegistration, setNewestRegistation] = useState();

  const contractCallsOnly = r => {
    console.log(r);
    return r.tx_status === 'success' && r.tx_type === 'contract_call';
  };

  const fetchActivities = useCallback(async () => {
    const response = await accountsApi.getAccountTransactions({
      principal: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
    });
    console.log(response);
    setActivities(response.results.filter(contractCallsOnly));
  }, []);

  const fetchNewestRegistration = useCallback(async () => {
    const getLastIdResponse = await smartContractsApi.callReadOnlyFunctionRaw({
      stacksAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-last-id',
      readOnlyFunctionArgs: ReadOnlyFunctionArgsFromJSON({
        sender: CONTRACT_ADDRESS,
        arguments: [],
      }),
    });
    console.log(getLastIdResponse);
    const lastId = deserializeCV(getLastIdResponse.value);

    const ownerOfResponse = await smartContractsApi.callReadOnlyFunctionRaw({
      stacksAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'owner-of',
      readOnlyFunctionArgs: ReadOnlyFunctionArgsFromJSON({
        sender: CONTRACT_ADDRESS,
        arguments: [`0x${serializeCV(lastId).toString('hex')}`],
      }),
    });

    const mapEntryResponse = await smartContractsApi.getContractDataMapEntry({
      stacksAddress: CONTRACT_NAME,
      contractName: CONTRACT_NAME,
      mapName: 'registry',
      key: serializeCV(tupleCV({ 'registration-id': uintCV(lastId) })).toString('hex'),
    });
    console.log(mapEntryResponse);
  }, []);

  useEffect(() => {
    fetchActivities();
    fetchNewestRegistration();
  }, [fetchActivities, fetchNewestRegistration]);

  return activities && activities.length > 0 ? (
    <>
      <Text fontWeight="500" display="block" mb={0} fontSize={2}>
        Recent Activities
      </Text>
      {activities.map(activity => (
        <Text fontSize={0} key={activity.tx_id}>
          Registration{' '}
          {cvToString(deserializeCV(Buffer.from(activity.result.substr(2), 'hex')).value)} was{' '}
          {activity.contract_call.tx_result}ed.
        </Text>
      ))}
      {newestRegistration && (
        <>
          <Text fontWeight="500" display="block" mb={0} fontSize={2}>
            <a href={newestRegistration.url}>Newest Registration</a> by user{' '}
            {newestRegistration.name} using address {newestRegistration.owner} - Registration Id:{' '}
            {newestRegistration.lastId}
          </Text>
        </>
      )}
    </>
  ) : null;
};
