import React, { useCallback } from 'react';
import { SimpleGrid } from '@chakra-ui/react';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import InternalFormAccess from '../../../common/InternalFormAccess';
import SectionGeneralCard from '../../../common/SectionGeneralCard';
import Unit from './Unit';
import { UNIT_SCHEMA } from './unitConstants';
import DeleteButton from 'components/Buttons/DeleteButton';
import { ConfigurationSectionShape } from 'constants/propShapes';

const propTypes = {
  editing: PropTypes.bool.isRequired,
  setSection: PropTypes.func.isRequired,
  sectionInformation: ConfigurationSectionShape.isRequired,
  removeSub: PropTypes.func.isRequired,
};

const UnitSection = ({ editing, setSection, sectionInformation, removeSub }) => {
  const { t } = useTranslation();
  const sectionRef = useCallback(
    (node) => {
      if (node !== null) {
        const invalidValues = [];
        for (const [k, error] of Object.entries(node.errors)) {
          invalidValues.push({ key: `unit.${k}`, error });
        }

        const newSection = {
          data: node.values,
          isDirty: node.dirty,
          invalidValues,
        };

        if (!isEqual(sectionInformation, newSection)) {
          setSection(newSection);
        }
      }
    },
    [sectionInformation],
  );

  const removeUnit = () => removeSub('unit');

  return (
    <Formik innerRef={sectionRef} initialValues={sectionInformation.data} validationSchema={UNIT_SCHEMA(t)}>
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

UnitSection.propTypes = propTypes;
export default React.memo(UnitSection, isEqual);
