import * as Yup from 'yup';
import { testObjectName, testPhoneNumberArray, testRegex } from './formTests';
import phoneNumberTest from 'utils/phoneNumber';

export const DeviceRulesSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    rrm: Yup.lazy((value) => {
      switch (typeof value) {
        case 'object':
          return Yup.object().required(t('form.required'));
        case 'string':
        default:
          return Yup.string().required(t('form.required'));
      }
    }),
    rcOnly: Yup.string().required(t('form.required')),
    firmwareUpgrade: Yup.string().required(t('form.required')),
  });

// User Schemas
export const CreateUserSchema = (t: (str: string) => string, { passRegex }: { passRegex: string }) =>
  Yup.object().shape({
    email: Yup.string().email(t('form.invalid_email')).required('Required'),
    name: Yup.string().required('Required'),
    description: Yup.string(),
    currentPassword: Yup.string()
      .required(t('form.required'))
      .test('test-password', t('form.invalid_password'), (v) => testRegex(v, passRegex))
      .default(''),
    note: Yup.string(),
    userRole: Yup.string(),
  });

export const CreateUserNonRootSchema = (t: (str: string) => string, { passRegex }: { passRegex: string }) =>
  Yup.object().shape({
    email: Yup.string().email(t('form.invalid_email')).required('Required'),
    name: Yup.string().required('Required'),
    description: Yup.string(),
    currentPassword: Yup.string()
      .required(t('form.required'))
      .test('test-password', t('form.invalid_password'), (v) => testRegex(v, passRegex))
      .default(''),
    note: Yup.string(),
    userRole: Yup.string(),
  });

export const UpdateUserSchema = (t: (str: string) => string, { passRegex }: { passRegex: string }) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    currentPassword: Yup.string()
      .notRequired()
      .test('test-password', t('form.invalid_password'), (v) => testRegex(v, passRegex)),
    description: Yup.string(),
    mfa: Yup.string(),
    phoneNumber: Yup.string(),
  });

export const RootSchemaForRootUser = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    description: Yup.string(),
    defaultRedirector: Yup.string(),
    organization: Yup.string().required(t('form.required')),
    apiKey: Yup.string(),
    serverEnrollmentProfile: Yup.string(),
    clientEnrollmentProfile: Yup.string(),
    note: Yup.string(),
  });

export const RootSchemaForNonRootUser = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    description: Yup.string(),
    defaultRedirector: Yup.string(),
  });

// Certificate Schemas
export const CreateCertificateSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    type: Yup.string().required(t('form.required')),
    commonName: Yup.string()
      .required(t('form.required'))
      .when('type', {
        is: 'device',
        then: Yup.string()
          .required(t('form.required'))
          .test('test-mac-device', t('certificates.invalid_mac'), (v) => {
            if (v) {
              const cleanedString = v.trim().replace('-', '').replace(':', '');

              if (cleanedString.length !== 12) return false;
              if (!cleanedString.match('^[a-fA-F0-9]+$')) return false;
            }
            return true;
          }),
      })
      .when('type', {
        is: 'server',
        then: Yup.string()
          .required(t('form.required'))
          .test('test-mac-server', t('certificates.invalid_redirector'), (v) => {
            if (v) {
              const stringSplit = v.split('.');
              if (stringSplit.length < 2) return false;
              if (stringSplit[0] && stringSplit[0][0] === '*' && stringSplit[1] && stringSplit[1][0] === '*')
                return false;

              for (const part of stringSplit) {
                if (part.length === 0) return false;
                if (part[0] === '-' || part[part.length - 1] === '-') return false;
              }

              const splitPort = v.split(':');

              // @ts-ignore
              if ((splitPort.length === 2 && splitPort[1] < 1) || splitPort[1] > 65535) return false;
            }
            return true;
          }),
      }),
    manufacturer: Yup.string().when('type', {
      is: 'device',
      then: Yup.string().required(t('form.required')),
    }),
    model: Yup.string().when('type', {
      is: 'device',
      then: Yup.string().required(t('form.required')),
    }),
    redirector: Yup.string().when('type', {
      is: 'device',
      then: Yup.string()
        .required(t('form.required'))
        .test('test-redirector', t('certificates.invalid_redirector'), (v) => {
          if (v) {
            const stringSplit = v.split('.');
            if (stringSplit.length < 2) return false;
            if (stringSplit[0] && stringSplit[0][0] && stringSplit[0][0] === '*') return false;

            for (const part of stringSplit) {
              if (part.length === 0) return false;
              if (part[0] === '-' || part[part.length - 1] === '-') return false;
            }

            const splitPort = v.split(':');

            // @ts-ignore
            if ((splitPort.length === 2 && splitPort[1] < 1) || splitPort[1] > 65535) return false;
          }
          return true;
        }),
    }),
  });

