import React, { useCallback, useEffect, useState } from 'react';
import { Box, Flex, Text } from '@blockstack/ui';
import {
  AccountsApi,
  ReadOnlyFunctionArgsFromJSON,
  SmartContractsApi,
} from '@stacks/blockchain-api-client';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '../assets/constants';
import { ClarityType, cvToString, tupleCV, uintCV } from '@blockstack/stacks-transactions';
import { cvToHex, hexToCV } from '../utils';

const accountsApi = new AccountsApi();
const smartContractsApi = new SmartContractsApi();

export const RecentActivities = () => {
  const [activities, setActivities] = useState();
  const [firstRegistration, setFirstRegistration] = useState();

  const contractCallsOnly = r => {
    return r.tx_status === 'success' && r.tx_type === 'contract_call';
  };

  const fetchActivities = useCallback(async () => {
    // fetch activities
    const response = await accountsApi.getAccountTransactions({
      principal: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
    });
    setActivities(response.results.filter(contractCallsOnly));
  }, []);

  const fetchRegistration = useCallback(async () => {
    // fetch owner
    const ownerOfResponse = await smartContractsApi.callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'owner-of?',
      readOnlyFunctionArgs: ReadOnlyFunctionArgsFromJSON({
        sender: CONTRACT_ADDRESS,
        arguments: [cvToHex(uintCV(1))],
      }),
    });

    console.log({ ownerOfResponse });

    if (ownerOfResponse.okay) {
      const ownerCV = hexToCV(ownerOfResponse.result);
      const owner = cvToString(ownerCV);

      // fetch public url and name
      const key = cvToHex(tupleCV({ 'registry-id': uintCV(1) }));
      const mapEntryResponse = await smartContractsApi.getContractDataMapEntry({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        mapName: 'registry',
        key,
        proof: 0,
      });
      console.log({ mapEntryResponse });

      if (mapEntryResponse) {
        const optionalMapEntry = hexToCV(mapEntryResponse.data);
        console.log({ optionalMapEntry });
        if (optionalMapEntry.type === ClarityType.OptionalSome) {
          const mapEntryCV = optionalMapEntry.value;
          const registryData = mapEntryCV.data;
          const name = cvToString(registryData.name);
          const url = cvToString(registryData.url);

          setFirstRegistration({
            name,
            url,
            owner,
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    fetchRegistration();
  }, [fetchActivities, fetchRegistration]);

  console.log({ activities });

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
        {firstRegistration && (
          <Text fontWeight="500" display="block" mb={0} fontSize={2}>
            <a href={firstRegistration.url.substr(1, firstRegistration.url.length - 2)}>
              First Registration
            </a>{' '}
            by user {firstRegistration.name} using address {firstRegistration.owner}
          </Text>
        )}
        <Text fontWeight="500" display="block" mb={0} fontSize={2}>
          Recent Activities:{' '}
          {activities.map((activity, key) => {
            if (activity.contract_call.function_name === 'register') {
              const result = hexToCV(activity.tx_result.hex);
              return (
                <React.Fragment key={key}>
                  Entry {result.value.toString()} was registered at {activity.burn_block_time_iso}.{' '}
                </React.Fragment>
              );
            } else {
              const name = hexToCV(activity.contract_call.function_args[0].hex);
              return (
                <React.Fragment key={key}>
                  Entry for {cvToString(name)} was updated.{' '}
                </React.Fragment>
              );
            }
          })}
        </Text>
      </Box>
    </Flex>
  ) : null;
};
