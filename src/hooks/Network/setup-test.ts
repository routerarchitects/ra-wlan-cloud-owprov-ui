// @ts-ignore
global.window = {
  // @ts-ignore
  _env_: {
    REACT_APP_UCENTRALSEC_URL: 'https://localhost:8000',
  },
  location: {
    href: 'https://localhost:8000',
  },
} as any;

// @ts-ignore
global.document = {
  createElement: () => ({
    setAttribute: () => {},
    pathname: '',
    search: '',
    hash: '',
    host: '',
    hostname: '',
    port: '',
    protocol: '',
  }),
} as any;

// @ts-ignore
global.navigator = { userAgent: '' } as any;
