import { bool, object, number, string } from 'yup';

export const DEFAULT_UNIT = {
  configuration: {
    'leds-active': true,
  },
};

export const UNIT_SCHEMA = (t) =>
  object().shape({
    configuration: object().shape({
      'leds-active': bool().default(true),
      multicast: object()
        .shape({
          'igmp-snooping-enable': bool().default(false),
          'querier-enable': bool().default(false),
        })
        .default(undefined),
      'system-password': string().default(undefined),
      'usage-threshold': number().moreThan(-1).lessThan(101).integer().default(undefined),
    }),
  });
