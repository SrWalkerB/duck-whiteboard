import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'

import { BoardPage, RoomPage } from '@/routes/BoardPage'
import { SettingsPage } from '@/routes/SettingsPage'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: BoardPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/r/$roomToken',
  component: RoomPage,
})

const routeTree = rootRoute.addChildren([boardRoute, settingsRoute, roomRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
