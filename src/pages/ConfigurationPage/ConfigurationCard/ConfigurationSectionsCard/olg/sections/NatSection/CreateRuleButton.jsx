import React, { useRef, useState } from 'react';
import { FormControl, FormLabel, Modal, ModalBody, ModalContent, ModalOverlay, Select, useDisclosure } from '@chakra-ui/react';
import { useFormikContext } from 'formik';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import { DNAT_RULE_SCHEMA, NAT_RULE_SCHEMA } from './natConstants';
import CloseButton from 'components/Buttons/CloseButton';
import CreateButton from 'components/Buttons/CreateButton';
import SaveButton from 'components/Buttons/SaveButton';
import ModalHeader from 'components/Modals/ModalHeader';

const propTypes = {
  editing: PropTypes.bool.isRequired,
  setTabIndex: PropTypes.func.isRequired,
};

const nextRuleId = (rules = []) => {
  const maxExisting = rules.reduce((max, rule) => {
    const id = Number(rule?.['rule-id']);
    return Number.isFinite(id) ? Math.max(max, id) : max;
  }, 0);

  return maxExisting + 1;
};

const CreateRuleButton = ({ editing, setTabIndex }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { values, setFieldValue } = useFormikContext();
  const defaultType = 'snat';
  const [selectedType, setSelectedType] = useState(defaultType);
  const selectedTypeRef = useRef(defaultType);

  const addRule = (type) => {
    const normalizedType = type === 'dnat' ? 'dnat' : 'snat';
    const existingRules = values?.configuration?.[normalizedType]?.rules ?? [];
    const ruleId = nextRuleId(existingRules);
    const snatLength = values?.configuration?.snat?.rules?.length ?? 0;

    const newRule =
      normalizedType === 'dnat'
        ? DNAT_RULE_SCHEMA(t, true).cast({
            'rule-id': ruleId,
            'in-interface': {},
            translation: {},
          })
        : NAT_RULE_SCHEMA(t, true).cast({
            'rule-id': ruleId,
            'out-interface': { name: '' },
            source: { address: '' },
            translation: { address: 'masquerade' },
          });

    setFieldValue(`configuration.${normalizedType}.rules`, [...existingRules, newRule]);
    // Tabs are rendered as [snat..., dnat...]
    const visibleIndex = normalizedType === 'snat' ? existingRules.length : snatLength + existingRules.length;
    setTabIndex(visibleIndex);
    onClose();
  };

  return (
    <>
      <CreateButton
        label="Add Rule"
        onClick={() => {
          setSelectedType(defaultType);
          selectedTypeRef.current = defaultType;
          onOpen();
        }}
        isCompact={(values?.configuration?.snat?.rules?.length ?? 0) + (values?.configuration?.dnat?.rules?.length ?? 0) !== 0}
        hidden={!editing}
        size="lg"
        borderRadius={0}
      />
      <Modal onClose={onClose} isOpen={isOpen} size="sm" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader
            title="Add Rule"
            right={
              <>
                <SaveButton onClick={() => addRule(selectedTypeRef.current)} isDisabled={!selectedType} />
                <CloseButton ml={2} onClick={onClose} />
              </>
            }
          />
          <ModalBody>
            <FormControl isRequired mb={2}>
              <FormLabel>type</FormLabel>
              <Select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  selectedTypeRef.current = e.target.value;
                }}
              >
                <option value="snat">SNAT</option>
                <option value="dnat">DNAT</option>
              </Select>
            </FormControl>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

CreateRuleButton.propTypes = propTypes;

export default React.memo(CreateRuleButton, isEqual);
