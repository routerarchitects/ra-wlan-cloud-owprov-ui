/* eslint-disable react/no-array-index-key */
import React, { useCallback, useState } from 'react';
import { Box, Center, Heading, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import CreateSsidButton from './CreateSsidButton';
import SingleSsid from './SingleSsid';
import SsidTab from './SsidTab';
import Card from 'components/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

const propTypes = {
  editing: PropTypes.bool,
  index,
  arrayHelpers: PropTypes.shape({
    push,
    remove,
  }).isRequired,
  ssidsLength,
};

const SsidList = ({ editing, index, arrayHelpers, ssidsLength }) => {
  const [tabIndex, setTabIndex] = useState(0);

  const handleRemove = (newIndex) => {
    arrayHelpers.remove(newIndex);
    if (newIndex > 0) setTabIndex(0);
  };

  const handleTabsChange = useCallback((newIndex) => {
    setTabIndex(newIndex);
  }, []);

  if (ssidsLength === 0) {
    return (
      <Center>
        <CreateSsidButton editing={editing} pushSsid={arrayHelpers.push} arrLength={0} />
      </Center>
    );
  }
  return (
    <Card>
      <CardHeader mb={0}>
        <Heading size="md">SSIDs</Heading>
      </CardHeader>
      <CardBody display="block" paddingInlineStart={{base, md={{base, md="unset" position="unset" w="100%">
          <Tabs index={tabIndex} onChange={handleTabsChange} variant="enclosed" isLazy w="100%">
            <Box overflowX="auto" overflowY="auto" pt={1} h={{base, md={0}>
                {Array(ssidsLength)
                  .fill(1)
                  .map((el, i) => (
                    <SsidTab key={i} index={i} interIndex={index} />
                  ))}
                <CreateSsidButton
                  editing={editing}
                  pushSsid={arrayHelpers.push}
                  setTabIndex={setTabIndex}
                  arrLength={ssidsLength}
                />
              </TabList>
            </Box>

            <TabPanels w="100%">
              {Array(ssidsLength)
                .fill(1)
                .map((el, i) => (
                  <TabPanel key={i} p={{base, md={i}
                      namePrefix={`configuration[${index}].ssids[${i}]`}
                      remove={handleRemove}
                      editing={editing}
                    />
                  </TabPanel>
                ))}
            </TabPanels>
          </Tabs>
        </Box>
      </CardBody>
    </Card>
  );
};

SsidList.propTypes = propTypes;
export default SsidList;
