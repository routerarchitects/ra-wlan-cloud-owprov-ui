import React, { useCallback, useEffect, useState } from 'react';
import { SimpleGrid, VStack } from '@chakra-ui/react';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import InternalFormAccess from '../../../common/InternalFormAccess';
import SectionGeneralCard from '../../../common/SectionGeneralCard';
import Nat from './Nat';
import { NAT_SCHEMA } from './natConstants';
import DeleteButton from 'components/Buttons/DeleteButton';
import { ConfigurationSectionShape } from 'constants/propShapes';

const propTypes = {
  editing: PropTypes.bool.isRequired,
  setSection: PropTypes.func.isRequired,
  sectionInformation: ConfigurationSectionShape.isRequired,
  removeSub: PropTypes.func.isRequired,
};

const NatSection = ({ editing, setSection, sectionInformation, removeSub }) => {
  const { t } = useTranslation();
  const [formKey, setFormKey] = useState(uuid());

  const sectionRef = useCallback(
    (node) => {
      if (node !== null) {
        const invalidValues = [];
        for (const [k, error] of Object.entries(node.errors)) {
          invalidValues.push({ key: `nat.${k}`, error });
        }

        const newSection = {
          data: node.values,
          isDirty: node.dirty,
          invalidValues,
          warnings: [],
        };

        if (!isEqual(sectionInformation, newSection)) {
          setSection(newSection);
        }
      }
    },
    [sectionInformation],
  );

  const removeNat = () => removeSub('nat');

  useEffect(() => {
    if (!editing) {
      setFormKey(uuid());
    }
  }, [editing]);

  return (
    <Formik
      key={formKey}
      innerRef={sectionRef}
      initialValues={sectionInformation.data}
      validationSchema={NAT_SCHEMA(t)}
    >
      {({ values, setFieldValue }) => {
        const snatRules = values?.configuration?.snat?.rules ?? [];
        const dnatRules = values?.configuration?.dnat?.rules ?? [];
        const combinedRules = [
          ...snatRules.map((rule, index) => ({ mode: 'snat', index, rule })),
          ...dnatRules.map((rule, index) => ({ mode: 'dnat', index, rule })),
        ];

        const onRemoveRule = (mode, index) => {
          const currentRules = values?.configuration?.[mode]?.rules ?? [];
          setFieldValue(
            `configuration.${mode}.rules`,
            currentRules.filter((_, i) => i !== index),
          );
        };

        return (
          <>
            <InternalFormAccess shouldValidate={sectionInformation?.shouldValidate} />
            <VStack spacing={4}>
              <SectionGeneralCard editing={editing} buttons={<DeleteButton onClick={removeNat} isDisabled={!editing} />} />

              <SimpleGrid minChildWidth="400px" spacing={4} w="100%">
                <Nat editing={editing} rules={combinedRules} onRemoveRule={onRemoveRule} />
              </SimpleGrid>
            </VStack>
          </>
        );
      }}
    </Formik>
  );
};

NatSection.propTypes = propTypes;

export default React.memo(NatSection, isEqual);
