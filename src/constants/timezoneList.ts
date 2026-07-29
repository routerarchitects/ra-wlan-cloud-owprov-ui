// Dynamic IANA Timezone helper & options for Location entity.
// Sources the complete IANA timezone set via Intl.supportedValuesOf('timeZone')
// and dynamically calculates current UTC offsets to account for Daylight Saving Time (DST).

const LEGACY_CANONICAL_MAP: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Europe/Kiev': 'Europe/Kyiv',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'America/Godthab': 'America/Nuuk',
  'Africa/Asmera': 'Africa/Asmara',
};

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

export const getSupportedTimezones = (): string[] => {
  let rawZones: string[] = [];
  if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
    try {
      rawZones = (Intl as any).supportedValuesOf('timeZone') as string[];
    } catch (e) {
      // Fallback if unsupported
    }
  }

  if (!Array.isArray(rawZones) || rawZones.length === 0) {
    rawZones = [
      'UTC',
      'Africa/Cairo',
      'Africa/Johannesburg',
      'Africa/Nairobi',
      'America/Anchorage',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/New_York',
      'America/Phoenix',
      'America/Puerto_Rico',
      'America/Sao_Paulo',
      'America/St_Johns',
      'America/Toronto',
      'America/Vancouver',
      'Asia/Bangkok',
      'Asia/Dhaka',
      'Asia/Dubai',
      'Asia/Jakarta',
      'Asia/Karachi',
      'Asia/Kolkata',
      'Asia/Manila',
      'Asia/Seoul',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Asia/Tehran',
      'Asia/Tokyo',
      'Atlantic/Cape_Verde',
      'Australia/Adelaide',
      'Australia/Brisbane',
      'Australia/Perth',
      'Australia/Sydney',
      'Europe/Athens',
      'Europe/Dublin',
      'Europe/London',
      'Europe/Paris',
      'Pacific/Auckland',
      'Pacific/Guadalcanal',
      'Pacific/Honolulu',
      'Pacific/Midway',
    ];
  }

  const set = new Set<string>();
  rawZones.forEach((tz) => {
    const canonical = LEGACY_CANONICAL_MAP[tz] || tz;
    set.add(canonical);
  });

  return Array.from(set);
};

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