export const UpdateCertificateSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    manufacturer: Yup.string().when('type', {
      is: 'device',
      then: Yup.string().required(t('form.required')),
    }),
    model: Yup.string().when('type', {
      is: 'device',
      then: Yup.string().required(t('form.required')),
    }),
    redirector: Yup.string().when('type', {
      is: 'device',
      then: Yup.string()
        .required(t('form.required'))
        .test('test-redirector', t('certificates.invalid_redirector'), (v) => {
          if (v) {
            const stringSplit = v.split('.');
            if (stringSplit.length < 2) return false;
            if (stringSplit[0] && stringSplit[0][0] === '*') return false;

            for (const part of stringSplit) {
              if (part.length === 0) return false;
              if (part[0] === '-' || part[part.length - 1] === '-') return false;
            }

            const splitPort = v.split(':');

            // @ts-ignore
            if ((splitPort.length === 2 && splitPort[1] < 1) || splitPort[1] > 65535) return false;
          }
          return true;
        }),
    }),
  });

// Batch Schemas
export const BatchSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    description: Yup.string(),
    redirector: Yup.string().required(t('form.required')),
    manufacturer: Yup.string().required(t('form.required')),
    model: Yup.string().required(t('form.required')),
    commonNames: Yup.array().of(Yup.string()).required(t('form.required')).min(1, t('batch.need_devices')),
    note: Yup.string(),
  });

// Email Notification Schema
export const EmailNotificationSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    email: Yup.string().email(t('form.invalid_email')),
  });

// Sms Notification Schema
export const SmsNotificationSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    phone: Yup.string().test('test-phone-number', t('form.invalid_phone_number'), (v) => {
      if (v) {
        return phoneNumberTest(v);
      }
      return true;
    }),
  });

// Configuration  Schemas
export const CreateConfigurationSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    deviceRules: DeviceRulesSchema(t).required('form.required'),
    deviceTypes: Yup.array().of(Yup.string()).required(t('form.required')).min(1, t('form.required')),
    description: Yup.string(),
    entity: Yup.string().required(t('form.required')),
    note: Yup.string(),
    userRole: Yup.string(),
  });

// Inventory Tag  Schemas
export const CreateTagSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    serialNumber: Yup.string()
      .required(t('form.required'))
      .test('test-serial-regex', t('inventory.invalid_serial_number'), (v) => {
        if (v) {
          if (v.length !== 12) return false;
          if (!v.match('^[a-fA-F0-9]+$')) return false;
        }
        return true;
      }),
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    deviceRules: DeviceRulesSchema(t).required('form.required'),
    deviceType: Yup.string().required(t('form.required')),
    description: Yup.string(),
    entity: Yup.string(),
    note: Yup.string(),
  });

export const UpdateTagSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    deviceRules: DeviceRulesSchema(t).required('form.required'),
    deviceType: Yup.string().required(t('form.required')),
    description: Yup.string(),
    entity: Yup.string(),
    note: Yup.string(),
  });

