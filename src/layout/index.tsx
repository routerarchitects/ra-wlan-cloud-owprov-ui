import React from 'react';
import { IconButton, Tooltip, useBoolean, useBreakpoint, useColorMode } from '@chakra-ui/react';
import { MapTrifold } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import FavoritesDropdown from './FavoritesDropdown';
import { Navbar } from './Navbar';
import { PageContainer } from './PageContainer';
import { Sidebar } from './Sidebar';
import darkLogo from 'assets/Logo_Dark_Mode.svg';
import lightLogo from 'assets/Logo_Light_Mode.svg';
import LanguageSwitcher from 'components/LanguageSwitcher';
import { useAuth } from 'contexts/AuthProvider';
import { RouteName } from 'models/Routes';
import NotFoundPage from 'pages/NotFound';
import routes from 'router/routes';

const Layout = () => {
  const { t } = useTranslation();
  const authContext = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorMode } = useColorMode();
  const breakpoint = useBreakpoint('xl');
  const [isSidebarOpen, { toggle: toggleSidebar }] = useBoolean(breakpoint !== 'base' && breakpoint !== 'sm');
  document.documentElement.dir = 'ltr';

  const activeRoute = React.useMemo(() => {
    let name: RouteName = '';
    for (const route of routes) {
      if (!route.children && route.path === location.pathname) {
        name = route.navName ?? route.name;
        break;
      }
      if (route.path?.includes('/:')) {
        const routePath = route.path.split('/:')[0];
        const currPath = location.pathname.split('/');
        if (routePath && location.pathname.startsWith(routePath) && currPath.length === 3) {
          name = route.navName ?? route.name;
          break;
        }
      }
      if (route.children) {
        for (const child of route.children) {
          if (child.path === location.pathname) {
            name = child.navName ?? child.name;
            break;
          }
        }
      }
    }

    if (typeof name === 'function') return name(t);

    if (name.includes('PATH')) {
      name = location.pathname.split('/')[location.pathname.split('/').length - 1] ?? '';
    }

    if (name.includes('RAW-')) {
      return name.replace('RAW-', '');
    }

    return t(name);
  }, [t, location.pathname]);

  const routeInstances = React.useMemo(() => {
    const instances = [];

    for (const route of routes) {
      // @ts-ignore
      if (!route.children) instances.push(<Route path={route.path} element={<route.component />} key={route.id} />);
      else {
        for (const child of route.children) {
          // @ts-ignore
          instances.push(<Route path={child.path} element={<child.component />} key={child.id} />);
        }
      }
    }

    return instances;
  }, []);

  const goToMap = () => navigate('/map');

  return (
    <>
      <Sidebar
        routes={routes}
        isOpen={isSidebarOpen}
        toggle={toggleSidebar}
        version={__APP_VERSION__}
        logo={
          <img
            src={colorMode === 'light' ? lightLogo : darkLogo}
            alt="OpenWifi"
            width="180px"
            height="100px"
            style={{
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          />
        }
      />
      <Navbar
        toggleSidebar={toggleSidebar}
        languageSwitcher={<LanguageSwitcher />}
        favoritesButton={authContext.isUserLoaded ? <FavoritesDropdown /> : null}
        rightElements={
          <Tooltip label="Map" aria-label={t('common.go_to_map')}>
            <IconButton
              aria-label={t('common.go_to_map')}
              variant="ghost"
              icon={<MapTrifold size={24} />}
              onClick={goToMap}
            />
          </Tooltip>
        }
        activeRoute={activeRoute}
      />
      <PageContainer waitForUser>
        <Routes>{[...routeInstances, <Route path="*" element={<NotFoundPage />} key={uuid()} />]}</Routes>
      </PageContainer>
    </>
  );
};

export default Layout;
