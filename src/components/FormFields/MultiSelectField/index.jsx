import React, { useCallback } from 'react';
import { useField } from 'formik';
import PropTypes from 'prop-types';
import Field from './FastMultiSelectInput';

const propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    }),
  ).isRequired,
  isDisabled: PropTypes.bool,
  isRequired: PropTypes.bool,
  isHidden: PropTypes.bool,
  emptyIsUndefined: PropTypes.bool,
  hasVirtualAll: PropTypes.bool,
  canSelectAll: PropTypes.bool,
  isPortal: PropTypes.bool,
  definitionKey: PropTypes.string,
  placeholder: PropTypes.string,
  exclusiveValues: PropTypes.arrayOf(PropTypes.string),
};

const defaultProps = {
  isRequired: false,
  isDisabled: false,
  isHidden: false,
  emptyIsUndefined: false,
  hasVirtualAll: false,
  canSelectAll: false,
  isPortal: false,
  definitionKey: null,
  placeholder: null,
  exclusiveValues: [],
};

const MultiSelectField = ({
  options,
  name,
  isDisabled,
  label,
  isRequired,
  isHidden,
  emptyIsUndefined,
  canSelectAll,
  hasVirtualAll,
  isPortal,
  definitionKey,
  placeholder,
  exclusiveValues,
}) => {
  const [{ value }, { touched, error }, { setValue, setTouched }] = useField(name);

  const onChange = useCallback((option) => {
    const allIndex = option.findIndex((opt) => opt.value === '*');
    if (option.length === 0 && emptyIsUndefined) {
      setValue(undefined);
      setTouched(true);
      return;
    }

    if (exclusiveValues && exclusiveValues.length > 0) {
      const selectedValues = option.map((val) => val.value);
      const hasExclusive = selectedValues.some((v) => exclusiveValues.includes(v));
      const prevHasExclusive = (value ?? []).some((v) => exclusiveValues.includes(v));

      if (hasExclusive && !prevHasExclusive) {
        const exclusiveSelected = selectedValues.find((v) => exclusiveValues.includes(v));
        setValue([exclusiveSelected]);
        setTouched(true);
        return;
      }
    }

    if (allIndex === 0 && option.length > 1) {
      const newValues = option.slice(1);
      setValue(newValues.map((val) => val.value));
    } else if (allIndex >= 0) {
      if (!hasVirtualAll) setValue(['*']);
      else setValue(options.map(({ value: v }) => v));
    } else if (option.length > 0) setValue(option.map((val) => val.value));
    else setValue([]);
    setTouched(true);
  }, [value, exclusiveValues, emptyIsUndefined, hasVirtualAll, options, setValue, setTouched]);

  const onFieldBlur = useCallback(() => {
    setTouched(true);
  }, []);

  return (
    <Field
      canSelectAll={canSelectAll}
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onFieldBlur}
      error={error}
      touched={touched}
      options={options}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isHidden={isHidden}
      isPortal={isPortal}
      definitionKey={definitionKey}
      placeholder={placeholder}
      exclusiveValues={exclusiveValues}
    />
  );
};

MultiSelectField.propTypes = propTypes;
MultiSelectField.defaultProps = defaultProps;

export default React.memo(MultiSelectField);
