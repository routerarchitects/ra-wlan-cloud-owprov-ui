import React from 'react';
import { FormControl, FormErrorMessage, FormLabel } from '@chakra-ui/react';
import { Select } from 'chakra-react-select';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';
import ConfigurationFieldExplanation from '../ConfigurationFieldExplanation';

const propTypes = {
  value: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }),
  ).isRequired,
  onBlur: PropTypes.func.isRequired,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  touched: PropTypes.bool,
  isDisabled: PropTypes.bool,
  canSelectAll: PropTypes.bool,
  isRequired: PropTypes.bool,
  isHidden: PropTypes.bool,
  isPortal: PropTypes.bool.isRequired,
  definitionKey: PropTypes.string,
  placeholder: PropTypes.string,
  exclusiveValues: PropTypes.arrayOf(PropTypes.string),
};

const defaultProps = {
  value: [],
  error: false,
  touched: false,
  isRequired: false,
  canSelectAll: false,
  isDisabled: false,
  isHidden: false,
  definitionKey: null,
  placeholder: null,
  exclusiveValues: [],
};

const FastMultiSelectInput = ({
  options,
  label,
  value,
  onChange,
  onBlur,
  error,
  touched,
  canSelectAll,
  isRequired,
  isDisabled,
  isHidden,
  isPortal,
  definitionKey,
  placeholder,
  exclusiveValues,
}) => {
  const { t } = useTranslation();

  const hasExclusiveSelected = (value ?? []).some((val) => exclusiveValues?.includes(val));
  const mappedOptions = options.map((opt) => {
    if (hasExclusiveSelected && !exclusiveValues?.includes(opt.value)) {
      return { ...opt, isDisabled: true };
    }
    return opt;
  });

  const selectOptions = canSelectAll ? [{ value: '*', label: t('common.all') }, ...mappedOptions] : mappedOptions;

  return (
    <FormControl isInvalid={error && touched} isRequired={isRequired} hidden={isHidden}>
      {label ? (
        <FormLabel ms="4px" fontSize="md" fontWeight="normal" _disabled={{ opacity: 0.8 }}>
          {label}
          <ConfigurationFieldExplanation definitionKey={definitionKey} />
        </FormLabel>
      ) : null}
      <Select
        placeholder={placeholder ?? undefined}
        chakraStyles={{
          control: (provided, { isDisabled: isControlDisabled }) => ({
            ...provided,
            borderRadius: '15px',
            opacity: isControlDisabled ? '0.8 !important' : '1',
            border: '2px solid',
          }),
          dropdownIndicator: (provided) => ({
            ...provided,
            backgroundColor: 'unset',
            border: 'unset',
          }),
        }}
        classNamePrefix={isPortal ? 'chakra-react-select' : ''}
        menuPortalTarget={isPortal ? document.body : undefined}
        isMulti
        closeMenuOnSelect={false}
        options={selectOptions}
        value={
          value?.map((val) => {
            if (val === '*') return { value: val, label: t('common.all') };
            return options.find((opt) => opt.value === val);
          }) ?? []
        }
        onChange={onChange}
        onBlur={onBlur}
        isDisabled={isDisabled}
      />
      <FormErrorMessage>{error}</FormErrorMessage>
    </FormControl>
  );
};

FastMultiSelectInput.propTypes = propTypes;
FastMultiSelectInput.defaultProps = defaultProps;

export default React.memo(FastMultiSelectInput, isEqual);
