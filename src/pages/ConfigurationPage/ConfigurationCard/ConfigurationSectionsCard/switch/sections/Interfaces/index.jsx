import React, { useCallback, useState, useEffect } from 'react';
import { VStack } from '@chakra-ui/react';
import { FieldArray, Formik } from 'formik';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import InternalFormAccess from '../../../common/InternalFormAccess';
import SectionGeneralCard from '../../../common/SectionGeneralCard';
import Interfaces from './Interfaces';
import { INTERFACES_SCHEMA } from './interfacesConstants';
import DeleteButton from 'components/Buttons/DeleteButton';
import { ConfigurationSectionShape } from 'constants/propShapes';

const propTypes = {
  editing: PropTypes.bool.isRequired,
  setSection: PropTypes.func.isRequired,
  sectionInformation: ConfigurationSectionShape.isRequired,
  removeSub: PropTypes.func.isRequired,
};

const warningTests = () => [];

const InterfaceSection = ({ editing, setSection, sectionInformation, removeSub }) => {
  const { t } = useTranslation();
  const [formKey, setFormKey] = useState(uuid());
  const initialConfiguration = Array.isArray(sectionInformation.data?.configuration)
    ? sectionInformation.data.configuration
    : sectionInformation.data?.configuration?.configuration ?? [];
  const sectionRef = useCallback(
    (node) => {
      if (node !== null) {
        const invalidValues = [];
        for (const [k, error] of Object.entries(node.errors ?? {})) {
          invalidValues.push({ key: `interfaces.${k}`, error });
        }
        const warnings = warningTests(node.values);
        const newSection = {
          data: node.values,
          isDirty: node.dirty,
          invalidValues,
          warnings,
        };

        if (!isEqual(sectionInformation, newSection)) {
          setSection(newSection);
        }
      }
    },
    [sectionInformation, setSection],
  );

  const removeUnit = () => removeSub('interfaces');

  useEffect(() => {
    if (!editing) {
      setFormKey(uuid());
    }
  }, [editing]);

  return (
    <Formik
      key={formKey}
      innerRef={sectionRef}
      initialValues={{ ...sectionInformation.data, configuration: initialConfiguration }}
      validationSchema={INTERFACES_SCHEMA(t)}
    >
      {({ values }) => (
        <>
          <InternalFormAccess shouldValidate={sectionInformation?.shouldValidate} />
          <VStack spacing={4}>
            <SectionGeneralCard
              editing={editing}
              buttons={<DeleteButton ml={2} onClick={removeUnit} isDisabled={!editing} />}
            />
            <FieldArray name="configuration">
              {(arrayHelpers) => (
                <Interfaces
                  editing={editing}
                  arrayHelpers={arrayHelpers}
                  interfacesLength={(values.configuration ?? []).length}
                />
              )}
            </FieldArray>
          </VStack>
        </>
      )}
    </Formik>
  );
};

InterfaceSection.propTypes = propTypes;
export default React.memo(InterfaceSection, isEqual);
