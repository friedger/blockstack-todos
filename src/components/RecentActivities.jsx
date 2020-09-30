import React, { useCallback, useEffect, useState } from 'react';
import { Box, Flex, Text } from '@blockstack/ui';
import {
  AccountsApi,
  ReadOnlyFunctionArgsFromJSON,
  SmartContractsApi,
} from '@stacks/blockchain-api-client';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '../assets/constants';
import {
  ClarityType,
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
    return r.tx_status === 'success' && r.tx_type === 'contract_call';
  };

  const fetchActivities = useCallback(async () => {
    const response = await accountsApi.getAccountTransactions({
      principal: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
    });
    setActivities(response.results.filter(contractCallsOnly));
  }, []);

  const fetchNewestRegistration = useCallback(async () => {
    const getLastIdResponse = await smartContractsApi.callReadOnlyFunction({
      stacksAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-last-registry-id',
      readOnlyFunctionArgs: ReadOnlyFunctionArgsFromJSON({
        sender: CONTRACT_ADDRESS,
        arguments: [],
      }),
    });
    if (getLastIdResponse.okay) {
      const lastIdCV = deserializeCV(Buffer.from(getLastIdResponse.result.substr(2), 'hex'));
      const lastId = lastIdCV.value;
      if (lastId > 0) {
        const mapEntryResponseRaw = await smartContractsApi.getContractDataMapEntryRaw({
          stacksAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          mapName: 'registry',
          key: `0x${serializeCV(tupleCV({ 'registry-id': uintCV(lastId) })).toString('hex')}`,
          proof: 0,
        });
        const mapEntryResponse = await mapEntryResponseRaw.raw.json();
        console.log({ mapEntryResponse });

        if (mapEntryResponse) {
          const mapEntry = deserializeCV(Buffer.from(mapEntryResponse.data.substr(2), 'hex'));
          console.log({ mapEntry });
          if (mapEntry.type === ClarityType.OptionalSome) {
            const registryData = mapEntry.value.data;

            const ownerOfResponse = await smartContractsApi.callReadOnlyFunction({
              stacksAddress: CONTRACT_ADDRESS,
              contractName: CONTRACT_NAME,
              functionName: 'owner-of',
              readOnlyFunctionArgs: ReadOnlyFunctionArgsFromJSON({
                sender: CONTRACT_ADDRESS,
                arguments: [`0x${serializeCV(registryData.name).toString('hex')}`],
              }),
            });

            console.log({ ownerOfResponse });

            if (ownerOfResponse.okay) {
              const owner = cvToString(
                deserializeCV(Buffer.from(ownerOfResponse.result.substr(2), 'hex')).value
              );

              setNewestRegistation({
                name: cvToString(registryData.name),
                url: cvToString(registryData.url),
                lastId: lastId.toString(),
                owner,
              });
            }
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    fetchNewestRegistration();
  }, [fetchActivities, fetchNewestRegistration]);

  return activities && activities.length > 0 ? (
    <Flex
      display="block"
      position="absolute"
      bottom="0"
      width="100%"
      justifyContent="space-between"
      px={4}
      py={3}
    >
      <Box px={3} background="#efefef">
        <Text fontWeight="500" display="block" mb={0} fontSize={3}>
          Public To-Do List Registry
        </Text>
        {newestRegistration && (
          <Text fontWeight="500" display="block" mb={0} fontSize={2}>
            <a href={newestRegistration.url.substr(1, newestRegistration.url.length - 2)}>
              Newest Registration
            </a>{' '}
            by user {newestRegistration.name} using address {newestRegistration.owner} (registry id:{' '}
            {newestRegistration.lastId})
          </Text>
        )}
        <Text fontWeight="500" display="block" mb={0} fontSize={2}>
          Recent Activities:{' '}
          {activities.map((activity, key) => {
            if (activity.contract_call.function_name === 'update') {
              const name = deserializeCV(
                Buffer.from(activity.contract_call.function_args[0].hex.substr(2), 'hex')
              );

              return (
                <React.Fragment key={key}>
                  Entry for {cvToString(name)} was updated.{' '}
                </React.Fragment>
              );
            } else {
              const result = deserializeCV(Buffer.from(activity.tx_result.hex.substr(2), 'hex'));
              return (
                <React.Fragment key={key}>
                  Entry {result.value.toString()} was registered.{' '}
                </React.Fragment>
              );
            }
          })}
        </Text>
      </Box>
    </Flex>
  ) : null;
};
