// Dynamic IANA Timezone helper & options for Location entity.
// Uses @vvo/tzdb as the canonical IANA timezone list so the same timezone IDs
// are available on every browser/runtime, regardless of Intl.supportedValuesOf() support.
// Intl.DateTimeFormat is kept only for computing the current UTC offset label (DST-aware).

import { timeZonesNames } from '@vvo/tzdb';

export const getTimezoneOffsetString = (timeZone: string, date = new Date()): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart && tzPart.value) {
      let val = tzPart.value.replace('GMT', 'UTC');
      if (val === 'UTC') return 'UTC+0:00';
      if (!val.includes(':')) {
        val = `${val}:00`;
      }
      return val;
    }
  } catch (e) {
    // Return empty if timezone is invalid or unsupported by browser runtime
  }
  return '';
};

export const formatTimezoneLabel = (timeZone: string): string => {
  if (!timeZone) return '';
  const offset = getTimezoneOffsetString(timeZone);
  return offset ? `${timeZone} (${offset})` : timeZone;
};

export const getSupportedTimezones = (): string[] => Array.from(new Set(['UTC', ...timeZonesNames]));

export const getTimezoneOptions = (currentValue?: string): { label: string; value: string }[] => {
  const rawList = getSupportedTimezones();
  const optionsMap = new Map<string, { label: string; value: string }>();

  rawList.forEach((tz) => {
    optionsMap.set(tz, { value: tz, label: formatTimezoneLabel(tz) });
  });

  if (currentValue && currentValue.trim() !== '' && !optionsMap.has(currentValue)) {
    optionsMap.set(currentValue, {
      value: currentValue,
      label: formatTimezoneLabel(currentValue),
    });
  }

  return Array.from(optionsMap.values()).sort((a, b) => a.value.localeCompare(b.value));
};

const TIMEZONE_LIST = getTimezoneOptions();

export default TIMEZONE_LIST;
