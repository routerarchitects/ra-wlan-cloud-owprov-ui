import React, { useCallback, useState, useEffect } from 'react';
import { SimpleGrid } from '@chakra-ui/react';
import { Formik } from 'formik';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import InternalFormAccess from '../../../common/InternalFormAccess';
import SectionGeneralCard from '../../../common/SectionGeneralCard';
import Unit from './Unit';
import { UNIT_SCHEMA } from './unitConstants';
import DeleteButton from 'components/Buttons/DeleteButton';

const UnitSection = ({ editing, setSection, sectionInformation, removeSub }) => {
  const { t } = useTranslation();
  const [formKey, setFormKey] = useState(uuid());
  const sectionRef = useCallback(
    (node) => {
      if (node !== null) {
        const invalidValues = [];
        for (const [k, error] of Object.entries(node.errors ?? {})) {
          invalidValues.push({ key: `unit.${k}`, error });
        }

        const newSection = {
          data: { configuration: node.values.configuration },
          isDirty: node.dirty,
          invalidValues,
        };

        if (!isEqual(sectionInformation, newSection)) {
          setSection(newSection);
        }
      }
    },
    [sectionInformation, setSection],
  );

  const removeUnit = () => removeSub('unit');

  useEffect(() => {
    if (!editing) {
      setFormKey(uuid());
    }
  }, [editing]);

  return (
    <Formik
      key={formKey}
      innerRef={sectionRef}
      initialValues={{ name: 'Unit', ...(sectionInformation.data ?? UNIT_SCHEMA(t).cast({})) }}
      validationSchema={UNIT_SCHEMA(t)}
    >
      <>
        <InternalFormAccess shouldValidate={sectionInformation?.shouldValidate} />
        <SimpleGrid minChildWidth="400px" spacing={4}>
          <SectionGeneralCard buttons={<DeleteButton onClick={removeUnit} isDisabled={!editing} />} editing={editing} />
          <Unit editing={editing} />
        </SimpleGrid>
      </>
    </Formik>
  );
};

export default React.memo(UnitSection, isEqual);
