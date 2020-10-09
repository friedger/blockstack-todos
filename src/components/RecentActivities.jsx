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
      const owner = cvToString(ownerCV.value);

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
          const name = registryData.name.buffer.toString();
          const url = registryData.url.buffer.toString();

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
    <Box maxWidth="660px" width="100%" mx="auto" mt="75px">
      <Flex
        display="block"
        width="100%"
        justifyContent="space-between"
        borderColor="ink.200"
        borderWidth="1px"
        borderRadius="8px"
        my={4}
        px={4}
        py={4}
      >
        <Box px={3}>
          {firstRegistration && (
            <>
              <Text fontWeight="500" display="block" mb={0} fontSize={0}>
                First registration in 'Public To-Do List registry' by
              </Text>
              <Text fontSize={2}>
                <a href={firstRegistration.url}>{firstRegistration.name}</a>{' '}
              </Text>
              <Text fontSize={0}>using address {firstRegistration.owner}</Text>
              <br />
            </>
          )}
          <Text fontSize={0}>Recent Activities in 'Public To-Do List Registry':</Text>

          {activities.map((activity, key) => {
            if (activity.contract_call.function_name === 'register') {
              const result = hexToCV(activity.tx_result.hex);
              return (
                <React.Fragment key={key}>
                  <br />
                  <Text fontSize={2}>Entry {result.value.toString()} registered </Text>
                  <Text fontSize={0} fontWeight="100">
                    at {new Date(activity.burn_block_time_iso).toLocaleString()}
                  </Text>
                </React.Fragment>
              );
            } else {
              const name = hexToCV(activity.contract_call.function_args[0].hex);
              return (
                <React.Fragment key={key}>
                  <br />
                  <Text fontSize={2}>Entry {cvToString(name)} updated</Text>
                  <Text fontSize={0}>
                    at {new Date(activity.burn_block_time_iso).toLocaleString()}.
                  </Text>
                </React.Fragment>
              );
            }
          })}
        </Box>
      </Flex>
    </Box>
  ) : null;
};
