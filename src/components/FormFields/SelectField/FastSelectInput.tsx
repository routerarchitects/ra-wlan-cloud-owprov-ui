import React from 'react';
import { FormControl, FormErrorMessage, FormLabel, Select } from '@chakra-ui/react';
import isEqual from 'react-fast-compare';
import { v4 as uuid } from 'uuid';
import ConfigurationFieldExplanation from '../ConfigurationFieldExplanation';
import { defaultFormInput, FormInputProps } from 'models/FormField';

interface Props extends FormInputProps {
  value?: string;
  options: { label: string; value: string | number }[];
}

const defaultProps = {
  value: '',
  ...defaultFormInput,
};

const FastSelectInput = (
  {
    options,
    label,
    value,
    onChange,
    onBlur,
    error,
    touched,
    isRequired,
    isDisabled,
    isHidden,
    isLabelHidden,
    w,
    definitionKey
  }: Props
) => (<FormControl
  isInvalid={(error !== undefined || error) && touched}
  isRequired={isRequired}
  isDisabled={isDisabled}
  hidden={isHidden}
>
  {label ? (
    <FormLabel ms="4px" fontSize="md" fontWeight="normal" _disabled={{ opacity: 0.8 }} hidden={isLabelHidden}>
      {label} <ConfigurationFieldExplanation definitionKey={definitionKey} />
    </FormLabel>
  ) : null}
  <Select
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    borderRadius="15px"
    fontSize="sm"
    _disabled={{ opacity: 0.8, cursor: 'not-allowed' }}
    border="2px solid"
    w={w}
  >
    {options.map((option) => (
      <option value={option.value} key={uuid()}>
        {option.label}
      </option>
    ))}
  </Select>
  <FormErrorMessage>{error}</FormErrorMessage>
</FormControl>);

FastSelectInput.defaultProps = defaultProps;

export default React.memo(FastSelectInput, isEqual);