// Subscriber Schema
export const SubscriberSchema = (
  t: (str: string) => string,
  { passRegex, needPassword = true }: { passRegex: string; needPassword: boolean },
) =>
  Yup.object().shape({
    email: Yup.string().email(t('form.invalid_email')).required(t('form.required')).default(''),
    name: Yup.string()
      .required(t('form.required'))
      .test('name_test', t('common.name_error'), testObjectName)
      .default(''),
    description: Yup.string().default(''),
    currentPassword: needPassword
      ? Yup.string()
          .required(t('form.required'))
          .test('test-password', t('form.invalid_password'), (v) => testRegex(v, passRegex))
          .default('')
      : Yup.string()
          .test('test-password', t('form.invalid_password'), (v) => testRegex(v, passRegex))
          .default(undefined),
    note: Yup.string().default(''),
  });

// Contact Schemas
export const CreateContactSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    type: Yup.string().required(t('form.required')),
    salutation: Yup.string(),
    title: Yup.string(),
    firstname: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    lastname: Yup.string(),
    initials: Yup.string(),
    primaryEmail: Yup.string().email(t('form.invalid_email')).required(t('form.required')),
    secondaryEmail: Yup.string().email(t('form.invalid_email')),
    phones: Yup.array()
      .of(Yup.string())
      .test('test-phones', t('form.invalid_phone_numbers'), (v) => testPhoneNumberArray(v as string[])),
    mobiles: Yup.array()
      .of(Yup.string())
      .test('test-mobiles', t('form.invalid_phone_numbers'), (v) => testPhoneNumberArray(v as string[])),
    description: Yup.string(),
    accessPIN: Yup.string(),
    entity: Yup.string().required(t('form.required')),
    note: Yup.string(),
  });

// Location Schemas
export const CreateLocationSchema = (t: (str: string) => string, needEntity = true) => {
  if (needEntity)
    return Yup.object()
      .shape({
        name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
        description: Yup.string(),
        type: Yup.string().required(t('form.required')),
        addressLineOne: Yup.string().required(t('form.required')),
        addressLineTwo: Yup.string(),
        city: Yup.string().required(t('form.required')),
        state: Yup.string().required(t('form.required')),
        postal: Yup.string().required(t('form.required')),
        country: Yup.string().required(t('form.required')),
        buildingName: Yup.string(),
        phones: Yup.array().of(Yup.string()),
        mobiles: Yup.array().of(Yup.string()),
        geoCode: Yup.string(),
        note: Yup.string(),
        entity: Yup.string().required(t('form.required')),
      })
      .nullable();

  return Yup.object()
    .shape({
      name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
      description: Yup.string(),
      type: Yup.string().required(t('form.required')),
      addressLineOne: Yup.string().required(t('form.required')),
      addressLineTwo: Yup.string(),
      city: Yup.string().required(t('form.required')),
      state: Yup.string().required(t('form.required')),
      postal: Yup.string().required(t('form.required')),
      country: Yup.string().required(t('form.required')),
      buildingName: Yup.string(),
      phones: Yup.array().of(Yup.string()),
      mobiles: Yup.array().of(Yup.string()),
      geoCode: Yup.string(),
      note: Yup.string(),
    })
    .nullable();
};

// Entity Schemas
export const EntitySchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    description: Yup.string(),
    deviceRules: DeviceRulesSchema(t).required(t('common.required')),
    deviceConfiguration: Yup.array().of(Yup.string()),
    sourceIP: Yup.array().of(Yup.string()),
    __createLocation: CreateLocationSchema(t, false).nullable().default(undefined),
  });

// Entity Schemas
export const VenueSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    description: Yup.string(),
    deviceRules: DeviceRulesSchema(t).required(t('common.required')),
    deviceConfiguration: Yup.array().of(Yup.string()),
    contact: Yup.string(),
    location: Yup.string(),
    sourceIP: Yup.array().of(Yup.string()),
    __BOARD: Yup.object()
      .shape({
        name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
        interval: Yup.number().required(t('form.required')).moreThan(0).integer(),
        retention: Yup.number().required(t('form.required')).moreThan(0).integer(),
      })
      .nullable()
      .default(undefined),
  });

