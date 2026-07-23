import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';
import InternalFormAccess from '../../../common/InternalFormAccess';
import { ConfigurationSectionShape } from 'constants/propShapes';
import ConfigRaw from './ConfigRaw';
import { CONFIG_RAW_SCHEMA } from './configRawConstants';

const propTypes = {
  editing: PropTypes.bool.isRequired,
  setSection: PropTypes.func.isRequired,
  sectionInformation: ConfigurationSectionShape.isRequired,
  removeSub: PropTypes.func.isRequired,
};

const getConfigRawText = (configuration) => {
  if (typeof configuration === 'string') return configuration;
  if (configuration === undefined) return '[]';

  try {
    return JSON.stringify(configuration, null, 2);
  } catch {
    return '[]';
  }
};

const parseConfigRaw = (configurationText) => {
  try {
    const parsed = JSON.parse(configurationText);
    if (!Array.isArray(parsed)) return undefined;
    return parsed.every((entry) => Array.isArray(entry) && entry.every((value) => typeof value === 'string'))
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
};

const ConfigRawSection = ({ editing, setSection, sectionInformation, removeSub }) => {
  const { t } = useTranslation();
  const [formKey, setFormKey] = useState(uuid());

  const initialValues = useMemo(
    () => ({
      name: sectionInformation.data?.name ?? 'Config Raw',
      description: sectionInformation.data?.description ?? '',
      weight: sectionInformation.data?.weight ?? 0,
      configurationText: getConfigRawText(sectionInformation.data?.configuration),
    }),
    [sectionInformation.data],
  );

  const sectionRef = useCallback(
    (node) => {
      if (node !== null) {
        const invalidValues = [];
        const configurationText = node.values.configurationText ?? '';
        const parsedConfiguration = parseConfigRaw(configurationText);

        if (!parsedConfiguration) {
          invalidValues.push({ key: 'config-raw.configurationText', error: t('form.invalid_file_content') });
        }

        const newSection = {
          data: {
            name: node.values.name,
            description: node.values.description,
            weight: node.values.weight,
            configuration: parsedConfiguration ?? sectionInformation.data?.configuration ?? [],
          },
          isDirty: node.dirty,
          invalidValues,
        };

        if (!isEqual(sectionInformation, newSection)) {
          setSection(newSection);
        }
      }
    },
    [sectionInformation, setSection, t],
  );

  const removeSection = () => removeSub('config-raw');

  useEffect(() => {
    if (!editing) setFormKey(uuid());
  }, [editing]);

  return (
    <Formik
      key={formKey}
      innerRef={sectionRef}
      initialValues={initialValues}
      validationSchema={CONFIG_RAW_SCHEMA(t)}
      validate={(values) => {
        const errors = {};
        if (!parseConfigRaw(values.configurationText ?? '')) errors.configurationText = t('form.invalid_file_content');
        return errors;
      }}
    >
      <>
        <InternalFormAccess shouldValidate={sectionInformation?.shouldValidate} />
        <ConfigRaw editing={editing} onDelete={removeSection} />
      </>
    </Formik>
  );
};

ConfigRawSection.propTypes = propTypes;
export default React.memo(ConfigRawSection, isEqual);
