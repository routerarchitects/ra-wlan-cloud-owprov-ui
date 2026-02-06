import { string, object, number } from 'yup';

export default (t: (str: string) => string, useDefault = false) => {
  const shape = object().shape({
    name: string().required(t('form.required')).default(''),
    description: string().default(''),
    id: number().required(t('form.required')).moreThan(0).lessThan(4051).default(1080),
  });

  return useDefault ? shape : shape.nullable().default(undefined);
};