// Configuration  Schemas
export const CreateMapSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    visibility: Yup.string().required(t('form.required')),
    description: Yup.string(),
    note: Yup.string(),
  });

// Service Class Schemas
export const ServiceClassSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    description: Yup.string(),
    billingCode: Yup.string().required(t('form.required')),
    cost: Yup.number(),
    currency: Yup.string(),
    period: Yup.string(),
  });

// Operator Contact Schemas
export const SubscriberDeviceContactSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    type: Yup.string(),
    salutation: Yup.string(),
    title: Yup.string(),
    firstname: Yup.string().test('name_test', t('common.name_error'), (value) =>
      value && value.length > 0 ? testObjectName(value) : true,
    ),
    lastname: Yup.string(),
    initials: Yup.string(),
    primaryEmail: Yup.string()
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .email(t('form.invalid_email')),
    secondaryEmail: Yup.string()
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .email(t('form.invalid_email')),
    phones: Yup.array()
      .of(Yup.string())
      .test('test-phones', t('form.invalid_phone_numbers'), (v) => testPhoneNumberArray(v as string[])),
    mobiles: Yup.array()
      .of(Yup.string())
      .test('test-mobiles', t('form.invalid_phone_numbers'), (v) => testPhoneNumberArray(v as string[])),
    accessPIN: Yup.string(),
  });

// Location Schemas
export const SubscriberDeviceLocationSchema = (t: (str: string) => string) =>
  Yup.object()
    .shape({
      type: Yup.string(),
      addressLineOne: Yup.string(),
      addressLineTwo: Yup.string(),
      city: Yup.string(),
      state: Yup.string(),
      postal: Yup.string(),
      country: Yup.string(),
      buildingName: Yup.string(),
      phones: Yup.array().of(Yup.string()),
      mobiles: Yup.array().of(Yup.string()),
      geoCode: Yup.string(),
    })
    .nullable();

// Subscriber Device Schema
export const SubscriberDeviceSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string()
      .required(t('form.required'))
      .test('name_test', t('common.name_error'), testObjectName)
      .default(''),
    subscriberId: Yup.string().required(t('form.required')).default(''),
    description: Yup.string().default(''),
    note: Yup.string().default(''),
    serialNumber: Yup.string()
      .required(t('form.required'))
      .test('test-serial-regex', t('inventory.invalid_serial_number'), (v) => {
        if (v) {
          if (v.length !== 12) return false;
          if (!v.match('^[a-fA-F0-9]+$')) return false;
        }
        return true;
      })
      .default(''),
    deviceRules: DeviceRulesSchema(t).required('form.required').default({
      rrm: 'inherit',
      rcOnly: 'inherit',
      firmwareUpgrade: 'inherit',
    }),
    deviceType: Yup.string().required(t('form.required')).default(''),
    serviceClass: Yup.string().default(''),
    billingCode: Yup.string().default(''),
    locale: Yup.string().default(''),
    location: SubscriberDeviceLocationSchema(t),
    contact: SubscriberDeviceContactSchema(t),
    suspended: Yup.bool().default(false),
  });

export const CreateOperatorSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    description: Yup.string(),
    deviceRules: DeviceRulesSchema(t).required('form.required'),
    registrationId: Yup.string().required(t('form.required')),
    sourceIP: Yup.array().of(Yup.string()),
  });
export const EditOperatorSchema = (t: (str: string) => string) =>
  Yup.object().shape({
    name: Yup.string().required(t('form.required')).test('name_test', t('common.name_error'), testObjectName),
    description: Yup.string(),
    deviceRules: DeviceRulesSchema(t).required('form.required'),
    sourceIP: Yup.array().of(Yup.string()),
  });
